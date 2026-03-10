import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  // TODO: Find SequenceEnrolment records where nextDueAt <= now, advance step, send next email
  // For now, no-op
  return NextResponse.json({ ok: true, advanced: 0 });
}
