"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Mail, Send, Plus } from "lucide-react";
import { EmailComposer } from "./EmailComposer";

type Contact = {
  id: string;
  businessName: string;
  contactName: string | null;
  email: string;
  pipelineStatus: string;
  priority: string;
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

export function OutreachClient({
  initialContacts,
  templates,
}: {
  initialContacts: Contact[];
  templates: Template[];
}) {
  const [contacts, setContacts] = useState(initialContacts);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composeFor, setComposeFor] = useState<Contact | null>(null);
  const [threads, setThreads] = useState<Record<string, { id: string; subject: string; messages: { direction: string; from: string; to: string; subject: string | null; body: string; sentAt: string }[] }[]>>({});

  const selected = contacts.find((c) => c.id === selectedId);

  async function loadThreads(contactId: string) {
    const res = await fetch(`/api/threads?contactId=${contactId}`);
    const data = await res.json();
    if (data.threads) {
      setThreads((prev) => ({ ...prev, [contactId]: data.threads }));
    }
  }

  function handleSelect(id: string) {
    setSelectedId(id);
    if (!threads[id]) loadThreads(id);
  }

  function handleComposeSent() {
    setComposeFor(null);
    fetch("/api/contacts")
      .then((r) => r.json())
      .then((d) => setContacts(d.contacts ?? contacts));
    if (selectedId) loadThreads(selectedId);
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="w-80 border-r border-slate-800 overflow-y-auto flex-shrink-0">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <h1 className="font-semibold text-white">Contacts</h1>
          <a
            href="/outreach/import"
            className="text-sm text-cyan-400 hover:text-cyan-300"
          >
            Import
          </a>
        </div>
        <ul className="divide-y divide-slate-800/50">
          {contacts.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => handleSelect(c.id)}
                className={`w-full text-left px-3 py-2.5 hover:bg-slate-800/50 transition ${
                  selectedId === c.id ? "bg-slate-800" : ""
                }`}
              >
                <p className="font-medium text-white truncate">{c.businessName}</p>
                <p className="text-xs text-slate-400 truncate">{c.email}</p>
                <div className="flex gap-1 mt-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                    {c.pipelineStatus}
                  </span>
                  {c.priority === "hot" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/50 text-red-300">
                      hot
                    </span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {selected ? (
          <>
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-white">{selected.businessName}</h2>
                <p className="text-sm text-slate-400">{selected.email}</p>
              </div>
              <button
                onClick={() => setComposeFor(selected)}
                className="flex items-center gap-2 px-3 py-1.5 rounded bg-cyan-600 text-white text-sm hover:bg-cyan-500"
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
                      className={`rounded p-3 ${
                        msg.direction === "outbound"
                          ? "bg-cyan-900/20 border border-cyan-800/50 ml-4"
                          : "bg-slate-800/50 border border-slate-700 mr-4"
                      }`}
                    >
                      <p className="text-xs text-slate-400 mb-1">
                        {msg.direction === "outbound" ? "You" : msg.from} → {msg.to} ·{" "}
                        {formatDistanceToNow(new Date(msg.sentAt), { addSuffix: true })}
                      </p>
                      <div
                        className="text-sm text-slate-200 prose prose-invert prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: msg.body }}
                      />
                    </div>
                  ))}
                </div>
              ))}
              {(!threads[selected.id] || threads[selected.id].length === 0) && (
                <p className="text-slate-500 text-sm">No threads yet. Click Compose to send an email.</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            Select a contact
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
