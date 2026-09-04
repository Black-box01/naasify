import { requireUser } from "@/lib/auth";

/**
 * Gate for every /dashboard route. Signed-out visitors are redirected to
 * /login (proxy.ts also guards this; the layout is a second line of defense).
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">{children}</div>;
}
