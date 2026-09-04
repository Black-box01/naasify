import { formatMoney } from "@/lib/money";
import { CONTACT_EMAIL, CYCLE_LABELS } from "@/lib/constants";
import type { BillingCycle, CurrencyCode } from "@/lib/types";

/**
 * Branded transactional email templates (purple → cyan). Emails cannot
 * reference local files, so the logo/site URLs are absolute from
 * NEXT_PUBLIC_APP_URL.
 */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://naasify.online";
const LOGO_URL = `${APP_URL}/logo.png`;

export const GRADIENTS = {
  brand: "linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)",
  receipt: "linear-gradient(135deg, #6d28d9 0%, #0891b2 100%)",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function emailHeader(title: string, gradient: string): string {
  return `
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="background: ${gradient}; padding: 1.75rem 2rem; border-radius: 1rem 1rem 0 0; text-align: center;">
          <img src="${LOGO_URL}" alt="NAASIFY" width="48" height="48" style="display: block; margin: 0 auto 0.75rem; border-radius: 0.6rem;" />
          <h1 style="color: #ffffff; margin: 0; font-size: 1.35rem; font-weight: 800; letter-spacing: -0.01em; line-height: 1.3;">${title}</h1>
        </td>
      </tr>
    </table>`;
}

export function emailFooter(): string {
  return `
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="padding: 1.5rem 2rem; text-align: center; border-top: 1px solid #ece9f5;">
          <p style="margin: 0 0 0.5rem; font-size: 0.8rem; color: #9ca3af;">
            <strong style="color: #4c1d95;">NAASIFY</strong> — Everything your product needs to ship.
          </p>
          <p style="margin: 0 0 0.5rem; font-size: 0.75rem;">
            <a href="mailto:${CONTACT_EMAIL}" style="color: #7c3aed; text-decoration: none;">${CONTACT_EMAIL}</a>
            <span style="color: #d1d5db; margin: 0 0.4rem;">|</span>
            <a href="${APP_URL}" style="color: #06b6d4; text-decoration: none; font-weight: 600;">Visit Website</a>
          </p>
        </td>
      </tr>
    </table>`;
}

export function wrapEmail(content: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #ffffff; border-radius: 1rem; border: 1px solid #ece9f5; overflow: hidden; box-shadow: 0 8px 24px rgba(124,58,237,0.10);">
        ${content}
      </div>
      <p style="text-align: center; font-size: 0.7rem; color: #9ca3af; margin-top: 1rem;">
        &copy; ${new Date().getFullYear()} NAASIFY. All rights reserved.
      </p>
    </div>`;
}

const BODY = "background: #faf9ff; padding: 1.75rem 2rem;";
const LABEL =
  "color: #7c3aed; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 0.3rem; font-weight: 700;";

/** Admin notification for a new contact-form submission. */
export function contactAdminEmail({
  name,
  email,
  subject,
  message,
}: {
  name: string;
  email: string;
  subject?: string | null;
  message: string;
}): string {
  return wrapEmail(`
    ${emailHeader("New Contact Message", GRADIENTS.brand)}
    <div style="${BODY}">
      <div style="margin-bottom: 1.4rem;">
        <p style="${LABEL}">From</p>
        <p style="color: #111827; font-size: 1rem; font-weight: 700; margin: 0;">${escapeHtml(name)}</p>
        <p style="color: #6b7280; font-size: 0.875rem; margin: 0.25rem 0 0;">
          <a href="mailto:${escapeHtml(email)}" style="color: #0891b2; text-decoration: none;">${escapeHtml(email)}</a>
        </p>
      </div>
      ${
        subject
          ? `<div style="margin-bottom: 1.4rem;"><p style="${LABEL}">Subject</p><p style="color: #111827; font-size: 0.95rem; font-weight: 600; margin: 0;">${escapeHtml(subject)}</p></div>`
          : ""
      }
      <div>
        <p style="${LABEL}">Message</p>
        <div style="background: #ffffff; border: 1px solid #ece9f5; border-radius: 0.75rem; padding: 1rem;">
          <p style="color: #111827; font-size: 0.95rem; line-height: 1.65; margin: 0;">${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
        </div>
      </div>
    </div>
    ${emailFooter()}
  `);
}

/** Confirmation sent back to the person who contacted us. */
export function contactConfirmationEmail({ name }: { name: string }): string {
  return wrapEmail(`
    ${emailHeader("We got your message!", GRADIENTS.brand)}
    <div style="${BODY}">
      <p style="font-size: 1rem; color: #374151; margin: 0 0 1rem;">Hi ${escapeHtml(name)},</p>
      <p style="font-size: 0.95rem; color: #374151; line-height: 1.7; margin: 0 0 1.25rem;">
        Thanks for reaching out to NAASIFY. We've received your message and our team
        will get back to you soon — usually within one business day.
      </p>
      <div style="background: #ffffff; border: 1px solid #ece9f5; border-radius: 0.75rem; padding: 1.25rem; margin-bottom: 1.25rem;">
        <p style="font-size: 0.9rem; color: #374151; font-weight: 700; margin: 0 0 0.75rem;">While you wait:</p>
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="padding: 0.3rem 0; font-size: 0.9rem; color: #374151;">&#10003; Browse plans on our <a href="${APP_URL}/pricing" style="color: #7c3aed; text-decoration: none;">pricing page</a></td></tr>
          <tr><td style="padding: 0.3rem 0; font-size: 0.9rem; color: #374151;">&#10003; See everything included in the All-in-One bundle</td></tr>
          <tr><td style="padding: 0.3rem 0; font-size: 0.9rem; color: #374151;">&#10003; Create an account to manage subscriptions</td></tr>
        </table>
      </div>
      <p style="font-size: 0.9rem; color: #374151; margin: 0;">
        Best regards,<br/><strong>The NAASIFY Team</strong>
      </p>
    </div>
    ${emailFooter()}
  `);
}

/** Payment receipt + activation confirmation (sent after a successful charge). */
export function paymentReceiptEmail({
  name,
  planName,
  amount,
  currency,
  cycle,
  reference,
  endsAt,
}: {
  name?: string | null;
  planName: string;
  amount: number;
  currency: CurrencyCode;
  cycle: BillingCycle;
  reference: string;
  endsAt: string | null;
}): string {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hello,";
  const endsRow = endsAt
    ? `<tr><td style="padding: 0.4rem 0; color: #6b7280; font-size: 0.9rem;">Valid until</td><td style="padding: 0.4rem 0; color: #111827; font-size: 0.9rem; font-weight: 600; text-align: right;">${new Date(endsAt).toLocaleDateString("en-US", { dateStyle: "medium" })}</td></tr>`
    : "";
  return wrapEmail(`
    ${emailHeader("Payment successful", GRADIENTS.receipt)}
    <div style="${BODY}">
      <p style="font-size: 1rem; color: #374151; margin: 0 0 1rem;">${greeting}</p>
      <p style="font-size: 0.95rem; color: #374151; line-height: 1.7; margin: 0 0 1.25rem;">
        Your <strong>${escapeHtml(planName)}</strong> plan is now active. Here's your receipt —
        keep it for your records.
      </p>
      <div style="background: #ffffff; border: 1px solid #ece9f5; border-radius: 0.75rem; padding: 1.25rem;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="padding: 0.4rem 0; color: #6b7280; font-size: 0.9rem;">Plan</td><td style="padding: 0.4rem 0; color: #111827; font-size: 0.9rem; font-weight: 600; text-align: right;">${escapeHtml(planName)}</td></tr>
          <tr><td style="padding: 0.4rem 0; color: #6b7280; font-size: 0.9rem;">Billing cycle</td><td style="padding: 0.4rem 0; color: #111827; font-size: 0.9rem; font-weight: 600; text-align: right;">${CYCLE_LABELS[cycle]}</td></tr>
          ${endsRow}
          <tr><td style="padding: 0.4rem 0; color: #6b7280; font-size: 0.9rem;">Reference</td><td style="padding: 0.4rem 0; color: #111827; font-size: 0.8rem; font-family: monospace; text-align: right;">${escapeHtml(reference)}</td></tr>
          <tr><td colspan="2" style="padding: 0.6rem 0 0.2rem; border-top: 1px solid #ece9f5;"></td></tr>
          <tr><td style="padding: 0.4rem 0; color: #4c1d95; font-size: 1rem; font-weight: 800;">Amount paid</td><td style="padding: 0.4rem 0; color: #4c1d95; font-size: 1.1rem; font-weight: 800; text-align: right;">${formatMoney(amount, currency)}</td></tr>
        </table>
      </div>
      <p style="font-size: 0.9rem; color: #374151; margin: 1.25rem 0 0;">
        Questions? Reply to this email or write to
        <a href="mailto:${CONTACT_EMAIL}" style="color: #7c3aed; text-decoration: none;">${CONTACT_EMAIL}</a>.
      </p>
    </div>
    ${emailFooter()}
  `);
}
