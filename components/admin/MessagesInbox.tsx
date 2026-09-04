"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { adminFetch } from "@/lib/adminApi";
import { formatDate } from "@/lib/utils";
import { CONTACT_EMAIL } from "@/lib/constants";
import type { ContactMessage, MessageStatus } from "@/lib/types";

const TONE: Record<MessageStatus, "accent" | "neutral" | "success"> = {
  new: "accent",
  read: "neutral",
  replied: "success",
};

/** Contact-message inbox: read messages, change status, reply by email. */
export function MessagesInbox() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const data = await adminFetch<{ messages: ContactMessage[] }>(
          "/api/admin/messages",
        );
        if (active) {
          setMessages(data.messages);
          setError(null);
        }
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

  async function setStatus(message: ContactMessage, status: MessageStatus) {
    setBusyId(message.id);
    try {
      await adminFetch(`/api/admin/messages/${message.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, status } : m)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  const newCount = messages.filter((m) => m.status === "new").length;

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Messages</h1>
          <p className="mt-1 text-sm text-foreground/50">
            Submissions from the contact form
            {newCount > 0 ? ` · ${newCount} new` : ""}. Replies go to{" "}
            {CONTACT_EMAIL}.
          </p>
        </div>
      </header>

      {error && (
        <p className="glass mt-6 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="glass mt-6 rounded-3xl px-6 py-12 text-center text-foreground/50">
          Loading messages…
        </p>
      ) : messages.length === 0 ? (
        <p className="glass mt-6 rounded-3xl px-6 py-12 text-center text-foreground/50">
          No messages yet.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {messages.map((message) => (
            <article
              key={message.id}
              className="glass shadow-layered rounded-3xl p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {message.status === "new" && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-accent-400" />
                    )}
                    <h2 className="font-display truncate text-base font-bold text-foreground">
                      {message.subject || "(no subject)"}
                    </h2>
                  </div>
                  <p className="mt-1 text-sm text-foreground/55">
                    <span className="font-medium text-foreground/80">{message.name}</span>{" "}
                    · <a className="text-accent-300 hover:underline" href={`mailto:${message.email}`}>{message.email}</a>
                  </p>
                  <p className="mt-0.5 text-xs text-foreground/35">
                    {formatDate(message.created_at)}
                    {message.email_sent ? "" : " · notification email not sent"}
                  </p>
                </div>
                <Badge tone={TONE[message.status]}>{message.status}</Badge>
              </div>

              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/70">
                {message.message}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <a
                  href={`mailto:${message.email}?subject=${encodeURIComponent(
                    `Re: ${message.subject || "your NAASIFY message"}`,
                  )}`}
                  className="pill inline-flex items-center gap-2 bg-gradient-to-r from-brand-500 to-accent-500 px-4 py-2 text-xs font-semibold text-white shadow-layered transition-all hover:brightness-110"
                >
                  <Icon name="mail" className="h-4 w-4" />
                  Reply by email
                </a>
                {message.status !== "read" && (
                  <Button
                    variant="glass"
                    size="sm"
                    disabled={busyId === message.id}
                    onClick={() => setStatus(message, "read")}
                  >
                    Mark read
                  </Button>
                )}
                {message.status !== "replied" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busyId === message.id}
                    onClick={() => setStatus(message, "replied")}
                  >
                    Mark replied
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
