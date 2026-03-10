"use client";

import { useState, useEffect } from "react";

type WeeklyTarget = {
  id: string;
  weekStarting: string;
  outreachTarget: number;
  outreachActual: number;
  publishingTarget: number;
  publishingActual: number;
  revenueTarget: number;
  revenueActual: number;
  notes: string | null;
};

function getMonday(d = new Date()) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

export default function ReviewPage() {
  const [targets, setTargets] = useState<WeeklyTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const thisWeek = getMonday();

  const [form, setForm] = useState({
    outreachTarget: 0,
    outreachActual: 0,
    publishingTarget: 0,
    publishingActual: 0,
    revenueTarget: 0,
    revenueActual: 0,
    notes: "",
  });

  useEffect(() => {
    fetch("/api/weekly-targets")
      .then((r) => r.json())
      .then((d) => {
        const ts: WeeklyTarget[] = d.targets ?? [];
        setTargets(ts);
        const current = ts.find((t) => t.weekStarting.slice(0, 10) === thisWeek);
        if (current) {
          setForm({
            outreachTarget: current.outreachTarget,
            outreachActual: current.outreachActual,
            publishingTarget: current.publishingTarget,
            publishingActual: current.publishingActual,
            revenueTarget: current.revenueTarget,
            revenueActual: current.revenueActual,
            notes: current.notes ?? "",
          });
        }
        setLoading(false);
      });
  }, [thisWeek]);

  async function save() {
    setSaving(true);
    await fetch("/api/weekly-targets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStarting: thisWeek, ...form }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    const res = await fetch("/api/weekly-targets");
    const d = await res.json();
    setTargets(d.targets ?? []);
  }

  if (loading) return <div className="p-6"><p className="text-slate-400 animate-pulse">Loading...</p></div>;

  const pastWeeks = targets.filter((t) => t.weekStarting.slice(0, 10) !== thisWeek).slice(0, 8);

  return (
    <div className="p-6 max-w-4xl space-y-8">
      <h1 className="text-2xl font-semibold text-white">Weekly Review</h1>

      {/* This week */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
          Week of {new Date(thisWeek).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          {[
            { key: "outreach", label: "Outreach emails" },
            { key: "publishing", label: "Posts published" },
            { key: "revenue", label: "Revenue added (£)" },
          ].map(({ key, label }) => {
            const targetKey = `${key}Target` as keyof typeof form;
            const actualKey = `${key}Actual` as keyof typeof form;
            const hit = Number(form[actualKey]) >= Number(form[targetKey]) && Number(form[targetKey]) > 0;
            return (
              <div key={key}>
                <p className="text-xs text-slate-500 mb-2">{label}</p>
                <div className="flex gap-3 items-center">
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Target</p>
                    <input
                      type="number"
                      min={0}
                      value={form[targetKey] as number}
                      onChange={(e) => setForm({ ...form, [targetKey]: Number(e.target.value) })}
                      className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1">Actual</p>
                    <input
                      type="number"
                      min={0}
                      value={form[actualKey] as number}
                      onChange={(e) => setForm({ ...form, [actualKey]: Number(e.target.value) })}
                      className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  {Number(form[targetKey]) > 0 && (
                    <span className={`text-lg mt-4 ${hit ? "text-emerald-400" : "text-red-400"}`}>
                      {hit ? "✓" : "✗"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mb-4">
          <p className="text-xs text-slate-500 mb-1">Notes</p>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            placeholder="What worked, what didn't, what's next..."
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 resize-none"
          />
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded transition-colors"
        >
          {saved ? "Saved" : saving ? "Saving..." : "Save this week"}
        </button>
      </div>

      {/* History */}
      {pastWeeks.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">History</h2>
          <div className="rounded-lg border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80">
                  <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Week</th>
                  <th className="text-right px-4 py-2.5 text-slate-400 font-medium">Outreach</th>
                  <th className="text-right px-4 py-2.5 text-slate-400 font-medium">Posts</th>
                  <th className="text-right px-4 py-2.5 text-slate-400 font-medium">Revenue</th>
                  <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {pastWeeks.map((t) => (
                  <tr key={t.id} className="border-b border-slate-800/50">
                    <td className="px-4 py-2.5 text-slate-300">
                      {new Date(t.weekStarting).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={t.outreachActual >= t.outreachTarget && t.outreachTarget > 0 ? "text-emerald-400" : "text-slate-400"}>
                        {t.outreachActual}/{t.outreachTarget}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={t.publishingActual >= t.publishingTarget && t.publishingTarget > 0 ? "text-emerald-400" : "text-slate-400"}>
                        {t.publishingActual}/{t.publishingTarget}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={t.revenueActual >= t.revenueTarget && t.revenueTarget > 0 ? "text-emerald-400" : "text-slate-400"}>
                        £{t.revenueActual}/{t.revenueTarget}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs max-w-xs truncate">{t.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
