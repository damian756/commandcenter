"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export function DeepAnalyticsClient({ site }: { site: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats/deep?site=${site}&period=${period}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [site, period]);

  if (loading) return <p className="text-slate-400">Loading...</p>;
  if (!data || data.error) {
    return (
      <p className="text-red-400">
        {typeof data?.error === "string" ? data.error : "Failed to load"}
      </p>
    );
  }

  const analytics = data.analytics as Record<string, unknown> | undefined;
  const pageViewsLast24h = (analytics?.pageViewsLast24h as number) ?? 0;
  const pageViewsPrior24h = (analytics?.pageViewsPrior24h as number) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/analytics" className="text-cyan-400 hover:text-cyan-300 text-sm">
          ← Back to overview
        </Link>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-white text-sm"
        >
          <option value="7">7 days</option>
          <option value="30">30 days</option>
          <option value="90">90 days</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-xs text-slate-400">Page views (24h)</p>
          <p className="text-xl font-semibold text-white">{pageViewsLast24h}</p>
          <p className="text-xs text-slate-500">
            Prior 24h: {pageViewsPrior24h}
          </p>
        </div>
      </div>

      <pre className="rounded border border-slate-800 bg-slate-900 p-4 overflow-auto text-xs text-slate-300">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
