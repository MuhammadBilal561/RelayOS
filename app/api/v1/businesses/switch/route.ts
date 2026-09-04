import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ACTIVE_BUSINESS_COOKIE } from "@/lib/current-business";

/**
 * Agency mode: switches which business the dashboard is showing. Confirms
 * the requested business actually belongs to the caller's organization
 * before trusting it (RLS on the select does this for us — a business
 * outside the org simply won't be found).
 */
export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  const overviewUrl = new URL("/overview", req.url);

  if (!businessId) return NextResponse.redirect(overviewUrl);

  const supabase = createServerSupabaseClient();
  const { data: business, error } = await supabase.from("businesses").select("id").eq("id", businessId).maybeSingle();

  if (error) {
    console.error("Business switch lookup failed:", error.message);
    return NextResponse.redirect(overviewUrl);
  }
  if (!business) {
    // Either it doesn't exist, or RLS hid it because it belongs to another
    // organization — either way, don't switch to it.
    return NextResponse.redirect(overviewUrl);
  }

  const response = NextResponse.redirect(overviewUrl);
  response.cookies.set(ACTIVE_BUSINESS_COOKIE, businessId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
