import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      retainerMonths: { orderBy: { month: "desc" } },
      invoices: { orderBy: { issuedAt: "desc" }, take: 10 },
    },
  });

  if (!project) notFound();

  const currentMonth = project.retainerMonths.find(
    (r) => r.month === new Date().toISOString().slice(0, 7)
  ) ?? project.retainerMonths[0];

  return (
    <div className="p-6 max-w-4xl">
      <Link href="/projects" className="text-cyan-400 hover:text-cyan-300 text-sm mb-4 inline-block">
        ← Back to projects
      </Link>
      <h1 className="text-2xl font-semibold text-white">{project.name}</h1>
      <p className="text-slate-400">{project.clientName}</p>

      {project.type === "seo-retainer" && currentMonth && (
        <div className="mt-6 rounded border border-slate-800 bg-slate-900/50 p-4">
          <h2 className="font-medium text-white mb-3">
            Retainer – {currentMonth.month}
          </h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-slate-400">Blog posts</p>
              <p className="text-white">
                {currentMonth.blogPostsWritten} / {currentMonth.agreedBlogPosts}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Pages created</p>
              <p className="text-white">
                {currentMonth.pagesCreated} / {currentMonth.agreedPagesCreated}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Technical</p>
              <p className="text-white">
                {currentMonth.technicalCompleted} / {currentMonth.agreedTechnical}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        <h2 className="font-medium text-white mb-2">Recent invoices</h2>
        {project.invoices.length === 0 ? (
          <p className="text-slate-500 text-sm">No invoices</p>
        ) : (
          <ul className="space-y-2">
            {project.invoices.map((inv) => (
              <li
                key={inv.id}
                className="flex justify-between items-center py-2 border-b border-slate-800"
              >
                <span className="text-slate-300">£{inv.amount}</span>
                <span className="text-xs text-slate-500">{inv.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
