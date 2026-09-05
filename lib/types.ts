export type BillingCycle = "quarterly" | "half_yearly" | "annual";
export type CurrencyCode = "NGN" | "USD";
export type UserRole = "user" | "admin";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon_key: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  /** NULL = bundle plan (e.g. the All-in-One tier cards on /pricing) */
  service_id: string | null;
  name: string;
  billing_cycle: BillingCycle;
  /** numeric(12,2) arrives as a string from Supabase */
  price: string;
  currency: CurrencyCode;
  features: string[];
  /** Structured rights granted by this plan (admin-editable). */
  entitlements: PlanEntitlements;
  is_highlighted: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Structured rights a plan grants, stored as jsonb on naasify_plans and merged
 * across a user's active subscriptions by lib/entitlements.ts.
 */
export interface PlanEntitlements {
  /** Aggregate upload storage quota in MB (0 = project uploads disabled). */
  storage_mb: number;
  /** Per-file size cap in MB. */
  max_file_mb: number;
  /** Allowed upload extensions (lowercase, no dot); ["*"] = any type. */
  allowed_file_types: string[];
  /** Maximum number of build records (0 = project uploads disabled). */
  max_builds: number;
  /** Eligible add-on services: service slug -> max concurrent requests. */
  addons: Record<string, number>;
}

export type OrderStatus = "pending" | "paid" | "failed" | "refunded";

/** A plan joined with its parent service (admin tables). service is null for bundles. */
export interface PlanWithService extends Plan {
  service?: { id: string; name: string; slug: string } | null;
}

/** An order joined with its plan (admin/dashboard). */
export interface OrderWithPlan extends Omit<Order, "plan"> {
  plan?: Pick<Plan, "id" | "name"> | null;
}

export interface Order {
  id: string;
  user_id: string | null;
  plan_id: string;
  email: string;
  billing_cycle: BillingCycle;
  amount: string;
  currency: string;
  paystack_reference: string;
  status: OrderStatus;
  paid_at: string | null;
  raw_event: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  plan?: Plan;
}

export type SubscriptionStatus = "active" | "expired" | "cancelled";

export interface Subscription {
  id: string;
  order_id: string;
  user_id: string | null;
  plan_id: string;
  status: SubscriptionStatus;
  starts_at: string;
  ends_at: string;
  /** When the expiry cron last emailed a renewal reminder (dedupe marker). */
  expiry_notified_at: string | null;
  created_at: string;
  plan?: Plan;
}

export type MessageStatus = "new" | "read" | "replied";

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: MessageStatus;
  email_sent: boolean;
  created_at: string;
}

export type BuildStatus = "pending" | "processing" | "completed";

/** A user-uploaded project build (zip/files) staged in the user-builds bucket. */
export interface UserBuild {
  id: string;
  user_id: string;
  file_name: string;
  /** Storage object path: "{user_id}/{file_name}". */
  file_key: string;
  /** bigint arrives as a string from Supabase */
  file_size: string;
  mime_type: string | null;
  status: BuildStatus;
  uploaded_at: string;
  updated_at: string;
  /** Joined uploader (admin builds table). */
  user?: Pick<Profile, "id" | "email" | "full_name"> | null;
}

/** One chat message in a user <-> admin support thread. */
export interface SupportMessage {
  id: string;
  /** The non-admin participant's user id (stable thread key). */
  conversation_id: string;
  sender_id: string;
  receiver_id: string | null;
  message_text: string;
  is_read: boolean;
  created_at: string;
}

/** Admin inbox row: a user thread with its participant + unread aggregate. */
export interface SupportConversation {
  conversation_id: string;
  user: Pick<Profile, "id" | "email" | "full_name"> | null;
  last_message: SupportMessage;
  unread_count: number;
}

export type BlogPostStatus = "draft" | "published";

/** A blog/content post authored in the admin CMS. */
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  /** Trusted, admin-authored HTML rendered inside the `.blog-prose` container. */
  body_html: string;
  cover_image_url: string | null;
  tags: string[];
  author_id: string | null;
  status: BlogPostStatus;
  /** Null until published; may be a future date to schedule release. */
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** A blog post joined with its author profile (public + admin views). */
export interface BlogPostWithAuthor extends BlogPost {
  author?: Pick<Profile, "id" | "full_name" | "email"> | null;
}

export type RequestStatus = "pending" | "approved" | "fulfilled" | "rejected";

/** A user's request for an eligible add-on service (domain, SMTP, VPS, VPN). */
export interface ServiceRequest {
  id: string;
  user_id: string;
  service_id: string;
  /** Denormalised service slug snapshot (quota checks + display). */
  service_slug: string;
  /** Type-specific fields validated against REQUEST_CONFIGS[slug].schema. */
  details: Record<string, unknown>;
  status: RequestStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

/** A service request joined with its requester + service (admin views). */
export interface ServiceRequestWithUser extends ServiceRequest {
  user?: Pick<Profile, "id" | "email" | "full_name"> | null;
  service?: { id: string; name: string; slug: string; icon_key: string } | null;
}
