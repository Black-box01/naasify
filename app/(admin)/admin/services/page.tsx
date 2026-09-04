import type { Metadata } from "next";
import { ServiceTable } from "@/components/admin/ServiceTable";

export const metadata: Metadata = { title: "Services — Admin" };
export const dynamic = "force-dynamic";

export default function AdminServicesPage() {
  return <ServiceTable />;
}
