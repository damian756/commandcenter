import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const [streaks, targets, goals] = await Promise.all([
    prisma.streak.findMany(),
    prisma.weeklyTarget.findMany({
      orderBy: { weekStarting: "desc" },
      take: 4,
    }),
    prisma.quarterlyGoal.findMany({
      orderBy: { quarter: "desc" },
      take: 4,
    }),
  ]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-white mb-6">Goals & Accountability</h1>

      <div className="space-y-6">
        <div>
          <h2 className="font-medium text-white mb-2">Streaks</h2>
          <div className="grid gap-2 md:grid-cols-4">
            {streaks.map((s) => (
              <div
                key={s.id}
                className="rounded border border-slate-800 bg-slate-900/50 p-3"
              >
                <p className="text-xs text-slate-400 capitalize">{s.type.replace(/-/g, " ")}</p>
                <p className="text-xl font-semibold text-cyan-400">{s.currentRun}</p>
                <p className="text-xs text-slate-500">Best: {s.longestRun}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-medium text-white mb-2">Recent weekly targets</h2>
          <div className="space-y-2">
            {targets.map((t) => (
              <div
                key={t.id}
                className="rounded border border-slate-800 bg-slate-900/50 p-3 flex justify-between items-center"
              >
                <span className="text-slate-300">
                  {new Date(t.weekStarting).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span className="text-sm text-slate-400">
                  Outreach: {t.outreachActual}/{t.outreachTarget} · Blog: {t.blogActual}/{t.blogTarget}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-medium text-white mb-2">Quarterly goals</h2>
          {goals.length === 0 ? (
            <p className="text-slate-500 text-sm">No goals set</p>
          ) : (
            <div className="space-y-2">
              {goals.map((g) => (
                <div
                  key={g.id}
                  className="rounded border border-slate-800 bg-slate-900/50 p-3"
                >
                  <p className="text-slate-300">{g.quarter} – {g.metric}</p>
                  <div className="mt-1 h-2 rounded bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-cyan-600"
                      style={{
                        width: `${Math.min(100, (g.current / g.target) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {g.current} / {g.target} {g.unit}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
