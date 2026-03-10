import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const resend = getResend();
  if (!resend) {
    return NextResponse.json(
      { error: "Resend not configured" },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { contactId, subject, bodyHtml, bodyPlain, brand } = body;

  if (!contactId || !subject || !bodyHtml) {
    return NextResponse.json(
      { error: "contactId, subject, and bodyHtml are required" },
      { status: 400 }
    );
  }

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
  });
  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const from =
    brand === "churchtownmedia"
      ? "Damian <damian@churchtownmedia.co.uk>"
      : "Southport Guide <hello@southportguide.co.uk>";

  const { data, error } = await resend.emails.send({
    from,
    to: contact.email,
    subject,
    html: bodyHtml,
    text: bodyPlain ?? bodyHtml.replace(/<[^>]*>/g, ""),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const threadId = `thread-${contactId}-${Date.now()}`;
  const thread = await prisma.thread.create({
    data: {
      contactId,
      subject,
      brand: brand ?? "southportguide",
      threadId,
    },
  });

  await prisma.message.create({
    data: {
      threadId: thread.id,
      direction: "outbound",
      from,
      to: contact.email,
      subject,
      body: bodyHtml,
      bodyPlain: bodyPlain ?? null,
      resendId: data?.id ?? null,
      status: "sent",
    },
  });

  await prisma.contact.update({
    where: { id: contactId },
    data: {
      lastContactAt: new Date(),
      followUpCount: { increment: 1 },
      nextFollowUp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return NextResponse.json({ ok: true, messageId: data?.id });
}
