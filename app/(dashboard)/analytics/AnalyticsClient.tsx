"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type SiteData = {
  ok: boolean;
  data?: {
    site: string;
    analytics: { pageviewsToday: number; pageviewsThisWeek: number; pageviewsThisMonth: number };
    content?: { totalListings: number; claimedListings: number; totalBlogPosts: number };
    revenue?: { hubMRR: number; featuredMRR: number; affiliateThisMonth?: number };
  };
  error?: string;
};

export function AnalyticsClient() {
  const [data, setData] = useState<Record<string, SiteData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setData(d.sites ?? {}))
      .finally(() => setLoading(false));
  }, []);

  async function refresh() {
    const res = await fetch("/api/stats");
    const d = await res.json();
    setData(d.sites ?? {});
  }

  const sites = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));

  if (loading) {
    return <p className="text-slate-400">Loading analytics...</p>;
  }

  return (
      <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
        onClick={refresh}
        className="px-3 py-1.5 rounded border border-slate-600 text-slate-300 hover:bg-slate-800 text-sm"
      >
        Refresh
      </button>
        <Link
          href="/analytics/clients"
          className="text-cyan-400 hover:text-cyan-300 text-sm"
        >
          Client analytics →
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sites.map(([slug, result]) => (
          <div
            key={slug}
            className="rounded-lg border border-slate-800 bg-slate-900/50 p-4"
          >
            <h2 className="font-medium text-white capitalize mb-3">
              {slug.replace(/([A-Z])/g, " $1").trim()}
            </h2>
            {result.ok && result.data ? (
              <div className="space-y-2 text-sm">
                <p className="text-slate-400">
                  Today: {result.data.analytics?.pageviewsToday ?? 0} · Week:{" "}
                  {result.data.analytics?.pageviewsThisWeek ?? 0}
                </p>
                {result.data.content && (
                  <p className="text-slate-400">
                    Listings: {result.data.content.claimedListings}/
                    {result.data.content.totalListings} · Blog:{" "}
                    {result.data.content.totalBlogPosts}
                  </p>
                )}
                {result.data.revenue && (
                  <p className="text-cyan-400">
                    MRR: £
                    {(result.data.revenue.hubMRR ?? 0) +
                      (result.data.revenue.featuredMRR ?? 0)}
                  </p>
                )}
                {(slug === "southportguide" || slug === "lakesguide") && (
                  <Link
                    href={`/analytics/${slug}`}
                    className="text-cyan-400 hover:text-cyan-300 text-xs"
                  >
                    Deep analytics →
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-red-400 text-sm">{result.error ?? "Failed to load"}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
