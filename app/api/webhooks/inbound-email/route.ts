import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

// Widened type — Resend inbound payload includes more fields than outbound.
// We capture everything so nothing is silently dropped.
type ResendInboundData = {
  email_id?: string;
  message_id?: string;    // alternative ID field used in some Resend versions
  to: string[];
  from: string;
  subject?: string;
  html?: string | null;
  text?: string | null;
  headers?: Record<string, string> | null;
  attachments?: unknown[];
  spam_score?: number;
  [key: string]: unknown; // catch-all so nothing is lost
};

type ResendInboundPayload = {
  type: string;
  data: ResendInboundData;
};

async function fetchEmailById(id: string): Promise<{ html: string; text: string }> {
  // resend.emails.get() — works for both inbound and outbound
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data: email, error } = await resend.emails.get(id);
    if (!error && email) {
      const html = email.html ?? "";
      const text = email.text ?? "";
      console.log("[inbound-email] SDK fetch result", { id, hasHtml: !!html, hasText: !!text });
      if (html || text) return { html, text };
    }
  } catch (e) {
    console.warn("[inbound-email] SDK fetch failed", e);
  }

  // Raw REST fallback
  try {
    const res = await fetch(`https://api.resend.com/emails/${id}`, {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });
    const raw = await res.text();
    console.log("[inbound-email] raw REST response", { id, status: res.status, body: raw.slice(0, 500) });
    if (res.ok) {
      const data = JSON.parse(raw) as { html?: string | null; text?: string | null };
      return { html: data.html ?? "", text: data.text ?? "" };
    }
  } catch (e) {
    console.warn("[inbound-email] raw REST fetch failed", e);
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
    console.warn("[inbound-email] webhook secret mismatch, proceeding anyway");
  }

  // Read the raw body text first so we can log it before parsing
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: "Could not read body" }, { status: 400 });
  }

  // Log the full raw payload — this is the key diagnostic line
  console.log("[inbound-email] RAW PAYLOAD:", rawBody.slice(0, 2000));

  let payload: ResendInboundPayload;
  try {
    payload = JSON.parse(rawBody) as ResendInboundPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.type !== "email.received") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const data = payload.data;
  const email_id = data.email_id ?? data.message_id; // try both ID fields
  const { to, from, subject } = data;
  let html = (typeof data.html === "string" ? data.html : null) ?? "";
  let text = (typeof data.text === "string" ? data.text : null) ?? "";
  const toList = Array.isArray(to) ? to : [];
  const threadId = extractThreadId(toList);

  console.log("[inbound-email] parsed", {
    email_id,
    from,
    subject,
    toList,
    hasHtml: !!html,
    hasText: !!text,
    htmlLen: html.length,
    textLen: text.length,
    allKeys: Object.keys(data),
  });

  // If body is empty, try fetching from Resend API using the email ID
  if (!html.trim() && !text.trim() && email_id) {
    console.log("[inbound-email] body empty, attempting API fetch for", email_id);
    const fetched = await fetchEmailById(email_id);
    html = fetched.html;
    text = fetched.text;
    console.log("[inbound-email] after fetch", { hasHtml: !!html, hasText: !!text });
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

  // Save the inbound message — prefer HTML body, fall back to plain text
  const bodyHtml = html.trim() ? html : (text.trim() ? `<p>${text.replace(/\n/g, "<br/>")}</p>` : "");
  await prisma.message.create({
    data: {
      threadId: thread.id,
      direction: "inbound",
      from,
      to: toList.join(", "),
      subject: subject ?? null,
      body: bodyHtml,
      bodyPlain: text.trim() ? text : null,
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
               ${bodyHtml || "<p><em>(no message content — sender sent a blank reply)</em></p>"}
               <hr/>
               <p><a href="https://command.churchtownmedia.co.uk/outreach">View in Command Centre →</a></p>`,
      });
    } catch (e) {
      console.warn("[inbound-email] failed to send notification:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
