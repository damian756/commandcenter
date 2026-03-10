import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OutreachClient } from "./OutreachClient";

export const dynamic = "force-dynamic";

export default async function OutreachPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string } | undefined;
  if (!user?.id) redirect("/login");

  const templates = await prisma.emailTemplate.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return <OutreachClient templates={templates} />;
}
