import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Next 16 proxy (the renamed middleware convention — middleware.ts is
 * deprecated). Runs on the Node.js runtime.
 *
 * Gates: /dashboard + /admin require a session; /admin additionally requires
 * profiles.role = 'admin'; signed-in users are bounced off /login + /signup.
 * Defense in depth: admin layouts and /api/admin/* routes re-check the role,
 * and RLS admin-only policies protect the data layer.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Missing env (e.g. build time) — never block the request here.
  if (!url || !anonKey) return NextResponse.next();

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
        // REQUIRED by @supabase/ssr: auth-cookie responses must carry the
        // no-cache headers, otherwise a CDN could leak one user's session.
        for (const [key, value] of Object.entries(headers)) {
          supabaseResponse.headers.set(key, value);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (!user && (path === "/dashboard" || path.startsWith("/dashboard/"))) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (!user && (path === "/admin" || path.startsWith("/admin/"))) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (path === "/login" || path === "/signup")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (path === "/admin" || path.startsWith("/admin/"))) {
    const { data: profile } = await supabase
      .from("naasify_profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Skip static assets, images and the Paystack webhook (raw body must
    // reach the route untouched for HMAC signature verification).
    "/((?!_next/static|_next/image|favicon.ico|logo.png|icon.png|api/webhooks).*)",
  ],
};
