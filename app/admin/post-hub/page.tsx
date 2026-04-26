"use client";

import { useEffect, useMemo, useState } from "react";

type Platform =
  | "Instagram"
  | "Facebook"
  | "Nextdoor"
  | "YouTube"
  | "TikTok"
  | "LinkedIn"
  | "Email"
  | "Blog";

type ContentStatus =
  | "Idea"
  | "Draft"
  | "Ready"
  | "Scheduled"
  | "Posted"
  | "Repurpose";

type PostItem = {
  id: string;
  title: string;
  pillar: string;
  status: ContentStatus;
  platforms: Platform[];
  hook: string;
  caption: string;
  cta: string;
  format: string;
  audience: string;
  notes: string;
  date: string;
};

const defaultPosts: PostItem[] = [
  {
    id: "1",
    title: "Pain-Free Strength at Home",
    pillar: "In-Home Training",
    status: "Ready",
    platforms: ["Instagram", "Facebook", "Nextdoor", "Email"],
    hook: "You do not need a gym to get stronger.",
    caption:
      "Sound Fitness brings strength training and assisted stretching directly to your home so you can build muscle, move better, and stay consistent without gym stress.",
    cta: "Book a free intro session.",
    format: "Short video + carousel",
    audience: "Busy adults / beginners",
    notes: "Use home workout B-roll and simple coaching voiceover.",
    date: "2026-04-25",
  },
  {
    id: "2",
    title: "Post-Rehab Strength Continuation",
    pillar: "Continuation Program",
    status: "Draft",
    platforms: ["Blog", "Email", "LinkedIn"],
    hook: "Physical therapy ends, but strength still needs a plan.",
    caption:
      "The Sound Fitness Continuation Program helps bridge the gap between rehab and independent strength training with in-home coaching.",
    cta: "Ask if the continuation program is a fit.",
    format: "Blog + email",
    audience: "Adults post-rehab / 55+",
    notes: "Keep language careful. Not medical treatment.",
    date: "2026-04-26",
  },
];

const platforms: Platform[] = [
  "Instagram",
  "Facebook",
  "Nextdoor",
  "YouTube",
  "TikTok",
  "LinkedIn",
  "Email",
  "Blog",
];

const statuses: ContentStatus[] = [
  "Idea",
  "Draft",
  "Ready",
  "Scheduled",
  "Posted",
  "Repurpose",
];

const pillars = [
  "In-Home Training",
  "Assisted Stretch",
  "Online Training",
  "Continuation Program",
  "Strength Education",
  "Mobility",
  "Nutrition",
  "Client Proof",
  "Local Seattle/Eastside",
  "Behind the Scenes",
];

const defaultDraft: PostItem = {
  id: "",
  title: "",
  pillar: "In-Home Training",
  status: "Idea",
  platforms: ["Instagram"],
  hook: "",
  caption: "",
  cta: "",
  format: "Short video",
  audience: "",
  notes: "",
  date: "",
};

