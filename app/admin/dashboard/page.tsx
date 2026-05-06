import Link from "next/link";
import { ROUTES } from "@/lib/routes";

export default function CoachDashboardPage() {
  const stats = [
    ["Leads", "8"],
    ["Follow-Ups", "5"],
    ["Active Clients", "12"],
    ["Revenue (Month)", "$5.4k"],
  ];

  const quickLinks = [
    ["CRM Dashboard", ROUTES.admin.crmDashboard],
    ["Leads Pipeline", ROUTES.admin.leads],
    ["Client Directory", ROUTES.admin.clients],
    ["Follow-Ups", ROUTES.admin.followUps],
    ["Sales", ROUTES.admin.sales],
    ["Invoices", ROUTES.admin.invoices],
    ["Referrals", ROUTES.admin.referrals],
    ["Reports", ROUTES.admin.reports],
  ];

  const alerts = [
    "2 clients low on sessions",
    "1 overdue payment",
    "3 leads not contacted",
    "4 follow-ups due today",
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-5 py-8 text-white">
      <section className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300">
            Coach Dashboard
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Run your business from here.
          </h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            Leads, clients, money, and follow-ups — all in one place.
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(([label, value]) => (
            <div
              key={label}
              className="rounded-[26px] border border-white/10 bg-white/[0.05] p-5 shadow-xl"
            >
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-2 text-3xl font-bold text-sky-300">{value}</p>
            </div>
          ))}
        </div>

        {/* Alerts */}
        <section className="rounded-[32px] border border-rose-400/20 bg-rose-500/10 p-6 shadow-xl">
          <h2 className="text-xl font-bold">Attention Needed</h2>

          <div className="mt-4 space-y-2">
            {alerts.map((alert) => (
              <div key={alert} className="text-sm text-rose-300">
                ⚠️ {alert}
              </div>
            ))}
          </div>
        </section>

        {/* Quick Navigation */}
        <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
          <h2 className="text-2xl font-bold">Manage Your Business</h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {quickLinks.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className="rounded-[24px] border border-white/10 bg-slate-950/60 p-5 hover:bg-white/10 transition"
              >
                <p className="text-lg font-bold">{label}</p>
                <p className="mt-2 text-sm text-slate-400">Open →</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Daily Focus */}
        <section className="rounded-[32px] border border-sky-400/20 bg-sky-500/10 p-6 shadow-xl">
          <h2 className="text-2xl font-bold">Daily Focus</h2>

          <div className="mt-4 space-y-2 text-sm text-slate-200">
            <p>• Contact all new leads</p>
            <p>• Complete all follow-ups</p>
            <p>• Check session balances</p>
            <p>• Push 1–2 closes</p>
          </div>
        </section>
      </section>
    </main>
  );
}
