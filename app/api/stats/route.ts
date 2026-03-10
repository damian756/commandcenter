import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const sites = await prisma.siteConfig.findMany({
    where: { slug: { not: "churchtownmedia" }, statsApiUrl: { not: "" } },
  });

  const results: Record<
    string,
    { ok: boolean; data?: unknown; error?: string }
  > = {};

  await Promise.all(
    sites.map(async (site) => {
      try {
        const res = await fetch(site.statsApiUrl, {
          headers: { "x-api-key": site.apiKey },
          next: { revalidate: 0 },
        });
        const data = await res.json();
        if (!res.ok) {
          results[site.slug] = { ok: false, error: data.error ?? "Fetch failed" };
          return;
        }
        results[site.slug] = { ok: true, data };
      } catch (e) {
        results[site.slug] = {
          ok: false,
          error: e instanceof Error ? e.message : "Fetch failed",
        };
      }
    })
  );

  return NextResponse.json({ sites: results });
}
