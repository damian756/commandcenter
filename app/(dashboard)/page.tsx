import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { SyncButton } from "@/components/SyncButton";

export const dynamic = "force-dynamic";

type StatsData = {
  analytics?: { pageviewsToday: number; pageviewsThisWeek: number; pageviewsThisMonth: number };
  content?: { totalListings: number; claimedListings: number; lastBlogPostDate: string | null };
  revenue?: { hubMRR: number; featuredMRR: number };
};

export default async function MorningPage() {
  const [sites, invoices, streaks] = await Promise.all([
    prisma.siteConfig.findMany({ orderBy: { name: "asc" } }),
    prisma.invoice.findMany({
      where: { status: { in: ["sent", "overdue"] } },
      include: { project: { select: { name: true, clientName: true } } },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      take: 5,
    }),
    prisma.streak.findMany(),
  ]);

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Morning" : now.getHours() < 17 ? "Afternoon" : "Evening";

  const sitesWithStats = sites.map((s) => ({
    ...s,
    stats: s.lastStats as StatsData | null,
  }));

  const totalToday = sitesWithStats.reduce(
    (sum, s) => sum + (s.stats?.analytics?.pageviewsToday ?? 0), 0
  );
  const totalWeek = sitesWithStats.reduce(
    (sum, s) => sum + (s.stats?.analytics?.pageviewsThisWeek ?? 0), 0
  );
  const totalMRR = sitesWithStats.reduce(
    (sum, s) => sum + (s.stats?.revenue?.hubMRR ?? 0) + (s.stats?.revenue?.featuredMRR ?? 0), 0
  );
  const overdueInvoices = invoices.filter(
    (i) => i.status === "overdue" || (i.dueAt && new Date(i.dueAt) < now)
  );

  const lastSync = sites.find((s) => s.lastFetchAt)?.lastFetchAt;

  return (
    <div className="p-6 space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">{greeting}, Damian.</h1>
          <p className="text-slate-500 text-sm mt-1">
            {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="text-right">
          {lastSync ? (
            <p className="text-xs text-slate-600">
              Stats synced {lastSync.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </p>
          ) : (
            <p className="text-xs text-amber-500">Stats not yet synced</p>
          )}
          <Link href="/analytics" className="text-xs text-cyan-400 hover:text-cyan-300">
            Live analytics →
          </Link>
          <SyncButton />
        </div>
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
          <div key={stat.label} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.alert ? "text-red-400" : "text-white"}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Site grid */}
      <div>
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">Sites</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sitesWithStats.map((site) => (
            <div key={site.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              <p className="text-sm font-medium text-white mb-2">{site.name}</p>
              {site.stats ? (
                <div className="space-y-1 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Today</span>
                    <span className="text-white font-medium">
                      {(site.stats.analytics?.pageviewsToday ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>This week</span>
                    <span>{(site.stats.analytics?.pageviewsThisWeek ?? 0).toLocaleString()}</span>
                  </div>
                  {(site.stats.content?.totalListings ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Listings</span>
                      <span>
                        {site.stats.content!.claimedListings}/{site.stats.content!.totalListings}
                      </span>
                    </div>
                  )}
                  {site.stats.content?.lastBlogPostDate && (
                    <div className="flex justify-between">
                      <span>Last post</span>
                      <span className={
                        new Date(site.stats.content.lastBlogPostDate) <
                        new Date(Date.now() - 14 * 86400000)
                          ? "text-amber-400"
                          : ""
                      }>
                        {new Date(site.stats.content.lastBlogPostDate).toLocaleDateString(
                          "en-GB", { day: "numeric", month: "short" }
                        )}
                      </span>
                    </div>
                  )}
                  {((site.stats.revenue?.hubMRR ?? 0) + (site.stats.revenue?.featuredMRR ?? 0)) > 0 && (
                    <div className="flex justify-between">
                      <span>MRR</span>
                      <span className="text-cyan-400">
                        £{((site.stats.revenue!.hubMRR ?? 0) + (site.stats.revenue!.featuredMRR ?? 0)).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-600">No data yet</p>
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
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Outstanding Invoices</h2>
            <Link href="/projects/invoices" className="text-xs text-cyan-400 hover:text-cyan-300">All →</Link>
          </div>
          {invoices.length === 0 ? (
            <p className="text-sm text-slate-500">No outstanding invoices.</p>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => {
                const overdue = inv.status === "overdue" || (inv.dueAt && new Date(inv.dueAt) < now);
                return (
                  <div key={inv.id} className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm">
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
                        £{inv.amount.toFixed(0)}
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
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Streaks</h2>
            <Link href="/goals" className="text-xs text-cyan-400 hover:text-cyan-300">All →</Link>
          </div>
          {streaks.length === 0 ? (
            <p className="text-sm text-slate-500">No streaks tracked yet.</p>
          ) : (
            <div className="space-y-2">
              {streaks.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm">
                  <p className="text-white capitalize">{s.type.replace(/-/g, " ")}</p>
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
