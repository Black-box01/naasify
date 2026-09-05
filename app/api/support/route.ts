import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supportMessageSchema } from "@/lib/validation";
import { sendEmail } from "@/lib/email/resend";
import { supportNewMessageAdminEmail } from "@/lib/email/templates";
import { CONTACT_EMAIL } from "@/lib/constants";
import type { SupportMessage } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * The signed-in user's support thread. conversation_id === the user's id, so a
 * single continuous conversation runs between each user and the admin team.
 */
export async function GET() {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("naasify_support_messages")
    .select("*")
    .eq("conversation_id", current.user.id)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Opening the thread marks any admin replies as read (best-effort receipt).
  await supabase
    .from("naasify_support_messages")
    .update({ is_read: true })
    .eq("conversation_id", current.user.id)
    .neq("sender_id", current.user.id)
    .eq("is_read", false);

  return NextResponse.json({ messages: (data ?? []) as SupportMessage[] });
}

/** Send a message to the admin team; fires an immediate email alert. */
export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = supportMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid message" },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("naasify_support_messages")
    .insert({
      conversation_id: current.user.id,
      sender_id: current.user.id,
      receiver_id: null,
      message_text: parsed.data.message_text,
      is_read: false,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // The row is the source of truth; the alert email is best-effort.
  const userEmail = current.user.email ?? "";
  await sendEmail({
    to: CONTACT_EMAIL,
    subject: `[NAASIFY Support] New message from ${userEmail}`,
    html: supportNewMessageAdminEmail({
      userName: current.profile?.full_name,
      userEmail,
      messageText: parsed.data.message_text,
    }),
    replyTo: userEmail || undefined,
  });

  return NextResponse.json({ message: data as SupportMessage });
}
