"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { hubDocumentIssue, previewHub, type HubDocument, type HubSnapshot } from "@/lib/trainer-hub/model";

const PREVIEW_KEY = "sound-fitness:trainer-hub:preview:v1";
function snapshotIssue(value: unknown): string | null {
  if (!value || typeof value !== "object" || !("revision" in value) || !Number.isSafeInteger(value.revision) || Number(value.revision) < 0 || !("document" in value)) return "This saved workspace cannot be read. Its original data has been preserved.";
  return hubDocumentIssue(value.document);
}

export function useHubWorkspace(mode: "preview" | "live", accountId: string) {
  const [snapshot, setSnapshot] = useState<HubSnapshot | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const lock = useRef(false);
  const generation = useRef(0);
  const pending = useRef<{ document: string; revision: number; mutationId: string } | null>(null);

  const liveRequest = useCallback(async (init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || session.user.id !== accountId) throw new Error("Your account changed. Sign in again before saving.");
    const response = await fetch("/api/trainer-hub/workspace", { ...init, cache: "no-store", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "The workspace could not be saved. Your form is still available.");
    const issue = snapshotIssue(result);
    if (issue) throw new Error(issue);
    return result as HubSnapshot;
  }, [accountId]);

  const load = useCallback(async () => {
    const ticket = ++generation.current;
    setLoading(true); setError("");
    try {
      let result: HubSnapshot;
      if (mode === "preview") {
        // Yield so the server and first client render have the same loading state.
        await Promise.resolve();
        const raw = localStorage.getItem(PREVIEW_KEY);
        result = raw ? JSON.parse(raw) : { document: previewHub(), revision: 0 };
        const issue = snapshotIssue(result);
        if (issue) throw new Error(issue);
      } else result = await liveRequest();
      if (generation.current === ticket) { setSnapshot(result); pending.current = null; }
    } catch (e) { if (generation.current === ticket) setError(e instanceof Error ? e.message : "Workspace unavailable."); }
    finally { if (generation.current === ticket) setLoading(false); }
  }, [mode, liveRequest]);

  useEffect(() => {
    let cancelled = false;
    const lifecycle = generation;
    queueMicrotask(() => { if (!cancelled) void load(); });
    return () => { cancelled = true; lifecycle.current++; };
  }, [load]);

  async function save(document: HubDocument, message: string): Promise<boolean> {
    if (!snapshot || lock.current) return false;
    const issue = hubDocumentIssue(document);
    if (issue) { setError(issue); return false; }
    lock.current = true; setBusy(true); setError(""); setNotice("");
    const ticket = generation.current;
    try {
      let result: HubSnapshot;
      if (mode === "preview") {
        const current = localStorage.getItem(PREVIEW_KEY);
        const original = current ? JSON.parse(current) : { revision: 0 };
        if (original.revision !== snapshot.revision) throw new Error("The preview changed in another tab. Reload it before saving again. Your form is still here.");
        result = { document, revision: snapshot.revision + 1 };
        localStorage.setItem(PREVIEW_KEY, JSON.stringify(result));
      } else {
        const serialized = JSON.stringify(document);
        if (!pending.current || pending.current.document !== serialized || pending.current.revision !== snapshot.revision) pending.current = { document: serialized, revision: snapshot.revision, mutationId: crypto.randomUUID() };
        result = await liveRequest({ method: "PUT", body: JSON.stringify({ document, revision: snapshot.revision, mutationId: pending.current.mutationId }) });
      }
      if (ticket !== generation.current) return false;
      setSnapshot(result); pending.current = null; setNotice(message); return true;
    } catch (e) { if (ticket === generation.current) setError(e instanceof Error ? e.message : "Save failed. Your form is still here."); return false; }
    finally { lock.current = false; if (ticket === generation.current) setBusy(false); }
  }

  async function resetPreview() {
    if (mode !== "preview" || lock.current) return;
    try { localStorage.removeItem(PREVIEW_KEY); await load(); setNotice("Sample workspace restored."); }
    catch { setError("Browser storage is unavailable. The preview could not be reset."); }
  }

  return { snapshot, error, busy, loading, notice, save, reload: load, resetPreview };
}
