import { z } from "zod";
import type { RequestStatus } from "@/lib/types";

/**
 * Add-on service request catalogue.
 *
 * Each requestable add-on (a naasify_services slug) declares the fields a user
 * fills in and the zod schema the server validates against. The SAME `fields`
 * drive the dashboard's dynamic request form, so the UI and the API stay in
 * lock-step. Eligibility/quota is enforced separately by lib/entitlements.ts.
 */

export const ADD_ON_SLUGS = [
  "domain-names",
  "smtp-emailing",
  "vps",
  "vpn",
] as const;

export type AddOnSlug = (typeof ADD_ON_SLUGS)[number];

export function isAddOnSlug(slug: string): slug is AddOnSlug {
  return (ADD_ON_SLUGS as readonly string[]).includes(slug);
}

/** A single renderable form field (drives ServiceRequestForm + validation). */
export type FieldDef =
  | {
      name: string;
      label: string;
      type: "text";
      placeholder?: string;
      required?: boolean;
      max?: number;
    }
  | { name: string; label: string; type: "email"; placeholder?: string; required?: boolean }
  | {
      name: string;
      label: string;
      type: "textarea";
      placeholder?: string;
      required?: boolean;
      max?: number;
    }
  | {
      name: string;
      label: string;
      type: "number";
      min?: number;
      max?: number;
      step?: number;
      required?: boolean;
    }
  | {
      name: string;
      label: string;
      type: "select";
      options: { value: string; label: string }[];
      required?: boolean;
    };

export interface RequestConfig {
  title: string;
  blurb: string;
  fields: FieldDef[];
  schema: z.ZodTypeAny;
}

const notesField: FieldDef = {
  name: "notes",
  label: "Notes (optional)",
  type: "textarea",
  placeholder: "Anything else we should know?",
  max: 1000,
};

export const REQUEST_CONFIGS: Record<AddOnSlug, RequestConfig> = {
  "domain-names": {
    title: "Register a domain",
    blurb: "We register your domain with free WHOIS privacy and DNS management.",
    fields: [
      {
        name: "desired_domain",
        label: "Desired domain",
        type: "text",
        placeholder: "mybrand",
        required: true,
        max: 80,
      },
      {
        name: "tld",
        label: "Extension (TLD)",
        type: "select",
        required: true,
        options: [
          { value: ".com", label: ".com" },
          { value: ".ng", label: ".ng" },
          { value: ".com.ng", label: ".com.ng" },
          { value: ".io", label: ".io" },
          { value: ".dev", label: ".dev" },
          { value: ".co", label: ".co" },
        ],
      },
      { name: "registrant_name", label: "Registrant name", type: "text", required: true, max: 120 },
      { name: "registrant_email", label: "Registrant email", type: "email", required: true },
      notesField,
    ],
    schema: z.object({
      desired_domain: z.string().min(1, "Enter the domain you want").max(80),
      tld: z.enum([".com", ".ng", ".com.ng", ".io", ".dev", ".co"]),
      registrant_name: z.string().min(1, "Registrant name is required").max(120),
      registrant_email: z.email("Enter a valid email"),
      notes: z.string().max(1000).optional(),
    }),
  },

  "smtp-emailing": {
    title: "Request SMTP mailboxes",
    blurb: "Transactional email with high deliverability, templates and analytics.",
    fields: [
      { name: "mailboxes", label: "Number of mailboxes", type: "number", min: 1, max: 100, required: true },
      {
        name: "send_domain",
        label: "Sending domain",
        type: "text",
        placeholder: "mail.mybrand.com",
        required: true,
        max: 120,
      },
      { name: "reply_to", label: "Reply-to email", type: "email", required: true },
      notesField,
    ],
    schema: z.object({
      mailboxes: z.number().int().min(1).max(100),
      send_domain: z.string().min(1, "Sending domain is required").max(120),
      reply_to: z.email("Enter a valid reply-to email"),
      notes: z.string().max(1000).optional(),
    }),
  },

  vps: {
    title: "Provision a VPS",
    blurb: "High-performance virtual private server with root access and NVMe storage.",
    fields: [
      {
        name: "size",
        label: "Instance size",
        type: "select",
        required: true,
        options: [
          { value: "small", label: "Small — 2 vCPU / 4 GB" },
          { value: "medium", label: "Medium — 4 vCPU / 8 GB" },
          { value: "large", label: "Large — 8 vCPU / 16 GB" },
        ],
      },
      {
        name: "os",
        label: "Operating system",
        type: "select",
        required: true,
        options: [
          { value: "ubuntu-24.04", label: "Ubuntu 24.04" },
          { value: "ubuntu-22.04", label: "Ubuntu 22.04" },
          { value: "debian-12", label: "Debian 12" },
        ],
      },
      { name: "hostname", label: "Hostname", type: "text", placeholder: "app-01", required: true, max: 80 },
      notesField,
    ],
    schema: z.object({
      size: z.enum(["small", "medium", "large"]),
      os: z.enum(["ubuntu-24.04", "ubuntu-22.04", "debian-12"]),
      hostname: z.string().min(1, "Hostname is required").max(80),
      notes: z.string().max(1000).optional(),
    }),
  },

  vpn: {
    title: "Set up VPN access",
    blurb: "Secure private networking and VPN endpoints for your team.",
    fields: [
      { name: "clients", label: "Number of clients", type: "number", min: 1, max: 500, required: true },
      {
        name: "region",
        label: "Region",
        type: "select",
        required: true,
        options: [
          { value: "us", label: "United States" },
          { value: "eu", label: "Europe" },
          { value: "uk", label: "United Kingdom" },
          { value: "za", label: "South Africa" },
          { value: "ng", label: "Nigeria" },
        ],
      },
      notesField,
    ],
    schema: z.object({
      clients: z.number().int().min(1).max(500),
      region: z.enum(["us", "eu", "uk", "za", "ng"]),
      notes: z.string().max(1000).optional(),
    }),
  },
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  fulfilled: "Fulfilled",
  rejected: "Rejected",
};

export const REQUEST_STATUS_TONE: Record<
  RequestStatus,
  "warning" | "accent" | "success" | "danger"
> = {
  pending: "warning",
  approved: "accent",
  fulfilled: "success",
  rejected: "danger",
};

const str = (v: unknown): string => (v == null ? "" : String(v));

/** One-line human summary of a request's details (admin + dashboard tables). */
export function summarizeDetails(slug: string, details: Record<string, unknown>): string {
  switch (slug) {
    case "domain-names":
      return `${str(details.desired_domain)}${str(details.tld)}`.trim() || "Domain request";
    case "smtp-emailing":
      return `${str(details.mailboxes)} mailbox(es) · ${str(details.send_domain)}`.trim();
    case "vps":
      return `${str(details.size)} · ${str(details.os)} · ${str(details.hostname)}`.trim();
    case "vpn":
      return `${str(details.clients)} client(s) · region ${str(details.region)}`.trim();
    default: {
      const values = Object.values(details).filter(Boolean).slice(0, 2).map(str);
      return values.join(" · ") || "Service request";
    }
  }
}
