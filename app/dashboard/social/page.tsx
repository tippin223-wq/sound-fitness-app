import { ROUTES } from "@/lib/routes";

const communityPosts = [
  {
    id: "1",
    name: "Kristina",
    initials: "K",
    tag: "Client Win",
    title: "12-session consistency streak",
    body: "Showing up every Saturday, building confidence, and getting stronger without chasing max weight.",
    stat: "12/12",
    reactions: "18 cheers",
    image:
      "https://images.unsplash.com/photo-1599058917765-a780eda07a3e?q=80&w=1200",
    points: "+10 Momentum",
    replies: [
      { user: "Coach Joey", text: "Huge consistency. Keep stacking wins 💪" },
      { user: "Claude", text: "That’s awesome. I’m trying to hit 8!" },
    ],
  },
  {
    id: "2",
    name: "Claude",
    initials: "C",
    tag: "Strength Progress",
    title: "Better control, better reps",
    body: "Lower-body strength is moving up because tempo, bracing, and clean range of motion are improving.",
    stat: "+5 lb",
    reactions: "11 cheers",
    image:
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200",
    points: "+10 Momentum",
    replies: [
      { user: "Coach Joey", text: "That tempo work is paying off." },
      { user: "Kristina", text: "Clean reps are hard but worth it!" },
    ],
  },
  {
    id: "3",
    name: "Sound Fitness",
    initials: "SF",
    tag: "Coach Challenge",
    title: "Make every rep count",
    body: "This week’s challenge: pick one lift and slow the lowering phase to 3 seconds.",
    stat: "Challenge",
    reactions: "Coach pick",
    image:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1200",
    points: "+15 Momentum",
    replies: [
      { user: "Coach Joey", text: "Post your win after you try it." },
      { user: "Client Group", text: "Challenge accepted 🔥" },
    ],
  },
];

const workoutStats = [
  { label: "Streak", value: "6 days", sub: "Keep it alive" },
  { label: "This Week", value: "3/4", sub: "One left" },
  { label: "Last Workout", value: "Lower Body", sub: "35 min" },
  { label: "Completion", value: "92%", sub: "Strong effort" },
  { label: "Top Progress", value: "+5 lb", sub: "Goblet squat" },
  { label: "Recovery", value: "Good", sub: "Ready to train" },
];

const momentum = {
  points: 85,
  nextReward: 100,
  tier: "Building Momentum",
  weeklyEarned: 28,
};

const earningActions = [
  { label: "Post a workout win", points: "+10" },
  { label: "Reply to another client", points: "+3" },
  { label: "Complete a workout", points: "+5" },
  { label: "Hit weekly streak goal", points: "+10" },
  { label: "Try coach challenge", points: "+15" },
];

const rewardsList = [
  { label: "Bonus workout template", cost: "75 pts", status: "Available soon" },
  {
    label: "Free assisted stretch add-on",
    cost: "100 pts",
    status: "Almost there",
  },
  { label: "Session package discount", cost: "150 pts", status: "Locked" },
  { label: "Sound Fitness merch credit", cost: "200 pts", status: "Locked" },
];

const postIdeas = [
  "Something felt easier than last week.",
  "I showed up even though I didn’t feel like it.",
  "My form felt cleaner on one movement.",
  "I finished the workout.",
  "I had less pain, better energy, or more confidence.",
];

const quickActions = [
  { label: "Post a Workout Win (+10)", href: ROUTES.dashboard.socialPost },
  { label: "View Today’s Workout", href: ROUTES.dashboard.home },
  { label: "Open Progress", href: ROUTES.dashboard.progress },
  { label: "Message Coach", href: ROUTES.dashboard.coachMessaging },
];

