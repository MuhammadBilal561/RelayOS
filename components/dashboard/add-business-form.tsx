"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label className="mb-1.5 block text-xs font-medium text-ink-700">New business name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Riverside Dental" required />
      </div>
      <div className="flex-1">
        <label className="mb-1.5 block text-xs font-medium text-ink-700">Industry (optional)</label>
        <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Dental" />
      </div>
      <Button type="submit" variant="signal" size="sm" disabled={saving}>
        {saving ? "Creating…" : "Add business"}
      </Button>
      {error && <p className="text-sm text-alert-600">{error}</p>}
    </form>
  );
}
