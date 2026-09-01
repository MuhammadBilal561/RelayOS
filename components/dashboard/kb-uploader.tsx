"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";

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
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Title" htmlFor="title" spacing="sm">
        <Input
          id="title"
          placeholder="e.g. Pricing & Services"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>
      <Field
        label="Content"
        htmlFor="content"
        spacing="sm"
        hint="Paste your FAQ, pricing, service menu, or policies here — plain text is fine."
      >
        <Textarea
          id="content"
          required
          rows={6}
          placeholder="Paste your FAQ, pricing, service menu, or policies here — plain text is fine."
          value={contentText}
          onChange={(e) => setContentText(e.target.value)}
        />
      </Field>

      {error && (
        <p role="alert" className="flex items-center gap-1.5 rounded-lg bg-alert-500/10 px-3 py-2 text-sm text-alert-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="flex items-center gap-1.5 rounded-lg bg-relay-500/10 px-3 py-2 text-sm text-relay-700">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {success}
        </p>
      )}

      <Button type="submit" variant="signal" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Embedding…
          </>
        ) : (
          "Save & embed"
        )}
      </Button>
    </form>
  );
}
