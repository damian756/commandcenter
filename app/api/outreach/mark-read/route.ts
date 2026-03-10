import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { threadId } = await req.json().catch(() => ({}));
  if (!threadId) {
    return NextResponse.json({ error: "threadId required" }, { status: 400 });
  }

  await prisma.message.updateMany({
    where: {
      threadId,
      direction: "inbound",
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
