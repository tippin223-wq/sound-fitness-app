"use client";

import { useEffect, useMemo, useState } from "react";

type PromptPack = {
  id: string;
  title: string;
  type: string;
  status: string;
  prompt: string;
};

const defaultMaster = `PROJECT: Sound Fitness App + Website + CRM

OWNER: Joey Bell

GOAL:
Build a premium in-home and online personal training business with strong systems, lead tracking, client dashboards, and AI-assisted workflows.

CURRENT FOCUS:
- Website pages
- Training app pages
- Admin dashboard
- CRM / lead map
- AI prompt library
- Online training system

STYLE:
Premium dark gradient, sky blue CTA buttons, rounded cards, clean spacing, mobile-friendly layouts.

IMPORTANT:
Keep Joey Bell, Roberta Bell, South Sound Vision, and Sound Fitness details separate.`;

const defaultPrompts: PromptPack[] = [
  {
    id: "1",
    title: "Website Builder Prompt",
    type: "Website",
    status: "Ready",
    prompt:
      "Build the next Sound Fitness website page using premium dark styling, strong CTA structure, clean mobile layout, and conversion-focused copy.",
  },
  {
    id: "2",
    title: "Client Program Prompt",
    type: "Coaching",
    status: "Ready",
    prompt:
      "Create a personalized training plan using client goals, injury history, available equipment, schedule, and progression rules.",
  },
  {
    id: "3",
    title: "CRM Notes Cleaner",
    type: "CRM",
    status: "Draft",
    prompt:
      "Turn rough lead notes into clean CRM entries with next action, urgency, service fit, location, and follow-up message.",
  },
];

const defaultMemory = [
  "Sound Fitness = in-home personal training, assisted stretching, online training, continuation program.",
  "Primary goal = more private clients, more recurring revenue, stronger systems.",
  "Style = premium, dark gradient, clean cards, sky blue accents, rounded panels.",
  "Keep Joey Bell, Roberta Bell, Sound Fitness, and South Sound Vision details separate.",
];

const defaultWorkflows = [
  "New Chat Starter",
  "Website Page Builder",
  "Client Plan Generator",
  "Lead Follow-Up Writer",
  "Social Content Repurposer",
  "CRM Notes Cleaner",
];

