import type { Metadata } from "next";
import { OrdersTable } from "@/components/admin/OrdersTable";

export const metadata: Metadata = { title: "Orders — Admin" };
export const dynamic = "force-dynamic";

export default function AdminOrdersPage() {
  return <OrdersTable />;
}
