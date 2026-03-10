import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const templates = await prisma.emailTemplate.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { name, subject, body: bodyHtml, bodyPlain, brand, stage } = body;

  if (!name || !subject || !bodyHtml) {
    return NextResponse.json(
      { error: "name, subject, and body are required" },
      { status: 400 }
    );
  }

  const template = await prisma.emailTemplate.create({
    data: {
      name,
      subject,
      body: bodyHtml,
      bodyPlain: bodyPlain ?? null,
      brand: brand ?? "southportguide",
      stage: stage ?? null,
    },
  });

  return NextResponse.json(template);
}
