"use client";

import React, { useEffect, useMemo, useState } from "react";

type LeadStatus = "New" | "Contacted" | "Booked" | "Client" | "Lost";

type Lead = {
  id: string;
  name: string;
  phone: string;
  source: string;
  address: string;
  city: string;
  status: LeadStatus;
  notes: string;
  lat?: number;
  lon?: number;
};

declare global {
  interface Window {
    L: any;
  }
}

const STORAGE_KEY = "soundFitnessLeadsV1";

const starterLeads: Lead[] = [
  {
    id: "1",
    name: "Sample Lead",
    phone: "",
    source: "Website",
    address: "Kirkland, WA",
    city: "Kirkland",
    status: "New",
    notes: "Example lead. Delete when ready.",
    lat: 47.6769,
    lon: -122.206,
  },
];

const statuses: LeadStatus[] = ["New", "Contacted", "Booked", "Client", "Lost"];

export default function AdminLeadMapPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"All" | LeadStatus>("All");
  const [cityFilter, setCityFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [query, setQuery] = useState("");

  const [form, setForm] = useState<Omit<Lead, "id">>({
    name: "",
    phone: "",
    source: "Website",
    address: "",
    city: "",
    status: "New",
    notes: "",
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    setLeads(saved ? JSON.parse(saved) : starterLeads);
  }, []);

  useEffect(() => {
    if (leads.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
    }
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesStatus =
        statusFilter === "All" || lead.status === statusFilter;
      const matchesCity = cityFilter === "All" || lead.city === cityFilter;
      const matchesSource =
        sourceFilter === "All" || lead.source === sourceFilter;
      const search = query.toLowerCase();

      const matchesQuery =
        !search ||
        lead.name.toLowerCase().includes(search) ||
        lead.address.toLowerCase().includes(search) ||
        lead.city.toLowerCase().includes(search) ||
        lead.notes.toLowerCase().includes(search);

      return matchesStatus && matchesCity && matchesSource && matchesQuery;
    });
  }, [leads, statusFilter, cityFilter, sourceFilter, query]);

  const mappedLeads = filteredLeads.filter((lead) => lead.lat && lead.lon);
  const selectedLead = leads.find((lead) => lead.id === selectedId);

  const cities = Array.from(
    new Set(leads.map((lead) => lead.city).filter(Boolean)),
  );
  const sources = Array.from(
    new Set(leads.map((lead) => lead.source).filter(Boolean)),
  );

  const insights = useMemo(() => {
    const total = leads.length;
    const clients = leads.filter((lead) => lead.status === "Client").length;
    const booked = leads.filter((lead) => lead.status === "Booked").length;
    const unmapped = leads.filter((lead) => !lead.lat || !lead.lon).length;

    const cityCounts = leads.reduce<Record<string, number>>((acc, lead) => {
      const key = lead.city || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const topCity =
      Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "None yet";

    return {
      total,
      clients,
      booked,
      unmapped,
      closeRate: total ? Math.round((clients / total) * 100) : 0,
      topCity,
    };
  }, [leads]);

  useEffect(() => {
    if (!window.L || !mappedLeads.length) return;

    const mapContainer = document.getElementById("lead-map");
    if (!mapContainer) return;

    mapContainer.innerHTML = "";

    const avgLat =
      mappedLeads.reduce((sum, lead) => sum + Number(lead.lat), 0) /
      mappedLeads.length;
    const avgLon =
      mappedLeads.reduce((sum, lead) => sum + Number(lead.lon), 0) /
      mappedLeads.length;

    const map = window.L.map("lead-map").setView([avgLat, avgLon], 11);

    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);

    const bounds: any[] = [];

    mappedLeads.forEach((lead) => {
      const marker = window.L.marker([lead.lat, lead.lon]).addTo(map);
      marker.bindPopup(`
        <strong>${lead.name}</strong><br/>
        ${lead.address}, ${lead.city}<br/>
        Status: ${lead.status}<br/>
        Source: ${lead.source}
      `);

      marker.on("click", () => setSelectedId(lead.id));
      bounds.push([lead.lat, lead.lon]);
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    return () => {
      map.remove();
    };
  }, [mappedLeads]);

  useEffect(() => {
    if (document.getElementById("leaflet-css")) return;

    const link = document.createElement("link");
    link.id = "leaflet-css";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setLeads((current) => [...current]);
    document.body.appendChild(script);
  }, []);

  async function geocodeAddress(address: string) {
    const query = encodeURIComponent(address);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
    );
    const data = await res.json();

    if (!data?.[0]) return null;

    return {
      lat: Number(data[0].lat),
      lon: Number(data[0].lon),
    };
  }

  async function addLead() {
    if (!form.name.trim() || !form.address.trim()) return;

    setIsGeocoding(true);

    let coords = null;

    try {
      coords = await geocodeAddress(`${form.address}, ${form.city}, WA`);
    } catch {
      coords = null;
    }

    const newLead: Lead = {
      id: crypto.randomUUID(),
      ...form,
      ...(coords || {}),
    };

    setLeads((current) => [newLead, ...current]);
    setSelectedId(newLead.id);

    setForm({
      name: "",
      phone: "",
      source: "Website",
      address: "",
      city: "",
      status: "New",
      notes: "",
    });

    setIsGeocoding(false);
  }

  function deleteLead(id: string) {
    setLeads((current) => current.filter((lead) => lead.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function updateStatus(id: string, status: LeadStatus) {
    setLeads((current) =>
      current.map((lead) => (lead.id === id ? { ...lead, status } : lead)),
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_30%),radial-gradient(circle_at_80%_10%,_rgba(249,115,22,0.14),_transparent_26%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="rounded-[34px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/25 backdrop-blur lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-sky-300">
                Admin CRM
              </div>
              <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Lead Tracking Map
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                Track leads by address, city, source, and status. Filter the
                pipeline and see where Sound Fitness is building momentum.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2 rounded-[28px] border border-white/10 bg-white/[0.05] p-4 text-center">
              <MiniStat label="Total" value={insights.total} />
              <MiniStat label="Booked" value={insights.booked} />
              <MiniStat label="Clients" value={insights.clients} />
              <MiniStat label="Close" value={`${insights.closeRate}%`} />
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <InsightCard
            label="Top Area"
            value={insights.topCity}
            detail="Most lead activity"
          />
          <InsightCard
            label="Mapped Pins"
            value={mappedLeads.length}
            detail="Visible after filters"
          />
          <InsightCard
            label="Unmapped"
            value={insights.unmapped}
            detail="Need better address"
          />
          <InsightCard
            label="Filtered Leads"
            value={filteredLeads.length}
            detail="Current view"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="space-y-6">
            <div className="rounded-[34px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300">
                Add Lead
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                New lead info
              </h2>

              <div className="mt-5 grid gap-3">
                <input
                  className="field"
                  placeholder="Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <input
                  className="field"
                  placeholder="Phone / email"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
                <input
                  className="field"
                  placeholder="Street address or apartment complex"
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                />
                <input
                  className="field"
                  placeholder="City, e.g. Kirkland"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    className="field"
                    value={form.source}
                    onChange={(e) =>
                      setForm({ ...form, source: e.target.value })
                    }
                  >
                    <option>Website</option>
                    <option>Referral</option>
                    <option>Flyer</option>
                    <option>Nextdoor</option>
                    <option>Instagram</option>
                    <option>Door Hanger</option>
                    <option>Other</option>
                  </select>

                  <select
                    className="field"
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as LeadStatus })
                    }
                  >
                    {statuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <textarea
                  className="field min-h-[110px]"
                  placeholder="Notes: goal, price interest, neighborhood, follow-up..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />

                <button
                  onClick={addLead}
                  disabled={isGeocoding}
                  className="rounded-[24px] bg-sky-500 px-5 py-4 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400 disabled:opacity-60"
                >
                  {isGeocoding ? "Mapping Lead..." : "Add Lead + Map Pin"}
                </button>
              </div>
            </div>

            <div className="rounded-[34px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-amber-300">
                Filters
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Focus the pipeline
              </h2>

              <div className="mt-5 grid gap-3">
                <input
                  className="field"
                  placeholder="Search name, address, city, notes..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />

                <div className="grid gap-3 sm:grid-cols-3">
                  <select
                    className="field"
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(e.target.value as "All" | LeadStatus)
                    }
                  >
                    <option>All</option>
                    {statuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>

                  <select
                    className="field"
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                  >
                    <option>All</option>
                    {cities.map((city) => (
                      <option key={city}>{city}</option>
                    ))}
                  </select>

                  <select
                    className="field"
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value)}
                  >
                    <option>All</option>
                    {sources.map((source) => (
                      <option key={source}>{source}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-[34px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-violet-300">
                Lead List
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Pipeline
              </h2>

              <div className="mt-5 max-h-[620px] space-y-3 overflow-auto pr-1">
                {filteredLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className={`rounded-[24px] border p-4 ${
                      selectedId === lead.id
                        ? "border-sky-400/40 bg-sky-500/10"
                        : "border-white/10 bg-slate-950/45"
                    }`}
                  >
                    <button
                      onClick={() => setSelectedId(lead.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">{lead.name}</div>
                          <div className="mt-1 text-sm text-slate-400">
                            {lead.address}, {lead.city}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {lead.source}{" "}
                            {lead.lat ? "• mapped" : "• not mapped"}
                          </div>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-sky-200">
                          {lead.status}
                        </span>
                      </div>
                    </button>

                    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                      <select
                        className="field"
                        value={lead.status}
                        onChange={(e) =>
                          updateStatus(lead.id, e.target.value as LeadStatus)
                        }
                      >
                        {statuses.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>

                      <button
                        onClick={() => deleteLead(lead.id)}
                        className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 hover:bg-red-500/20"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-[34px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">
                    Map View
                  </div>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight">
                    All filtered lead pins
                  </h2>
                </div>
                <div className="text-right text-xs text-slate-400">
                  {mappedLeads.length} pins
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/55">
                <div id="lead-map" className="h-[560px] w-full" />
              </div>

              <div className="mt-3 text-xs text-slate-500">
                Click a map pin or lead card to select a lead.
              </div>
            </div>

            <div className="rounded-[34px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300">
                Area Strategy
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Where to focus
              </h2>

              <div className="mt-5 space-y-3">
                {Object.entries(
                  filteredLeads.reduce<Record<string, number>>((acc, lead) => {
                    const key = lead.city || "Unknown";
                    acc[key] = (acc[key] || 0) + 1;
                    return acc;
                  }, {}),
                )
                  .sort((a, b) => b[1] - a[1])
                  .map(([city, count]) => (
                    <div
                      key={city}
                      className="rounded-[24px] border border-white/10 bg-slate-950/45 p-4"
                    >
                      <div className="flex justify-between">
                        <strong>{city}</strong>
                        <span className="text-sky-300">{count} leads</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-sky-500"
                          style={{ width: `${Math.min(100, count * 20)}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {selectedLead && (
              <div className="rounded-[34px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/20 backdrop-blur">
                <div className="text-[11px] uppercase tracking-[0.22em] text-sky-300">
                  Selected Lead
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">
                  {selectedLead.name}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {selectedLead.notes || "No notes yet."}
                </p>
                <div className="mt-4 rounded-[24px] border border-white/10 bg-slate-950/45 p-4 text-sm text-slate-300">
                  <div>
                    {selectedLead.address}, {selectedLead.city}
                  </div>
                  <div>{selectedLead.phone}</div>
                  <div>Source: {selectedLead.source}</div>
                  <div>Status: {selectedLead.status}</div>
                </div>
              </div>
            )}
          </section>
        </section>
      </div>

      <style>{`
        .field {
          width: 100%;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.1);
          background: rgba(15,23,42,.55);
          color: white;
          padding: 14px 16px;
          outline: none;
          font-size: 14px;
        }
        .field::placeholder {
          color: rgb(100 116 139);
        }
        .leaflet-popup-content-wrapper,
        .leaflet-popup-tip {
          background: #020617;
          color: white;
        }
      `}</style>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
        {label}
      </div>
    </div>
  );
}

function InsightCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.055] p-5 shadow-xl shadow-black/15 backdrop-blur">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight text-white">
        {value}
      </div>
      <div className="mt-1 text-sm text-slate-400">{detail}</div>
    </div>
  );
}
