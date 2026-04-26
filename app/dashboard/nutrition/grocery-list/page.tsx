"use client";

import { useState } from "react";

export default function GroceryListPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const sections = [
    {
      title: "Protein",
      items: [
        "Chicken breast",
        "Lean ground turkey",
        "Greek yogurt",
        "Eggs",
        "Cottage cheese",
        "Protein powder",
      ],
    },
    {
      title: "Carbs",
      items: [
        "Rice",
        "Oats",
        "Potatoes",
        "Whole grain wraps",
        "Bananas",
        "Berries",
      ],
    },
    {
      title: "Vegetables",
      items: [
        "Frozen broccoli",
        "Spinach",
        "Bell peppers",
        "Lettuce",
        "Tomatoes",
        "Onions",
      ],
    },
    {
      title: "Flavor + Extras",
      items: [
        "Salsa",
        "Hot sauce",
        "Taco seasoning",
        "Low-fat cheese",
        "Olive oil",
        "Greek yogurt ranch",
      ],
    },
  ];

  const allItems = sections.flatMap((section) => section.items);
  const completed = allItems.filter((item) => checked[item]).length;

  function toggle(item: string) {
    setChecked({ ...checked, [item]: !checked[item] });
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-5 py-8 text-white">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300">
            Grocery List Generator
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Build a simple grocery run.
          </h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            Check off high-protein staples, easy carbs, vegetables, and simple
            flavor items so meal prep stays realistic.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[26px] border border-white/10 bg-white/[0.05] p-5">
            <p className="text-sm text-slate-400">Total Items</p>
            <p className="mt-2 text-3xl font-bold">{allItems.length}</p>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/[0.05] p-5">
            <p className="text-sm text-slate-400">Checked Off</p>
            <p className="mt-2 text-3xl font-bold text-emerald-300">
              {completed}
            </p>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/[0.05] p-5">
            <p className="text-sm text-slate-400">Remaining</p>
            <p className="mt-2 text-3xl font-bold text-amber-300">
              {allItems.length - completed}
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {sections.map((section) => (
            <div
              key={section.title}
              className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-xl"
            >
              <h2 className="text-2xl font-bold">{section.title}</h2>

              <div className="mt-5 space-y-3">
                {section.items.map((item) => (
                  <label
                    key={item}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${
                      checked[item]
                        ? "border-emerald-400/30 bg-emerald-500/10"
                        : "border-white/10 bg-slate-950/60 hover:bg-white/10"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!checked[item]}
                      onChange={() => toggle(item)}
                      className="h-5 w-5 accent-sky-500"
                    />

                    <span
                      className={`font-medium ${
                        checked[item]
                          ? "text-emerald-300 line-through"
                          : "text-slate-200"
                      }`}
                    >
                      {item}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-[32px] border border-sky-400/20 bg-sky-500/10 p-6 shadow-xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-sky-300">
            Coach Note
          </p>

          <h2 className="mt-3 text-2xl font-bold">
            Don’t make grocery shopping complicated.
          </h2>

          <p className="mt-3 max-w-3xl text-slate-200">
            The goal is repeatable food. Pick a protein, a carb, a vegetable,
            and one or two sauces you actually like. That is enough to make meal
            prep work.
          </p>
        </div>
      </section>
    </main>
  );
}
