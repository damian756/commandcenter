"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  async function handleSync() {
    setSyncing(true);
    try {
      await fetch("/api/admin/sync-stats", { method: "POST" });
      router.refresh();
    } catch {}
    setSyncing(false);
  }

  return (
    <div className="flex gap-2 mt-1">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {syncing ? "Syncing..." : "Sync now"}
      </button>
    </div>
  );
}
