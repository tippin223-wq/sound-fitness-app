import UserMenu from "@/components/UserMenu";
import Link from "next/link";

const serviceCards = [
  {
    title: "Strength Training",
    text: "Build lean muscle, improve confidence, and move with better technique.",
    icon: "🏋️",
    image:
      "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=900",
  },
  {
    title: "Assisted Stretch",
    text: "Increase flexibility, reduce tension, and recover faster between sessions.",
    icon: "🧘",
    image:
      "https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?q=80&w=900",
  },
  {
    title: "Mobility & Recovery",
    text: "Improve movement quality so daily life, training, and recovery feel better.",
    icon: "🌿",
    image:
      "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?q=80&w=900",
  },
  {
    title: "Custom Programming",
    text: "Fully customized training plans built around your goals, schedule, and equipment.",
    icon: "🧠",
    image:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=900",
  },
  {
    title: "Boxing & Performance",
    text: "Improve conditioning, coordination, and power with fun, skill-based training.",
    icon: "🥊",
    image:
      "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?q=80&w=900",
  },
  {
    title: "Endurance Training",
    text: "Build stamina, burn fat, and improve overall fitness with structured conditioning.",
    icon: "⚡",
    image:
      "https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf?q=80&w=900",
  },
  {
    title: "Online Coaching",
    text: "Custom programming, progress support, and accountability from anywhere.",
    icon: "💻",
    image:
      "https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=900",
  },
  {
    title: "Continuation Program",
    text: "Support after rehab, mobility decline, or life changes that require structure.",
    icon: "🛡️",
    image:
      "https://images.unsplash.com/photo-1571019613914-85f342c6a11e?q=80&w=900",
  },
];

const services = [
  "Free Intro Session",
  "In-Home Strength Training",
  "Assisted Stretch",
  "Mobility / Recovery",
  "Online Coaching",
  "Continuation Program",
];

