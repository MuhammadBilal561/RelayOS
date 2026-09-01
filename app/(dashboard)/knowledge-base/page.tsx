import Link from "next/link";
import { BookOpen, FileText, Layers } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-business";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { KnowledgeBaseUploader } from "@/components/dashboard/kb-uploader";
import { SectionHeader } from "@/components/dashboard/section-header";
import { formatDate } from "@/lib/format";

export default async function KnowledgeBasePage() {
  const business = await getCurrentBusiness();
  const supabase = createServerSupabaseClient();

  const { data: documents } = await supabase
    .from("kb_documents")
    .select("id, title, created_at, content_text")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const docIds = (documents ?? []).map((d) => d.id);
  const { data: chunkRows } = docIds.length
    ? await supabase.from("kb_chunks").select("document_id")
    : { data: [] };

  const chunkCounts = new Map<string, number>();
  for (const chunk of chunkRows ?? []) {
    chunkCounts.set(chunk.document_id, (chunkCounts.get(chunk.document_id) ?? 0) + 1);
  }

  const docs = (documents ?? []).map((doc) => ({
    ...doc,
    chunkCount: chunkCounts.get(doc.id) ?? 0,
  }));

  return (
    <div className="mx-auto w-full max-w-3xl p-6 sm:p-8">
      <SectionHeader
        eyebrow="Knowledge Base"
        title="What your AI knows"
        description="Anything you add here gets embedded and used to ground the widget's answers — it will not invent prices or policies that aren't listed below."
      />

      <Card className="mt-6">
        <CardHeader>
          <div>
            <CardTitle>Add a document</CardTitle>
            <CardDescription>
              The content is chunked, embedded, and indexed so answers stay grounded in your actual business data.
            </CardDescription>
          </div>
        </CardHeader>
        <div className="p-5 pt-4">
          <KnowledgeBaseUploader businessId={business.id} />
        </div>
      </Card>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold tracking-tight text-ink-950">
          Documents{" "}
          {docs.length > 0 && (
            <span className="ml-1 font-mono text-xs font-normal text-ink-400">{docs.length}</span>
          )}
        </h2>
      </div>

      {docs.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={FileText}
          title="No documents yet"
          description="Add your pricing, services, and policies above. Until then, the widget answers from general knowledge only."
        />
      ) : (
        <ul className="mt-4 space-y-2">
          {docs.map((doc) => (
            <li key={doc.id}>
              <div className="surface p-4 transition-shadow duration-150 hover:shadow-panel-hover">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-signal-500/10 text-signal-700">
                      <BookOpen className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-900">{doc.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-400">
                        {doc.content_text}
                      </p>
                      <p className="mt-2 font-mono text-[10px] text-ink-300">
                        added {formatDate(doc.created_at)}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="success"
                    dot
                    dotTone="live"
                    className="shrink-0"
                    title={`${doc.chunkCount} chunk(s) embedded`}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Layers className="h-3 w-3" aria-hidden="true" />
                      {doc.chunkCount} chunk{doc.chunkCount === 1 ? "" : "s"}
                    </span>
                  </Badge>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs text-ink-400">
        Want to test it?{" "}
        <Link href="/widget/demo-widget-key" target="_blank" className="font-medium text-signal-600 hover:text-signal-700">
          Open the live widget
        </Link>{" "}
        and ask a question about what you just added.
      </p>
    </div>
  );
}
