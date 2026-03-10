import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    include: {
      retainerMonths: { take: 3, orderBy: { month: "desc" } },
      invoices: { where: { status: { in: ["sent", "overdue"] } } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const {
    name,
    clientName,
    clientEmail,
    clientContact,
    type,
    status,
    monthlyFee,
    contractValue,
    startDate,
    liveUrl,
  } = body;

  if (!name || !clientName) {
    return NextResponse.json(
      { error: "name and clientName are required" },
      { status: 400 }
    );
  }

  const project = await prisma.project.create({
    data: {
      name,
      clientName,
      clientEmail: clientEmail ?? null,
      clientContact: clientContact ?? null,
      type: type ?? "seo-retainer",
      status: status ?? "active",
      monthlyFee: monthlyFee ? parseFloat(monthlyFee) : null,
      contractValue: contractValue ? parseFloat(contractValue) : null,
      startDate: startDate ? new Date(startDate) : null,
      liveUrl: liveUrl ?? null,
    },
  });

  return NextResponse.json(project);
}
