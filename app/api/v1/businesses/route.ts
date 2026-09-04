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
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) return NextResponse.json({ error: "Authentication unavailable" }, { status: 503 });
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: userRow, error: userError } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
  if (userError) {
    console.error("Business creation user lookup failed:", userError.message, { userId: user.id });
    return NextResponse.json({ error: "Couldn't verify account" }, { status: 503 });
  }
  if (!userRow) return NextResponse.json({ error: "Account not fully set up" }, { status: 403 });

  let body: { name?: string; industry?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { name, industry } = body;
  if (typeof name !== "string" || !name.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const { data: business, error } = await supabase
    .from("businesses")
    .insert({ organization_id: userRow.organization_id, name: name.trim(), industry: typeof industry === "string" && industry.trim() ? industry.trim() : null })
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
