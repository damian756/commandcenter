import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-webhook-secret");
  const expected = process.env.COMMAND_CENTRE_WEBHOOK_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  let body: {
    listingId?: string;
    businessName?: string;
    email?: string;
    claimedAt?: string;
    listingUrl?: string;
    site?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { listingId, businessName, email, listingUrl, site } = body;
  if (!email || !site) {
    return NextResponse.json({ error: "Missing email or site" }, { status: 400 });
  }

  try {
    const contact = await prisma.contact.findFirst({
      where: {
        email,
        site: site === "southportguide" ? "southportguide" : site === "thelakesguide" ? "thelakesguide" : site,
      },
    });

    if (contact) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          listingClaimed: true,
          pipelineStatus: "listing-claimed",
          listingId: listingId ?? contact.listingId,
          listingUrl: listingUrl ?? contact.listingUrl,
          lastContactAt: new Date(),
        },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("listing-claimed webhook error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
