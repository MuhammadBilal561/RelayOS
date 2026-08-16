import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ingestDocument } from "@/lib/rag/ingest";

export const runtime = "nodejs";

/**
 * Authenticated dashboard endpoint: a business owner uploads/pastes a
 * document (FAQ, pricing sheet, service menu) and it gets chunked +
 * embedded for the widget's RAG retrieval to use immediately.
 */
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { businessId, title, contentText } = await req.json();
  if (!businessId || !title || !contentText?.trim()) {
    return NextResponse.json({ error: "businessId, title, and contentText are required" }, { status: 400 });
  }

  // RLS confirms this user's organization actually owns the business —
  // if the select returns nothing, they don't have access.
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .single();

  if (businessError || !business) {
    return NextResponse.json({ error: "Business not found or access denied" }, { status: 403 });
  }

  try {
    const result = await ingestDocument({
      businessId,
      title,
      sourceType: "manual",
      contentText,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("Knowledge base ingestion failed:", err);
    return NextResponse.json({ error: "Failed to ingest document" }, { status: 500 });
  }
}
