"use client";

import { useState, useRef, useEffect, FormEvent, useCallback } from "react";
import Image from "next/image";

type ImageBlock = {
  type: "image";
  source: {
    type: "base64";
    media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    data: string;
  };
};

type TextBlock = {
  type: "text";
  text: string;
};

type ContentBlock = ImageBlock | TextBlock;

type Message = {
  role: "user" | "assistant";
  content: string | ContentBlock[];
  previewUrls?: string[]; // local blob URLs for display only
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

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type AllowedMime = (typeof ALLOWED_TYPES)[number];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getMessageText(msg: Message): string {
  if (typeof msg.content === "string") return msg.content;
  return msg.content
    .filter((b): b is TextBlock => b.type === "text")
    .map((b) => b.text)
    .join(" ");
}

function stripImages(messages: Message[]): { role: "user" | "assistant"; content: string }[] {
  return messages.map((m) => ({
    role: m.role,
    content: typeof m.content === "string" ? m.content : getMessageText(m),
  }));
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<{ file: File; previewUrl: string; base64: string; mimeType: AllowedMime }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<ConversationMeta[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);
  const historyPanelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (historyPanelRef.current && !historyPanelRef.current.contains(e.target as Node)) {
        setHistoryOpen(false);
      }
    }
    if (historyOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [historyOpen]);

  // Global paste handler for images
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const items = Array.from(e.clipboardData?.items ?? []);
    const imageItems = items.filter((item) => ALLOWED_TYPES.includes(item.type as AllowedMime));
    if (!imageItems.length) return;

    e.preventDefault();
    for (const item of imageItems) {
      const file = item.getAsFile();
      if (!file) continue;
      const base64 = await fileToBase64(file);
      const previewUrl = URL.createObjectURL(file);
      setPendingImages((prev) => [...prev, { file, previewUrl, base64, mimeType: file.type as AllowedMime }]);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      pendingImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
  }, []); // eslint-disable-line

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type as AllowedMime)) continue;
      const base64 = await fileToBase64(file);
      const previewUrl = URL.createObjectURL(file);
      setPendingImages((prev) => [...prev, { file, previewUrl, base64, mimeType: file.type as AllowedMime }]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(idx: number) {
    setPendingImages((prev) => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  }

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
    setPendingImages([]);
    userScrolledUpRef.current = false;
  }

  async function saveConversation(msgs: Message[], currentId: string | null): Promise<string> {
    // Strip images before saving to DB to keep conversation records lean
    const saveable = stripImages(msgs);
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: currentId, messages: saveable }),
    });
    const data = await res.json();
    return data.id;
  }

  function copyTranscript() {
    const text = messages
      .map((m) => `${m.role === "user" ? "Damian" : "Gandalf"}: ${getMessageText(m)}`)
      .join("\n\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function send(textContent: string) {
    const hasText = textContent.trim().length > 0;
    const hasImages = pendingImages.length > 0;
    if ((!hasText && !hasImages) || loading) return;

    let userContent: string | ContentBlock[];
    let previewUrls: string[] | undefined;

    if (hasImages) {
      const blocks: ContentBlock[] = [];
      for (const img of pendingImages) {
        blocks.push({ type: "image", source: { type: "base64", media_type: img.mimeType, data: img.base64 } });
      }
      if (hasText) blocks.push({ type: "text", text: textContent.trim() });
      userContent = blocks;
      previewUrls = pendingImages.map((img) => img.previewUrl);
    } else {
      userContent = textContent.trim();
    }

    const userMessage: Message = { role: "user", content: userContent, previewUrls };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setPendingImages([]);
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
            <Image src="/gandalf-white.webp" alt="Gandalf the White" width={36} height={36} className="object-cover w-full h-full" priority />
          </div>
          <div>
            <p className="font-semibold text-sm tracking-wide" style={{ color: "#f0e8d0" }}>Gandalf the White</p>
            <p className="text-xs" style={{ color: "#5a5040" }}>Returned from shadow. Sees what must be done.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block animate-pulse mr-1" style={{ background: "#c4922a" }} />

          <div className="relative" ref={historyPanelRef}>
            <button
              onClick={toggleHistory}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ border: "1px solid #2a2218", color: historyOpen ? "#e8d5a3" : "#7a6a50", background: historyOpen ? "#1e1810" : "transparent" }}
            >
              History
            </button>

            {historyOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-xl overflow-hidden z-50"
                style={{ border: "1px solid #2a2218", background: "#13100d", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
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
                      <button key={conv.id} onClick={() => loadConversation(conv.id)}
                        className="w-full text-left px-3 py-2.5 flex items-start justify-between gap-2 transition-colors group"
                        style={{ borderBottom: "1px solid #1a1510" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#1e1810")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate" style={{ color: conversationId === conv.id ? "#e8d5a3" : "#a89070" }}>{conv.title}</p>
                          <p className="text-xs mt-0.5" style={{ color: "#4a4030" }}>
                            {new Date(conv.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <button onClick={(e) => deleteConversation(conv.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                          style={{ color: "#7a4040", border: "1px solid #3a2020" }}>×</button>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button onClick={startNewChat} disabled={isEmpty && !conversationId}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ border: "1px solid #2a2218", color: "#7a6a50", background: "transparent" }}
            onMouseEnter={(e) => { if (!isEmpty || conversationId) e.currentTarget.style.borderColor = "#5c4a2a"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2a2218"; }}>
            New chat
          </button>

          {messages.length > 0 && (
            <button onClick={copyTranscript}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ border: "1px solid #2a2218", color: copied ? "#a8c090" : "#7a6a50", background: "transparent" }}>
              {copied ? "Copied!" : "Copy"}
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-6">
        {isEmpty ? (
          <div className="max-w-4xl mx-auto">
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
                <h2 className="text-xl font-semibold tracking-wide mb-1" style={{ color: "#f0e8d0" }}>A wizard is never idle.</h2>
                <p className="text-sm mt-4 italic leading-relaxed max-w-md mx-auto" style={{ color: "#7a6a50" }}>&ldquo;{quote}&rdquo;</p>
                <p className="text-xs mt-2" style={{ color: "#5a4e38" }}>— Gandalf the White</p>
                <p className="text-xs mt-4" style={{ color: "#4a3e28" }}>You may paste or upload images — Gandalf sees all.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button key={prompt} onClick={() => send(prompt)}
                  className="text-left p-4 rounded-xl text-sm italic transition-colors"
                  style={{ border: "1px solid #2a2218", color: "#a89070", background: "transparent" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#5c4a2a"; e.currentTarget.style.background = "#15120e"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2a2218"; e.currentTarget.style.background = "transparent"; }}>
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
                    <Image src="/gandalf-white.webp" alt="Gandalf" width={28} height={28} className="object-cover w-full h-full" />
                  </div>
                )}
                <div className="rounded-2xl px-4 py-3 text-base leading-relaxed"
                  style={{
                    maxWidth: "85%",
                    ...(msg.role === "user"
                      ? { background: "#2a2218", color: "#e8d5a3", borderTopRightRadius: "4px" }
                      : { background: "#13100d", borderLeft: "2px solid #5c4a2a", color: "#d4c4a0", borderTopLeftRadius: "4px" }),
                  }}>
                  {/* Show image previews for user messages */}
                  {msg.previewUrls && msg.previewUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {msg.previewUrls.map((url, idx) => (
                        <img key={idx} src={url} alt="attached" className="rounded-lg max-h-48 max-w-full object-contain" style={{ border: "1px solid #5c4a2a" }} />
                      ))}
                    </div>
                  )}
                  {msg.role === "assistant" && msg.content === "" && loading ? (
                    <span className="inline-flex gap-1 py-1">
                      <span className="w-2 h-2 rounded-full animate-bounce [animation-delay:0ms]" style={{ background: "#7a6030" }} />
                      <span className="w-2 h-2 rounded-full animate-bounce [animation-delay:150ms]" style={{ background: "#7a6030" }} />
                      <span className="w-2 h-2 rounded-full animate-bounce [animation-delay:300ms]" style={{ background: "#7a6030" }} />
                    </span>
                  ) : msg.role === "assistant" && msg.content === "" && !loading ? (
                    <span style={{ color: "#7a6a50", fontStyle: "italic" }}>The wizard did not respond. Try again.</span>
                  ) : (
                    <span className="whitespace-pre-wrap">{getMessageText(msg)}</span>
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

      {/* Input area */}
      <div className="px-4 py-4 flex-shrink-0" style={{ borderTop: "1px solid #2a2218", background: "#0d0b09" }}>
        <div className="max-w-4xl mx-auto">

          {/* Pending image previews */}
          {pendingImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {pendingImages.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img src={img.previewUrl} alt="pending" className="h-16 w-16 object-cover rounded-lg" style={{ border: "1px solid #5c4a2a" }} />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "#3a1a1a", border: "1px solid #7a3030", color: "#d06060" }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
              <div className="flex-1 flex gap-2 items-end">
                {/* Image upload button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0 rounded-xl px-3 py-3 text-sm transition-colors"
                  title="Attach image"
                  style={{ background: "#13100d", border: "1px solid #2a2218", color: "#7a6a50" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#5c4a2a"; e.currentTarget.style.color = "#c4a060"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2a2218"; e.currentTarget.style.color = "#7a6a50"; }}>
                  🖼
                </button>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple className="hidden" onChange={handleFileInput} />
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={pendingImages.length > 0 ? "Describe the image or ask a question..." : "Speak your question, Damian... (paste images with Ctrl+V)"}
                  rows={2}
                  disabled={loading}
                  className="flex-1 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none disabled:opacity-50"
                  style={{ background: "#13100d", border: "1px solid #2a2218", color: "#d4c4a0", maxHeight: "120px" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#5c4a2a")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2218")}
                />
              </div>
              <button
                type="submit"
                disabled={loading || (!input.trim() && pendingImages.length === 0)}
                className="w-full sm:w-auto rounded-xl px-6 py-3 text-sm font-medium transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "#3d2e12", color: "#e8d5a3", border: "1px solid #5c4a2a" }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#4f3c18"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#3d2e12"; }}>
                {loading ? "Thinking..." : "Send"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
