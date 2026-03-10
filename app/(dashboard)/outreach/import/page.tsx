"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";

const SITE_CONFIGS = [
  {
    slug: "southportguide",
    name: "Southport Guide",
    url: "https://www.southportguide.co.uk/api/command-centre/unclaimed-listings",
  },
  {
    slug: "thelakesguide",
    name: "The Lakes Guide",
    url: "https://thelakesguide.co.uk/api/command-centre/unclaimed-listings",
  },
];

export default function ImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [apiKey, setApiKey] = useState("");

  async function fetchFromSite(site: (typeof SITE_CONFIGS)[0]) {
    if (!apiKey.trim()) {
      alert("Enter the API key for the site (COMMAND_CENTRE_API_KEY from the site's env)");
      return;
    }
    setImporting(true);
    setResult(null);
    try {
      const res = await fetch(site.url, {
        headers: { "x-api-key": apiKey },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fetch failed");

      const listings = data.listings ?? [];
      if (listings.length === 0) {
        setResult({ imported: 0, skipped: 0 });
        return;
      }

      const importRes = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: data.site,
          listings,
          site: data.site,
        }),
      });
      const importData = await importRes.json();
      if (!importRes.ok) throw new Error(importData.error ?? "Import failed");
      setResult(importData);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

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
      <h1 className="text-2xl font-semibold text-white mb-6">Import Contacts</h1>

      <div className="space-y-6">
        <div>
          <label className="block text-sm text-slate-400 mb-2">
            API key (COMMAND_CENTRE_API_KEY from the site)
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="For fetching from Southport/Lakes Guide"
            className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder-slate-500"
          />
        </div>

        <div>
          <h2 className="font-medium text-white mb-2">Fetch from site</h2>
          <div className="flex gap-2">
            {SITE_CONFIGS.map((site) => (
              <button
                key={site.slug}
                onClick={() => fetchFromSite(site)}
                disabled={importing}
                className="px-4 py-2 rounded bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-50"
              >
                {importing ? "Importing..." : `Import from ${site.name}`}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-medium text-white mb-2">Or upload CSV</h2>
          <p className="text-sm text-slate-400 mb-2">
            CSV must have columns: email, name (or businessName), and optionally phone, website, address, category
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
            className="px-4 py-2 rounded border border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            Choose CSV file
          </button>
        </div>

        {result && (
          <div className="rounded border border-slate-700 bg-slate-800/50 p-4">
            <p className="text-white">
              Imported: {result.imported} | Skipped (duplicates): {result.skipped}
            </p>
          </div>
        )}
      </div>

      <div className="mt-8">
        <button
          onClick={() => router.push("/outreach")}
          className="text-cyan-400 hover:text-cyan-300"
        >
          ← Back to Outreach
        </button>
      </div>
    </div>
  );
}
