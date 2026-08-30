"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const WEBHOOK_FIELDS = [
  {
    key: "n8n_webhook_url_lead_qualified",
    label: "Lead Qualified",
    description: "Triggered when a visitor shares contact info for the first time.",
    eventType: "lead.qualified",
  },
  {
    key: "n8n_webhook_url_lead_escalated",
    label: "Lead Escalated",
    description: "Triggered when the AI hands off to a human with a summary.",
    eventType: "lead.escalated",
  },
  {
    key: "n8n_webhook_url_booking_created",
    label: "Booking Created",
    description: "Triggered when a visitor books an appointment on the calendar.",
    eventType: "booking.created",
  },
] as const;

type WebhookField = (typeof WEBHOOK_FIELDS)[number];

interface WebhookFormProps {
  businessId: string;
  initialUrls: Record<string, string | null>;
}

export function AutomationWebhookForm({ businessId, initialUrls }: WebhookFormProps) {
  const [urls, setUrls] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(initialUrls).map(([k, v]) => [k, v ?? ""])
    )
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleChange = (key: string, value: string) => {
    setUrls((prev) => ({ ...prev, [key]: value }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const webhookUrls: Record<string, string | null> = {};
    WEBHOOK_FIELDS.forEach((field) => {
      const url = urls[field.key]?.trim();
      webhookUrls[field.key] = url || null;
    });

    try {
      const res = await fetch("/api/v1/automations/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, webhookUrls }),
      });

      const json = await res.json();
      setSaving(false);

      if (res.ok) {
        setMessage("Saved.");
      } else {
        setMessage(json.error ?? "Couldn't save — check the URLs are valid.");
      }
    } catch {
      setSaving(false);
      setMessage("Network error — couldn't reach the server.");
    }
  }

  const getStatus = (url: string | null | undefined) => (url?.trim() ? "enabled" : "disabled");

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-sm text-ink-700/60">
        Each event posts to its own n8n webhook URL. Leave blank to disable that automation.
        <br />
        <a
          href="/automations"
          target="_blank"
          rel="noopener noreferrer"
          className="text-signal-600 underline underline-offset-2 hover:no-underline"
        >
          See example n8n workflows →
        </a>
      </p>

      <div className="space-y-5">
        {WEBHOOK_FIELDS.map((field) => {
          const url = urls[field.key] ?? "";
          const status = getStatus(url);

          return (
            <div key={field.key} className="rounded-xl border border-ink-800/10 bg-white/50 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ink-900">{field.label}</p>
                    <Badge variant={status === "enabled" ? "live" : "neutral"}>{status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-ink-700/60">{field.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="url"
                  placeholder="https://your-n8n-instance.example.com/webhook/relay"
                  value={url}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="flex-1"
                  disabled={saving}
                  aria-label={`${field.label} webhook URL`}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-3 border-t border-ink-800/10">
        <Button type="submit" variant="signal" size="sm" disabled={saving} className="w-full sm:w-auto">
          {saving ? "Saving…" : "Save all"}
        </Button>
        {message && (
          <p className="mt-3 text-sm text-ink-700/60 whitespace-pre-wrap">{message}</p>
        )}
      </div>
    </form>
  );
}