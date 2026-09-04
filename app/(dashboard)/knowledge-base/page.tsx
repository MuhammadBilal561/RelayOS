import Link from "next/link";
import { BookOpen, FileText, Layers } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-business";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { KnowledgeBaseUploader } from "@/components/dashboard/kb-uploader";
import { SectionHeader } from "@/components/dashboard/section-header";
import { PageShell } from "@/components/dashboard/page-shell";
import { formatDate } from "@/lib/format";

export default async function KnowledgeBasePage() {
  const business = await getCurrentBusiness();
  const supabase = createServerSupabaseClient();

  const { data: documents, error: documentsError } = await supabase
    .from("kb_documents")
    .select("id, title, created_at, content_text")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });
  if (documentsError) throw new Error(`Failed to load knowledge base documents: ${documentsError.message}`);

  const docIds = (documents ?? []).map((d) => d.id);
  const { data: chunkRows, error: chunksError } = docIds.length
    ? await supabase.from("kb_chunks").select("document_id").eq("business_id", business.id).in("document_id", docIds)
    : { data: [], error: null };
  if (chunksError) throw new Error(`Failed to load knowledge base chunks: ${chunksError.message}`);

  const chunkCounts = new Map<string, number>();
  for (const chunk of chunkRows ?? []) {
    chunkCounts.set(chunk.document_id, (chunkCounts.get(chunk.document_id) ?? 0) + 1);
  }

  const docs = (documents ?? []).map((doc) => ({
    ...doc,
    chunkCount: chunkCounts.get(doc.id) ?? 0,
  }));

  return (
    <PageShell width="narrow">
      <SectionHeader
        eyebrow="Knowledge Base"
        title="What your AI knows"
        description="Anything you add here gets embedded and used to ground the widget's answers — it will not invent prices or policies that aren't listed below."
      />

      <div className="mt-7 overflow-hidden rounded-2xl border border-ink-900/8 bg-[#fffdf8] shadow-[0_18px_40px_-24px_rgba(55,40,18,0.28)]">
        <div className="border-b border-ink-900/8 bg-ink-950 px-5 py-5 text-white sm:px-6">
          <h2 className="font-display text-lg font-semibold tracking-tight">Add a document</h2>
          <p className="mt-1 text-sm text-white/55">
            The content is chunked, embedded, and indexed so answers stay grounded in your actual business data.
          </p>
        </div>
        <div className="p-5 sm:p-6">
          <KnowledgeBaseUploader businessId={business.id} />
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-display text-base font-semibold tracking-tight text-ink-950">
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
        <ul className="mt-4 space-y-3">
          {docs.map((doc) => (
            <li key={doc.id}>
              <div className="surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-950 text-signal-400">
                      <BookOpen className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-semibold text-ink-950">{doc.title}</p>
                      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-500">
                        {doc.content_text}
                      </p>
                      <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-ink-400">
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
        <Link href="/widget/demo-widget-key" target="_blank" className="font-medium text-signal-700 hover:text-signal-600">
          Open the live widget
        </Link>{" "}
        and ask a question about what you just added.
      </p>
    </PageShell>
  );
}
