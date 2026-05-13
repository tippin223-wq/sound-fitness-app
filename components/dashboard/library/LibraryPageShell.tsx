"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import TrainingJourneyNavigator from "@/components/dashboard/TrainingJourneyNavigator";
import { ROUTES } from "@/lib/routes";

export type LibraryItem = {
  id: string;
  title: string;
  category: string;
  description: string;
  accent?: string;
  image?: string;
  stats: Array<{ label: string; value: string }>;
  tags: string[];
  details: string[];
  recommendation?: string;
};

export type LibraryPageShellProps = {
  actionLabel: string;
  categories: string[];
  heroEyebrow: string;
  heroMetrics: Array<{ label: string; value: string; helper: string }>;
  items: LibraryItem[];
  libraryId: "nutrition" | "recovery" | "performance" | "mobility";
  planStorageKey: string;
  storageKey: string;
  subtitle: string;
  title: string;
};

const librarySwitcher = [
  { emoji: "🏋", label: "Exercise", href: ROUTES.dashboard.exerciseLibrary },
  { emoji: "🥗", label: "Nutrition", href: ROUTES.nutrition.home },
  { emoji: "🩹", label: "Recovery", href: ROUTES.dashboard.recovery },
  { emoji: "⚡", label: "Performance", href: ROUTES.dashboard.performance },
  { emoji: "🧘", label: "Mobility", href: ROUTES.dashboard.mobility },
] as const;

const safeJsonParse = (value: string | null): unknown => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const readLocal = (key: string) =>
  typeof window === "undefined"
    ? null
    : safeJsonParse(window.localStorage.getItem(key));

const writeLocal = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const readStringArray = (key: string) => {
  const value = readLocal(key);
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
};

const readLibraryState = (key: string) => {
  const state = asRecord(readLocal(key));
  const favorites = Array.isArray(state.favorites)
    ? state.favorites.filter((item): item is string => typeof item === "string")
    : [];
  const recent = Array.isArray(state.recent)
    ? state.recent.filter((item): item is string => typeof item === "string")
    : [];

  return { favorites, recent };
};

