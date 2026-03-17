import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const search = searchParams.get("search") ?? "";
  const site = searchParams.get("site") ?? "";
  const inbox = searchParams.get("inbox") === "1";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  const where: Record<string, unknown> = {};
  if (site) where.site = site;
  if (status) where.pipelineStatus = status;
  if (inbox) {
    // "Inbox" view: contacts with at least one waiting-reply thread
    where.threads = { some: { status: "waiting-reply" } };
  }
  if (search) {
    where.OR = [
      { businessName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { contactName: { contains: search, mode: "insensitive" } },
    ];
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: {
        threads: {
          take: 1,
          orderBy: { updatedAt: "desc" },
          select: { id: true, subject: true, status: true, updatedAt: true },
        },
      },
      orderBy: [
        // Contacts that have replied bubble to the top
        { lastReplyAt: { sort: "desc", nulls: "last" } },
        { lastContactAt: { sort: "desc", nulls: "last" } },
        { createdAt: "desc" },
      ],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.contact.count({ where }),
  ]);

  return NextResponse.json({
    contacts,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
  });
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
