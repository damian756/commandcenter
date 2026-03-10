"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type SiteData = {
  ok: boolean;
  data?: {
    site: string;
    analytics: {
      pageviewsToday: number;
      pageviewsThisWeek: number;
      pageviewsThisMonth: number;
    };
    content?: {
      totalListings: number;
      claimedListings: number;
      totalBlogPosts: number;
      lastBlogPostDate: string | null;
    };
    revenue?: { hubMRR: number; featuredMRR: number };
  };
  error?: string;
};

type Invoice = {
  id: string;
  amountPence: number;
  status: string;
  dueAt: string | null;
  project: { name: string; clientName: string };
};

type Streak = {
  type: string;
  currentRun: number;
  longestRun: number;
};

const SITE_LABELS: Record<string, string> = {
  southportguide: "SouthportGuide",
  lakesguide: "LakesGuide",
  formbyguide: "FormbyGuide",
  seftoncoastwildlife: "SCWildlife",
  seftonlinks: "SeftonLinks",
  hikethelakes: "HikeLakes",
  lakeswildlife: "LakesWildlife",
  forefrontimaging: "Forefront",
  churchtownmedia: "ChurchtownMedia",
  seftoncoastnetwork: "SCNetwork",
};

export default function MorningView() {
  const [sites, setSites] = useState<Record<string, SiteData>>({});
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/stats").then((r) => r.json()),
      fetch("/api/projects/invoices").then((r) => r.json()),
      fetch("/api/streaks").then((r) => r.json()),
    ]).then(([statsData, invoiceData, streakData]) => {
      setSites(statsData.sites ?? {});
      setInvoices(invoiceData.invoices ?? []);
      setStreaks(streakData.streaks ?? []);
      setLoading(false);
    });
  }, []);

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? "Morning" : now.getHours() < 17 ? "Afternoon" : "Evening";

  const totalToday = Object.values(sites).reduce(
    (sum, s) => sum + (s.data?.analytics.pageviewsToday ?? 0),
    0
  );
  const totalWeek = Object.values(sites).reduce(
    (sum, s) => sum + (s.data?.analytics.pageviewsThisWeek ?? 0),
    0
  );
  const totalMRR = Object.values(sites).reduce(
    (sum, s) => sum + (s.data?.revenue?.hubMRR ?? 0) + (s.data?.revenue?.featuredMRR ?? 0),
    0
  );
  const overdueInvoices = invoices.filter(
    (i) => i.status === "overdue" || (i.dueAt && new Date(i.dueAt) < now)
  );

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-slate-400 animate-pulse">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">
          {greeting}, Damian.
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Pageviews today", value: totalToday.toLocaleString() },
          { label: "Pageviews this week", value: totalWeek.toLocaleString() },
          { label: "Network MRR", value: `£${totalMRR.toLocaleString()}` },
          {
            label: "Overdue invoices",
            value: overdueInvoices.length.toString(),
            alert: overdueInvoices.length > 0,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-slate-800 bg-slate-900/50 p-4"
          >
            <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.alert ? "text-red-400" : "text-white"}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Site grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Sites</h2>
          <Link href="/analytics" className="text-xs text-cyan-400 hover:text-cyan-300">
            Full analytics →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Object.entries(sites).map(([slug, result]) => (
            <div
              key={slug}
              className="rounded-lg border border-slate-800 bg-slate-900/50 p-3"
            >
              <p className="text-sm font-medium text-white mb-2">
                {SITE_LABELS[slug] ?? slug}
              </p>
              {result.ok && result.data ? (
                <div className="space-y-1 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Today</span>
                    <span className="text-white font-medium">
                      {result.data.analytics.pageviewsToday.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>This week</span>
                    <span>{result.data.analytics.pageviewsThisWeek.toLocaleString()}</span>
                  </div>
                  {result.data.content?.totalListings ? (
                    <div className="flex justify-between">
                      <span>Listings</span>
                      <span>
                        {result.data.content.claimedListings}/{result.data.content.totalListings}
                      </span>
                    </div>
                  ) : null}
                  {result.data.content?.lastBlogPostDate && (
                    <div className="flex justify-between">
                      <span>Last post</span>
                      <span className={
                        new Date(result.data.content.lastBlogPostDate) <
                        new Date(Date.now() - 14 * 86400000)
                          ? "text-amber-400"
                          : "text-slate-400"
                      }>
                        {new Date(result.data.content.lastBlogPostDate).toLocaleDateString(
                          "en-GB", { day: "numeric", month: "short" }
                        )}
                      </span>
                    </div>
                  )}
                  {(result.data.revenue?.hubMRR ?? 0) + (result.data.revenue?.featuredMRR ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span>MRR</span>
                      <span className="text-cyan-400">
                        £{((result.data.revenue?.hubMRR ?? 0) + (result.data.revenue?.featuredMRR ?? 0)).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-red-400">Offline</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Invoices */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
              Outstanding Invoices
            </h2>
            <Link href="/projects/invoices" className="text-xs text-cyan-400 hover:text-cyan-300">
              All →
            </Link>
          </div>
          {invoices.length === 0 ? (
            <p className="text-sm text-slate-500">No outstanding invoices.</p>
          ) : (
            <div className="space-y-2">
              {invoices.slice(0, 5).map((inv) => {
                const overdue =
                  inv.status === "overdue" || (inv.dueAt && new Date(inv.dueAt) < now);
                return (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="text-white">{inv.project.clientName}</p>
                      {inv.dueAt && (
                        <p className="text-xs text-slate-500">
                          Due {new Date(inv.dueAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={overdue ? "text-red-400 font-medium" : "text-white"}>
                        £{(inv.amountPence / 100).toFixed(0)}
                      </p>
                      {overdue && <p className="text-xs text-red-400">Overdue</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Streaks */}
        <div>
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
            Streaks
          </h2>
          {streaks.length === 0 ? (
            <p className="text-sm text-slate-500">No streaks tracked yet.</p>
          ) : (
            <div className="space-y-2">
              {streaks.map((s) => (
                <div
                  key={s.type}
                  className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm"
                >
                  <p className="text-white capitalize">{s.type.replace("-", " ")}</p>
                  <div className="text-right">
                    <p className="text-white font-medium">{s.currentRun} days</p>
                    <p className="text-xs text-slate-500">Best: {s.longestRun}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
