import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ACTIVE_BUSINESS_COOKIE } from "@/lib/current-business";

/**
 * Adds another business under the caller's organization — the whole of
 * agency mode is "one organization, many businesses," so this is
 * deliberately just an insert scoped by RLS, not a separate concept.
 */
export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: userRow } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
  if (!userRow) return NextResponse.json({ error: "Account not fully set up" }, { status: 403 });

  const { name, industry } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const { data: business, error } = await supabase
    .from("businesses")
    .insert({ organization_id: userRow.organization_id, name, industry: industry || null })
    .select("id, name")
    .single();

  if (error || !business) {
    return NextResponse.json({ error: error?.message ?? "Failed to create business" }, { status: 500 });
  }

  const response = NextResponse.json({ businessId: business.id, name: business.name }, { status: 201 });
  response.cookies.set(ACTIVE_BUSINESS_COOKIE, business.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
