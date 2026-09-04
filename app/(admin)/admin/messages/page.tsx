import type { Metadata } from "next";
import { MessagesInbox } from "@/components/admin/MessagesInbox";

export const metadata: Metadata = { title: "Messages — Admin" };
export const dynamic = "force-dynamic";

export default function AdminMessagesPage() {
  return <MessagesInbox />;
}