export default function LibraryPageShell({
  actionLabel,
  categories,
  heroEyebrow,
  heroMetrics,
  items,
  libraryId,
  planStorageKey,
  storageKey,
  subtitle,
  title,
}: LibraryPageShellProps) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const namespaced = readLibraryState(storageKey);
    const globalFavorites = readStringArray("soundFitnessFavorites")
      .filter((key) => key.startsWith(`${libraryId}:`))
      .map((key) => key.replace(`${libraryId}:`, ""));

    setFavorites(Array.from(new Set([...namespaced.favorites, ...globalFavorites])));
    setRecent(namespaced.recent);
  }, [libraryId, storageKey]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return items.filter((item) => {
      const matchesCategory =
        activeCategory === "All" || item.category === activeCategory;
      const haystack = [
        item.title,
        item.category,
        item.description,
        ...item.tags,
        ...item.details,
        ...item.stats.map((stat) => `${stat.label} ${stat.value}`),
      ]
        .join(" ")
        .toLowerCase();

      return matchesCategory && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [activeCategory, items, query]);

  const recommendedItems = useMemo(
    () => filteredItems.filter((item) => item.recommendation).slice(0, 3),
    [filteredItems],
  );

  const persistLibraryState = (nextFavorites: string[], nextRecent: string[]) => {
    writeLocal(storageKey, {
      favorites: nextFavorites,
      recent: nextRecent.slice(0, 8),
      updatedAt: new Date().toISOString(),
    });
  };

  const toggleFavorite = (itemId: string) => {
    const nextFavorites = favorites.includes(itemId)
      ? favorites.filter((id) => id !== itemId)
      : [...favorites, itemId];
    const globalFavorites = readStringArray("soundFitnessFavorites");
    const scopedKey = `${libraryId}:${itemId}`;
    const nextGlobal = nextFavorites.includes(itemId)
      ? Array.from(new Set([...globalFavorites, scopedKey]))
      : globalFavorites.filter((item) => item !== scopedKey);

    setFavorites(nextFavorites);
    writeLocal("soundFitnessFavorites", nextGlobal);
    persistLibraryState(nextFavorites, recent);
  };

  const addItem = (item: LibraryItem) => {
    const currentPlan = readLocal(planStorageKey);
    const planItems = Array.isArray(currentPlan)
      ? currentPlan
      : Array.isArray(asRecord(currentPlan).items)
        ? (asRecord(currentPlan).items as unknown[])
        : [];
    const nextPlan = [
      {
        ...item,
        addedAt: new Date().toISOString(),
        sourceLibrary: libraryId,
      },
      ...planItems.filter((entry) => asRecord(entry).id !== item.id),
    ].slice(0, 30);
    const nextRecent = [item.id, ...recent.filter((id) => id !== item.id)];

    writeLocal(planStorageKey, nextPlan);
    setRecent(nextRecent);
    persistLibraryState(favorites, nextRecent);
    setMessage(`${item.title} added to draft.`);
  };

  const recentItems = recent
    .map((itemId) => items.find((item) => item.id === itemId))
    .filter((item): item is LibraryItem => Boolean(item));

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_88%_8%,rgba(251,191,36,0.14),transparent_32%),linear-gradient(180deg,#020617_0%,#0f172a_48%,#020617_100%)] text-white">
      <section className="mx-auto w-full max-w-[1440px] space-y-5 px-3 py-5 sm:px-5 lg:px-8">
        <TrainingJourneyNavigator currentStep="library" variant="full" />

        <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.2),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.94),rgba(2,6,23,0.98))] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.62)] sm:p-6 lg:p-8">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:items-stretch">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-200">
                {heroEyebrow}
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                {title}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
                {subtitle}
              </p>
              <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
                {librarySwitcher.map((item) => {
                  const active =
                    (libraryId === "nutrition" && item.label === "Nutrition") ||
                    (libraryId === "recovery" && item.label === "Recovery") ||
                    (libraryId === "performance" && item.label === "Performance") ||
                    (libraryId === "mobility" && item.label === "Mobility");

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`shrink-0 rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-[0.12em] transition ${
                        active
                          ? "border-cyan-300/40 bg-cyan-300/12 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.16)]"
                          : "border-white/10 bg-white/[0.045] text-slate-300 hover:border-cyan-300/30 hover:text-white"
                      }`}
                    >
                      {item.emoji} {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {heroMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border border-white/10 bg-slate-950/55 p-4"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-2xl font-black text-white">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{metric.helper}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-slate-950/58 p-4 shadow-2xl backdrop-blur-xl">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
                Search Library
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search category, goal fit, target area, ingredients, equipment..."
                className="mt-2 min-h-[48px] w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300"
              />
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 lg:max-w-[520px]">
              {["All", ...categories].map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`min-h-[44px] shrink-0 rounded-2xl border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${
                    activeCategory === category
                      ? "border-amber-300/35 bg-amber-300/12 text-amber-100"
                      : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-cyan-300/30 hover:text-white"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_0.38fr]">
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => {
                const favorite = favorites.includes(item.id);
                return (
                  <article
                    key={item.id}
                    className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/62 p-5 shadow-2xl transition hover:border-cyan-300/30 hover:bg-slate-950/76"
                  >
                    {item.image ? (
                      <>
                        <img
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover opacity-20"
                          src={item.image}
                        />
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-slate-950/78 to-slate-950/96" />
                      </>
                    ) : null}
                    <div className="relative z-10">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
                            {item.category}
                          </p>
                          <h2 className="mt-2 text-xl font-black text-white">
                            {item.title}
                          </h2>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleFavorite(item.id)}
                          className={`h-10 w-10 shrink-0 rounded-2xl border text-lg transition ${
                            favorite
                              ? "border-amber-300/35 bg-amber-300/15 text-amber-200"
                              : "border-white/10 bg-white/[0.04] text-slate-400 hover:text-amber-200"
                          }`}
                          aria-label={favorite ? "Remove favorite" : "Add favorite"}
                        >
                          ★
                        </button>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-300">
                        {item.description}
                      </p>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {item.stats.map((stat) => (
                          <div
                            key={`${item.id}-${stat.label}`}
                            className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"
                          >
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                              {stat.label}
                            </p>
                            <p className="mt-1 text-sm font-black text-white">
                              {stat.value}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.tags.slice(0, 4).map((tag) => (
                          <span
                            key={`${item.id}-${tag}`}
                            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-bold text-slate-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <ul className="mt-4 space-y-2 text-sm leading-5 text-slate-400">
                        {item.details.slice(0, 3).map((detail) => (
                          <li key={`${item.id}-${detail}`}>• {detail}</li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={() => addItem(item)}
                        className="mt-5 min-h-[44px] w-full rounded-2xl bg-cyan-300 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-cyan-200"
                      >
                        {actionLabel}
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-[28px] border border-dashed border-white/15 bg-white/[0.025] p-6 md:col-span-2">
                <p className="font-black text-white">No matching items yet</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Clear the search or choose another category to keep browsing.
                </p>
              </div>
            )}
          </div>

          <aside className="space-y-5">
            <section className="rounded-[28px] border border-white/10 bg-slate-950/62 p-5 shadow-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
                Library Insights
              </p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm font-black text-white">
                    {filteredItems.length} matching items
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {activeCategory === "All" ? "All categories" : activeCategory}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm font-black text-white">
                    {favorites.length} favorites
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Saved locally for this library.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm font-black text-white">
                    {recent.length} recent actions
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Recent adds keep your plan flow visible.
                  </p>
                </div>
              </div>
              {message ? (
                <p className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-100">
                  {message}
                </p>
              ) : null}
            </section>

            <section className="rounded-[28px] border border-amber-300/18 bg-amber-300/10 p-5 shadow-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-100">
                Recommended
              </p>
              <div className="mt-4 space-y-3">
                {(recommendedItems.length ? recommendedItems : filteredItems.slice(0, 3)).map(
                  (item) => (
                    <button
                      key={`recommended-${item.id}`}
                      type="button"
                      onClick={() => addItem(item)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/45 p-3 text-left transition hover:border-amber-200/35"
                    >
                      <p className="font-black text-white">{item.title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        {item.recommendation || item.description}
                      </p>
                    </button>
                  ),
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-slate-950/62 p-5 shadow-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                Recent Items
              </p>
              <div className="mt-4 space-y-2">
                {recentItems.length > 0 ? (
                  recentItems.map((item) => (
                    <div
                      key={`recent-${item.id}`}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
                    >
                      <p className="text-sm font-bold text-white">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.category}</p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-white/15 bg-white/[0.025] p-4 text-sm leading-6 text-slate-500">
                    Add an item to start a recent trail.
                  </p>
                )}
              </div>
            </section>
          </aside>
        </section>
      </section>
    </main>
  );
}
