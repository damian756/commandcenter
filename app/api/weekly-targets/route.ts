import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const targets = await prisma.weeklyTarget.findMany({
    orderBy: { weekStarting: "desc" },
    take: 12,
  });
  return NextResponse.json({ targets });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await req.json();
  const {
    weekStarting,
    outreachTarget, outreachActual,
    publishingTarget, publishingActual,
    revenueTarget, revenueActual,
    notes,
  } = body;

  const target = await prisma.weeklyTarget.upsert({
    where: { weekStarting: new Date(weekStarting) },
    create: {
      weekStarting: new Date(weekStarting),
      outreachTarget: outreachTarget ?? 0,
      outreachActual: outreachActual ?? 0,
      publishingTarget: publishingTarget ?? 0,
      publishingActual: publishingActual ?? 0,
      revenueTarget: revenueTarget ?? 0,
      revenueActual: revenueActual ?? 0,
      notes: notes ?? null,
    },
    update: {
      outreachTarget: outreachTarget ?? 0,
      outreachActual: outreachActual ?? 0,
      publishingTarget: publishingTarget ?? 0,
      publishingActual: publishingActual ?? 0,
      revenueTarget: revenueTarget ?? 0,
      revenueActual: revenueActual ?? 0,
      notes: notes ?? null,
    },
  });

  return NextResponse.json({ target });
}
