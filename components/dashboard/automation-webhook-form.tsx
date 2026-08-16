"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AutomationWebhookForm({ businessId, initialUrl }: { businessId: string; initialUrl: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/v1/automations/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, webhookUrl: url }),
    });
    setSaving(false);
    setMessage(res.ok ? "Saved." : "Couldn't save that URL — check it's a valid https:// link.");
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        type="url"
        placeholder="https://your-n8n-instance.example.com/webhook/relay"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <Button type="submit" variant="outline" size="sm" disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </Button>
      {message && <span className="whitespace-nowrap text-xs text-ink-700/60">{message}</span>}
    </form>
  );
}
