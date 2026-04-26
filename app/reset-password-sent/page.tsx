import Link from "next/link";

export default function ResetPasswordSentPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#020713] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(0,132,255,0.22),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(56,189,248,0.12),transparent_28%),linear-gradient(180deg,#020713_0%,#06111f_48%,#020713_100%)]" />

      {/* HEADER */}
      <header className="relative z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-center px-5 py-8 sm:px-8">
          <Link href="/" className="flex items-center gap-3 text-center">
            <img
              src="/sound-fitness-logo.png"
              alt="Sound Fitness"
              className="h-14 w-14 object-contain"
            />

            <div className="leading-[0.9]">
              <div className="bg-gradient-to-r from-white via-slate-200 to-white bg-clip-text text-3xl font-black uppercase tracking-[0.08em] text-transparent sm:text-4xl">
                SOUND
              </div>

              <div className="relative mt-[-2px] text-xs font-black uppercase tracking-[0.42em] text-sky-400">
                FITNESS
                <div className="absolute left-1/2 top-full mt-1 h-[2px] w-[85%] -translate-x-1/2 bg-gradient-to-r from-transparent via-sky-400 to-transparent opacity-60" />
              </div>
            </div>
          </Link>
        </div>
      </header>

      {/* MAIN */}
      <section className="relative mx-auto flex min-h-[calc(100vh-120px)] max-w-3xl items-center justify-center px-5 pb-12 sm:px-8">
        <div className="absolute left-1/2 top-[15%] h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative w-full rounded-[32px] border border-sky-400/40 bg-slate-950/70 p-8 text-center shadow-[0_0_80px_rgba(14,165,233,0.22)] backdrop-blur sm:p-10">
          <div className="absolute inset-0 rounded-[32px] bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.2),transparent_35%)]" />

          <div className="relative">
            {/* ICON */}
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-sky-400/40 bg-sky-500/10 text-4xl shadow-[0_0_40px_rgba(14,165,233,0.3)]">
              📬
            </div>

            {/* TEXT */}
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-400">
              Email Sent
            </div>

            <h1 className="mt-4 text-4xl font-black uppercase tracking-tight sm:text-5xl">
              Check your inbox
            </h1>

            <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-slate-400">
              We’ve sent password reset instructions to your email. Follow the
              link to securely update your password and get back into your
              dashboard.
            </p>

            {/* INFO BLOCK */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-left">
              <ul className="space-y-3 text-sm text-slate-400">
                <li>• Check your spam or junk folder if you don’t see it</li>
                <li>• Make sure you entered the correct email</li>
                <li>• The link will expire for security reasons</li>
              </ul>
            </div>

            {/* ACTIONS */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/login"
                className="rounded-xl border border-white/15 bg-white/[0.03] px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:border-sky-400/50 hover:bg-sky-500/10"
              >
                Back to Login
              </Link>

              <Link
                href="/forgot-password"
                className="rounded-xl bg-sky-500 px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_0_35px_rgba(14,165,233,0.35)] transition hover:bg-sky-400"
              >
                Resend Email →
              </Link>
            </div>

            {/* FOOT NOTE */}
            <div className="mt-8 border-t border-white/10 pt-5">
              <p className="text-xs text-slate-500">
                Still having trouble? Reach out to us at
                <b> train@thesoundfitness.com </b> and we’ll help you get back
                in.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-3 border-t border-white/10 px-5 py-6 text-xs text-slate-500 sm:px-8">
        <div>© 2026 Sound Fitness. All rights reserved.</div>

        <div className="flex items-center gap-4">
          <Link href="/coach/login" className="hover:text-sky-300">
            Coach Sign In
          </Link>
          <span>•</span>
          <Link href="/admin/login" className="hover:text-sky-300">
            Admin Sign In
          </Link>
        </div>
      </footer>
    </main>
  );
}
