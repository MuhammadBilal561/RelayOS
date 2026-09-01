"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { AuthShell } from "@/components/auth/auth-shell";

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
    <AuthShell title="Set up your front office" subtitle="A couple of minutes, then your AI is live.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Your company / agency name" htmlFor="org" spacing="sm">
          <Input id="org" required value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} />
        </Field>
        <Field label="First client business name" htmlFor="biz" spacing="sm">
          <Input id="biz" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
        </Field>
        <Field label="Email" htmlFor="email" spacing="sm">
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          spacing="sm"
          hint="At least 6 characters."
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
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
              Setting up…
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-ink-950 underline underline-offset-4 hover:text-signal-700">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
