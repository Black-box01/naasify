"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Toggle } from "@/components/ui/Toggle";
import { Icon } from "@/components/ui/icons";
import { adminFetch } from "@/lib/adminApi";
import { cn } from "@/lib/utils";
import type { SupportConversation, SupportMessage } from "@/lib/types";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** A message belongs to the user when sender_id === conversation_id. */
const isFromUser = (m: SupportMessage) => m.sender_id === m.conversation_id;

/**
 * Admin support inbox: conversation list (left) + live thread & reply composer
 * (right). New messages stream in via Supabase Realtime (RLS-scoped to admin).
 */
export function SupportInbox() {
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<SupportMessage[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [notifyUser, setNotifyUser] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<string | null>(null);
  const conversationsRef = useRef<SupportConversation[]>([]);
  useEffect(() => {
    selectedRef.current = selectedId;
  }, [selectedId]);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const appendToThread = useCallback((msg: SupportMessage) => {
    setThread((prev) =>
      prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
    );
  }, []);

  const refreshList = useCallback(async () => {
    const data = await adminFetch<{ conversations: SupportConversation[] }>(
      "/api/admin/support",
    );
    setConversations(data.conversations);
    return data.conversations;
  }, []);

  // Initial load: conversation list, auto-open the most recent thread.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const list = await refreshList();
        if (active && list.length > 0) {
          setSelectedId(list[0].conversation_id);
          setLoadingThread(true);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (active) setLoadingList(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshList]);

  // Load the selected thread (server marks the user's messages read on GET).
  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    void (async () => {
      try {
        const data = await adminFetch<{ messages: SupportMessage[] }>(
          `/api/admin/support/${selectedId}`,
        );
        if (active) {
          setThread(data.messages);
          setError(null);
          setConversations((prev) =>
            prev.map((c) =>
              c.conversation_id === selectedId ? { ...c, unread_count: 0 } : c,
            ),
          );
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load thread");
      } finally {
        if (active) setLoadingThread(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedId]);

  // Single realtime subscription; reads refs so it never needs re-subscribing.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("support-admin")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "naasify_support_messages",
        },
        (payload) => {
          const msg = payload.new as SupportMessage;
          const open = msg.conversation_id === selectedRef.current;
          if (open) appendToThread(msg);

          const known = conversationsRef.current.some(
            (c) => c.conversation_id === msg.conversation_id,
          );
          if (!known) {
            void refreshList().catch(() => undefined);
            return;
          }
          setConversations((prev) =>
            prev
              .map((c) =>
                c.conversation_id === msg.conversation_id
                  ? {
                      ...c,
                      last_message: msg,
                      unread_count:
                        isFromUser(msg) && !open ? c.unread_count + 1 : 0,
                    }
                  : c,
              )
              .sort(
                (a, b) =>
                  new Date(b.last_message.created_at).getTime() -
                  new Date(a.last_message.created_at).getTime(),
              ),
          );

          // A user message landing in the open thread is read immediately.
          if (open && isFromUser(msg)) {
            void adminFetch(`/api/admin/support/${msg.conversation_id}`, {
              method: "PATCH",
            }).catch(() => undefined);
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [appendToThread, refreshList]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread]);

  async function send() {
    const body = replyText.trim();
    if (!body || !selectedId || sending) return;
    setSending(true);
    setError(null);
    try {
      const data = await adminFetch<{ message: SupportMessage }>(
        `/api/admin/support/${selectedId}`,
        {
          method: "POST",
          body: JSON.stringify({ message_text: body, notify_user: notifyUser }),
        },
      );
      setReplyText("");
      setNotifyUser(false);
      appendToThread(data.message);
      setConversations((prev) =>
        prev.map((c) =>
          c.conversation_id === selectedId
            ? { ...c, last_message: data.message, unread_count: 0 }
            : c,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setSending(false);
    }
  }

  // Selecting a conversation resets the pane in the click handler (not an
  // effect) so the loading state flips without a cascading render.
  function openConversation(id: string) {
    setSelectedId(id);
    setThread([]);
    setLoadingThread(true);
  }

  const selected = conversations.find((c) => c.conversation_id === selectedId) ?? null;
  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Support Inbox</h1>
          <p className="mt-1 text-sm text-foreground/50">
            Live conversations with your users
            {totalUnread > 0 ? ` · ${totalUnread} unread` : ""}.
          </p>
        </div>
      </header>

      {error && (
        <p
          className="glass mt-6 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[20rem_1fr]">
        {/* Conversation list */}
        <aside className="glass shadow-layered h-fit overflow-hidden rounded-3xl">
          <div className="max-h-[34rem] overflow-y-auto">
            {loadingList ? (
              <p className="px-5 py-12 text-center text-sm text-foreground/50">Loading…</p>
            ) : conversations.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-foreground/50">
                No conversations yet.
              </p>
            ) : (
              <ul className="divide-y divide-foreground/5">
                {conversations.map((c) => {
                  const activeItem = c.conversation_id === selectedId;
                  return (
                    <li key={c.conversation_id}>
                      <button
                        type="button"
                        onClick={() => openConversation(c.conversation_id)}
                        className={cn(
                          "flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors",
                          activeItem
                            ? "bg-gradient-to-r from-brand-500/20 to-accent-500/10"
                            : "hover:bg-foreground/5",
                        )}
                      >
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-sm font-bold text-brand-200">
                          {(c.user?.full_name || c.user?.email || "?").charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-foreground">
                              {c.user?.full_name || "User"}
                            </span>
                            {c.unread_count > 0 && (
                              <Badge tone="accent">{c.unread_count}</Badge>
                            )}
                          </span>
                          <span className="block truncate text-xs text-foreground/45">
                            {c.user?.email ?? c.conversation_id}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-foreground/40">
                            {c.last_message.message_text}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Thread + composer */}
        <section className="glass shadow-layered flex min-h-[34rem] flex-col overflow-hidden rounded-3xl">
          {!selected ? (
            <p className="m-auto text-center text-sm text-foreground/50">
              Select a conversation to view the thread.
            </p>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-foreground/10 px-6 py-4">
                <div className="min-w-0">
                  <h2 className="font-display truncate text-base font-bold text-foreground">
                    {selected.user?.full_name || "User"}
                  </h2>
                  <a
                    className="block truncate text-xs text-accent-300 hover:underline"
                    href={`mailto:${selected.user?.email ?? ""}`}
                  >
                    {selected.user?.email ?? selected.conversation_id}
                  </a>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                {loadingThread ? (
                  <p className="py-8 text-center text-sm text-foreground/50">Loading thread…</p>
                ) : thread.length === 0 ? (
                  <p className="py-8 text-center text-sm text-foreground/50">No messages yet.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {thread.map((msg) => {
                      const mine = !isFromUser(msg);
                      return (
                        <li
                          key={msg.id}
                          className={cn("flex", mine ? "justify-end" : "justify-start")}
                        >
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

              <div className="border-t border-foreground/10 px-6 py-4">
                <Textarea
                  value={replyText}
                  rows={2}
                  placeholder="Write a reply…"
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  className="rounded-2xl"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="max-w-xs">
                    <Toggle
                      label="Email the user a copy"
                      checked={notifyUser}
                      onChange={setNotifyUser}
                    />
                  </div>
                  <Button size="sm" onClick={send} loading={sending} disabled={!replyText.trim()}>
                    <Icon name="send" className="h-4 w-4" />
                    Send reply
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
