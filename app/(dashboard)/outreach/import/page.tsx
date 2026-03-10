"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";

export default function ImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);
    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        try {
          const rows = results.data as Record<string, string>[];
          const importRes = await fetch("/api/contacts/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              source: "csv",
              listings: rows,
              site: "southportguide",
            }),
          });
          const importData = await importRes.json();
          if (!importRes.ok) throw new Error(importData.error ?? "Import failed");
          setResult(importData);
        } catch (err) {
          alert(err instanceof Error ? err.message : "Import failed");
        } finally {
          setImporting(false);
        }
      },
    });
    e.target.value = "";
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold text-white mb-2">Import Contacts</h1>
      <p className="text-slate-400 text-sm mb-8">
        Contacts from Southport Guide are synced automatically each time you hit &ldquo;Sync now&rdquo; on the Morning page. Use this page to import a one-off CSV from an external source.
      </p>

      <div className="space-y-4">
        <div>
          <h2 className="font-medium text-white mb-1">Upload CSV</h2>
          <p className="text-sm text-slate-400 mb-3">
            Required columns: <code className="text-slate-300">email</code>, <code className="text-slate-300">name</code> (or <code className="text-slate-300">businessName</code>). Optional: phone, website, address, category.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="px-4 py-2 rounded border border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {importing ? "Importing..." : "Choose CSV file"}
          </button>
        </div>

        {result && (
          <div className="rounded border border-slate-700 bg-slate-800/50 p-4">
            <p className="text-white font-medium">Import complete</p>
            <p className="text-slate-300 text-sm mt-1">
              {result.imported} added · {result.skipped} skipped (already existed)
            </p>
          </div>
        )}
      </div>

      <div className="mt-8">
        <button
          onClick={() => router.push("/outreach")}
          className="text-cyan-400 hover:text-cyan-300 text-sm"
        >
          ← Back to Outreach
        </button>
      </div>
    </div>
  );
}
