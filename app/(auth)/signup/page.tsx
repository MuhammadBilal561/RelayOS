"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [organizationName, setOrganizationName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        setLoading(false);
        setError(signUpError.message);
        return;
      }

      if (!data.session) {
        setLoading(false);
        setError(
          "Signed up, but no session was returned — if your Supabase project requires email confirmation, disable that for local testing (Authentication → Providers → Email) or check your inbox."
        );
        return;
      }

      const res = await fetch("/api/v1/organizations/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationName, businessName }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }));
        setLoading(false);
        setError(body.error ?? `Failed to set up your account (${res.status})`);
        return;
      }

      // Wait briefly for session cookies to be fully set
      await new Promise(resolve => setTimeout(resolve, 1000));
      window.location.href = "/overview";
    } catch (err) {
      setLoading(false);
      setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper-50 px-6 py-12">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-700/50">RelayOS</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-ink-950">Set up your front office</h1>
          <p className="mt-1 text-sm text-ink-700/70">A couple of minutes, then your AI is live.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <div>
              <label htmlFor="org" className="mb-1.5 block text-xs font-medium text-ink-700">
                Your company / agency name
              </label>
              <Input id="org" required value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} />
            </div>
            <div>
              <label htmlFor="biz" className="mb-1.5 block text-xs font-medium text-ink-700">
                First client business name
              </label>
              <Input id="biz" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
            </div>
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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-alert-600">{error}</p>}

            <Button type="submit" variant="signal" className="w-full" disabled={loading}>
              {loading ? "Setting up…" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-700/70">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-ink-950 underline underline-offset-4">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
