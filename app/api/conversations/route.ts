import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const conversations = await prisma.conversation.findMany({
    orderBy: { updatedAt: "desc" },
    take: 30,
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json(conversations);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id, messages } = await req.json();

  const firstUserMsg = messages.find((m: { role: string; content: string }) => m.role === "user");
  const title = firstUserMsg
    ? firstUserMsg.content.slice(0, 60) + (firstUserMsg.content.length > 60 ? "..." : "")
    : "New conversation";

  if (id) {
    const conversation = await prisma.conversation.update({
      where: { id },
      data: { messages, title },
    });
    return NextResponse.json(conversation);
  }

  const conversation = await prisma.conversation.create({
    data: { messages, title },
  });
  return NextResponse.json(conversation);
}
