import type { Metadata } from "next";
import { PlanTable } from "@/components/admin/PlanTable";

export const metadata: Metadata = { title: "Plans — Admin" };
export const dynamic = "force-dynamic";

export default function AdminPlansPage() {
  return <PlanTable />;
}
