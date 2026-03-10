"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const router = useRouter();

  async function handleSync() {
    setSyncing(true);
    try {
      await fetch("/api/admin/sync-stats", { method: "POST" });
      router.refresh();
    } catch {}
    setSyncing(false);
  }

  async function handleReset() {
    if (!confirm("Delete all analytics data from every site? This cannot be undone.")) return;
    setResetting(true);
    try {
      const res = await fetch("/api/admin/reset-analytics", { method: "POST" });
      const data = await res.json();
      const failed = Object.entries(data.results ?? {})
        .filter(([, v]) => v !== "cleared")
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      if (failed) alert(`Reset issues: ${failed}`);
      router.refresh();
    } catch {}
    setResetting(false);
  }

  return (
    <div className="flex gap-2 mt-1">
      <button
        onClick={handleSync}
        disabled={syncing || resetting}
        className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {syncing ? "Syncing..." : "Sync now"}
      </button>
      <button
        onClick={handleReset}
        disabled={syncing || resetting}
        className="text-xs px-3 py-1.5 rounded-lg border border-red-900 text-red-500 hover:border-red-700 hover:text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {resetting ? "Resetting..." : "Reset analytics"}
      </button>
    </div>
  );
}
