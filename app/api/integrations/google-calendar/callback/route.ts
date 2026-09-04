import { NextRequest, NextResponse } from "next/server";
import { connectGoogleCalendar } from "@/lib/google-calendar";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

const GOOGLE_OAUTH_STATE_COOKIE = "relayos_google_oauth_state";

/**
 * Google redirects here with ?code=...&state=<state> after the owner approves
 * the consent screen. The state is matched to an HttpOnly cookie before the
 * business id is trusted.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const stateCookie = cookies().get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  const settingsUrl = new URL("/settings", req.url);

  if (!code || !state || !stateCookie || state !== stateCookie) {
    settingsUrl.searchParams.set("calendar_error", "Missing code or business reference from Google.");
    const response = NextResponse.redirect(settingsUrl);
    response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
    return response;
  }
  const businessId = state.slice(0, state.indexOf("."));
  if (!businessId) {
    settingsUrl.searchParams.set("calendar_error", "Invalid business reference from Google.");
    const response = NextResponse.redirect(settingsUrl);
    response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
    return response;
  }

  try {
    // OAuth state is not an authorization mechanism by itself. Re-check the
    // callback against the current session and organization before storing
    // tokens, otherwise a forged state could attach credentials cross-tenant.
    const supabase = createServerSupabaseClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) throw new Error("OAuth callback is not authenticated");
    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", auth.user.id)
      .single();
    if (userError || !userRow) throw new Error("OAuth callback account is not provisioned");
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", businessId)
      .eq("organization_id", userRow.organization_id)
      .maybeSingle();
    if (businessError || !business) throw new Error("OAuth callback business is not accessible");
    await connectGoogleCalendar(businessId, code);
    settingsUrl.searchParams.set("calendar_connected", "1");
  } catch (err) {
    console.error("Google Calendar connect failed:", err);
    settingsUrl.searchParams.set("calendar_error", "Couldn't connect Google Calendar — please try again.");
  }

  const response = NextResponse.redirect(settingsUrl);
  response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
  return response;
}
