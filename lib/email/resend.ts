import { Resend } from "resend";

/**
 * Graceful Resend wrapper. When RESEND_API_KEY is absent we log and return an
 * {error} instead of throwing, so a missing key or Resend outage never breaks
 * the contact form (the DB row is the source of truth).
 */
const resendApiKey = process.env.RESEND_API_KEY || "";
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "NAASIFY <info@naasify.com>";

export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<{ data?: unknown; error?: string }> {
  if (!resend) {
    console.log(`[resend] key missing — would send "${subject}" to ${String(to)}`);
    return { error: "Resend not configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
    });
    if (error) {
      console.error("[resend] send error:", error);
      return { error: error.message ?? "Resend send failed" };
    }
    return { data };
  } catch (error) {
    console.error("[resend] exception:", error);
    return { error: error instanceof Error ? error.message : "Resend exception" };
  }
}
