import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-business";
import { Card, CardContent } from "@/components/ui/card";
import { KnowledgeBaseUploader } from "@/components/dashboard/kb-uploader";
import { SectionHeader } from "@/components/dashboard/section-header";

export default async function KnowledgeBasePage() {
  const business = await getCurrentBusiness();
  const supabase = createServerSupabaseClient();

  const { data: documents } = await supabase
    .from("kb_documents")
    .select("id, title, created_at, content_text")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-10">
      <SectionHeader
        eyebrow="Knowledge Base"
        title="What your AI knows"
        description="Anything you add here gets embedded and used to ground the widget's answers — it will not invent prices or policies that aren't listed below."
      />

      <Card className="mt-6">
        <CardContent>
          <KnowledgeBaseUploader businessId={business.id} />
        </CardContent>
      </Card>

      <div className="mt-6 space-y-3">
        {documents?.map((doc) => (
          <Card key={doc.id}>
            <CardContent>
              <p className="text-sm font-medium text-ink-900">{doc.title}</p>
              <p className="mt-1 line-clamp-2 text-xs text-ink-700/60">{doc.content_text}</p>
              <p className="mt-2 font-mono text-[10px] text-ink-700/40">
                added {new Date(doc.created_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
