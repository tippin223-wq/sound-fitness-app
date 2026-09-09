import { supabase } from "@/lib/supabaseClient";

/* THE DIRECTORY, SHARED WITH THE WEBSITE ADMIN.
 *
 * These rows used to live in window.localStorage under
 * "soundFitnessAdminUserListRecords", and that is worse than it sounds. A
 * record typed here was saved to ONE BROWSER PROFILE on ONE MACHINE: it never
 * reached a server, so it could not be opened on a phone, could not survive
 * clearing site data, could not be backed up, and could not be seen by the
 * Sound Fitness website admin - which shows the same twelve steps of the same
 * customer journey.
 *
 * They live in public.directory_records now, in the Supabase project both
 * codebases already share. Same rows, both admins. See the website repo's
 * supabase/directory-records.sql for the table and its policies.
 *
 * LOCALSTORAGE IS STILL HERE, as a cache and a lifeboat:
 *
 *   - it answers instantly on load, so the table paints before the round trip
 *   - it is what the migration below reads, so nothing typed before this
 *     change is lost
 *   - it is the fallback when the table does not exist yet, so the dashboard
 *     keeps working between this deploy and the migration being run
 *
 * WRITES ARE PER-RECORD AND COALESCED. The caller hands over the whole array
 * on every state change, which for a text field is every keystroke. Sending
 * that array each time would be a write storm against one table; diffing it
 * against the last version and sending only what actually changed, once the
 * typing stops, is the same result and a few hundred fewer requests.
 */

const STORAGE_KEY = "soundFitnessAdminUserListRecords";
const MIGRATED_KEY = "soundFitnessAdminUserListMigratedAt";
const TABLE = "directory_records";
const WRITE_DELAY_MS = 600;

export type DirectoryRow = {
  addedAt: string;
  clientId?: string;
  details: Record<string, string>;
  id: string;
  isLiveDirectory?: boolean;
  isMock?: boolean;
  name: string;
  profile?: Record<string, string>;
  reached: string;
  stage: string;
};

const textMap = (value: unknown): Record<string, string> =>
  value && typeof value === "object"
    ? Object.fromEntries(
        Object.entries(value as Record<string, unknown>).flatMap(
          ([key, entry]) =>
            typeof entry === "string" ? [[key, entry] as const] : [],
        ),
      )
    : {};

const rowFromTable = (row: Record<string, unknown>): DirectoryRow | null => {
  const id = typeof row.id === "string" ? row.id : "";
  const stage = typeof row.stage === "string" ? row.stage : "";
  const name = typeof row.name === "string" ? row.name : "";
  if (!id || !stage || !name) return null;

  return {
    addedAt: typeof row.added_at === "string" ? row.added_at : "Added",
    details: textMap(row.details),
    id,
    name,
    profile: textMap(row.profile),
    reached: typeof row.reached === "string" ? row.reached : "Added",
    stage,
  };
};

const rowToTable = (row: DirectoryRow) => ({
  added_at: /^\d{4}-\d{2}-\d{2}/.test(row.addedAt)
    ? row.addedAt
    : new Date().toISOString(),
  details: row.details ?? {},
  id: row.id,
  name: row.name,
  profile: row.profile ?? {},
  reached: row.reached ?? "Added",
  source: "app",
  stage: row.stage,
  updated_at: new Date().toISOString(),
});

function readLocal(): DirectoryRow[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");

    return Array.isArray(parsed) ? (parsed as DirectoryRow[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(rows: DirectoryRow[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    /* A full or disabled store is not a reason to lose the write that
       matters - the table above already has it. */
  }
}

/* WHAT WAS TYPED BEFORE THIS EXISTED.
 *
 * Runs once, and only when the shared table has no row with that id yet, so
 * it cannot resurrect something deliberately deleted on another machine
 * afterwards. Marked in localStorage so a second browser does not re-upload
 * the same rows it happens to be holding. */
async function migrateLocalRows(existingIds: Set<string>) {
  if (typeof window === "undefined") return [];
  if (window.localStorage.getItem(MIGRATED_KEY)) return [];

  const local = readLocal().filter(
    (row) => !row.isLiveDirectory && !row.isMock && !existingIds.has(row.id),
  );

  if (local.length) {
    const { error } = await supabase
      .from(TABLE)
      .upsert(local.map(rowToTable), { onConflict: "id" });

    if (error) return [];
  }

  window.localStorage.setItem(MIGRATED_KEY, new Date().toISOString());

  return local;
}

/**
 * Every typed row, shared. Null means "the table could not be reached", which
 * the caller treats differently from an empty table: one is a connection
 * problem and the other is a directory nobody has added to.
 */
export async function loadDirectoryRows(): Promise<DirectoryRow[] | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("added_at", { ascending: false });

  if (error) return null;

  const rows = (data ?? []).flatMap((row) => {
    const parsed = rowFromTable(row as Record<string, unknown>);
    return parsed ? [parsed] : [];
  });

  const migrated = await migrateLocalRows(new Set(rows.map((row) => row.id)));
  const all = [...migrated, ...rows];

  writeLocal(all);

  return all;
}

/** The cache, for the first paint before the round trip lands. */
export function loadCachedDirectoryRows(): DirectoryRow[] {
  return readLocal();
}

/* The last version actually sent, so the next call can work out what changed
   rather than re-sending everything. */
let lastSent = new Map<string, string>();
let timer: ReturnType<typeof setTimeout> | null = null;
let pending: DirectoryRow[] | null = null;
let inFlight: Promise<void> = Promise.resolve();

const fingerprint = (row: DirectoryRow) =>
  JSON.stringify([row.stage, row.name, row.details, row.profile, row.reached]);

async function flush() {
  const rows = pending;
  pending = null;
  timer = null;
  if (!rows) return;

  const next = new Map(rows.map((row) => [row.id, fingerprint(row)]));
  const changed = rows.filter((row) => lastSent.get(row.id) !== next.get(row.id));
  const removed = [...lastSent.keys()].filter((id) => !next.has(id));

  /* Chained rather than concurrent: two overlapping upserts of the same row
     is how one of them silently wins. */
  inFlight = inFlight.then(async () => {
    try {
      if (changed.length) {
        const { error } = await supabase
          .from(TABLE)
          .upsert(changed.map(rowToTable), { onConflict: "id" });
        if (error) return;
      }

      if (removed.length) {
        const { error } = await supabase.from(TABLE).delete().in("id", removed);
        if (error) return;
      }

      /* Only once the write is known to have landed. Recording it earlier
         would mean a failed request is never retried, because the next diff
         would see nothing to send. */
      lastSent = next;
    } catch {
      /* Left un-recorded, so the next change re-sends it. */
    }
  });

  await inFlight;
}

/**
 * Save the typed rows. Takes the whole list, sends only what moved.
 *
 * localStorage is written immediately and synchronously: it is the cache the
 * next load paints from, and it must be right even if the tab closes before
 * the request lands.
 */
export function saveDirectoryRows(rows: DirectoryRow[]) {
  const typed = rows.filter((row) => !row.isLiveDirectory);

  writeLocal(typed);

  pending = typed;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flush(), WRITE_DELAY_MS);

  if (typeof window !== "undefined") {
    /* A tab closing mid-edit would otherwise drop the pending write. */
    const send = () => {
      if (timer) clearTimeout(timer);
      void flush();
    };

    window.addEventListener("pagehide", send, { once: true });
  }
}

/** Seeds the diff after a load, so the first save does not re-send every row
    it just read. */
export function primeDirectoryDiff(rows: DirectoryRow[]) {
  lastSent = new Map(rows.map((row) => [row.id, fingerprint(row)]));
}
