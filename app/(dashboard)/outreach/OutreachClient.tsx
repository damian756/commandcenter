"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { Send, Search, ChevronLeft, ChevronRight, Pencil, Check, X } from "lucide-react";
import { EmailComposer } from "./EmailComposer";

type Contact = {
  id: string;
  businessName: string;
  contactName: string | null;
  email: string;
  pipelineStatus: string;
  priority: string;
  category: string | null;
  nextFollowUp: string | Date | null;
  lastContactAt: string | Date | null;
  threads: { id: string; subject: string; status: string; updatedAt: string | Date }[];
};

type Template = {
  id: string;
  name: string;
  subject: string;
  body: string;
};

const STATUS_OPTIONS = [
  { value: "__inbox__", label: "Inbox" },
  { value: "", label: "All" },
  { value: "prospect", label: "Prospect" },
  { value: "engaged", label: "Engaged" },
  { value: "listing-claimed", label: "Claimed" },
  { value: "hub-signed", label: "Hub Signed" },
  { value: "cm-lead", label: "CM Lead" },
  { value: "cm-signed", label: "CM Signed" },
  { value: "declined", label: "Declined" },
  { value: "dormant", label: "Dormant" },
];

const STATUS_COLOURS: Record<string, string> = {
  prospect: "bg-slate-700 text-slate-300",
  engaged: "bg-blue-900/60 text-blue-300",
  "listing-claimed": "bg-green-900/60 text-green-300",
  "hub-signed": "bg-emerald-900/60 text-emerald-300",
  "cm-lead": "bg-amber-900/60 text-amber-300",
  "cm-signed": "bg-amber-700/60 text-amber-200",
  declined: "bg-red-900/40 text-red-400",
  dormant: "bg-slate-800 text-slate-500",
};

