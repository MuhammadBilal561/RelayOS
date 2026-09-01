"use client";

import { useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";

export function AddBusinessForm() {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/v1/businesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, industry }),
    });

    if (!res.ok) {
      const body = await res.json();
      setSaving(false);
      setError(body.error ?? "Couldn't create that business.");
      return;
    }

    // The route already set the new business as active via cookie —
    // reload into it fresh rather than trying to patch client state.
    window.location.href = "/overview";
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="New business name" htmlFor="new-biz-name" spacing="sm">
          <Input
            id="new-biz-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Riverside Dental"
            required
          />
        </Field>
        <Field label="Industry (optional)" htmlFor="new-biz-industry" spacing="sm">
          <Input
            id="new-biz-industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="e.g. Dental"
          />
        </Field>
      </div>

      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-alert-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <Button type="submit" variant="signal" size="sm" disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Creating…
          </>
        ) : (
          "Add business"
        )}
      </Button>
    </form>
  );
}
