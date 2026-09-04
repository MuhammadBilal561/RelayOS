import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export async function PATCH(req: NextRequest, { params }: { params: { businessId: string } }) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const update: Record<string, unknown> = {};

  if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim();
  if (typeof body.brandColor === "string") {
    if (!HEX_COLOR.test(body.brandColor)) {
      return NextResponse.json({ error: "brandColor must be a hex color like #F2A93B" }, { status: 400 });
    }
    update.brand_color = body.brandColor;
  }
  if (body.avgJobValue !== undefined) {
    const value = Number(body.avgJobValue);
    if (body.avgJobValue !== null && (Number.isNaN(value) || value < 0)) {
      return NextResponse.json({ error: "avgJobValue must be a non-negative number" }, { status: 400 });
    }
    update.avg_job_value = body.avgJobValue === null || body.avgJobValue === "" ? null : value;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // RLS confirms this user's organization actually owns the business.
  const { data: updatedBusiness, error } = await supabase
    .from("businesses")
    .update(update)
    .eq("id", params.businessId)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updatedBusiness) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  return NextResponse.json({ saved: true });
}
