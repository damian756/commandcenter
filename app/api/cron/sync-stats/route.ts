import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const sites = await prisma.siteConfig.findMany({
    where: { slug: { not: "churchtownmedia" }, statsApiUrl: { not: "" } },
  });

  let updated = 0;
  for (const site of sites) {
    try {
      const res = await fetch(site.statsApiUrl, {
        headers: { "x-api-key": site.apiKey },
      });
      const data = await res.json();
      if (res.ok) {
        await prisma.siteConfig.update({
          where: { id: site.id },
          data: { lastStats: data, lastFetchAt: new Date() },
        });
        updated++;
      }
    } catch {
      // skip failed fetches
    }
  }

  return NextResponse.json({ ok: true, updated });
}
