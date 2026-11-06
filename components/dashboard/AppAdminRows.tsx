"use client";

import Link from "next/link";
import AdminContentLibrary from "./AdminContentLibrary";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import { APP_PLANS } from "@/lib/appPlans";
import { APP_ADMIN_PRODUCTS, APP_ADMIN_ROWS, type AppAdminSnapshot } from "@/lib/appAdmin";
import styles from "./AppAdminRows.module.css";

function useAppAdminSnapshot() {
  const [result, setResult] = useState<{ owner: string | null; data: AppAdminSnapshot | null; error: string | null }>({ owner: null, data: null, error: null });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let disposed = false;
    let observedAuth = false;
    let request: AbortController | null = null;
    function load(session: { access_token: string; user: { id: string } } | null) {
      request?.abort();
      const controller = new AbortController();
      request = controller;
      const owner = session?.user.id ?? null;
      setResult({ owner, data: null, error: session ? null : "Sign in to load app administration." });
      if (!session) return;
      void fetch("/api/admin/app-center", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store", signal: controller.signal })
        .then(async response => {
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error || "App reporting is unavailable.");
          if (!disposed && !controller.signal.aborted) setResult({ owner, data: payload, error: null });
        }).catch(error => {
          if (!disposed && !controller.signal.aborted) setResult({ owner, data: null, error: error instanceof Error ? error.message : "App reporting is unavailable." });
        });
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { observedAuth = true; load(session); });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (disposed || observedAuth) return;
      if (error) setResult({ owner: null, data: null, error: "Your app session could not be loaded." });
      else load(data.session);
    });
    return () => { disposed = true; request?.abort(); subscription.unsubscribe(); };
  }, [revision]);
  return { ...result, refresh: () => setRevision(r => r + 1) };
}

function Messages({ issues }: { issues: string[] }) {
  return issues.length ? <p role="status" className={styles.notice}>{issues.join(" ")}</p> : null;
}

function Resource({ title, description, href, label = "Open member area" }: { title: string; description: string; href: string; label?: string }) {
  return <article className={styles.card}><h3>{title}</h3><p>{description}</p><Link href={href} target="_blank" rel="noopener noreferrer">{label} ↗</Link></article>;
}

function AnnouncementDraft({ owner }: { owner: string | null }) {
  const key = owner ? `sf:app-admin:announcement-draft:${owner}` : null;
  // The parent keys this editor by owner, so another account never inherits a draft.
  const [initial] = useState(() => {
    if (!key || typeof window === "undefined") return { text: "", ready: false, status: "" };
    try { return { text: localStorage.getItem(key) ?? "", ready: true, status: "" }; }
    catch { return { text: "", ready: false, status: "Draft storage is unavailable. Existing data has not been changed." }; }
  });
  const [text, setText] = useState(initial.text);
  const [status, setStatus] = useState(initial.status);
  const ready = initial.ready;
  return <div className={styles.editor}>
    <label htmlFor="app-announcement">Member announcement draft</label>
    <textarea id="app-announcement" value={text} maxLength={10000} disabled={!ready} onChange={event => { setText(event.target.value); setStatus("Unsaved changes"); }} placeholder="Write an onboarding message, product update, or app announcement…" />
    <div className={styles.actions}><button disabled={!ready} onClick={() => { try { if (key) { localStorage.setItem(key, text); setStatus("Draft saved on this device. It has not been published or sent."); } } catch { setStatus("Draft could not be saved. Copy your text before leaving."); } }}>Save draft on this device</button><span role="status">{status}</span></div>
    <p>Publishing, audience selection, and delivery tracking are not connected yet. This draft is private to this admin account on this device.</p>
  </div>;
}

