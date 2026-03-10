"use client";

import { useState, useEffect } from "react";

type SiteConfig = {
  id: string;
  slug: string;
  name: string;
  domain: string;
  network: string;
  statsApiUrl: string;
  apiKey: string;
  hasRevenue: boolean;
  hasListings: boolean;
};

export default function SettingsPage() {
  const [sites, setSites] = useState<SiteConfig[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ apiKey: "", statsApiUrl: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings/sites")
      .then((r) => r.json())
      .then((d) => { setSites(d.sites ?? []); setLoading(false); });
  }, []);

  function startEdit(site: SiteConfig) {
    setEditing(site.id);
    setEditValues({ apiKey: site.apiKey, statsApiUrl: site.statsApiUrl });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    await fetch("/api/settings/sites", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...editValues }),
    });
    setSaving(false);
    setSaved(id);
    setEditing(null);
    setTimeout(() => setSaved(null), 2000);
    const res = await fetch("/api/settings/sites");
    const d = await res.json();
    setSites(d.sites ?? []);
  }

  if (loading) return <div className="p-6"><p className="text-slate-400 animate-pulse">Loading...</p></div>;

  const grouped = sites.reduce<Record<string, SiteConfig[]>>((acc, s) => {
    acc[s.network] = [...(acc[s.network] ?? []), s];
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage site API keys and endpoints. Changes take effect immediately.</p>
      </div>

      {Object.entries(grouped).map(([network, networkSites]) => (
        <div key={network}>
          <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 capitalize">
            {network} network
          </h2>
          <div className="space-y-2">
            {networkSites.map((site) => (
              <div key={site.id} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-white font-medium text-sm">{site.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{site.domain}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {saved === site.id && (
                      <span className="text-xs text-emerald-400">Saved</span>
                    )}
                    {editing === site.id ? (
                      <>
                        <button
                          onClick={() => setEditing(null)}
                          className="text-xs text-slate-400 hover:text-white px-2 py-1"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveEdit(site.id)}
                          disabled={saving}
                          className="text-xs bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-3 py-1 rounded transition-colors"
                        >
                          {saving ? "Saving..." : "Save"}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startEdit(site)}
                        className="text-xs text-slate-400 hover:text-white border border-slate-700 px-3 py-1 rounded transition-colors"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                {editing === site.id ? (
                  <div className="space-y-2 mt-3">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">API Key (x-api-key header)</p>
                      <input
                        type="text"
                        value={editValues.apiKey}
                        onChange={(e) => setEditValues({ ...editValues, apiKey: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Stats API URL</p>
                      <input
                        type="text"
                        value={editValues.statsApiUrl}
                        onChange={(e) => setEditValues({ ...editValues, statsApiUrl: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-6 mt-1 text-xs text-slate-500">
                    <span>
                      Key: {site.apiKey && site.apiKey !== "placeholder"
                        ? <span className="text-emerald-400">Set ✓</span>
                        : <span className="text-red-400">Not set</span>}
                    </span>
                    <span>
                      Endpoint: {site.statsApiUrl
                        ? <span className="text-slate-400 font-mono">{site.statsApiUrl.replace("https://", "")}</span>
                        : <span className="text-red-400">Not set</span>}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