export default function AdminPostHubPage() {
  const [posts, setPosts] = useState<PostItem[]>(defaultPosts);
  const [draft, setDraft] = useState<PostItem>(defaultDraft);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<"All" | Platform>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | ContentStatus>(
    "All",
  );
  const [selectedPost, setSelectedPost] = useState<PostItem | null>(
    defaultPosts[0],
  );

  useEffect(() => {
    const saved = localStorage.getItem("sound-admin-post-hub");

    if (saved) {
      const data = JSON.parse(saved);
      setPosts(data.posts || defaultPosts);
      setSelectedPost(data.posts?.[0] || defaultPosts[0]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("sound-admin-post-hub", JSON.stringify({ posts }));
  }, [posts]);

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      `${post.title} ${post.pillar} ${post.hook} ${post.caption} ${post.notes}`
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchesPlatform =
      platformFilter === "All" || post.platforms.includes(platformFilter);

    const matchesStatus =
      statusFilter === "All" || post.status === statusFilter;

    return matchesSearch && matchesPlatform && matchesStatus;
  });

  const stats = useMemo(() => {
    return [
      {
        label: "Total Ideas",
        value: posts.length,
        sub: "All saved content",
      },
      {
        label: "Ready",
        value: posts.filter((p) => p.status === "Ready").length,
        sub: "Can post soon",
      },
      {
        label: "Scheduled",
        value: posts.filter((p) => p.status === "Scheduled").length,
        sub: "Already planned",
      },
      {
        label: "Repurpose",
        value: posts.filter((p) => p.status === "Repurpose").length,
        sub: "Turn into more formats",
      },
    ];
  }, [posts]);

  const aiPrompt = useMemo(() => {
    if (!selectedPost) return "";

    return `You are helping Joey Bell create content for Sound Fitness.

CONTENT IDEA:
Title: ${selectedPost.title}
Pillar: ${selectedPost.pillar}
Audience: ${selectedPost.audience}
Platforms: ${selectedPost.platforms.join(", ")}
Format: ${selectedPost.format}

HOOK:
${selectedPost.hook}

CAPTION / CORE MESSAGE:
${selectedPost.caption}

CTA:
${selectedPost.cta}

NOTES:
${selectedPost.notes}

TASK:
Turn this into platform-specific content:
1. Instagram caption
2. Facebook post
3. Nextdoor post
4. Short video script
5. Email version
6. Blog outline
Keep the tone premium, clear, local, trustworthy, and conversion-focused.`;
  }, [selectedPost]);

  function togglePlatform(platform: Platform) {
    setDraft((prev) => {
      const exists = prev.platforms.includes(platform);
      return {
        ...prev,
        platforms: exists
          ? prev.platforms.filter((p) => p !== platform)
          : [...prev.platforms, platform],
      };
    });
  }

  function savePost() {
    if (!draft.title.trim()) return;

    if (draft.id) {
      setPosts((prev) =>
        prev.map((item) => (item.id === draft.id ? draft : item)),
      );
      setSelectedPost(draft);
    } else {
      const newPost = { ...draft, id: crypto.randomUUID() };
      setPosts((prev) => [newPost, ...prev]);
      setSelectedPost(newPost);
    }

    setDraft(defaultDraft);
  }

  function editPost(post: PostItem) {
    setDraft(post);
    setSelectedPost(post);
  }

  function deletePost(id: string) {
    setPosts((prev) => prev.filter((post) => post.id !== id));
    if (selectedPost?.id === id) setSelectedPost(null);
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_32%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.05] shadow-2xl shadow-black/20 backdrop-blur">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
            <div>
              <div className="text-[11px] uppercase tracking-[0.26em] text-sky-300">
                Admin / Post Hub
              </div>

              <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
                Content Command Center
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                Curate ideas, captions, hooks, scripts, blog topics, emails, and
                repurposed content for every Sound Fitness platform from one
                admin page.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/admin/social-portal"
                  className="rounded-2xl bg-sky-500 px-5 py-3 text-center text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400"
                >
                  Open Social Portal
                </a>

                <a
                  href="/admin/ai-prompt"
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-center text-sm font-medium text-slate-200 hover:bg-white/10"
                >
                  Open AI Prompt Center
                </a>

                <button
                  onClick={() => copyText(aiPrompt)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 hover:bg-white/10"
                >
                  Copy AI Content Prompt
                </button>
              </div>
            </div>

            <div className="rounded-[30px] border border-sky-400/20 bg-sky-500/10 p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-sky-300">
                Content System Goal
              </div>

              <h2 className="mt-3 text-2xl font-bold">
                One idea becomes ten assets
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-300">
                Start with a single training idea, then turn it into a short
                video, carousel, blog, email, Nextdoor post, and follow-up CTA.
              </p>

              <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">
                Best workflow: Idea → Hook → Core Message → Platform Versions →
                Schedule → Repurpose.
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <div
              key={item.label}
              className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur"
            >
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                {item.label}
              </div>
              <div className="mt-3 text-3xl font-bold tracking-tight">
                {item.value}
              </div>
              <div className="mt-2 text-sm text-slate-400">{item.sub}</div>
            </div>
          ))}
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <div className="space-y-6">
            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-violet-300">
                    Content Library
                  </div>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight">
                    Saved post ideas
                  </h2>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                  />

                  <select
                    value={platformFilter}
                    onChange={(e) =>
                      setPlatformFilter(e.target.value as "All" | Platform)
                    }
                    className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none focus:border-sky-400/50"
                  >
                    <option>All</option>
                    {platforms.map((platform) => (
                      <option key={platform}>{platform}</option>
                    ))}
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(e.target.value as "All" | ContentStatus)
                    }
                    className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none focus:border-sky-400/50"
                  >
                    <option>All</option>
                    {statuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                {filteredPosts.map((post) => (
                  <div
                    key={post.id}
                    className={`rounded-[26px] border p-5 ${
                      selectedPost?.id === post.id
                        ? "border-sky-400/40 bg-sky-500/10"
                        : "border-white/10 bg-slate-950/55"
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-white">
                            {post.title}
                          </h3>
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-sky-300">
                            {post.pillar}
                          </span>
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                            {post.status}
                          </span>
                        </div>

                        <p className="mt-3 text-sm font-semibold text-white">
                          {post.hook}
                        </p>

                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {post.caption}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {post.platforms.map((platform) => (
                            <span
                              key={platform}
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
                            >
                              {platform}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          onClick={() => setSelectedPost(post)}
                          className="rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
                        >
                          Select
                        </button>
                        <button
                          onClick={() => editPost(post)}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deletePost(post.id)}
                          className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm text-red-300 hover:bg-red-500/15"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-amber-300">
                Platform Matrix
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Repurpose map
              </h2>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {platforms.map((platform) => {
                  const count = posts.filter((p) =>
                    p.platforms.includes(platform),
                  ).length;

                  return (
                    <div
                      key={platform}
                      className="rounded-[24px] border border-white/10 bg-slate-950/55 p-4"
                    >
                      <div className="text-sm font-semibold text-white">
                        {platform}
                      </div>
                      <div className="mt-2 text-2xl font-bold text-sky-300">
                        {count}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        mapped ideas
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300">
                Create / Edit
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Content asset builder
              </h2>

              <div className="mt-5 space-y-3">
                <input
                  value={draft.title}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Title"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    value={draft.pillar}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, pillar: e.target.value }))
                    }
                    className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none focus:border-sky-400/50"
                  >
                    {pillars.map((pillar) => (
                      <option key={pillar}>{pillar}</option>
                    ))}
                  </select>

                  <select
                    value={draft.status}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        status: e.target.value as ContentStatus,
                      }))
                    }
                    className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none focus:border-sky-400/50"
                  >
                    {statuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <input
                  value={draft.hook}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, hook: e.target.value }))
                  }
                  placeholder="Hook"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                />

                <textarea
                  value={draft.caption}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, caption: e.target.value }))
                  }
                  rows={5}
                  placeholder="Caption / core message"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                />

                <input
                  value={draft.cta}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, cta: e.target.value }))
                  }
                  placeholder="CTA"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={draft.format}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, format: e.target.value }))
                    }
                    placeholder="Format"
                    className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                  />

                  <input
                    value={draft.audience}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        audience: e.target.value,
                      }))
                    }
                    placeholder="Audience"
                    className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                  />
                </div>

                <input
                  type="date"
                  value={draft.date}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, date: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none focus:border-sky-400/50"
                />

                <div>
                  <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                    Platforms
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {platforms.map((platform) => (
                      <button
                        key={platform}
                        onClick={() => togglePlatform(platform)}
                        className={`rounded-full border px-3 py-2 text-xs font-medium ${
                          draft.platforms.includes(platform)
                            ? "border-sky-400/40 bg-sky-500/10 text-sky-300"
                            : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        {platform}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  value={draft.notes}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  rows={4}
                  placeholder="Production notes, shot list, reminders..."
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={savePost}
                    className="rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400"
                  >
                    {draft.id ? "Save Changes" : "Add Content"}
                  </button>

                  <button
                    onClick={() => setDraft(defaultDraft)}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:bg-white/10"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">
                AI Repurpose Prompt
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Selected content handoff
              </h2>

              <textarea
                value={aiPrompt}
                readOnly
                rows={14}
                className="mt-5 w-full rounded-[24px] border border-white/10 bg-slate-950/70 p-4 text-sm leading-6 text-slate-300 outline-none"
              />

              <button
                onClick={() => copyText(aiPrompt)}
                className="mt-4 w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400"
              >
                Copy Repurpose Prompt
              </button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
