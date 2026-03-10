import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter"); // unread | follow-up-due | overdue | hot
  const site = searchParams.get("site");
  const pipelineStatus = searchParams.get("pipelineStatus");

  const where: Record<string, unknown> = {};
  if (site) where.site = site;
  if (pipelineStatus) where.pipelineStatus = pipelineStatus;
  if (filter === "hot") where.priority = "hot";
  if (filter === "follow-up-due") {
    where.nextFollowUp = { lte: new Date(), not: null };
  }
  if (filter === "overdue") {
    where.nextFollowUp = { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) };
  }

  const contacts = await prisma.contact.findMany({
    where,
    include: {
      threads: {
        take: 1,
        orderBy: { updatedAt: "desc" },
        select: { id: true, subject: true, status: true, updatedAt: true },
      },
    },
    orderBy: [{ lastContactAt: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return NextResponse.json({ contacts });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const {
    businessName,
    contactName,
    email,
    phone,
    website,
    address,
    category,
    listingUrl,
    listingId,
    network,
    site,
    source,
  } = body;

  if (!businessName || !email) {
    return NextResponse.json(
      { error: "businessName and email are required" },
      { status: 400 }
    );
  }

  const existing = await prisma.contact.findFirst({
    where: { email, site: site ?? "southportguide" },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Contact with this email already exists for this site" },
      { status: 400 }
    );
  }

  const contact = await prisma.contact.create({
    data: {
      businessName,
      contactName: contactName ?? null,
      email,
      phone: phone ?? null,
      website: website ?? null,
      address: address ?? null,
      category: category ?? null,
      listingUrl: listingUrl ?? null,
      listingId: listingId ?? null,
      network: network ?? "sefton",
      site: site ?? "southportguide",
      source: source ?? "cold-outreach",
    },
  });

  return NextResponse.json(contact);
}
