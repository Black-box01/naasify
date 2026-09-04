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
  is_highlighted: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
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
