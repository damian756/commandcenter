import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { DeepAnalyticsClient } from "./DeepAnalyticsClient";

export const dynamic = "force-dynamic";

export default async function DeepAnalyticsPage({
  params,
}: {
  params: Promise<{ site: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { site } = await params;
  if (!["southportguide", "lakesguide"].includes(site)) {
    notFound();
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-white mb-6">
        Deep Analytics – {site === "southportguide" ? "Southport Guide" : "The Lakes Guide"}
      </h1>
      <DeepAnalyticsClient site={site} />
    </div>
  );
}