export default function ClientSocialHubPage() {
  const progressPercent = Math.min(
    100,
    Math.round((momentum.points / momentum.nextReward) * 100),
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.05] shadow-2xl shadow-black/20 backdrop-blur">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.08fr_0.92fr] lg:p-8">
            <div>
              <div className="text-[11px] uppercase tracking-[0.26em] text-sky-300">
                Sound Fitness Social
              </div>

              <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
                Share the win. Earn Momentum.
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                A private client hub for workout wins, coach challenges,
                progress updates, photos, replies, and redeemable Momentum
                Points.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/dashboard/social/post"
                  className="rounded-2xl bg-sky-500 px-5 py-3 text-center text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400"
                >
                  Post a Workout Win (+10)
                </a>

                <a
                  href="/dashboard/progress"
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-center text-sm font-medium text-slate-200 hover:bg-white/10"
                >
                  View My Stats
                </a>
              </div>
            </div>

            <div className="rounded-[30px] border border-yellow-400/20 bg-yellow-500/10 p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-yellow-300">
                Momentum Points
              </div>

              <div className="mt-3 flex items-end justify-between gap-4">
                <div>
                  <div className="text-4xl font-bold text-yellow-300">
                    {momentum.points}
                  </div>
                  <div className="mt-1 text-sm text-slate-300">
                    {momentum.tier}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-right">
                  <div className="text-xs text-slate-400">This week</div>
                  <div className="mt-1 text-xl font-bold text-white">
                    +{momentum.weeklyEarned}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex justify-between text-xs text-slate-400">
                  <span>Next reward</span>
                  <span>
                    {momentum.points}/{momentum.nextReward}
                  </span>
                </div>

                <div className="h-3 w-full rounded-full bg-white/10">
                  <div
                    className="h-3 rounded-full bg-yellow-400"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-300">
                  You’re {momentum.nextReward - momentum.points} points away
                  from your next redeemable reward.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {workoutStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur"
            >
              <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                {stat.label}
              </div>
              <div className="mt-2 text-2xl font-bold text-white">
                {stat.value}
              </div>
              <div className="mt-1 text-xs text-slate-400">{stat.sub}</div>
            </div>
          ))}
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-violet-300">
                  Community Feed
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">
                  Client wins, photos, replies, and challenges
                </h2>
              </div>

              <a
                href="/dashboard/social/post"
                className="rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-sky-400"
              >
                + Share Update
              </a>
            </div>

            <div className="mt-5 rounded-[28px] border border-emerald-400/20 bg-emerald-500/10 p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300">
                Post Prompt
              </div>
              <h3 className="mt-2 text-xl font-bold">
                What’s one thing you improved this week?
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Post a simple win and earn{" "}
                <span className="font-semibold text-yellow-300">
                  +10 Momentum Points
                </span>
                . It can be showing up, better form, less pain, more confidence,
                or finishing a workout.
              </p>
            </div>

            <div className="mt-5 grid gap-5">
              {communityPosts.map((post) => (
                <article
                  key={post.id}
                  className="rounded-[30px] border border-white/10 bg-slate-950/55 p-5 transition hover:border-sky-400/30 hover:bg-sky-500/10"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-bold text-sky-300">
                        {post.initials}
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-white">
                          {post.name}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-sky-300">
                            {post.tag}
                          </span>
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                            {post.stat}
                          </span>
                          <span className="rounded-full border border-yellow-400/20 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-300">
                            {post.points}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-slate-500">
                      {post.reactions}
                    </div>
                  </div>

                  <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03]">
                    <img
                      src={post.image}
                      alt=""
                      className="h-72 w-full object-cover"
                    />
                  </div>

                  <div className="mt-5">
                    <h3 className="text-xl font-bold text-white">
                      {post.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {post.body}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-white/10">
                      👏 Cheer
                    </button>
                    <button className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-white/10">
                      💬 Reply (+3)
                    </button>
                    <button className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-white/10">
                      ⭐ Save
                    </button>
                    <button className="rounded-full border border-sky-400/20 bg-sky-500/10 px-4 py-2 text-xs font-medium text-sky-300 hover:bg-sky-500/15">
                      Share my version (+10)
                    </button>
                  </div>

                  <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.035] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        Replies
                      </div>
                      <div className="text-xs text-yellow-300">
                        Earn +3 for thoughtful replies
                      </div>
                    </div>

                    <div className="space-y-3">
                      {post.replies.map((reply, index) => (
                        <div key={index} className="flex gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-bold text-sky-300">
                            {reply.user.slice(0, 1)}
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3">
                            <div className="text-xs font-semibold text-sky-300">
                              {reply.user}
                            </div>
                            <div className="mt-1 text-sm leading-5 text-slate-300">
                              {reply.text}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <input
                        placeholder="Write a reply..."
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                      />
                      <button className="rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-sky-400">
                        Send
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur xl:sticky xl:top-6">
              <div className="text-[11px] uppercase tracking-[0.22em] text-yellow-300">
                Momentum Rewards
              </div>

              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Earn points. Redeem perks.
              </h2>

              <div className="mt-5 rounded-[24px] border border-yellow-400/20 bg-yellow-500/10 p-5">
                <div className="text-sm text-slate-400">Your Balance</div>
                <div className="mt-2 text-4xl font-bold text-yellow-300">
                  {momentum.points} pts
                </div>
                <div className="mt-1 text-sm text-slate-300">
                  {momentum.tier}
                </div>

                <div className="mt-4 h-3 w-full rounded-full bg-white/10">
                  <div
                    className="h-3 rounded-full bg-yellow-400"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="mt-3 text-xs text-slate-400">
                  {momentum.nextReward - momentum.points} points until your next
                  reward.
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                  Earn Momentum
                </div>

                <div className="space-y-2">
                  {earningActions.map((item) => (
                    <div
                      key={item.label}
                      className="flex justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2 text-sm"
                    >
                      <span className="text-slate-300">{item.label}</span>
                      <span className="font-semibold text-yellow-300">
                        {item.points}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                  Redeem
                </div>

                <div className="space-y-2">
                  {rewardsList.map((reward) => (
                    <div
                      key={reward.label}
                      className="rounded-xl border border-white/10 bg-slate-950/55 px-3 py-3 text-sm"
                    >
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-200">{reward.label}</span>
                        <span className="text-yellow-300">{reward.cost}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {reward.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <a
                href="/dashboard/social/post"
                className="mt-5 block rounded-2xl bg-sky-500 px-4 py-3 text-center text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400"
              >
                Post Win + Earn Points
              </a>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300">
                Recent Workout Snapshot
              </div>

              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Your stats stay visible
              </h2>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {workoutStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-[22px] border border-white/10 bg-slate-950/55 p-4"
                  >
                    <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                      {stat.label}
                    </div>
                    <div className="mt-2 text-xl font-bold text-white">
                      {stat.value}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {stat.sub}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-amber-300">
                Easy Post Ideas
              </div>

              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Don’t overthink it
              </h2>

              <div className="mt-5 space-y-3">
                {postIdeas.map((tip, index) => (
                  <div
                    key={tip}
                    className="rounded-[24px] border border-white/10 bg-slate-950/55 p-4"
                  >
                    <div className="flex gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-slate-950">
                        {index + 1}
                      </div>
                      <p className="text-sm leading-6 text-slate-300">{tip}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">
                Quick Actions
              </div>

              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Keep moving
              </h2>

              <div className="mt-5 grid gap-3">
                {quickActions.map((action) => (
                  <a
                    key={action.label}
                    href={action.href}
                    className="rounded-[22px] border border-white/10 bg-slate-950/55 px-4 py-4 text-sm font-medium text-white hover:border-sky-400/40 hover:bg-sky-500/10"
                  >
                    {action.label}
                  </a>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
