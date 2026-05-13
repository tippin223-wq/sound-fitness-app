import Link from "next/link";
import OnboardingQuestionnaire from "@/components/onboarding/OnboardingQuestionnaire";

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-[#020713] text-white">
      <header className="relative z-10 border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/sound-fitness-logo.png"
              alt="Sound Fitness"
              className="h-11 w-11 object-contain"
            />
            <div>
              <div className="text-lg font-black uppercase tracking-[0.14em]">
                Sound Fitness
              </div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
                Free Assessment
              </div>
            </div>
          </Link>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/login"
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
            >
              Log In
            </Link>
            <Link
              href="/start"
              className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-300 hover:text-slate-950"
            >
              Welcome
            </Link>
          </div>
        </div>
      </header>

      <OnboardingQuestionnaire />
    </main>
  );
}
