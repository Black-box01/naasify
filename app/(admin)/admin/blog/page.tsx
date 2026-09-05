import type { Metadata } from "next";
import { BlogTable } from "@/components/admin/BlogTable";

export const metadata: Metadata = { title: "Blog — Admin" };
export const dynamic = "force-dynamic";

export default function AdminBlogPage() {
  return <BlogTable />;
}
