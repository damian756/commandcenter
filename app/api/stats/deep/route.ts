import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const siteSlug = searchParams.get("site");

  if (!siteSlug || !["southportguide", "lakesguide"].includes(siteSlug)) {
    return NextResponse.json(
      { error: "site must be southportguide or lakesguide" },
      { status: 400 }
    );
  }

  const site = await prisma.siteConfig.findUnique({
    where: { slug: siteSlug },
  });

  if (!site?.deepApiUrl) {
    return NextResponse.json(
      { error: "Deep analytics not available for this site" },
      { status: 404 }
    );
  }

  const period = searchParams.get("period") ?? "30";
  const url = `${site.deepApiUrl}?period=${period}`;

  try {
    const res = await fetch(url, {
      headers: { "x-api-key": site.apiKey },
      next: { revalidate: 0 },
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error ?? "Fetch failed" },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Fetch failed" },
      { status: 500 }
    );
  }
}
