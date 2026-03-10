"use client";

import { useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

type Contact = {
  id: string;
  businessName: string;
  contactName: string | null;
  email: string;
};

type Template = {
  id: string;
  name: string;
  subject: string;
  body: string;
};

export function EmailComposer({
  contact,
  templates,
  onClose,
  onSent,
}: {
  contact: Contact;
  templates: Template[];
  onClose: () => void;
  onSent: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Write your email..." }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-sm max-w-none min-h-[200px] p-3 focus:outline-none",
      },
    },
  });

  const loadTemplate = useCallback(
    (t: Template) => {
      const name = contact.contactName || contact.businessName;
      const replace = (s: string) =>
        s.replace(/\{contactName\}/gi, name)
         .replace(/\{businessName\}/gi, contact.businessName)
         .replace(/\{email\}/gi, contact.email);
      setSubject(replace(t.subject));
      editor?.commands.setContent(replace(t.body));
    },
    [editor, contact]
  );

  async function handleSend() {
    if (!subject.trim()) {
      setError("Subject is required");
      return;
    }
    const html = editor?.getHTML() ?? "";
    if (!html || html === "<p></p>") {
      setError("Body is required");
      return;
    }

    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: contact.id,
          subject: subject.trim(),
          bodyHtml: html,
          bodyPlain: html.replace(/<[^>]*>/g, ""),
          brand: "churchtownmedia",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Send failed");
      onSent();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-2xl max-h-[90vh] rounded-lg border border-slate-700 bg-slate-900 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">Compose to {contact.businessName}</h3>
            <p className="text-xs text-slate-500 mt-0.5">From: Damian @ Churchtown Media &lt;damian@churchtownmedia.co.uk&gt;</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            ×
          </button>
        </div>
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          {templates.length > 0 && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Start from template</label>
              <div className="flex gap-2 flex-wrap">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => loadTemplate(t)}
                    className="text-xs px-2 py-1 rounded border border-slate-600 text-slate-300 hover:bg-slate-800"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Body</label>
            <div className="rounded border border-slate-600 bg-slate-800 overflow-hidden">
              <EditorContent editor={editor} />
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="rounded border border-slate-700 bg-slate-900/50 p-3 text-xs text-slate-500">
            <p className="font-medium text-slate-400 mb-0.5">Signature (appended automatically)</p>
            <p>Damian Roche &nbsp;·&nbsp; Director, Churchtown Media &nbsp;·&nbsp; SouthportGuide · FormbyGuide · SeftonLinks</p>
          </div>
        </div>
        <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="px-4 py-2 rounded bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
