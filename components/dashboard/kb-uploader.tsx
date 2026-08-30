"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function KnowledgeBaseUploader({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [contentText, setContentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/v1/knowledge-base/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, title, contentText }),
    });
    const body = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(body.error ?? "Failed to save this document.");
      return;
    }

    setSuccess(`Saved and embedded ${body.chunksIngested} chunk(s). The widget can use this immediately.`);
    setTitle("");
    setContentText("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="title" className="mb-1.5 block text-xs font-medium text-ink-700">
          Title
        </label>
        <Input
          id="title"
          placeholder="e.g. Pricing & Services"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="content" className="mb-1.5 block text-xs font-medium text-ink-700">
          Content
        </label>
        <textarea
          id="content"
          required
          rows={6}
          placeholder="Paste your FAQ, pricing, service menu, or policies here — plain text is fine."
          value={contentText}
          onChange={(e) => setContentText(e.target.value)}
          className="w-full rounded-lg border border-ink-800/15 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-700/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-500/40"
        />
      </div>

      {error && <p className="text-sm text-alert-600">{error}</p>}
      {success && <p className="text-sm text-relay-600">{success}</p>}

      <Button type="submit" variant="signal" disabled={submitting}>
        {submitting ? "Embedding…" : "Save & embed"}
      </Button>
    </form>
  );
}
