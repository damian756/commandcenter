"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type SiteData = {
  ok: boolean;
  data?: {
    site: string;
    revenue?: { hubMRR: number; featuredMRR: number; hubMembers: number; featuredListings: number };
    content?: { totalListings: number; claimedListings: number };
    analytics?: { pageviewsThisMonth: number };
  };
};

type Invoice = {
  id: string;
  amount: number;
  status: string;
  dueAt: string | null;
  project: { name: string; clientName: string };
};

export default function RevenuePage() {
  const [sites, setSites] = useState<Record<string, SiteData>>({});
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/stats").then((r) => r.json()),
      fetch("/api/projects/invoices").then((r) => r.json()),
    ]).then(([statsData, invoiceData]) => {
      setSites(statsData.sites ?? {});
      setInvoices(invoiceData.invoices ?? []);
      setLoading(false);
    });
  }, []);

  const revenueRows = Object.entries(sites)
    .filter(([, s]) => s.ok && s.data?.revenue)
    .map(([slug, s]) => {
      const rev = s.data!.revenue!;
      const mrr = (rev.hubMRR ?? 0) + (rev.featuredMRR ?? 0);
      return { slug, mrr, hubMembers: rev.hubMembers, featuredListings: rev.featuredListings };
    })
    .filter((r) => r.mrr > 0)
    .sort((a, b) => b.mrr - a.mrr);

  const totalNetworkMRR = revenueRows.reduce((s, r) => s + r.mrr, 0);

  const retainerTotal = invoices
    .filter((i) => i.status === "sent")
    .reduce((s, i) => s + i.amount, 0);

  const overdueTotal = invoices
    .filter((i) => i.status === "overdue" || (i.dueAt && new Date(i.dueAt) < new Date()))
    .reduce((s, i) => s + i.amount, 0);

  if (loading) {
    return <div className="p-6"><p className="text-slate-400 animate-pulse">Loading...</p></div>;
  }

  return (
    <div className="p-6 max-w-4xl space-y-8">
      <h1 className="text-2xl font-semibold text-white">Revenue</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Network MRR", value: `£${totalNetworkMRR.toLocaleString()}` },
          { label: "Network ARR", value: `£${(totalNetworkMRR * 12).toLocaleString()}` },
          { label: "Invoices pending", value: `£${retainerTotal.toFixed(0)}` },
          { label: "Invoices overdue", value: `£${overdueTotal.toFixed(0)}`, alert: overdueTotal > 0 },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.alert ? "text-red-400" : "text-white"}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Network MRR by site */}
      {revenueRows.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">MRR by site</h2>
          <div className="rounded-lg border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80">
                  <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Site</th>
                  <th className="text-right px-4 py-2.5 text-slate-400 font-medium">Hub members</th>
                  <th className="text-right px-4 py-2.5 text-slate-400 font-medium">Featured</th>
                  <th className="text-right px-4 py-2.5 text-slate-400 font-medium">MRR</th>
                </tr>
              </thead>
              <tbody>
                {revenueRows.map((r) => (
                  <tr key={r.slug} className="border-b border-slate-800/50 hover:bg-slate-900/30">
                    <td className="px-4 py-2.5 text-white capitalize">{r.slug.replace(/([A-Z])/g, " $1")}</td>
                    <td className="px-4 py-2.5 text-right text-slate-400">{r.hubMembers}</td>
                    <td className="px-4 py-2.5 text-right text-slate-400">{r.featuredListings}</td>
                    <td className="px-4 py-2.5 text-right text-cyan-400 font-medium">£{r.mrr.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-slate-900/50">
                  <td className="px-4 py-2.5 text-white font-medium" colSpan={3}>Total</td>
                  <td className="px-4 py-2.5 text-right text-cyan-400 font-bold">£{totalNetworkMRR.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoices */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Outstanding invoices</h2>
          <Link href="/projects/invoices" className="text-xs text-cyan-400 hover:text-cyan-300">Manage →</Link>
        </div>
        {invoices.length === 0 ? (
          <p className="text-sm text-slate-500">No outstanding invoices.</p>
        ) : (
          <div className="rounded-lg border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80">
                  <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Client</th>
                  <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Due</th>
                  <th className="text-right px-4 py-2.5 text-slate-400 font-medium">Amount</th>
                  <th className="text-right px-4 py-2.5 text-slate-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const overdue = inv.status === "overdue" || (inv.dueAt && new Date(inv.dueAt) < new Date());
                  return (
                    <tr key={inv.id} className="border-b border-slate-800/50">
                      <td className="px-4 py-2.5 text-white">{inv.project.clientName}</td>
                      <td className="px-4 py-2.5 text-slate-400">
                        {inv.dueAt ? new Date(inv.dueAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-white">£{inv.amount.toFixed(0)}</td>
                      <td className={`px-4 py-2.5 text-right text-xs font-medium ${overdue ? "text-red-400" : "text-amber-400"}`}>
                        {overdue ? "Overdue" : "Sent"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
