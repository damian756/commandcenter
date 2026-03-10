import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-white mb-6">Weekly Review</h1>
      <p className="text-slate-400">Log your weekly targets and complete the review flow. Full flow coming soon.</p>
    </div>
  );
}
