import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const invoices = await prisma.invoice.findMany({
    where: { status: { in: ["sent", "overdue", "draft"] } },
    include: { project: { select: { name: true, clientName: true } } },
    orderBy: [{ dueAt: "asc" }],
  });

  const now = new Date();
  const overdue = invoices.filter(
    (i) => i.dueAt && new Date(i.dueAt) < now && i.status !== "paid"
  );
  const pending = invoices.filter((i) => !overdue.includes(i));

  return (
    <div className="p-6">
      <Link href="/projects" className="text-cyan-400 hover:text-cyan-300 text-sm mb-4 inline-block">
        ← Back to projects
      </Link>
      <h1 className="text-2xl font-semibold text-white mb-6">Invoices</h1>

      {overdue.length > 0 && (
        <div className="mb-6">
          <h2 className="font-medium text-red-400 mb-2">Overdue</h2>
          <ul className="space-y-2">
            {overdue.map((i) => (
              <li
                key={i.id}
                className="flex justify-between items-center py-2 px-3 rounded bg-red-900/20 border border-red-800/50"
              >
                <div>
                  <span className="text-white">{i.project.name}</span>
                  <span className="text-slate-400 text-sm ml-2">
                    £{i.amount} · Due {i.dueAt ? new Date(i.dueAt).toLocaleDateString() : "-"}
                  </span>
                </div>
                <span className="text-xs text-red-400">{i.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="font-medium text-slate-300 mb-2">Pending</h2>
      {pending.length === 0 && overdue.length === 0 ? (
        <p className="text-slate-500 text-sm">No outstanding invoices</p>
      ) : (
        <ul className="space-y-2">
          {pending.map((i) => (
            <li
              key={i.id}
              className="flex justify-between items-center py-2 border-b border-slate-800"
            >
              <div>
                <span className="text-white">{i.project.name}</span>
                <span className="text-slate-400 text-sm ml-2">
                  £{i.amount} · Due {i.dueAt ? new Date(i.dueAt).toLocaleDateString() : "-"}
                </span>
              </div>
              <span className="text-xs text-slate-500">{i.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
