import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile, SupportConversation, SupportMessage } from "@/lib/types";

export const dynamic = "force-dynamic";

const SCAN_LIMIT = 1000;

/**
 * Admin support inbox: every user thread with its latest message + unread count.
 * conversation_id === the user's id, so a user-sent message is one where
 * sender_id === conversation_id — that is what feeds the unread badge.
 */
export async function GET() {
  const guard = await requireAdminApi();
  if ("response" in guard) return guard.response;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("naasify_support_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(SCAN_LIMIT);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const messages = (data ?? []) as SupportMessage[];

  // Newest-first, so the first message seen per thread is its latest.
  const grouped = new Map<string, { last_message: SupportMessage; unread_count: number }>();
  for (const m of messages) {
    const userSent = m.sender_id === m.conversation_id;
    const unread = userSent && !m.is_read ? 1 : 0;
    const existing = grouped.get(m.conversation_id);
    if (existing) {
      existing.unread_count += unread;
    } else {
      grouped.set(m.conversation_id, { last_message: m, unread_count: unread });
    }
  }

  const conversationIds = [...grouped.keys()];
  const users = new Map<string, Pick<Profile, "id" | "email" | "full_name">>();
  if (conversationIds.length) {
    const { data: profiles } = await supabase
      .from("naasify_profiles")
      .select("id, email, full_name")
      .in("id", conversationIds);
    for (const p of (profiles ?? []) as Pick<Profile, "id" | "email" | "full_name">[]) {
      users.set(p.id, p);
    }
  }

  const conversations: SupportConversation[] = conversationIds
    .map((id) => {
      const g = grouped.get(id)!;
      return {
        conversation_id: id,
        user: users.get(id) ?? null,
        last_message: g.last_message,
        unread_count: g.unread_count,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.last_message.created_at).getTime() -
        new Date(a.last_message.created_at).getTime(),
    );

  return NextResponse.json({ conversations });
}
