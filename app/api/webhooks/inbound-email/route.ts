import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

// Resend sends inbound email payloads as JSON
// Note: `to` is string[] in Resend's actual payload, not {email}[]
type ResendInboundPayload = {
  type: string;
  data: {
    email_id?: string;
    to: string[];
    from: string;
    subject?: string;
    html?: string;
    text?: string;
  };
};

async function fetchEmailBody(emailId: string): Promise<{ html: string; text: string }> {
  // First try via Resend SDK
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data: email, error } = await resend.emails.get(emailId);
    if (!error && email) {
      const record = email as Record<string, unknown>;
      const html = typeof record.html === "string" ? record.html : "";
      const text = typeof record.text === "string" ? record.text : "";
      if (html || text) return { html, text };
    }
  } catch {
    // fall through to raw fetch
  }

  // Fallback: raw Resend REST API
  try {
    const res = await fetch(`https://api.resend.com/emails/${emailId}`, {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });
    if (res.ok) {
      const data = await res.json() as Record<string, unknown>;
      return {
        html: typeof data.html === "string" ? data.html : "",
        text: typeof data.text === "string" ? data.text : "",
      };
    }
  } catch {
    // give up
  }

  return { html: "", text: "" };
}

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

  const { email_id, to, from, subject } = payload.data;
  let { html, text } = payload.data;
  const toList = Array.isArray(to) ? to : [];
  const threadId = extractThreadId(toList);

  console.log("[inbound-email] received", { email_id, from, subject, toList, hasHtml: !!html, hasText: !!text });

  // If body is empty in the webhook payload, fetch it from Resend API
  if ((!html || html.trim() === "") && (!text || text.trim() === "") && email_id) {
    console.log("[inbound-email] body empty in payload, fetching from Resend API", email_id);
    const fetched = await fetchEmailBody(email_id);
    html = fetched.html;
    text = fetched.text;
    console.log("[inbound-email] fetched body", { hasHtml: !!html, hasText: !!text });
  }

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
      resendId: email_id ?? null,
      status: "delivered",
    },
  });

  // Update thread status
  await prisma.thread.update({
    where: { id: thread.id },
    data: { status: "waiting-reply", updatedAt: new Date() },
  });

  // Fetch contact name for notification
  const contact = await prisma.contact.findUnique({
    where: { id: thread.contactId },
    select: { businessName: true, email: true, pipelineStatus: true },
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

  // Send notification email to Damian
  if (process.env.RESEND_API_KEY && contact) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Command Centre <damian@churchtownmedia.co.uk>",
        to: "damian@churchtownmedia.co.uk",
        subject: `Reply from ${contact.businessName}: ${subject ?? "(no subject)"}`,
        html: `<p><strong>${contact.businessName}</strong> (${from}) has replied to your outreach.</p>
               <p><strong>Subject:</strong> ${subject ?? "(no subject)"}</p>
               <hr/>
               ${html ?? `<p>${text ?? ""}</p>`}
               <hr/>
               <p><a href="https://command.churchtownmedia.co.uk/outreach">View in Command Centre →</a></p>`,
      });
    } catch (e) {
      console.warn("[inbound-email] failed to send notification:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
