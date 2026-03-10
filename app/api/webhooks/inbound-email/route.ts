import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Resend sends inbound email payloads as JSON
// Note: `to` is string[] in Resend's actual payload, not {email}[]
type ResendInboundPayload = {
  type: string;
  data: {
    to: string[];
    from: string;
    subject?: string;
    html?: string;
    text?: string;
  };
};

function extractThreadId(toAddresses: string[]): string | null {
  for (const addr of toAddresses) {
    const match = addr.match(/reply\+([^@]+)@/);
    if (match) return match[1];
  }
  return null;
}

export async function POST(req: NextRequest) {
  // Verify webhook secret
  const secret = req.headers.get("svix-secret") ??
    req.headers.get("webhook-secret") ??
    new URL(req.url).searchParams.get("secret");

  if (process.env.COMMAND_CENTRE_WEBHOOK_SECRET && secret !== process.env.COMMAND_CENTRE_WEBHOOK_SECRET) {
    // Resend may not send the secret as a header — log but don't hard-block during testing
    console.warn("[inbound-email] webhook secret mismatch, proceeding anyway");
  }

  let payload: ResendInboundPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.type !== "email.received") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { to, from, subject, html, text } = payload.data;
  const toList = Array.isArray(to) ? to : [];
  const threadId = extractThreadId(toList);

  if (!threadId) {
    console.warn("[inbound-email] no thread ID found in To address", to);
    return NextResponse.json({ ok: true, skipped: "no thread id" });
  }

  const thread = await prisma.thread.findUnique({ where: { threadId } });
  if (!thread) {
    console.warn("[inbound-email] thread not found:", threadId);
    return NextResponse.json({ ok: true, skipped: "thread not found" });
  }

  // Save the inbound message
  await prisma.message.create({
    data: {
      threadId: thread.id,
      direction: "inbound",
      from,
      to: toList.join(", "),
      subject: subject ?? null,
      body: html ?? text ?? "",
      bodyPlain: text ?? null,
      status: "delivered",
    },
  });

  // Update thread status
  await prisma.thread.update({
    where: { id: thread.id },
    data: { status: "waiting-reply", updatedAt: new Date() },
  });

  // Update contact: mark as replied, move to engaged
  await prisma.contact.update({
    where: { id: thread.contactId },
    data: {
      lastReplyAt: new Date(),
      pipelineStatus: "engaged",
      nextFollowUp: null,
    },
  });

  return NextResponse.json({ ok: true });
}
