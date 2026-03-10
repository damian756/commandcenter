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

  const contacts = await prisma.contact.findMany({
    include: {
      threads: {
        take: 1,
        orderBy: { updatedAt: "desc" },
        select: { id: true, subject: true, status: true, updatedAt: true },
      },
    },
    orderBy: [{ lastContactAt: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  const templates = await prisma.emailTemplate.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <OutreachClient
      initialContacts={contacts}
      templates={templates}
    />
  );
}
