import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Alert = {
  level: "critical" | "warning" | "info";
  title: string;
  detail: string;
  link?: string;
  linkLabel?: string;
};

export default async function AlertsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const now = new Date();
  const alerts: Alert[] = [];

  // --- Invoices ---
  const invoices = await prisma.invoice.findMany({
    where: { status: { in: ["sent", "overdue"] } },
    include: { project: { select: { name: true } } },
    orderBy: { dueAt: "asc" },
  });

  for (const inv of invoices) {
    if (!inv.dueAt) continue;
    const daysUntilDue = Math.ceil((inv.dueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const amount = `£${inv.amount.toLocaleString("en-GB")}`;

    if (daysUntilDue < 0) {
      const daysOverdue = Math.abs(daysUntilDue);
      alerts.push({
        level: "critical",
        title: `Invoice overdue — ${inv.project.name}`,
        detail: `${amount} was due ${daysOverdue} day${daysOverdue === 1 ? "" : "s"} ago${inv.description ? ` · ${inv.description}` : ""}`,
        link: "/projects/invoices",
        linkLabel: "View invoices",
      });
    } else if (daysUntilDue <= 7) {
      alerts.push({
        level: "warning",
        title: `Invoice due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"} — ${inv.project.name}`,
        detail: `${amount} due ${inv.dueAt.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}${inv.description ? ` · ${inv.description}` : ""}`,
        link: "/projects/invoices",
        linkLabel: "View invoices",
      });
    }
  }

  // --- Stale site stats ---
  const sites = await prisma.siteConfig.findMany({
    where: { statsApiUrl: { not: "" } },
    orderBy: { name: "asc" },
  });

  for (const site of sites) {
    if (!site.lastFetchAt) {
      alerts.push({
        level: "warning",
        title: `No stats yet — ${site.name}`,
        detail: "Analytics have never been synced for this site.",
        link: "/settings",
        linkLabel: "Sync stats",
      });
    } else {
      const hoursAgo = (now.getTime() - site.lastFetchAt.getTime()) / (1000 * 60 * 60);
      if (hoursAgo > 26) {
        alerts.push({
          level: "warning",
          title: `Stale data — ${site.name}`,
          detail: `Last synced ${Math.floor(hoursAgo)} hours ago. Data may be out of date.`,
          link: "/settings",
          linkLabel: "Sync stats",
        });
      }
    }
  }

  // --- Retainer underdelivery ---
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const retainerMonths = await prisma.retainerMonth.findMany({
    where: { month: currentMonth },
    include: { project: { select: { name: true, status: true } } },
  });

  for (const rm of retainerMonths) {
    if (rm.project.status !== "active") continue;
    const blogBehind = rm.agreedBlogPosts - (rm.blogPostsDelivered ?? 0);
    const pagesBehind = rm.agreedPagesCreated - (rm.pagesDelivered ?? 0);
    if (blogBehind > 0) {
      alerts.push({
        level: "info",
        title: `Blog delivery behind — ${rm.project.name}`,
        detail: `${blogBehind} blog post${blogBehind === 1 ? "" : "s"} still needed this month (${currentMonth}).`,
        link: "/projects",
        linkLabel: "View project",
      });
    }
    if (pagesBehind > 0) {
      alerts.push({
        level: "info",
        title: `Page delivery behind — ${rm.project.name}`,
        detail: `${pagesBehind} page${pagesBehind === 1 ? "" : "s"} still needed this month (${currentMonth}).`,
        link: "/projects",
        linkLabel: "View project",
      });
    }
  }

  // --- The Open 2026 countdown ---
  const openDate = new Date("2026-07-12");
  const daysToOpen = Math.ceil((openDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysToOpen > 0 && daysToOpen <= 120) {
    alerts.push({
      level: daysToOpen <= 30 ? "critical" : daysToOpen <= 60 ? "warning" : "info",
      title: `The Open 2026 — ${daysToOpen} days away`,
      detail: "Royal Birkdale, 12–19 July 2026. Accommodation partnerships, hub pages, and outreach should be active now.",
    });
  }

  const criticals = alerts.filter((a) => a.level === "critical");
  const warnings = alerts.filter((a) => a.level === "warning");
  const infos = alerts.filter((a) => a.level === "info");

  const levelStyle = {
    critical: {
      border: "border-red-800/60",
      bg: "bg-red-950/30",
      dot: "bg-red-500",
      title: "text-red-300",
      detail: "text-red-400/80",
    },
    warning: {
      border: "border-amber-800/60",
      bg: "bg-amber-950/20",
      dot: "bg-amber-400",
      title: "text-amber-200",
      detail: "text-amber-400/70",
    },
    info: {
      border: "border-slate-700",
      bg: "bg-slate-900/40",
      dot: "bg-slate-400",
      title: "text-slate-200",
      detail: "text-slate-400",
    },
  };

  function AlertList({ items }: { items: Alert[] }) {
    return (
      <div className="space-y-3">
        {items.map((alert, i) => {
          const s = levelStyle[alert.level];
          return (
            <div key={i} className={`rounded-xl border px-4 py-3 ${s.border} ${s.bg}`}>
              <div className="flex items-start gap-3">
                <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${s.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${s.title}`}>{alert.title}</p>
                  <p className={`text-xs mt-0.5 ${s.detail}`}>{alert.detail}</p>
                  {alert.link && (
                    <Link href={alert.link} className="text-xs text-cyan-500 hover:text-cyan-400 mt-1 inline-block">
                      {alert.linkLabel} →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-white">Alerts</h1>
        {alerts.length === 0 && (
          <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full">All clear</span>
        )}
        {alerts.length > 0 && (
          <span className="text-xs text-slate-400">
            {alerts.length} active alert{alerts.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 px-6 py-10 text-center">
          <p className="text-slate-400 text-sm">No alerts. Everything looks clean.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {criticals.length > 0 && (
            <div>
              <p className="text-xs font-medium text-red-400 uppercase tracking-wider mb-3">Critical</p>
              <AlertList items={criticals} />
            </div>
          )}
          {warnings.length > 0 && (
            <div>
              <p className="text-xs font-medium text-amber-400 uppercase tracking-wider mb-3">Warnings</p>
              <AlertList items={warnings} />
            </div>
          )}
          {infos.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Info</p>
              <AlertList items={infos} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
