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
