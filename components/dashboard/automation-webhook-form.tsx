"use client";

import { useState } from "react";
import { Loader2, Webhook } from "lucide-react";
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
    Object.fromEntries(Object.entries(initialUrls).map(([k, v]) => [k, v ?? ""]))
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const handleChange = (key: string, value: string) => {
    setUrls((prev) => ({ ...prev, [key]: value }));
    setMessage(null);
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
        setMessage({ kind: "success", text: "Automation settings saved." });
      } else {
        setMessage({ kind: "error", text: json.error ?? "Couldn't save — check the URLs are valid." });
      }
    } catch {
      setSaving(false);
      setMessage({ kind: "error", text: "Network error — couldn't reach the server." });
    }
  }

  const enabledCount = WEBHOOK_FIELDS.filter((f) => urls[f.key]?.trim()).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm leading-relaxed text-ink-500">
          Each event posts to its own n8n webhook URL. Leave a field blank to disable that
          automation.
        </p>
        <Badge variant={enabledCount > 0 ? "live" : "neutral"}>
          {enabledCount}/3 active
        </Badge>
      </div>

      <div className="space-y-3">
        {WEBHOOK_FIELDS.map((field) => {
          const url = urls[field.key] ?? "";
          const enabled = url.trim().length > 0;

          return (
            <div
              key={field.key}
              className="rounded-xl border border-ink-900/[0.08] bg-white p-4 transition-shadow duration-150 hover:shadow-panel-hover"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: enabled ? "rgba(47,191,113,0.1)" : "rgba(17,20,27,0.06)" }}
                  >
                    <Webhook
                      className={`h-4 w-4 ${enabled ? "text-relay-700" : "text-ink-400"}`}
                      aria-hidden="true"
                    />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-ink-900">{field.label}</p>
                      <Badge variant={enabled ? "live" : "neutral"}>{enabled ? "enabled" : "disabled"}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-400">{field.description}</p>
                  </div>
                </div>
                <code className="hidden shrink-0 rounded-md bg-ink-900/[0.05] px-2 py-1 font-mono text-[10px] text-ink-500 sm:block">
                  {field.eventType}
                </code>
              </div>

              <Input
                type="url"
                placeholder="https://your-n8n-instance.example.com/webhook/relay"
                value={url}
                onChange={(e) => handleChange(field.key, e.target.value)}
                disabled={saving}
                aria-label={`${field.label} webhook URL`}
                className="font-mono text-xs"
              />
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" variant="signal" size="sm" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Saving…
            </>
          ) : (
            "Save all webhooks"
          )}
        </Button>
        {message && (
          <p
            role={message.kind === "error" ? "alert" : "status"}
            className={`text-sm ${message.kind === "error" ? "text-alert-600" : "text-relay-700"}`}
          >
            {message.text}
          </p>
        )}
      </div>

      <p className="text-xs text-ink-400">
        Need templates?{" "}
        <a
          href="/automations"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-signal-600 underline underline-offset-2 hover:no-underline"
        >
          See example n8n workflows
        </a>{" "}
        for each event.
      </p>
    </form>
  );
}
