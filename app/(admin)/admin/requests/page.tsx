import type { Metadata } from "next";
import { RequestsTable } from "@/components/admin/RequestsTable";

export const metadata: Metadata = { title: "Service Requests — Admin" };
export const dynamic = "force-dynamic";

export default function AdminRequestsPage() {
  return <RequestsTable />;
}
