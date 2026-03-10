"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import Image from "next/image";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type ConversationMeta = {
  id: string;
  title: string;
  updatedAt: string;
};

const QUOTES = [
  "All we have to decide is what to do with the time that is given us.",
  "Even the very wise cannot see all ends.",
  "A wizard is never late. He arrives precisely when he means to.",
  "Not all those who wander are lost.",
  "Courage is found in unlikely places.",
  "It is not despair, for despair is only for those who see the end beyond all doubt.",
  "I will not say: do not weep; for not all tears are an evil.",
  "The world is not in your books and maps. It is out there.",
  "Do not be too eager to deal out death in judgment.",
  "Some believe it is only great power that can hold evil in check. That is not what I have found.",
  "The greatest adventure is what lies ahead.",
  "He that breaks a thing to find out what it is, has left the path of wisdom.",
];

const SUGGESTED_PROMPTS = [
  "What is the most important thing I should do today?",
  "Which fires are going cold across the network?",
  "What does The Open 2026 require of me right now?",
  "Am I avoiding something I shouldn't be?",
  "How should I approach the BID relationship?",
  "What does the road ahead look like for the Lakes Network?",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<ConversationMeta[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [quote] = useState(
    () => QUOTES[Math.floor(Math.random() * QUOTES.length)]
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);
  const historyPanelRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledUpRef.current = distanceFromBottom > 80;
  }

  useEffect(() => {
    if (!userScrolledUpRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Close history panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (historyPanelRef.current && !historyPanelRef.current.contains(e.target as Node)) {
        setHistoryOpen(false);
      }
    }
    if (historyOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [historyOpen]);

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      setHistory(data);
    } catch {}
    setHistoryLoading(false);
  }

  function toggleHistory() {
    if (!historyOpen) loadHistory();
    setHistoryOpen((v) => !v);
  }

  async function loadConversation(id: string) {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      const data = await res.json();
      setMessages(data.messages);
      setConversationId(id);
      setHistoryOpen(false);
      userScrolledUpRef.current = false;
    } catch {}
  }

  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setHistory((h) => h.filter((c) => c.id !== id));
    if (conversationId === id) startNewChat();
  }

  function startNewChat() {
    setMessages([]);
    setConversationId(null);
    setError(null);
    userScrolledUpRef.current = false;
  }

  async function saveConversation(msgs: Message[], currentId: string | null): Promise<string> {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: currentId, messages: msgs }),
    });
    const data = await res.json();
    return data.id;
  }

  function copyTranscript() {
    const text = messages
      .map((m) => `${m.role === "user" ? "Damian" : "Gandalf"}: ${m.content}`)
      .join("\n\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function send(content: string) {
    if (!content.trim() || loading) return;

    const userMessage: Message = { role: "user", content: content.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);

    const placeholder: Message = { role: "assistant", content: "" };
    setMessages([...newMessages, placeholder]);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: accumulated };
          return updated;
        });
      }

      // Auto-save conversation after response
      const finalMessages = [...newMessages, { role: "assistant" as const, content: accumulated }];
      const savedId = await saveConversation(finalMessages, conversationId);
      setConversationId(savedId);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-screen" style={{ background: "#0d0b09" }}>

      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between flex-shrink-0" style={{ borderColor: "#2a2218", background: "#0d0b09" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0" style={{ border: "1px solid #6a5a3a" }}>
            <Image
              src="/gandalf-white.webp"
              alt="Gandalf the White"
              width={36}
              height={36}
              className="object-cover w-full h-full"
              priority
            />
          </div>
          <div>
            <p className="font-semibold text-sm tracking-wide" style={{ color: "#f0e8d0" }}>
              Gandalf the White
            </p>
            <p className="text-xs" style={{ color: "#5a5040" }}>
              Returned from shadow. Sees what must be done.
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block animate-pulse mr-1" style={{ background: "#c4922a" }} />

          {/* History button */}
          <div className="relative" ref={historyPanelRef}>
            <button
              onClick={toggleHistory}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{
                border: "1px solid #2a2218",
                color: historyOpen ? "#e8d5a3" : "#7a6a50",
                background: historyOpen ? "#1e1810" : "transparent",
              }}
            >
              History
            </button>

            {historyOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-72 rounded-xl overflow-hidden z-50"
                style={{ border: "1px solid #2a2218", background: "#13100d", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}
              >
                <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: "#2a2218" }}>
                  <span className="text-xs font-medium" style={{ color: "#7a6a50" }}>Recent conversations</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {historyLoading ? (
                    <p className="text-xs px-3 py-4 text-center" style={{ color: "#5a4e38" }}>Loading...</p>
                  ) : history.length === 0 ? (
                    <p className="text-xs px-3 py-4 text-center italic" style={{ color: "#5a4e38" }}>No past conversations</p>
                  ) : (
                    history.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => loadConversation(conv.id)}
                        className="w-full text-left px-3 py-2.5 flex items-start justify-between gap-2 transition-colors group"
                        style={{ borderBottom: "1px solid #1a1510" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#1e1810")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate" style={{ color: conversationId === conv.id ? "#e8d5a3" : "#a89070" }}>
                            {conv.title}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: "#4a4030" }}>
                            {new Date(conv.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <button
                          onClick={(e) => deleteConversation(conv.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{ color: "#7a4040", border: "1px solid #3a2020" }}
                        >
                          ×
                        </button>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* New chat */}
          <button
            onClick={startNewChat}
            disabled={isEmpty && !conversationId}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ border: "1px solid #2a2218", color: "#7a6a50", background: "transparent" }}
            onMouseEnter={(e) => { if (!isEmpty || conversationId) e.currentTarget.style.borderColor = "#5c4a2a"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2a2218"; }}
          >
            New chat
          </button>

          {/* Copy transcript */}
          {messages.length > 0 && (
            <button
              onClick={copyTranscript}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ border: "1px solid #2a2218", color: copied ? "#a8c090" : "#7a6a50", background: "transparent" }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-6">
        {isEmpty ? (
          <div className="max-w-4xl mx-auto">
            {/* Flanking images — desktop only */}
            <div className="relative">
              <div className="hidden lg:block absolute -left-40 top-0 w-36 h-72 pointer-events-none overflow-hidden rounded-xl opacity-20"
                style={{ maskImage: "linear-gradient(to right, transparent, black 50%)" }}>
                <Image src="/gandalf-grey.avif" alt="" fill className="object-cover object-top" />
              </div>
              <div className="hidden lg:block absolute -right-40 top-0 w-36 h-72 pointer-events-none overflow-hidden rounded-xl opacity-30"
                style={{ maskImage: "linear-gradient(to left, transparent, black 50%)" }}>
                <Image src="/gandalf-white.webp" alt="" fill className="object-cover object-top" />
              </div>

              <div className="text-center mb-10">
                <div className="relative w-28 h-28 rounded-full overflow-hidden mx-auto mb-5"
                  style={{ border: "2px solid #8a7a50", boxShadow: "0 0 50px rgba(220,200,140,0.12), 0 0 100px rgba(220,200,140,0.05)" }}>
                  <Image src="/gandalf-white.webp" alt="Gandalf the White" fill className="object-cover object-top" priority />
                </div>
                <h2 className="text-xl font-semibold tracking-wide mb-1" style={{ color: "#f0e8d0" }}>
                  A wizard is never idle.
                </h2>
                <p className="text-sm mt-4 italic leading-relaxed max-w-md mx-auto" style={{ color: "#7a6a50" }}>
                  &ldquo;{quote}&rdquo;
                </p>
                <p className="text-xs mt-2" style={{ color: "#5a4e38" }}>
                  — Gandalf the White
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => send(prompt)}
                  className="text-left p-4 rounded-xl text-sm italic transition-colors"
                  style={{ border: "1px solid #2a2218", color: "#a89070", background: "transparent" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#5c4a2a"; e.currentTarget.style.background = "#15120e"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2a2218"; e.currentTarget.style.background = "transparent"; }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mt-1" style={{ border: "1px solid #6a5a3a" }}>
                    <Image src="/gandalf-white.webp" alt="Gandalf the White" width={28} height={28} className="object-cover w-full h-full" />
                  </div>
                )}
                <div
                  className="rounded-2xl px-4 py-3 text-base leading-relaxed whitespace-pre-wrap"
                  style={{
                    maxWidth: "85%",
                    ...(msg.role === "user"
                      ? { background: "#2a2218", color: "#e8d5a3", borderTopRightRadius: "4px" }
                      : { background: "#13100d", borderLeft: "2px solid #5c4a2a", color: "#d4c4a0", borderTopLeftRadius: "4px" }),
                  }}
                >
                  {msg.role === "assistant" && msg.content === "" && loading ? (
                    <span className="inline-flex gap-1 py-1">
                      <span className="w-2 h-2 rounded-full animate-bounce [animation-delay:0ms]" style={{ background: "#7a6030" }} />
                      <span className="w-2 h-2 rounded-full animate-bounce [animation-delay:150ms]" style={{ background: "#7a6030" }} />
                      <span className="w-2 h-2 rounded-full animate-bounce [animation-delay:300ms]" style={{ background: "#7a6030" }} />
                    </span>
                  ) : msg.role === "assistant" && msg.content === "" && !loading ? (
                    <span style={{ color: "#7a6a50", fontStyle: "italic" }}>The wizard did not respond. Try again.</span>
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mt-1" style={{ border: "1px solid #3a2e1a" }}>
                    <Image src="/gandalf-grey.avif" alt="You" width={28} height={28} className="object-cover w-full h-full" />
                  </div>
                )}
              </div>
            ))}

            {error && (
              <div className="text-center">
                <p className="text-red-400 text-sm bg-red-900/20 rounded-xl px-4 py-3 inline-block">{error}</p>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-4 flex-shrink-0" style={{ borderTop: "1px solid #2a2218", background: "#0d0b09" }}>
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Speak your question, Damian..."
              rows={2}
              disabled={loading}
              className="flex-1 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none disabled:opacity-50"
              style={{ background: "#13100d", border: "1px solid #2a2218", color: "#d4c4a0", maxHeight: "120px" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#5c4a2a")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2218")}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-full sm:w-auto rounded-xl px-6 py-3 text-sm font-medium transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "#3d2e12", color: "#e8d5a3", border: "1px solid #5c4a2a" }}
              onMouseEnter={(e) => { if (!loading && input.trim()) e.currentTarget.style.background = "#4f3c18"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#3d2e12"; }}
            >
              {loading ? "Thinking..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