export function OutreachClient({ templates }: { templates: Template[] }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("__inbox__");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composeFor, setComposeFor] = useState<Contact | null>(null);
  const [threads, setThreads] = useState<Record<string, { id: string; subject: string; messages: { direction: string; from: string; to: string; subject: string | null; body: string; bodyPlain: string | null; sentAt: string }[] }[]>>({});
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchContacts = useCallback(async (p: number, s: string, q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (s === "__inbox__") {
        params.set("inbox", "1");
      } else if (s) {
        params.set("status", s);
      }
      if (q) params.set("search", q);
      const res = await fetch(`/api/contacts?${params}`);
      const data = await res.json();
      setContacts(data.contacts ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchContacts(page, status, search);
  }, [page, status, search, fetchContacts]);

  function handleSearchChange(val: string) {
    setSearchInput(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 300);
  }

  function handleStatusChange(val: string) {
    setStatus(val);
    setPage(1);
    setSelectedId(null);
  }

  async function loadThreads(contactId: string) {
    const res = await fetch(`/api/threads?contactId=${contactId}`);
    const data = await res.json();
    if (data.threads) {
      setThreads((prev) => ({ ...prev, [contactId]: data.threads }));
      // Mark all inbound messages in these threads as read
      for (const thread of data.threads) {
        fetch("/api/outreach/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threadId: thread.id }),
        }).catch(() => {});
      }
    }
  }

  function handleSelect(id: string) {
    setSelectedId(id);
    setEditingEmail(false);
    loadThreads(id);
  }

  function handleComposeSent() {
    setComposeFor(null);
    fetchContacts(page, status, search);
    if (selectedId) loadThreads(selectedId);
  }

  function startEditEmail() {
    if (!selected) return;
    setEmailDraft(selected.email);
    setEditingEmail(true);
  }

  async function saveEmail() {
    if (!selected || !emailDraft.trim()) return;
    setSavingEmail(true);
    try {
      const res = await fetch(`/api/contacts/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailDraft.trim() }),
      });
      if (res.ok) {
        setContacts((prev) =>
          prev.map((c) => c.id === selected.id ? { ...c, email: emailDraft.trim() } : c)
        );
        setEditingEmail(false);
      }
    } catch {}
    setSavingEmail(false);
  }

  const selected = contacts.find((c) => c.id === selectedId);

  return (
    <div className="flex h-screen bg-slate-950">
      {/* Sidebar */}
      <div className="w-80 border-r border-slate-800 flex flex-col flex-shrink-0">

        {/* Header */}
        <div className="p-3 border-b border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <h1 className="font-semibold text-white">
              Contacts
              {total > 0 && (
                <span className="ml-2 text-xs font-normal text-slate-500">{total.toLocaleString()}</span>
              )}
            </h1>
            <a href="/outreach/import" className="text-xs text-cyan-400 hover:text-cyan-300">
              CSV import
            </a>
          </div>

          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            <input
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search name or email..."
              className="w-full pl-8 pr-3 py-1.5 rounded bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
            />
          </div>

          {/* Status filter */}
          <div className="flex gap-1 flex-wrap">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleStatusChange(opt.value)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                  status === opt.value
                    ? opt.value === "__inbox__"
                      ? "border-emerald-500 bg-emerald-900/30 text-emerald-300"
                      : "border-cyan-500 bg-cyan-900/30 text-cyan-300"
                    : opt.value === "__inbox__"
                      ? "border-emerald-800 text-emerald-500 hover:border-emerald-600"
                      : "border-slate-700 text-slate-400 hover:border-slate-500"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-slate-500 text-sm">Loading...</div>
          ) : contacts.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              {search || status ? "No contacts match." : "No contacts yet. Sync from Morning page."}
            </div>
          ) : (
            <ul className="divide-y divide-slate-800/50">
              {contacts.map((c) => {
                const hasReply = c.threads[0]?.status === "waiting-reply";
                return (
                  <li key={c.id} className={hasReply ? "border-l-2 border-emerald-500" : "border-l-2 border-transparent"}>
                    <button
                      onClick={() => handleSelect(c.id)}
                      className={`w-full text-left px-3 py-2.5 hover:bg-slate-800/50 transition ${
                        selectedId === c.id ? "bg-slate-800" : ""
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {hasReply && (
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                        )}
                        <p className={`truncate text-sm ${hasReply ? "font-bold text-white" : "font-medium text-white"}`}>
                          {c.businessName}
                        </p>
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{c.email}</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLOURS[c.pipelineStatus] ?? "bg-slate-700 text-slate-300"}`}>
                          {c.pipelineStatus}
                        </span>
                        {c.category && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">
                            {c.category}
                          </span>
                        )}
                        {c.priority === "hot" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/50 text-red-300">hot</span>
                        )}
                        {hasReply && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-300 font-semibold">
                            replied
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-500">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Detail panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {selected ? (
          <>
            <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-white">{selected.businessName}</h2>

                {/* Editable email */}
                {editingEmail ? (
                  <div className="flex items-center gap-1 mt-0.5">
                    <input
                      value={emailDraft}
                      onChange={(e) => setEmailDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveEmail(); if (e.key === "Escape") setEditingEmail(false); }}
                      autoFocus
                      className="text-sm rounded px-2 py-0.5 bg-slate-800 border border-slate-600 text-white focus:outline-none focus:border-cyan-500 w-64"
                    />
                    <button onClick={saveEmail} disabled={savingEmail} className="text-green-400 hover:text-green-300 disabled:opacity-40">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingEmail(false)} className="text-slate-500 hover:text-slate-300">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 mt-0.5 group">
                    <p className="text-sm text-slate-400">{selected.email}</p>
                    <button
                      onClick={startEditEmail}
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-slate-400 transition-opacity"
                      title="Edit email"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {selected.contactName && (
                  <p className="text-sm text-slate-500">{selected.contactName}</p>
                )}
                {selected.lastContactAt && (
                  <p className="text-xs text-slate-600 mt-1">
                    Last contact {formatDistanceToNow(new Date(selected.lastContactAt), { addSuffix: true })}
                  </p>
                )}
              </div>
              <button
                onClick={() => setComposeFor(selected)}
                className="flex items-center gap-2 px-3 py-1.5 rounded bg-cyan-600 text-white text-sm hover:bg-cyan-500 flex-shrink-0"
              >
                <Send className="w-4 h-4" />
                Compose
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {(threads[selected.id] ?? []).map((thread) => (
                <div key={thread.id} className="space-y-2">
                  <p className="text-sm font-medium text-slate-300">{thread.subject}</p>
                  {thread.messages.map((msg) => (
                    <div
                      key={msg.sentAt}
                      className={`rounded overflow-hidden border ${
                        msg.direction === "outbound"
                          ? "border-cyan-800/50 ml-4"
                          : "border-slate-600 mr-4"
                      }`}
                    >
                      <div className={`px-3 py-1.5 text-xs ${
                        msg.direction === "outbound"
                          ? "bg-cyan-900/40 text-cyan-300"
                          : "bg-slate-700 text-slate-400"
                      }`}>
                        {msg.direction === "outbound" ? "You" : msg.from} →{" "}
                        {formatDistanceToNow(new Date(msg.sentAt), { addSuffix: true })}
                      </div>
                      {msg.body && msg.body.trim() ? (
                        <div
                          className="bg-white p-4 text-sm"
                          dangerouslySetInnerHTML={{ __html: msg.body }}
                        />
                      ) : (msg as {bodyPlain?: string}).bodyPlain?.trim() ? (
                        <pre className="bg-white p-4 text-sm text-gray-800 whitespace-pre-wrap font-sans">
                          {(msg as {bodyPlain?: string}).bodyPlain}
                        </pre>
                      ) : (
                        <p className="bg-white p-4 text-sm text-gray-400 italic">(no message content — the sender may have sent a blank reply)</p>
                      )}
                    </div>
                  ))}
                </div>
              ))}
              {(!threads[selected.id] || threads[selected.id].length === 0) && (
                <p className="text-slate-500 text-sm">No emails sent yet. Click Compose to send the first one.</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
            Select a contact from the list
          </div>
        )}
      </div>

      {composeFor && (
        <EmailComposer
          contact={composeFor}
          templates={templates}
          onClose={() => setComposeFor(null)}
          onSent={handleComposeSent}
        />
      )}
    </div>
  );
}
