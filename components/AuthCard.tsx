"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { resolvePostAuthPath } from "@/lib/redirect";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function AuthCard({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isLogin = mode === "login";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (isLogin) {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        // Role-aware landing: admins → /admin, everyone else → /dashboard,
        // unless a safe ?next deep-link (e.g. a purchase) overrides it.
        let role: string | null = null;
        if (data.user) {
          const { data: prof } = await supabase
            .from("naasify_profiles")
            .select("role")
            .eq("id", data.user.id)
            .maybeSingle();
          role = prof?.role ?? null;
        }
        router.push(resolvePostAuthPath(role, nextParam));
        router.refresh();
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          // New users are always role='user' (handle_new_auth_user trigger),
          // so skip the role fetch and just honour a safe ?next.
          router.push(resolvePostAuthPath(null, nextParam));
          router.refresh();
        } else {
          setNotice(
            "Account created. Check your email to confirm, then sign in.",
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass shadow-layered rounded-3xl p-8">
      <div className="mb-8 flex flex-col items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="NAASIFY logo"
            width={178}
            height={124}
            className="h-14 w-auto"
            priority
          />
          <span className="font-display text-xl font-extrabold tracking-tight">
            NAASIFY
          </span>
        </Link>
        <h1 className="text-gradient font-display text-2xl font-bold">
          {isLogin ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-center text-sm text-foreground/60">
          {isLogin
            ? "Sign in to manage your services and subscriptions."
            : "Start building on NAASIFY in minutes."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {!isLogin && (
          <Input
            label="Full name"
            placeholder="Ada Lovelace"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        )}
        <Input
          label="Email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />

        {error && (
          <p className="pill bg-red-500/15 px-4 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        {notice && (
          <p className="pill bg-accent-500/15 px-4 py-2 text-sm text-accent-300">
            {notice}
          </p>
        )}

        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
          {isLogin ? "Sign in" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-foreground/60">
        {isLogin ? (
          <>
            New to NAASIFY?{" "}
            <Link href="/signup" className="font-semibold text-accent-300 hover:text-accent-200">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-accent-300 hover:text-accent-200">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
