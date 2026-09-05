import type { Metadata } from "next";
import { SupportInbox } from "@/components/admin/SupportInbox";

export const metadata: Metadata = { title: "Support — Admin" };
export const dynamic = "force-dynamic";

export default function AdminSupportPage() {
  return <SupportInbox />;
}
