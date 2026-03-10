import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const SITE_RESET_ENDPOINTS: { slug: string; url: string; envKey: string }[] = [
  { slug: "southportguide",    url: "https://southportguide.co.uk/api/command-centre/stats",      envKey: "STATS_API_KEY_SOUTHPORTGUIDE" },
  { slug: "formbyguide",       url: "https://formbyguide.co.uk/api/command-centre/stats",         envKey: "STATS_API_KEY_FORMBYGUIDE" },
  { slug: "seftoncoastwildlife", url: "https://seftoncoastwildlife.co.uk/api/command-centre/stats", envKey: "STATS_API_KEY_SCW" },
  { slug: "seftonlinks",       url: "https://seftonlinks.com/api/command-centre/stats",           envKey: "STATS_API_KEY_SL" },
  { slug: "lakesguide",        url: "https://thelakesguide.co.uk/api/command-centre/stats",       envKey: "STATS_API_KEY_LAKESGUIDE" },
  { slug: "lakeswildlife",     url: "https://thelakeswildlife.co.uk/api/command-centre/stats",    envKey: "STATS_API_KEY_LW" },
  { slug: "hikethelakes",      url: "https://hikethelakes.com/api/command-centre/stats",          envKey: "STATS_API_KEY_HTL" },
  { slug: "forefrontimaging",  url: "https://forefrontimaging.co.uk/api/command-centre/stats",    envKey: "STATS_API_KEY_FI" },
  { slug: "churchtownmedia",   url: "https://churchtownmedia.co.uk/api/command-centre/stats",     envKey: "STATS_API_KEY_CM" },
  { slug: "seftoncoastnetwork", url: "https://seftoncoast.network/api/command-centre/stats",      envKey: "STATS_API_KEY_SCN" },
  { slug: "alotek",            url: "https://alotekshelters.co.uk/api/command-centre/stats",      envKey: "STATS_API_KEY_ALOTEK" },
];

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const results: Record<string, string> = {};

  await Promise.allSettled(
    SITE_RESET_ENDPOINTS.map(async ({ slug, url, envKey }) => {
      const apiKey = process.env[envKey];
      if (!apiKey) { results[slug] = "no api key"; return; }
      try {
        const res = await fetch(url, {
          method: "DELETE",
          headers: { "x-api-key": apiKey },
          signal: AbortSignal.timeout(10000),
        });
        results[slug] = res.ok ? "cleared" : `error ${res.status}`;
      } catch (e) {
        results[slug] = `fetch failed: ${e instanceof Error ? e.message : "unknown"}`;
      }
    })
  );

  // Also clear the Command Centre's cached stats so the UI shows 0 immediately
  await prisma.siteConfig.updateMany({
    data: { lastStats: Prisma.DbNull, lastFetchAt: null },
  });

  return NextResponse.json({ ok: true, results });
}
