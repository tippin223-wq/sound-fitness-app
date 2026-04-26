import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="border-b border-blue-500/20 bg-black">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <img
              src="/sound-logo.png"
              alt="Sound Fitness"
              className="h-16 w-16 object-contain"
            />
            <div>
              <div className="text-3xl font-black tracking-wide text-white">
                SOUND FITNESS
              </div>
              <div className="text-sm font-medium uppercase tracking-[0.18em] text-blue-400">
                In-Home Training & Assisted Stretch
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-8 text-sm font-semibold uppercase tracking-[0.14em] text-white/80 md:flex">
            <a href="#" className="transition hover:text-blue-400">
              About
            </a>
            <a href="#" className="transition hover:text-blue-400">
              Training
            </a>
            <a href="#" className="transition hover:text-blue-400">
              Results
            </a>
            <a href="#" className="transition hover:text-blue-400">
              Contact
            </a>
          </div>

          <Link
            href="/dashboard"
            className="rounded-2xl border border-blue-500/50 px-5 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-blue-500/10"
          >
            Returning Client? <span className="text-blue-400">Sign In</span>
          </Link>
        </div>
      </section>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_30%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.10),transparent_24%)]" />
        <div className="mx-auto grid max-w-7xl gap-0 px-6 py-10 lg:grid-cols-2">
          <div className="border-r border-blue-500/20 pr-0 lg:pr-10">
            <div className="max-w-3xl">
              <h1 className="text-6xl font-black uppercase leading-[0.95] tracking-tight md:text-7xl">
                <span className="text-white">Book Your</span>
                <br />
                <span className="text-blue-500">Session</span>
              </h1>

              <p className="mt-6 max-w-xl text-2xl leading-relaxed text-white/85">
                Request your session below and we’ll personally confirm the best
                time for you.
              </p>

              <div className="mt-8 flex flex-wrap gap-8 text-xl font-semibold uppercase tracking-wide">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-blue-500/60 text-2xl">
                    🏠
                  </div>
                  <span className="text-white">In-Home Training</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-blue-500/60 text-2xl">
                    👤
                  </div>
                  <span className="text-white">Beginner Friendly</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-blue-500/60 text-2xl">
                    💬
                  </div>
                  <span className="text-white">We Confirm By Call Or Text</span>
                </div>
              </div>

              <div className="mt-10 rounded-[30px] border border-blue-500/35 bg-[#05070b] p-8 shadow-[0_0_0_1px_rgba(59,130,246,0.08)]">
                <div className="mb-6 text-3xl font-black uppercase tracking-wide text-blue-500">
                  Request a Session
                </div>

                <form className="space-y-6">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-bold uppercase tracking-[0.12em] text-white/90">
                        Full Name
                      </label>
                      <input
                        type="text"
                        placeholder="Your full name"
                        className="w-full rounded-xl border border-white/15 bg-black px-4 py-4 text-lg text-white outline-none transition placeholder:text-white/30 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold uppercase tracking-[0.12em] text-white/90">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        placeholder="(555) 123-4567"
                        className="w-full rounded-xl border border-white/15 bg-black px-4 py-4 text-lg text-white outline-none transition placeholder:text-white/30 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold uppercase tracking-[0.12em] text-white/90">
                      Select Service
                    </label>
                    <select className="w-full rounded-xl border border-white/15 bg-black px-4 py-4 text-lg text-white outline-none transition focus:border-blue-500">
                      <option>Free Intro Session (In-Home)</option>
                      <option>In-Home Strength Training</option>
                      <option>Assisted Stretch Session</option>
                      <option>Mobility / Recovery Session</option>
                    </select>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-bold uppercase tracking-[0.12em] text-white/90">
                        Preferred Date
                      </label>
                      <input
                        type="date"
                        className="w-full rounded-xl border border-white/15 bg-black px-4 py-4 text-lg text-white outline-none transition focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold uppercase tracking-[0.12em] text-white/90">
                        Preferred Time
                      </label>
                      <select className="w-full rounded-xl border border-white/15 bg-black px-4 py-4 text-lg text-white outline-none transition focus:border-blue-500">
                        <option>Select time</option>
                        <option>Early Morning</option>
                        <option>Morning</option>
                        <option>Midday</option>
                        <option>Afternoon</option>
                        <option>Evening</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-bold uppercase tracking-[0.12em] text-white/90">
                        Location
                      </label>
                      <input
                        type="text"
                        placeholder="City, State / Neighborhood"
                        className="w-full rounded-xl border border-white/15 bg-black px-4 py-4 text-lg text-white outline-none transition placeholder:text-white/30 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold uppercase tracking-[0.12em] text-white/90">
                        Notes (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Any details we should know?"
                        className="w-full rounded-xl border border-white/15 bg-black px-4 py-4 text-lg text-white outline-none transition placeholder:text-white/30 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-blue-600 px-6 py-5 text-xl font-black uppercase tracking-[0.12em] text-white transition hover:bg-blue-500"
                  >
                    Request Booking
                  </button>

                  <p className="text-center text-sm text-white/55">
                    We respect your privacy. Your info is never shared.
                  </p>
                </form>
              </div>
            </div>
          </div>

          <div className="mt-10 lg:mt-0 lg:pl-10">
            <div className="mb-6 overflow-hidden rounded-[30px] border border-blue-500/30 bg-[#05070b]">
              <div className="flex min-h-[330px] items-center justify-center bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.18),transparent_38%),linear-gradient(180deg,#05070b,#0a0f18)] p-8">
                <img
                  src="/sound-badge.png"
                  alt="Sound Fitness Badge"
                  className="max-h-[300px] w-auto object-contain"
                />
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-[24px] border border-blue-500/30 bg-[#05070b] p-7">
                <h3 className="mb-5 text-3xl font-black uppercase tracking-wide text-blue-500">
                  How It Works
                </h3>

                <div className="space-y-5">
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-500 text-lg font-bold text-blue-400">
                      1
                    </div>
                    <div>
                      <div className="text-xl font-bold text-white">
                        Submit your request
                      </div>
                      <div className="mt-1 text-lg text-white/70">
                        Fill out the form with your preferred time.
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-500 text-lg font-bold text-blue-400">
                      2
                    </div>
                    <div>
                      <div className="text-xl font-bold text-white">
                        We reach out to confirm
                      </div>
                      <div className="mt-1 text-lg text-white/70">
                        We’ll call or text to lock in the best time.
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-500 text-lg font-bold text-blue-400">
                      3
                    </div>
                    <div>
                      <div className="text-xl font-bold text-white">
                        Show up & get results
                      </div>
                      <div className="mt-1 text-lg text-white/70">
                        We meet at your location and get to work.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-blue-500/30 bg-[#05070b] p-7">
                <h3 className="mb-5 text-3xl font-black uppercase tracking-wide text-blue-500">
                  What To Expect
                </h3>

                <ul className="space-y-3 text-lg text-white/80">
                  <li>✓ Free intro session to get started</li>
                  <li>✓ Custom plan built around your goals</li>
                  <li>✓ No gym required — we come to you</li>
                  <li>✓ Real coaching. Real results.</li>
                </ul>
              </div>

              <div className="rounded-[24px] border border-blue-500/30 bg-[#05070b] p-7">
                <h3 className="mb-4 text-3xl font-black uppercase tracking-wide text-blue-500">
                  Already A Client?
                </h3>

                <p className="mb-6 text-lg text-white/75">
                  Manage your existing sessions, reschedule, or update details.
                </p>

                <Link
                  href="/dashboard"
                  className="inline-flex rounded-xl border border-blue-500 px-6 py-4 text-lg font-bold uppercase tracking-[0.1em] text-white transition hover:bg-blue-500/10"
                >
                  Sign In To Your Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-blue-500/20 bg-black">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 md:grid-cols-5">
          <div>
            <div className="text-2xl font-black uppercase text-white">
              No gym. No excuses.
            </div>
            <div className="mt-2 text-lg text-white/65">
              Just results that last.
            </div>
          </div>

          <div>
            <div className="text-3xl font-black text-blue-500">100+</div>
            <div className="text-sm uppercase tracking-[0.12em] text-white/60">
              Clients Helped
            </div>
          </div>

          <div>
            <div className="text-3xl font-black text-blue-500">5+</div>
            <div className="text-sm uppercase tracking-[0.12em] text-white/60">
              Years Experience
            </div>
          </div>

          <div>
            <div className="text-3xl font-black text-blue-500">100%</div>
            <div className="text-sm uppercase tracking-[0.12em] text-white/60">
              Commitment
            </div>
          </div>

          <div>
            <div className="text-3xl font-black text-blue-500">1 Goal</div>
            <div className="text-sm uppercase tracking-[0.12em] text-white/60">
              Your Best Self
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
