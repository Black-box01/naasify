"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Icon } from "@/components/ui/icons";

type Status = "idle" | "submitting" | "success" | "error";

/** Contact form: posts to /api/contact and shows an inline success/error state. */
export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [emailed, setEmailed] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
    setStatus("idle");
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim() || undefined,
          message: message.trim(),
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        emailed?: boolean;
        error?: string;
      };
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Something went wrong. Please try again.");
      }
      setEmailed(data.emailed !== false);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="glass shadow-layered rounded-3xl p-8 text-center">
        <span className="pill mx-auto inline-flex bg-emerald-500/15 p-4 text-emerald-300">
          <Icon name="check" className="h-7 w-7" />
        </span>
        <h2 className="font-display mt-5 text-2xl font-bold text-foreground">
          Message sent!
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-sm text-foreground/60">
          Thanks for reaching out, {name.trim().split(" ")[0] || "there"}. Our team
          will get back to you soon — usually within one business day.
          {!emailed && (
            <>
              {" "}
              <span className="text-foreground/45">
                (Our email provider is catching up, but your message is safely
                logged and we&apos;ll still reply.)
              </span>
            </>
          )}
        </p>
        <Button variant="glass" className="mt-6" onClick={reset}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="glass shadow-layered rounded-3xl p-7 sm:p-8">
      <h2 className="font-display text-2xl font-bold text-foreground">Send us a message</h2>
      <p className="mt-2 text-sm text-foreground/55">
        Questions about a plan, a custom bundle, or migration? We read every
        message.
      </p>

      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            required
            autoComplete="name"
            placeholder="Ada Lovelace"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Input
          label="Subject (optional)"
          placeholder="All-in-One bundle question"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <Textarea
          label="Message"
          required
          rows={5}
          placeholder="Tell us what you're building…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      {status === "error" && error && (
        <p
          className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="mt-6 w-full"
        loading={status === "submitting"}
        disabled={
          !name.trim() || !email.trim() || message.trim().length < 5
        }
      >
        {status === "submitting" ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
