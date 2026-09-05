import type { Metadata } from "next";
import { BuildsTable } from "@/components/admin/BuildsTable";

export const metadata: Metadata = { title: "User Builds — Admin" };
export const dynamic = "force-dynamic";

export default function AdminBuildsPage() {
  return <BuildsTable />;
}
