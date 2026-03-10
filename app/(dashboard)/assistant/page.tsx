"use client";

import { useState, useRef, useEffect, FormEvent } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

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
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-600 flex items-center justify-center text-base flex-shrink-0">
            🧙
          </div>
          <div>
            <p className="font-semibold text-white text-sm">Gandalf the Grey</p>
            <p className="text-xs text-zinc-500">Ancient counsel. Sees the whole board.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          <span className="text-xs text-zinc-500">Live context loaded</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {isEmpty ? (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <div className="w-16 h-16 rounded-full bg-zinc-700 mx-auto mb-4 flex items-center justify-center text-4xl">
                🧙
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">A wizard is never idle.</h2>
              <p className="text-zinc-400 text-sm max-w-sm mx-auto">
                I have been watching. The data is before me. Ask what you will, or let me tell you what the road requires of you today.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => send(prompt)}
                  className="text-left p-4 rounded-xl border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800 transition-colors text-sm text-zinc-300 italic"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-sm flex-shrink-0 mt-1">
                    🧙
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-3 text-sm max-w-[85%] leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-zinc-700 text-white rounded-tr-sm"
                      : "bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-tl-sm"
                  }`}
                >
                  {msg.content}
                  {msg.role === "assistant" && msg.content === "" && loading && (
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:300ms]" />
                    </span>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-zinc-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-1">
                    D
                  </div>
                )}
              </div>
            ))}

            {error && (
              <div className="text-center">
                <p className="text-red-400 text-sm bg-red-900/20 rounded-xl px-4 py-3 inline-block">
                  {error}
                </p>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 px-4 py-4 flex-shrink-0">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <div className="flex gap-3 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Ray anything about the business..."
              rows={1}
              disabled={loading}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-zinc-500 disabled:opacity-50"
              style={{ maxHeight: "120px", overflowY: "auto" }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-zinc-600 hover:bg-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 text-sm font-medium transition-colors flex-shrink-0"
            >
              {loading ? "..." : "Send"}
            </button>
          </div>
          <p className="text-xs text-zinc-600 mt-2 text-center">
            Gandalf has live access to your site stats, targets, pipeline, and outreach data.
          </p>
        </form>
      </div>
    </div>
  );
}
