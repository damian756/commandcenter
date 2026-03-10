import { prisma } from "@/lib/prisma";

type RemoteContact = {
  id: string;
  businessName: string;
  email: string;
  phone: string | null;
  website: string | null;
  address: string | null;
  category: string;
  listingUrl: string;
  listingId: string;
};

const CONTACT_SYNC_SITES: {
  slug: string;
  network: string;
  url: string;
  envKey: string;
}[] = [
  {
    slug: "southportguide",
    network: "sefton",
    url: "https://www.southportguide.co.uk/api/command-centre/contacts",
    envKey: "STATS_API_KEY_SOUTHPORTGUIDE",
  },
];

export async function syncContacts(): Promise<Record<string, { added: number; skipped: number; error?: string }>> {
  const results: Record<string, { added: number; skipped: number; error?: string }> = {};

  for (const site of CONTACT_SYNC_SITES) {
    const apiKey = process.env[site.envKey];
    if (!apiKey || apiKey === "placeholder") {
      results[site.slug] = { added: 0, skipped: 0, error: "No API key" };
      continue;
    }

    try {
      const res = await fetch(site.url, {
        headers: { "x-api-key": apiKey },
        next: { revalidate: 0 },
      });

      if (!res.ok) {
        results[site.slug] = { added: 0, skipped: 0, error: `HTTP ${res.status}` };
        continue;
      }

      const data = await res.json();
      const contacts: RemoteContact[] = data.contacts ?? [];

      let added = 0;
      let skipped = 0;

      for (const c of contacts) {
        // Check by listingId first (so edited emails are never overwritten),
        // then fall back to email match to avoid duplicates
        const existing = await prisma.contact.findFirst({
          where: {
            site: site.slug,
            OR: [
              { listingId: c.listingId },
              { email: c.email.trim() },
            ],
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await prisma.contact.create({
          data: {
            businessName: c.businessName,
            email: c.email.trim(),
            phone: c.phone ?? null,
            website: c.website ?? null,
            address: c.address ?? null,
            category: c.category,
            listingUrl: c.listingUrl,
            listingId: c.listingId,
            network: site.network,
            site: site.slug,
            source: "site-import",
            pipelineStatus: "prospect",
          },
        });
        added++;
      }

      results[site.slug] = { added, skipped };
    } catch (e) {
      results[site.slug] = {
        added: 0,
        skipped: 0,
        error: e instanceof Error ? e.message : "Failed",
      };
    }
  }

  return results;
}
