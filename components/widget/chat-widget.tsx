"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface WidgetMessage {
  role: "visitor" | "assistant";
  content: string;
  kind?: "error";
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

function ThinkingDots({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-1 px-1 py-1.5" aria-label="Assistant is typing" role="status">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full"
          style={{
            backgroundColor: color,
            animationDelay: `${i * 140}ms`,
            animationDuration: "900ms",
          }}
        />
      ))}
    </div>
  );
}

export function ChatWidget({ widgetKey, businessName, brandColor }: ChatWidgetProps) {
  const [messages, setMessages] = useState<WidgetMessage[]>([
    { role: "assistant", content: `Hi! I'm ${businessName}'s assistant. Ask about services, pricing, or book an appointment.` },
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
          { role: "assistant", content: data.error ?? "Something went wrong — please try again.", kind: "error" },
        ]);
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I couldn't reach the server — please try again in a moment.",
          kind: "error",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-ink-900/10 bg-white shadow-float">
      {/* Header */}
      <div
        className="relative flex items-center gap-2.5 px-4 py-3 text-white"
        style={{ backgroundColor: brandColor }}
      >
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-px bg-white/15"
        />
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15">
          <span className="font-display text-sm font-bold">R</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-semibold">{businessName}</p>
          <p className="flex items-center gap-1 text-[11px] text-white/80">
            <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
            online — replies in seconds
          </p>
        </div>
        <Sparkles className="h-4 w-4 shrink-0 text-white/70" aria-hidden="true" />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="scroll-thin flex-1 space-y-3 overflow-y-auto bg-paper-50/60 p-4">
        {messages.map((m, i) => {
          const isVisitor = m.role === "visitor";
          return (
            <div
              key={i}
              className={cn("flex animate-fade-in-up", isVisitor ? "justify-end" : "justify-start")}
              style={{ animationDuration: "250ms" }}
            >
              <div
                className={cn(
                  "max-w-[82%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
                  isVisitor
                    ? "rounded-br-md bg-ink-950 text-paper-50"
                    : m.kind === "error"
                      ? "rounded-bl-md border border-alert-500/25 bg-alert-500/10 text-alert-700"
                      : "rounded-bl-md border border-ink-900/[0.06] bg-white text-ink-900"
                )}
              >
                {m.kind === "error" && (
                  <span className="mb-1 flex items-center gap-1 text-[11px] font-medium text-alert-600">
                    <AlertCircle className="h-3 w-3" aria-hidden="true" />
                    Something went wrong
                  </span>
                )}
                {m.content}
              </div>
            </div>
          );
        })}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-ink-900/[0.06] bg-white px-3 py-2 shadow-sm">
              <ThinkingDots color={brandColor} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="flex items-center gap-2 border-t border-ink-900/[0.08] bg-white p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          aria-label="Type a message"
          className="h-10 min-w-0 flex-1 rounded-full border border-ink-900/15 bg-paper-50 px-4 text-sm text-ink-900 placeholder:text-ink-400 transition-shadow duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-500/40"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-all duration-150 hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ backgroundColor: brandColor }}
          aria-label="Send message"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
