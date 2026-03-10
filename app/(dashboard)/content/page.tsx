"use client";

import { useState, useEffect } from "react";

type ContentItem = {
  id: string;
  site: string;
  title: string;
  url: string | null;
  type: string;
  status: string;
  dueDate: string | null;
  publishedAt: string | null;
  notes: string | null;
};

const SITES = [
  "southportguide", "formbyguide", "seftonlinks", "seftoncoastwildlife",
  "lakesguide", "hikethelakes", "lakeswildlife", "churchtownmedia", "seftoncoastnetwork",
];

const TYPES = ["blog-post", "guide", "landing-page", "species-page", "fell-page"];

const STATUS_ORDER = ["idea", "assigned", "drafted", "reviewed", "published"];

const STATUS_COLOURS: Record<string, string> = {
  idea: "bg-slate-700 text-slate-300",
  assigned: "bg-blue-900/60 text-blue-300",
  drafted: "bg-amber-900/60 text-amber-300",
  reviewed: "bg-purple-900/60 text-purple-300",
  published: "bg-emerald-900/60 text-emerald-300",
};

const SITE_LABELS: Record<string, string> = {
  southportguide: "SouthportGuide",
  formbyguide: "FormbyGuide",
  seftonlinks: "SeftonLinks",
  seftoncoastwildlife: "SCWildlife",
  lakesguide: "LakesGuide",
  hikethelakes: "HikeLakes",
  lakeswildlife: "LakesWildlife",
  churchtownmedia: "ChurchtownMedia",
  seftoncoastnetwork: "SCNetwork",
};

const BLANK_FORM = { site: "southportguide", title: "", type: "blog-post", status: "idea", dueDate: "", url: "", notes: "" };

export default function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [filterSite, setFilterSite] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  async function load() {
    const res = await fetch("/api/content");
    const d = await res.json();
    setItems(d.items ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addItem() {
    setSaving(true);
    await fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setShowAdd(false);
    setForm(BLANK_FORM);
    load();
  }

  async function updateStatus(id: string, status: string) {
    await fetch("/api/content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, ...(status === "published" ? { publishedAt: new Date().toISOString() } : {}) }),
    });
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, status } : i));
  }

  async function deleteItem(id: string) {
    await fetch("/api/content", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const filtered = items.filter((i) => {
    if (filterSite !== "all" && i.site !== filterSite) return false;
    if (filterStatus !== "all" && i.status !== filterStatus) return false;
    return true;
  });

  const counts = STATUS_ORDER.reduce<Record<string, number>>((acc, s) => {
    acc[s] = items.filter((i) => i.status === s).length;
    return acc;
  }, {});

  if (loading) return <div className="p-6"><p className="text-slate-400 animate-pulse">Loading...</p></div>;

  return (
    <div className="p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Content Pipeline</h1>
          <p className="text-slate-500 text-sm mt-1">{items.length} items across all sites</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
        >
          + Add item
        </button>
      </div>

      {/* Status summary */}
      <div className="flex flex-wrap gap-3">
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              filterStatus === s ? STATUS_COLOURS[s] : "bg-slate-800 text-slate-500 hover:text-slate-300"
            }`}
          >
            {s} ({counts[s] ?? 0})
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={filterSite}
          onChange={(e) => setFilterSite(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none"
        >
          <option value="all">All sites</option>
          {SITES.map((s) => <option key={s} value={s}>{SITE_LABELS[s] ?? s}</option>)}
        </select>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-5 space-y-4">
          <h2 className="text-sm font-medium text-white">New content item</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Title</p>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Best restaurants in Southport 2026"
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Site</p>
              <select
                value={form.site}
                onChange={(e) => setForm({ ...form, site: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                {SITES.map((s) => <option key={s} value={s}>{SITE_LABELS[s] ?? s}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Type</p>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Status</p>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                {STATUS_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Due date</p>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">URL (once published)</p>
              <input
                type="text"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://..."
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Notes</p>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="Keywords, brief, context..."
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={addItem}
              disabled={saving || !form.title}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded transition-colors"
            >
              {saving ? "Saving..." : "Add item"}
            </button>
            <button onClick={() => setShowAdd(false)} className="text-sm text-slate-400 hover:text-white px-3 py-2">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Items table */}
      {filtered.length === 0 ? (
        <p className="text-slate-500 text-sm">No items. Add something to the pipeline.</p>
      ) : (
        <div className="rounded-lg border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80">
                <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Title</th>
                <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Site</th>
                <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Type</th>
                <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Status</th>
                <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Due</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-slate-800/50 hover:bg-slate-900/30 group">
                  <td className="px-4 py-2.5">
                    {item.url ? (
                      <a href={item.url} target="_blank" rel="noopener" className="text-white hover:text-cyan-400 transition-colors">
                        {item.title}
                      </a>
                    ) : (
                      <span className="text-white">{item.title}</span>
                    )}
                    {item.notes && <p className="text-xs text-slate-600 mt-0.5 truncate max-w-xs">{item.notes}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-slate-400 text-xs">{SITE_LABELS[item.site] ?? item.site}</td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">{item.type}</td>
                  <td className="px-4 py-2.5">
                    <select
                      value={item.status}
                      onChange={(e) => updateStatus(item.id, e.target.value)}
                      className={`text-xs px-2 py-1 rounded border-0 focus:outline-none cursor-pointer ${STATUS_COLOURS[item.status]}`}
                    >
                      {STATUS_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">
                    {item.dueDate
                      ? new Date(item.dueDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="text-xs text-red-500 hover:text-red-400"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
