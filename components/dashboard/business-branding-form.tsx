"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";

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
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

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
      setMessage({ kind: "error", text: body.error ?? "Couldn't save changes." });
      return;
    }
    setMessage({ kind: "success", text: "Changes saved." });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Business name" htmlFor="biz-name" spacing="sm">
          <Input id="biz-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field
          label="Widget brand color"
          htmlFor="brand-color"
          spacing="sm"
          hint="Used by the chat widget header and send button."
        >
          <div className="flex items-center gap-2">
            <input
              id="brand-color"
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="h-10 w-11 shrink-0 cursor-pointer rounded-lg border border-ink-900/15 bg-white p-1 transition-colors hover:border-ink-900/25"
              aria-label="Choose widget brand color"
            />
            <Input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="font-mono text-xs" />
          </div>
        </Field>
      </div>

      <Field
        label="Average value of a booked job ($)"
        htmlFor="avg-job"
        spacing="sm"
        hint="This is what turns bookings into the revenue-recovered number on Analytics."
      >
        <Input
          id="avg-job"
          type="number"
          min="0"
          step="0.01"
          placeholder="e.g. 250"
          value={avgJobValue}
          onChange={(e) => setAvgJobValue(e.target.value)}
          className="max-w-[220px]"
        />
      </Field>

      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={`flex items-center gap-1.5 text-sm ${message.kind === "error" ? "text-alert-600" : "text-relay-700"}`}
        >
          {message.kind === "error" ? (
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
          {message.text}
        </p>
      )}

      <Button type="submit" variant="primary" size="sm" disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Saving…
          </>
        ) : (
          "Save changes"
        )}
      </Button>
    </form>
  );
}
