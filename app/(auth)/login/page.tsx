"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

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
    <main className="flex min-h-screen items-center justify-center bg-paper-50 px-6">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-700/50">RelayOS</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-ink-950">Welcome back</h1>
          <p className="mt-1 text-sm text-ink-700/70">Log in to your front office.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-ink-700">
                Email
              </label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-ink-700">
                Password
              </label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-alert-600">{error}</p>}

            <Button type="submit" variant="signal" className="w-full" disabled={loading}>
              {loading ? "Logging in…" : "Log in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-700/70">
            New here?{" "}
            <Link href="/signup" className="font-medium text-ink-950 underline underline-offset-4">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
