"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";

interface WidgetMessage {
  role: "visitor" | "assistant";
  content: string;
}

interface ChatWidgetProps {
  widgetKey: string;
  businessName: string;
  brandColor: string;
}

function getOrCreateSessionId(widgetKey: string): string {
  const storageKey = `relayos_session_${widgetKey}`;
  let sessionId = sessionStorage.getItem(storageKey);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(storageKey, sessionId);
  }
  return sessionId;
}

export function ChatWidget({ widgetKey, businessName, brandColor }: ChatWidgetProps) {
  const [messages, setMessages] = useState<WidgetMessage[]>([
    { role: "assistant", content: `Hi! I'm ${businessName}'s assistant. What can I help you with today?` },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Distance (px) from the bottom within which we treat the user as
  // "at the bottom" and keep auto-scrolling. If they've scrolled further
  // up to read history, we don't wrench the viewport back down.
  const autoScrollThreshold = 80;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Only auto-scroll when the user is already near the bottom. If they
    // scrolled up to read history, a new message shouldn't fight them.
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom <= autoScrollThreshold) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, sending]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;

    setMessages((prev) => [...prev, { role: "visitor", content: text }]);
    setInput("");
    setSending(true);

    try {
      const sessionId = getOrCreateSessionId(widgetKey);
      const res = await fetch("/api/widget/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ widgetKey, sessionId, message: text }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.error ?? "Something went wrong — please try again." },
        ]);
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I couldn't reach the server — please try again in a moment." },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-ink-800/10 bg-white shadow-panel">
      <div
        className="flex items-center gap-2 px-4 py-3 text-white"
        style={{ backgroundColor: brandColor }}
      >
        <span className="signal-dot signal-dot--live" />
        <p className="font-display text-sm font-medium">{businessName}</p>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "visitor" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "visitor"
                  ? "max-w-[80%] rounded-2xl rounded-br-sm bg-ink-950 px-3.5 py-2 text-sm text-white"
                  : "max-w-[80%] rounded-2xl rounded-bl-sm bg-paper-100 px-3.5 py-2 text-sm text-ink-900"
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex items-center gap-1.5 text-xs text-ink-700/50">
            <span className="signal-dot signal-dot--thinking" />
            thinking…
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="flex items-center gap-2 border-t border-ink-800/10 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          className="h-10 flex-1 rounded-full border border-ink-800/15 bg-paper-50 px-4 text-sm focus-visible:outline-none focus-visible:ring-2"
          style={{ boxShadow: "none" }}
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-40"
          style={{ backgroundColor: brandColor }}
          aria-label="Send message"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