const proofItems = [
  {
    icon: "🏠",
    title: "We come to you",
    text: "No gym. No hassle. Just structured coaching at your location.",
  },
  {
    icon: "🎯",
    title: "Goal focused",
    text: "Your plan is built around your goals, ability, schedule, and space.",
  },
  {
    icon: "📈",
    title: "Progress tracked",
    text: "Workouts, wins, habits, and progress stay organized in-app.",
  },
  {
    icon: "🛡️",
    title: "Accountability",
    text: "You get coaching support that helps you stay consistent.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#020713] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(0,132,255,0.22),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(56,189,248,0.12),transparent_28%),linear-gradient(180deg,#020713_0%,#06111f_48%,#020713_100%)]" />

      <header className="relative z-20 border-b border-white/5 bg-[#020713]/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-4 sm:px-8 md:flex-row md:justify-between md:gap-6 md:py-6">
          <Link
            href="/"
            className="flex min-w-0 items-center justify-center gap-3 text-center md:justify-start"
          >
            <img
              src="/sound-fitness-logo.png"
              alt="Sound Fitness"
              className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14"
            />

            <div className="min-w-0 leading-[0.9]">
              <div className="bg-gradient-to-r from-white via-slate-200 to-white bg-clip-text text-2xl font-black uppercase tracking-[0.07em] text-transparent sm:text-4xl">
                SOUND
              </div>

              <div className="relative mt-[-2px] text-[10px] font-black uppercase tracking-[0.34em] text-sky-400 sm:text-xs sm:tracking-[0.42em]">
                FITNESS
                <div className="absolute left-1/2 top-full mt-1 h-[2px] w-[85%] -translate-x-1/2 bg-gradient-to-r from-transparent via-sky-400 to-transparent opacity-60" />
              </div>
            </div>
          </Link>

          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center sm:justify-center sm:gap-3">
            <UserMenu />
          </div>
        </div>
      </header>

      <section className="relative mx-auto grid max-w-7xl gap-10 px-5 pb-12 pt-6 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:pb-20">
        <div className="absolute left-[22%] top-0 hidden h-[580px] w-[420px] rounded-full bg-sky-500/10 blur-3xl lg:block" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white">
            <span className="h-2 w-2 rounded-full bg-sky-400" />
            In-Home Training & Assisted Stretch
          </div>

          <h1 className="mt-7 max-w-3xl text-5xl font-black uppercase leading-[0.9] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Stronger
            <br />
            at home.
            <br />
            <span className="text-sky-500">Better for life.</span>
          </h1>
          <p
            className="mt-3 text-sm italic font-medium text-slate-400"
            style={{ fontFamily: "'Playfair Display', cursive" }}
          >
            Serving Seattle & the Eastside
          </p>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Premium in-home coaching that builds strength, improves mobility,
            and fits your real life. We come to you. You show up. We handle the
            structure.
          </p>

          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {[
              ["🏠", "We come to you", "No gym. No hassle. Just results."],
              [
                "👥",
                "Expert coaching",
                "Personalized for your goals and level.",
              ],
              [
                "💬",
                "Confirmed personally",
                "We text or call to confirm your session.",
              ],
            ].map(([icon, title, text]) => (
              <div key={title}>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-400/30 bg-sky-500/10 text-2xl text-sky-300">
                  {icon}
                </div>
                <h3 className="text-xs font-black uppercase tracking-[0.14em] text-white">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="#booking"
              className="rounded-xl bg-sky-500 px-8 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_0_35px_rgba(14,165,233,0.35)] transition hover:bg-sky-400"
            >
              Request Your Session →
            </a>

            <a
              href="#services"
              className="rounded-xl border border-white/15 bg-white/[0.03] px-8 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-white transition hover:border-sky-400/50 hover:bg-sky-500/10"
            >
              View Services
            </a>
          </div>

          <div className="mt-7 flex items-center gap-4">
            <div className="flex -space-x-3">
              {["J", "K", "C", "M"].map((letter) => (
                <div
                  key={letter}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-950 bg-slate-800 text-xs font-black text-sky-300"
                >
                  {letter}
                </div>
              ))}
            </div>
            <div>
              <div className="text-sm text-yellow-300">★★★★★</div>
              <div className="text-xs text-slate-400">
                Trusted by members across Seattle & the Eastside
              </div>
            </div>
          </div>
        </div>

        <section
          id="booking"
          className="relative rounded-[28px] border border-sky-400/50 bg-slate-950/65 p-6 shadow-[0_0_70px_rgba(14,165,233,0.18)] backdrop-blur lg:p-8"
        >
          <div className="absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_35%)]" />

          <div className="relative">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-400">
              Request Your Free Intro
            </div>

            <h2 className="mt-4 text-3xl font-black tracking-tight">
              Tell us a little about you.
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              We’ll reach out personally to confirm the best starting point.
            </p>

            <form className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Full Name"
                  className="rounded-xl border border-white/15 bg-[#050b16] px-4 py-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400"
                />

                <input
                  type="tel"
                  placeholder="Phone Number"
                  className="rounded-xl border border-white/15 bg-[#050b16] px-4 py-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400"
                />
              </div>

              <select className="w-full rounded-xl border border-white/15 bg-[#050b16] px-4 py-4 text-sm text-slate-300 outline-none focus:border-sky-400">
                <option>Select Service</option>
                {services.map((service) => (
                  <option key={service}>{service}</option>
                ))}
              </select>

              <input
                type="text"
                placeholder="City / Neighborhood"
                className="w-full rounded-xl border border-white/15 bg-[#050b16] px-4 py-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400"
              />

              <textarea
                rows={5}
                placeholder="Goals, injuries, schedule, or anything helpful..."
                className="w-full rounded-xl border border-white/15 bg-[#050b16] px-4 py-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400"
              />

              <Link
                href="/onboarding"
                className="block rounded-xl bg-sky-500 px-6 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_0_35px_rgba(14,165,233,0.35)] transition hover:bg-sky-400"
              >
                Submit Request
              </Link>

              <p className="flex items-center justify-center gap-2 pt-3 text-center text-xs text-slate-400">
                <span className="text-sky-400">🛡</span>
                We’ll personally confirm by call or text.
              </p>
            </form>
          </div>
        </section>
      </section>

      <section id="services" className="mx-auto max-w-7xl px-5 pb-12 sm:px-8">
        <div className="text-center">
          <div className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-400">
            What We Offer
          </div>
          <h2 className="mt-4 text-3xl font-black uppercase tracking-tight sm:text-4xl">
            Services that create real change
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Everything we do is focused on helping you move better, get
            stronger, recover faster, and stay consistent.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
          {serviceCards.map((service) => (
            <article
              key={service.title}
              className="group relative overflow-hidden rounded-[24px] border border-sky-400/20 bg-[#020713] shadow-2xl shadow-black/25 transition duration-300 hover:-translate-y-1 hover:border-sky-400/60 hover:bg-[#041222]"
            >
              <div className="relative h-36 overflow-hidden rounded-t-[23px] bg-slate-950">
                <img
                  src={service.image}
                  alt=""
                  className="block h-full w-full object-cover opacity-70 transition duration-500 will-change-transform group-hover:scale-[1.08] group-hover:opacity-90"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#020713] via-[#020713]/35 to-transparent" />
              </div>

              <div className="relative bg-[#020713] px-5 pb-5 pt-12 transition duration-300 group-hover:bg-[#041222]">
                <div className="absolute -top-9 left-5 z-20 flex h-14 w-14 -translate-y-1 items-center justify-center rounded-2xl border border-sky-400/45 bg-[#020713] text-2xl shadow-[0_0_30px_rgba(14,165,233,0.28)] transition duration-300 group-hover:-translate-y-2 group-hover:border-sky-300/70 group-hover:bg-[#041222]">
                  <span className="relative -top-0.5">{service.icon}</span>
                </div>

                <h3 className="text-xl font-black uppercase leading-[1] text-white">
                  {service.title}
                </h3>

                <p className="mt-4 min-h-[72px] text-sm leading-6 text-slate-400">
                  {service.text}
                </p>

                <div className="mt-5 text-xl text-sky-400 transition duration-300 group-hover:translate-x-1">
                  →
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-12 sm:px-8">
        <div className="rounded-[28px] border border-sky-400/25 bg-white/[0.04] p-6 shadow-2xl shadow-black/25 backdrop-blur lg:p-8">
          <div className="text-center">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-400">
              Why It Works
            </div>
            <h2 className="mt-4 text-3xl font-black uppercase tracking-tight">
              Less friction. More consistency.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Coaching at home removes barriers so you can stay consistent and
              actually see progress.
            </p>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {proofItems.map((item) => (
              <div key={item.title} className="flex gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-sky-400/30 bg-sky-500/10 text-2xl">
                  {item.icon}
                </div>

                <div>
                  <h3 className="text-sm font-black text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-white/10 px-5 py-8 text-xs text-slate-500 sm:px-8 md:flex-row">
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
