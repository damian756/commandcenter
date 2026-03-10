import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { type, data } = body;

  if (!type || !data) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const emailId = data?.email_id ?? data?.id;
  if (!emailId) return NextResponse.json({ ok: true });

  const message = await prisma.message.findFirst({
    where: { resendId: emailId },
  });
  if (!message) return NextResponse.json({ ok: true });

  if (type === "email.delivered") {
    await prisma.message.update({
      where: { id: message.id },
      data: { status: "delivered" },
    });
  } else if (type === "email.opened") {
    await prisma.message.update({
      where: { id: message.id },
      data: { status: "opened", openedAt: new Date() },
    });
  } else if (type === "email.bounced" || type === "email.complained") {
    await prisma.message.update({
      where: { id: message.id },
      data: { status: "bounced" },
    });
  }

  return NextResponse.json({ ok: true });
}
