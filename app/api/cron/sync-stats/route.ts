import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncContacts } from "@/lib/sync-contacts";

export const dynamic = "force-dynamic";

const ENV_KEY_MAP: Record<string, string> = {
  southportguide: "STATS_API_KEY_SOUTHPORTGUIDE",
  lakesguide: "STATS_API_KEY_LAKESGUIDE",
  formbyguide: "STATS_API_KEY_FORMBYGUIDE",
  seftoncoastwildlife: "STATS_API_KEY_SCW",
  seftonlinks: "STATS_API_KEY_SL",
  hikethelakes: "STATS_API_KEY_HTL",
  lakeswildlife: "STATS_API_KEY_LW",
  forefrontimaging: "STATS_API_KEY_FI",
  churchtownmedia: "STATS_API_KEY_CM",
  seftoncoastnetwork: "STATS_API_KEY_SCN",
  alotek: "STATS_API_KEY_ALOTEK",
};

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const sites = await prisma.siteConfig.findMany({
    where: { statsApiUrl: { not: "" } },
  });

  const results: Record<string, { ok: boolean; error?: string }> = {};

  await Promise.all(
    sites.map(async (site) => {
      const envKeyName = ENV_KEY_MAP[site.slug];
      const apiKey = (envKeyName && process.env[envKeyName]) || site.apiKey;

      if (!apiKey || apiKey === "placeholder") {
        results[site.slug] = { ok: false, error: "No API key" };
        return;
      }

      try {
        const res = await fetch(site.statsApiUrl, {
          headers: { "x-api-key": apiKey },
          next: { revalidate: 0 },
        });

        if (!res.ok) {
          results[site.slug] = { ok: false, error: `HTTP ${res.status}` };
          return;
        }

        const data = await res.json();

        await prisma.siteConfig.update({
          where: { id: site.id },
          data: { lastStats: data, lastFetchAt: new Date() },
        });

        results[site.slug] = { ok: true };
      } catch (e) {
        results[site.slug] = {
          ok: false,
          error: e instanceof Error ? e.message : "Failed",
        };
      }
    })
  );

  const contactResults = await syncContacts();

  return NextResponse.json({ synced: results, contacts: contactResults, at: new Date().toISOString() });
}
