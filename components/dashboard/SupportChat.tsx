"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Icon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { SupportMessage } from "@/lib/types";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * User support chat. Loads the thread through /api/support (which also marks
 * admin replies read), then streams new messages live via Supabase Realtime.
 * conversation_id === userId, so a single filter covers the whole thread.
 */
export function SupportChat({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const appendMessage = useCallback((msg: SupportMessage) => {
    setMessages((prev) =>
      prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
    );
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await fetch("/api/support", { cache: "no-store" });
        const data = (await res.json()) as { messages?: SupportMessage[]; error?: string };
        if (!res.ok) throw new Error(data.error || "Failed to load conversation");
        if (active) setMessages(data.messages ?? []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`support:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "naasify_support_messages",
          filter: `conversation_id=eq.${userId}`,
        },
        (payload) => appendMessage(payload.new as SupportMessage),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, appendMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_text: body }),
      });
      const data = (await res.json()) as { message?: SupportMessage; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setText("");
      if (data.message) appendMessage(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="glass shadow-layered overflow-hidden rounded-3xl">
      <header className="flex items-center gap-2 border-b border-foreground/10 px-6 py-4">
        <Icon name="message-circle" className="h-5 w-5 text-accent-300" />
        <div>
          <h2 className="font-display text-base font-bold text-foreground">Support chat</h2>
          <p className="text-xs text-foreground/45">
            Message our team — we typically reply within a day.
          </p>
        </div>
      </header>

      <div className="max-h-96 overflow-y-auto px-6 py-5">
        {loading ? (
          <p className="py-8 text-center text-sm text-foreground/50">Loading conversation…</p>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-foreground/50">
            No messages yet — say hello and tell us how we can help.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {messages.map((msg) => {
              const mine = msg.sender_id === userId;
              return (
                <li key={msg.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                      mine
                        ? "bg-gradient-to-r from-brand-500 to-accent-500 text-white"
                        : "glass text-foreground/85",
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.message_text}</p>
                    <span
                      className={cn(
                        "mt-1 block text-[10px]",
                        mine ? "text-white/70" : "text-foreground/40",
                      )}
                    >
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="mx-6 mb-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200" role="alert">
          {error}
        </p>
      )}

      <div className="border-t border-foreground/10 px-6 py-4">
        <Textarea
          value={text}
          rows={2}
          placeholder="Write a message…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void send();
            }
          }}
          className="rounded-2xl"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[11px] text-foreground/35">⌘/Ctrl + Enter to send</span>
          <Button size="sm" onClick={send} loading={sending} disabled={!text.trim()}>
            <Icon name="send" className="h-4 w-4" />
            Send
          </Button>
        </div>
      </div>
    </section>
  );
}