export default function AdminAiPromptPage() {
  const [masterContext, setMasterContext] = useState(defaultMaster);
  const [prompts, setPrompts] = useState<PromptPack[]>(defaultPrompts);
  const [memoryBlocks, setMemoryBlocks] = useState(defaultMemory);
  const [workflows, setWorkflows] = useState(defaultWorkflows);

  const [selectedPrompt, setSelectedPrompt] = useState<PromptPack | null>(null);
  const [activeWorkflow, setActiveWorkflow] = useState("New Chat Starter");
  const [search, setSearch] = useState("");

  const [draft, setDraft] = useState<PromptPack>({
    id: "",
    title: "",
    type: "Website",
    status: "Draft",
    prompt: "",
  });

  const [newMemory, setNewMemory] = useState("");
  const [newWorkflow, setNewWorkflow] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("sound-ai-prompt-admin");

    if (saved) {
      const data = JSON.parse(saved);
      setMasterContext(data.masterContext || defaultMaster);
      setPrompts(data.prompts || defaultPrompts);
      setMemoryBlocks(data.memoryBlocks || defaultMemory);
      setWorkflows(data.workflows || defaultWorkflows);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "sound-ai-prompt-admin",
      JSON.stringify({
        masterContext,
        prompts,
        memoryBlocks,
        workflows,
      }),
    );
  }, [masterContext, prompts, memoryBlocks, workflows]);

  const filteredPrompts = prompts.filter((item) =>
    `${item.title} ${item.type} ${item.status} ${item.prompt}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const fullAiPrompt = useMemo(() => {
    return `${masterContext}

ACTIVE WORKFLOW:
${activeWorkflow}

BUSINESS MEMORY:
${memoryBlocks.map((m) => `- ${m}`).join("\n")}

SELECTED PROMPT:
${selectedPrompt ? selectedPrompt.prompt : "No selected prompt yet."}

TASK:
Use the context above to help build the next Sound Fitness asset.`;
  }, [masterContext, memoryBlocks, selectedPrompt, activeWorkflow]);

  function savePrompt() {
    if (!draft.title.trim() || !draft.prompt.trim()) return;

    if (draft.id) {
      setPrompts((prev) =>
        prev.map((item) => (item.id === draft.id ? draft : item)),
      );
    } else {
      setPrompts((prev) => [
        {
          ...draft,
          id: crypto.randomUUID(),
        },
        ...prev,
      ]);
    }

    setDraft({
      id: "",
      title: "",
      type: "Website",
      status: "Draft",
      prompt: "",
    });
  }

  function editPrompt(item: PromptPack) {
    setDraft(item);
    setSelectedPrompt(item);
  }

  function deletePrompt(id: string) {
    setPrompts((prev) => prev.filter((item) => item.id !== id));
    if (selectedPrompt?.id === id) setSelectedPrompt(null);
  }

  function addMemory() {
    if (!newMemory.trim()) return;
    setMemoryBlocks((prev) => [...prev, newMemory]);
    setNewMemory("");
  }

  function removeMemory(index: number) {
    setMemoryBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  function updateMemory(index: number, value: string) {
    setMemoryBlocks((prev) =>
      prev.map((item, i) => (i === index ? value : item)),
    );
  }

  function addWorkflow() {
    if (!newWorkflow.trim()) return;
    setWorkflows((prev) => [...prev, newWorkflow]);
    setNewWorkflow("");
  }

  function removeWorkflow(index: number) {
    setWorkflows((prev) => prev.filter((_, i) => i !== index));
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-sky-300">
              Admin / AI Prompt System
            </div>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              Sound Fitness AI Command Center
            </h1>
            <p className="mt-3 max-w-2xl text-base text-slate-300">
              Edit your master context, save reusable prompts, organize business
              memory, and generate copy-ready AI instructions from one page.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => copyText(fullAiPrompt)}
              className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400"
            >
              Copy Full AI Prompt
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("sound-ai-prompt-admin");
                setMasterContext(defaultMaster);
                setPrompts(defaultPrompts);
                setMemoryBlocks(defaultMemory);
                setWorkflows(defaultWorkflows);
                setSelectedPrompt(null);
              }}
              className="rounded-2xl border border-red-400/20 bg-red-500/10 px-5 py-3 text-sm font-medium text-red-300 hover:bg-red-500/15"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-6">
            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300">
                    Master Editable Context
                  </div>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight">
                    Your reusable business brain
                  </h2>
                </div>
                <button
                  onClick={() => copyText(masterContext)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
                >
                  Copy
                </button>
              </div>

              <textarea
                value={masterContext}
                onChange={(e) => setMasterContext(e.target.value)}
                rows={16}
                className="mt-5 w-full rounded-[26px] border border-white/10 bg-slate-950/70 p-5 text-sm leading-6 text-slate-200 outline-none placeholder:text-slate-500 focus:border-sky-400/50"
              />
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-violet-300">
                    Prompt Library
                  </div>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight">
                    Add, edit, remove prompts
                  </h2>
                </div>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search prompts..."
                  className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                />
              </div>

              <div className="mt-5 grid gap-4">
                {filteredPrompts.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-[26px] border p-5 ${
                      selectedPrompt?.id === item.id
                        ? "border-sky-400/40 bg-sky-500/10"
                        : "border-white/10 bg-slate-950/55"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-white">
                            {item.title}
                          </h3>
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-300">
                            {item.type}
                          </span>
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                            {item.status}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-400">
                          {item.prompt}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        onClick={() => setSelectedPrompt(item)}
                        className="rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
                      >
                        Use
                      </button>
                      <button
                        onClick={() => copyText(item.prompt)}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => editPrompt(item)}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deletePrompt(item.id)}
                        className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/15"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300">
                Prompt Builder
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                {draft.id ? "Edit prompt" : "Create prompt"}
              </h2>

              <div className="mt-5 space-y-3">
                <input
                  value={draft.title}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Prompt title"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                />

                <select
                  value={draft.type}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, type: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none focus:border-sky-400/50"
                >
                  <option>Website</option>
                  <option>App Builder</option>
                  <option>CRM</option>
                  <option>Coaching</option>
                  <option>Marketing</option>
                  <option>Business Memory</option>
                </select>

                <select
                  value={draft.status}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none focus:border-sky-400/50"
                >
                  <option>Draft</option>
                  <option>Ready</option>
                  <option>Core</option>
                  <option>Needs Review</option>
                </select>

                <textarea
                  value={draft.prompt}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, prompt: e.target.value }))
                  }
                  rows={7}
                  placeholder="Write the reusable prompt here..."
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={savePrompt}
                    className="rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400"
                  >
                    {draft.id ? "Save Changes" : "Add Prompt"}
                  </button>
                  <button
                    onClick={() =>
                      setDraft({
                        id: "",
                        title: "",
                        type: "Website",
                        status: "Draft",
                        prompt: "",
                      })
                    }
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:bg-white/10"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-amber-300">
                Editable Memory
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Business context blocks
              </h2>

              <div className="mt-5 space-y-3">
                {memoryBlocks.map((memory, index) => (
                  <div key={index} className="flex gap-2">
                    <textarea
                      value={memory}
                      onChange={(e) => updateMemory(index, e.target.value)}
                      rows={2}
                      className="w-full rounded-[20px] border border-white/10 bg-slate-950/55 p-4 text-sm leading-6 text-slate-300 outline-none focus:border-sky-400/50"
                    />
                    <button
                      onClick={() => removeMemory(index)}
                      className="rounded-2xl border border-red-400/20 bg-red-500/10 px-3 text-sm font-medium text-red-300 hover:bg-red-500/15"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <div className="flex gap-2">
                  <input
                    value={newMemory}
                    onChange={(e) => setNewMemory(e.target.value)}
                    placeholder="Add memory block..."
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                  />
                  <button
                    onClick={addMemory}
                    className="rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-sky-400"
                  >
                    Add
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">
                AI Handoff Panel
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Copy-ready ChatGPT prompt
              </h2>

              <select
                value={activeWorkflow}
                onChange={(e) => setActiveWorkflow(e.target.value)}
                className="mt-5 w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none focus:border-sky-400/50"
              >
                {workflows.map((workflow) => (
                  <option key={workflow}>{workflow}</option>
                ))}
              </select>

              <textarea
                value={fullAiPrompt}
                readOnly
                rows={12}
                className="mt-4 w-full rounded-[24px] border border-white/10 bg-slate-950/70 p-4 text-sm leading-6 text-slate-300 outline-none"
              />

              <button
                onClick={() => copyText(fullAiPrompt)}
                className="mt-4 w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400"
              >
                Copy Prompt for ChatGPT
              </button>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-violet-300">
                Workflow Modes
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Add or remove modes
              </h2>

              <div className="mt-5 grid gap-3">
                {workflows.map((workflow, index) => (
                  <div key={index} className="flex gap-2">
                    <button
                      onClick={() => setActiveWorkflow(workflow)}
                      className={`w-full rounded-[20px] border px-4 py-3 text-left text-sm font-medium ${
                        activeWorkflow === workflow
                          ? "border-sky-400/40 bg-sky-500/10 text-sky-300"
                          : "border-white/10 bg-slate-950/55 text-white hover:bg-slate-900"
                      }`}
                    >
                      {workflow}
                    </button>
                    <button
                      onClick={() => removeWorkflow(index)}
                      className="rounded-2xl border border-red-400/20 bg-red-500/10 px-3 text-sm font-medium text-red-300 hover:bg-red-500/15"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <div className="flex gap-2">
                  <input
                    value={newWorkflow}
                    onChange={(e) => setNewWorkflow(e.target.value)}
                    placeholder="Add workflow..."
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                  />
                  <button
                    onClick={addWorkflow}
                    className="rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-sky-400"
                  >
                    Add
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
