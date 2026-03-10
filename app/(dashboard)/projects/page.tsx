import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const projects = await prisma.project.findMany({
    include: {
      retainerMonths: { take: 1, orderBy: { month: "desc" } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-white">Projects</h1>
        <Link
          href="/projects/invoices"
          className="text-cyan-400 hover:text-cyan-300 text-sm"
        >
          View invoices →
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((p) => {
          const latest = p.retainerMonths[0];
          return (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 hover:border-slate-700 transition"
            >
              <h2 className="font-medium text-white">{p.name}</h2>
              <p className="text-sm text-slate-400">{p.clientName}</p>
              <div className="mt-2 flex gap-2">
                <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                  {p.type}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                  {p.status}
                </span>
              </div>
              {p.monthlyFee && (
                <p className="text-cyan-400 text-sm mt-2">£{p.monthlyFee}/mo</p>
              )}
              {latest && p.type === "seo-retainer" && (
                <p className="text-xs text-slate-500 mt-1">
                  Latest: {latest.month} – {latest.blogPostsWritten}/{latest.agreedBlogPosts} posts
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
