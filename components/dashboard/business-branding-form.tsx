"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  businessId: string;
  initialName: string;
  initialBrandColor: string;
  initialAvgJobValue: number | null;
}

export function BusinessBrandingForm({ businessId, initialName, initialBrandColor, initialAvgJobValue }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [brandColor, setBrandColor] = useState(initialBrandColor);
  const [avgJobValue, setAvgJobValue] = useState(initialAvgJobValue?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await fetch(`/api/v1/businesses/${businessId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        brandColor,
        avgJobValue: avgJobValue === "" ? null : Number(avgJobValue),
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const body = await res.json();
      setMessage(body.error ?? "Couldn't save changes.");
      return;
    }
    setMessage("Saved.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-700">Business name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-700">Widget brand color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="h-10 w-10 rounded-lg border border-ink-800/15"
            />
            <Input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} />
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-ink-700">
          Average value of a booked job ($)
        </label>
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="e.g. 250"
          value={avgJobValue}
          onChange={(e) => setAvgJobValue(e.target.value)}
        />
        <p className="mt-1 text-xs text-ink-700/50">
          This is what turns bookings into the "Revenue recovered" number on Analytics.
        </p>
      </div>

      {message && <p className="text-sm text-ink-700/70">{message}</p>}

      <Button type="submit" variant="outline" size="sm" disabled={saving}>
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
