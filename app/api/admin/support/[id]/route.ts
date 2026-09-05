import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supportReplySchema } from "@/lib/validation";
import { sendEmail } from "@/lib/email/resend";
import { supportReplyUserEmail } from "@/lib/email/templates";
import type { Profile, SupportMessage } from "@/lib/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Full thread (oldest -> newest); opening it marks the user's messages read. */
export async function GET(_request: Request, { params }: Ctx) {
  const guard = await requireAdminApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("naasify_support_messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Read receipt: user-sent messages have sender_id === conversation_id.
  await supabase
    .from("naasify_support_messages")
    .update({ is_read: true })
    .eq("conversation_id", id)
    .eq("sender_id", id)
    .eq("is_read", false);

  return NextResponse.json({ messages: (data ?? []) as SupportMessage[] });
}

/** Admin reply into the user's thread; optionally emails the user. */
export async function POST(request: Request, { params }: Ctx) {
  const guard = await requireAdminApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = supportReplySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid reply" },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("naasify_support_messages")
    .insert({
      conversation_id: id,
      sender_id: guard.user.id,
      receiver_id: id,
      message_text: parsed.data.message_text,
      is_read: false,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Optional user notification (admin toggle), best-effort.
  if (parsed.data.notify_user) {
    const { data: profile } = await supabase
      .from("naasify_profiles")
      .select("email, full_name")
      .eq("id", id)
      .single();
    const recipient = profile as Pick<Profile, "email" | "full_name"> | null;
    if (recipient?.email) {
      await sendEmail({
        to: recipient.email,
        subject: "[NAASIFY Support] We replied to your message",
        html: supportReplyUserEmail({
          name: recipient.full_name,
          messageText: parsed.data.message_text,
        }),
      });
    }
  }

  return NextResponse.json({ message: data as SupportMessage });
}

/** Explicit read receipt for the thread (realtime clients call it on open). */
export async function PATCH(_request: Request, { params }: Ctx) {
  const guard = await requireAdminApi();
  if ("response" in guard) return guard.response;
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("naasify_support_messages")
    .update({ is_read: true })
    .eq("conversation_id", id)
    .eq("sender_id", id)
    .eq("is_read", false);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
