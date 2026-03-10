import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const sites = await prisma.siteConfig.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ sites });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id, apiKey, statsApiUrl } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const site = await prisma.siteConfig.update({
    where: { id },
    data: {
      ...(apiKey !== undefined && { apiKey }),
      ...(statsApiUrl !== undefined && { statsApiUrl }),
    },
  });

  return NextResponse.json({ site });
}
