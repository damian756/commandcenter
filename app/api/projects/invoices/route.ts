import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const invoices = await prisma.invoice.findMany({
    where: { status: { in: ["sent", "overdue"] } },
    include: { project: { select: { name: true, clientName: true } } },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
  });

  const overdue = invoices.filter(
    (i) => i.status === "overdue" || (i.dueAt && new Date(i.dueAt) < new Date())
  );
  const sent = invoices.filter((i) => i.status === "sent");

  return NextResponse.json({ invoices: [...overdue, ...sent] });
}