export default function AppAdminRows({ activeRow, calendar, onSelectRow }: { activeRow: number; calendar: ReactNode; onSelectRow: (row: number) => void }) {
  const report = useAppAdminSnapshot();
  const [search, setSearch] = useState("");
  const [product, setProduct] = useState("all");
  const filteredUsers = useMemo(() => (report.data?.users.records ?? []).filter(u =>
    `${u.name} ${u.email} ${u.role}`.toLowerCase().includes(search.toLowerCase()) && (product === "all" || u.products.includes(product))), [report.data, search, product]);
  const planCount = report.data?.billing.plans.reduce((sum, plan) => sum + plan.active, 0);
  const usersUnavailable = Boolean(report.data?.users.issues.length && !report.data.users.records.length);
  const loading = !report.data && !report.error;
  const reportStatus = <><Messages issues={report.error ? [report.error] : []} />{loading && <p role="status">Loading verified app records…</p>}</>;
  return <>{APP_ADMIN_ROWS.map((row, index) => {
    if (index === 4) return <div key={row.title} className={styles.calendar}>{calendar}</div>;
    return <div key={row.title} data-dashboard-orbiter-row={String(index)} aria-label={`${row.title} row`} className={`${styles.row} ${index === activeRow ? styles.active : styles.inactive}`}>
      <header className={styles.heading}><div><span className={styles.eyebrow}>Sound Fitness · App administration</span><h2>{row.title}</h2><p>{row.helper}</p></div><button onClick={report.refresh} disabled={loading}>Refresh data</button></header>
      <div className={styles.body} data-dashboard-orbiter-local-scroll="true">
        {index === 0 && <>
          {reportStatus}
          <div className={styles.grid}>
            <article className={styles.card}><h3>App accounts</h3><strong>{report.data && !report.data.users.issues.length && !report.data.users.partial ? report.data.users.records.length : "Unavailable"}</strong><p>Accounts with recorded app enrollment or training activity.</p><button onClick={() => onSelectRow(1)}>View app users</button></article>
            <article className={styles.card}><h3>Active app subscriptions</h3><strong>{report.data?.billing.plans.length && !report.data.billing.issues.length && !report.data.billing.partial ? planCount : "Unavailable"}</strong><p>Matched to configured app billing prices.</p><button onClick={() => onSelectRow(2)}>View subscriptions</button></article>
            <article className={styles.card}><h3>App products</h3><strong>{APP_ADMIN_PRODUCTS.length}</strong><p>Core member areas and companions, with connection status.</p><button onClick={() => onSelectRow(3)}>View app products</button></article>
          </div>
          <Messages issues={[...(report.data?.users.issues ?? []), ...(report.data?.billing.issues ?? [])]} />
          <p className={styles.notice}>Companion connections and paid bundle grants remain pending where marked. Lead journeys, in-home operations, general marketing, and business accounting remain in the website admin.</p>
        </>}
        {index === 1 && <>
          <div className={styles.actions}><label>Find account <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, email, or role" /></label><label>Product <select value={product} onChange={e => setProduct(e.target.value)}><option value="all">All app accounts</option> <option>Sound Fitness</option><option>Angles</option></select></label><span>{usersUnavailable || report.error ? "Accounts unavailable" : report.data ? `${filteredUsers.length} accounts shown` : "Loading accounts"}</span></div>
          {reportStatus}<Messages issues={report.data?.users.issues ?? []} />
          {report.data?.users.partial && <p role="status">Partial account list; additional records or sources could not be included.</p>}
          <p>Membership alone does not establish app use. This list uses training activity and Angles enrollment; inactive accounts without either are not yet included. Activity dates are saved-data updates or enrollment dates, not last sign-in.</p>
          <div className={styles.table}><table><thead><tr>{["Account", "Email", "Role", "App evidence", "Latest recorded activity", "Verified product access"].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{filteredUsers.map(u => <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.products.join(", ")}</td><td>{u.lastActivity ? new Date(u.lastActivity).toLocaleDateString() : "Not recorded"}</td><td>{u.access}</td></tr>)}</tbody></table></div>
          {report.data && !usersUnavailable && !filteredUsers.length && <p>No matching app accounts were returned by the connected sources.</p>}
        </>}
        {index === 2 && <>
          {reportStatus}<Messages issues={report.data?.billing.issues ?? []} />
          {report.data?.billing.partial && <p role="status">Partial billing snapshot: counts cover only the returned records, not lifetime totals.</p>}
          <div className={styles.grid}>{APP_PLANS.map(plan => {
            const metrics = report.data?.billing.plans.find(p => p.planId === plan.id);
            return <article className={styles.card} key={plan.id}><span className={styles.eyebrow}>{plan.id === "online-coaching" ? (metrics ? "Billing connected · enrollment available" : "Enrollment route available · billing not verified") : "Catalog only · checkout not enabled"}</span><h3>{plan.name}</h3><strong>{plan.price}<small>{plan.cadence}</small></strong><p>{plan.summary}</p><dl>{[["Active", metrics?.active], ["Trialing", metrics?.trialing], ["Past due / unpaid", metrics?.pastDue], ["Canceled", metrics?.canceled], ["Paid initial checkouts", metrics?.paidCheckouts]].map(([label, count]) => <div key={String(label)}><dt>{label}</dt><dd>{count ?? "Unavailable"}</dd></div>)}</dl>{metrics && Object.entries(metrics.checkoutTotals).map(([currency, minor]) => { const formatter = new Intl.NumberFormat(undefined, { style: "currency", currency }); const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2; return <p key={currency}>Paid checkout total: {formatter.format(minor / 10 ** digits)}</p>; })}</article>;
          })}</div>
          <p>Catalog prices come from the app’s existing plans. Sales count paid initial checkouts for an exact app price; renewal payments, refunds, business expenses, and in-home packages are excluded. Subscription counts describe current Stripe status. Shared website/app catalog synchronization is not yet verified.</p>
        </>}
        {index === 3 && <div className={styles.productGrid}>{APP_ADMIN_PRODUCTS.map(p => <article className={styles.card} key={p.id}><span className={styles.eyebrow}>{p.area}</span><h3>{p.name}</h3><p>{p.description}</p><span className={styles.badge}>{p.status}</span><Link href={p.href} target="_blank" rel="noopener noreferrer">Open {p.id === "angles" ? "Angles" : `${p.area} member area`} ↗</Link></article>)}</div>}
        {index === 5 && <><div className={styles.grid}><Resource title="App conversations" description="Open your existing in-app coaching conversations. An all-user support queue is not connected yet." href="/dashboard/coach-messaging" label="Open my conversations" /><Resource title="Video reviews" description="Open the existing form-check and video-review experience." href="/dashboard/video-review" label="Open video review" /><Resource title="Coach workspace" description="App programming and coach–member work. Website social and lead inboxes stay in the website admin." href="/trainer-hub/workspace" label="Open coach workspace" /></div><p>These links open existing app workspaces. They do not imply an aggregate support queue or unread totals.</p></>}
        {index === 6 && <AdminContentLibrary />}
        {index === 7 && <AnnouncementDraft key={report.owner} owner={report.owner} />}
        {index === 8 && <><div className={styles.grid}>
          <Resource title="My account & security" description="Manage your account preferences and available security controls." href="/dashboard/settings" label="Open account settings" />
          <article className={styles.card}><h3>Product connections</h3><p>Track companion enrollment, synchronization, and bundle readiness.</p><button onClick={() => onSelectRow(3)}>Review connection status</button></article>
          <article className={styles.card}><h3>Billing connection</h3><p>App price matching and subscription reporting use the existing server billing connection.</p><button onClick={() => onSelectRow(2)}>Review app billing</button></article>
        </div><p>Role changes, global notification rules, retention, and shared access/bundle controls require their own verified administration workflows. They are not editable from this overview.</p></>}
        {report.data && [0, 1, 2].includes(index) && <p className={styles.timestamp}>Snapshot: {new Date(report.data.checkedAt).toLocaleString()}</p>}
      </div>
    </div>;
  })}</>;
}
