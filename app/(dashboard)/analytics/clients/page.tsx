import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ClientAnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const projects = await prisma.project.findMany({
    where: { status: "active" },
    include: {
      invoices: { where: { status: { in: ["sent", "overdue"] } } },
    },
  });

  const totalMRR = projects.reduce((s, p) => s + (p.monthlyFee ?? 0), 0);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-white mb-6">Client Analytics</h1>
      <div className="space-y-4">
        <div className="rounded border border-slate-800 bg-slate-900/50 p-4">
          <p className="text-slate-400">Active client MRR</p>
          <p className="text-2xl font-semibold text-cyan-400">£{totalMRR.toFixed(0)}</p>
        </div>
        <div className="rounded border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/50">
                <th className="text-left py-3 px-4 text-slate-300">Project</th>
                <th className="text-left py-3 px-4 text-slate-300">Client</th>
                <th className="text-left py-3 px-4 text-slate-300">Monthly</th>
                <th className="text-left py-3 px-4 text-slate-300">Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-t border-slate-800">
                  <td className="py-3 px-4 text-white">{p.name}</td>
                  <td className="py-3 px-4 text-slate-300">{p.clientName}</td>
                  <td className="py-3 px-4 text-slate-300">£{p.monthlyFee ?? 0}</td>
                  <td className="py-3 px-4 text-slate-300">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
