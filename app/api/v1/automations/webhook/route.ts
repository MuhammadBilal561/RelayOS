import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { businessId, webhookUrl } = await req.json();
  if (!businessId) {
    return NextResponse.json({ error: "businessId is required" }, { status: 400 });
  }

  if (webhookUrl) {
    try {
      const parsed = new URL(webhookUrl);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("invalid protocol");
    } catch {
      return NextResponse.json({ error: "webhookUrl must be a valid URL" }, { status: 400 });
    }
  }

  // RLS confirms this user's organization actually owns the business.
  const { error } = await supabase
    .from("businesses")
    .update({ n8n_webhook_url: webhookUrl || null })
    .eq("id", businessId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ saved: true });
}
