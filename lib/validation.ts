import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().min(2, "Name is too short").max(120),
  email: z.email("Enter a valid email"),
  subject: z.string().max(200).optional(),
  message: z.string().min(5, "Message is too short").max(5000),
});
export type ContactInput = z.infer<typeof contactSchema>;

export const serviceSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(80).optional(),
  description: z.string().max(500).optional(),
  icon_key: z.string().min(1).max(40).optional(),
  sort_order: z.number().int().min(0).max(9999).optional(),
  is_active: z.boolean().optional(),
});
export type ServiceInput = z.infer<typeof serviceSchema>;
export const serviceUpdateSchema = serviceSchema.partial();

export const planSchema = z.object({
  service_id: z.string().uuid().nullable(),
  name: z.string().min(1).max(80),
  billing_cycle: z.enum(["quarterly", "half_yearly", "annual"]),
  price: z.number().min(0),
  currency: z.enum(["NGN", "USD"]),
  features: z.array(z.string().max(200)).max(30).default([]),
  is_highlighted: z.boolean().default(false),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(9999).default(0),
});
export type PlanInput = z.infer<typeof planSchema>;
export const planUpdateSchema = planSchema.partial();

export const checkoutSchema = z.object({
  planId: z.string().uuid(),
  email: z.email().optional(),
});

export const messageStatusSchema = z.object({
  status: z.enum(["new", "read", "replied"]),
});

export const orderStatusSchema = z.object({
  status: z.enum(["pending", "paid", "failed", "refunded"]),
});

export const buildStatusSchema = z.object({
  status: z.enum(["pending", "processing", "completed"]),
});

/** User -> admin support message (conversation_id is derived from the session). */
export const supportMessageSchema = z.object({
  message_text: z.string().min(1, "Message is empty").max(4000, "Message is too long"),
});

/** Admin -> user reply; notify_user toggles the optional email to the user. */
export const supportReplySchema = z.object({
  message_text: z.string().min(1, "Message is empty").max(4000, "Message is too long"),
  notify_user: z.boolean().optional(),
});

/**
 * Admin-authored blog post. `body_html` is trusted (only admins can write) and
 * rendered inside the `.blog-prose` container. `published_at` accepts an ISO or
 * datetime-local string and is normalised to a timestamp in the API route.
 */
export const blogPostSchema = z.object({
  title: z.string().min(2, "Title is too short").max(160),
  slug: z.string().min(2).max(160).optional(),
  excerpt: z.string().max(400).optional(),
  body_html: z.string().max(200_000).optional(),
  cover_image_url: z.string().max(600).optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  status: z.enum(["draft", "published"]).optional(),
  published_at: z.string().max(64).nullable().optional(),
});
export type BlogPostInput = z.infer<typeof blogPostSchema>;
export const blogPostUpdateSchema = blogPostSchema.partial();
