import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { source, listings, site } = body; // source: "southportguide" | "lakesguide" | "csv"

  if (!listings || !Array.isArray(listings)) {
    return NextResponse.json(
      { error: "listings array is required" },
      { status: 400 }
    );
  }

  const targetSite = site ?? (source === "thelakesguide" ? "thelakesguide" : "southportguide");
  const targetNetwork = targetSite === "thelakesguide" ? "lakes" : "sefton";

  let imported = 0;
  let skipped = 0;

  for (const row of listings) {
    const email = row.email ?? row.Email;
    if (!email || typeof email !== "string") {
      skipped++;
      continue;
    }

    const existing = await prisma.contact.findFirst({
      where: { email: email.trim(), site: targetSite },
    });
    if (existing) {
      skipped++;
      continue;
    }

    await prisma.contact.create({
      data: {
        businessName: (row.name ?? row.businessName ?? row.Business ?? "Unknown").toString(),
        contactName: (row.contactName ?? row.ContactName ?? row.contact_name)?.toString() ?? null,
        email: email.trim(),
        phone: (row.phone ?? row.Phone)?.toString() ?? null,
        website: (row.website ?? row.Website)?.toString() ?? null,
        address: (row.address ?? row.Address)?.toString() ?? null,
        category: (row.category ?? row.Category)?.toString() ?? null,
        listingUrl: (row.listingUrl ?? row.listing_url)?.toString() ?? null,
        listingId: (row.id ?? row.listingId)?.toString() ?? null,
        network: targetNetwork,
        site: targetSite,
        source: source === "csv" ? "csv-import" : "site-import",
      },
    });
    imported++;
  }

  return NextResponse.json({ imported, skipped });
}
