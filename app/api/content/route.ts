import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const items = await prisma.contentItem.findMany({
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const { site, title, type, status, dueDate, url, notes } = body;

  if (!site || !title || !type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const item = await prisma.contentItem.create({
    data: {
      site,
      title,
      type: type ?? "blog-post",
      status: status ?? "idea",
      dueDate: dueDate ? new Date(dueDate) : null,
      url: url ?? null,
      notes: notes ?? null,
    },
  });
  return NextResponse.json({ item });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const item = await prisma.contentItem.update({
    where: { id },
    data: {
      ...(data.status && { status: data.status }),
      ...(data.title && { title: data.title }),
      ...(data.url !== undefined && { url: data.url }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
      ...(data.publishedAt !== undefined && { publishedAt: data.publishedAt ? new Date(data.publishedAt) : null }),
    },
  });
  return NextResponse.json({ item });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.contentItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
