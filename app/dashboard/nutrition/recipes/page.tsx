"use client";

import { useState } from "react";

export default function RecipeLibraryPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const recipes = [
    {
      name: "Chicken Rice Bowl",
      category: "Meal Prep",
      protein: "42g",
      time: "25 min",
      tag: "High Protein",
    },
    {
      name: "Greek Yogurt Power Bowl",
      category: "Breakfast",
      protein: "32g",
      time: "5 min",
      tag: "No Cook",
    },
    {
      name: "Turkey Taco Skillet",
      category: "Dinner",
      protein: "45g",
      time: "20 min",
      tag: "Easy",
    },
    {
      name: "Protein Oats",
      category: "Breakfast",
      protein: "35g",
      time: "8 min",
      tag: "Simple",
    },
    {
      name: "Frozen Chicken Strip Wrap",
      category: "Fast Meals",
      protein: "38g",
      time: "10 min",
      tag: "Quick",
    },
    {
      name: "Cottage Cheese Snack Bowl",
      category: "Snacks",
      protein: "28g",
      time: "3 min",
      tag: "Recovery",
    },
  ];

  const categories = [
    "All",
    "Breakfast",
    "Dinner",
    "Meal Prep",
    "Fast Meals",
    "Snacks",
  ];

  const filtered = recipes.filter((recipe) => {
    return (
      (filter === "All" || recipe.category === filter) &&
      recipe.name.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-5 py-8 text-white">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300">
            Recipe Library
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Simple meals that support the plan.
          </h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            Browse high-protein meals, fast options, snacks, and prep-friendly
            recipes that make consistency easier.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["High-Protein Meals", "6"],
            ["Avg Prep Time", "12 min"],
            ["Client Friendly", "100%"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[26px] border border-white/10 bg-white/[0.05] p-5 shadow-xl"
            >
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-2 text-3xl font-bold text-sky-300">{value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <input
            placeholder="Search recipes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-400 md:w-80"
          />

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setFilter(category)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  filter === category
                    ? "bg-sky-500 text-slate-950"
                    : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((recipe) => (
            <div
              key={recipe.name}
              className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl transition hover:bg-white/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-400">{recipe.category}</p>
                  <h2 className="mt-2 text-xl font-bold">{recipe.name}</h2>
                </div>

                <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
                  {recipe.tag}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-950/60 p-3">
                  <p className="text-xs text-slate-500">Protein</p>
                  <p className="mt-1 font-bold text-white">{recipe.protein}</p>
                </div>

                <div className="rounded-2xl bg-slate-950/60 p-3">
                  <p className="text-xs text-slate-500">Time</p>
                  <p className="mt-1 font-bold text-white">{recipe.time}</p>
                </div>
              </div>

              <button className="mt-5 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10">
                View Recipe →
              </button>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-8 text-center text-slate-400">
            No recipes found.
          </div>
        )}
      </section>
    </main>
  );
}
