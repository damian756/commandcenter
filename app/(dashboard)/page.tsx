import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MorningPage() {
  const sites = await prisma.siteConfig.findMany({
    where: { slug: { not: "churchtownmedia" } },
    orderBy: { slug: "asc" },
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-white mb-6">Morning View</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sites.map((site) => (
          <div
            key={site.id}
            className="rounded-lg border border-slate-800 bg-slate-900/50 p-4"
          >
            <h2 className="font-medium text-white">{site.name}</h2>
            <p className="text-sm text-slate-400">{site.domain}</p>
            <p className="text-xs text-slate-500 mt-1">{site.network}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
