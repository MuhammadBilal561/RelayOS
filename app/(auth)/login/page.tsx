"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { AuthShell } from "@/components/auth/auth-shell";

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Read the ?error= param from the browser URL rather than useSearchParams().
  // useSearchParams() forces a CSR bailout that `next build` rejects while
  // prerendering this page unless it sits inside a Suspense boundary; reading
  // window.location in an effect keeps the page statically prerenderable.
  useEffect(() => {
    const errorParam = new URLSearchParams(window.location.search).get("error");
    if (errorParam === "auth_callback_error") {
      setError("Authentication failed. Please try again.");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      setError("Login successful but no session was created. Please try again.");
      setLoading(false);
      return;
    }

    // Wait briefly for session cookies to be fully set
    await new Promise((resolve) => setTimeout(resolve, 500));
    window.location.href = "/overview";
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to your front office.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email" htmlFor="email" spacing="sm">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password" htmlFor="password" spacing="sm">
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        {error && (
          <p role="alert" className="flex items-center gap-1.5 rounded-lg bg-alert-500/10 px-3 py-2 text-sm text-alert-700">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        <Button type="submit" variant="signal" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Logging in…
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        New here?{" "}
        <Link href="/signup" className="font-medium text-ink-950 underline underline-offset-4 hover:text-signal-700">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
