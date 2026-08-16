import { NextRequest, NextResponse } from "next/server";
import { connectGoogleCalendar } from "@/lib/google-calendar";

/**
 * Google redirects here with ?code=...&state=<businessId> after the owner
 * approves the consent screen. `state` is how we know which business
 * these tokens belong to — see getGoogleAuthUrl() in lib/google-calendar.ts.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const businessId = req.nextUrl.searchParams.get("state");
  const settingsUrl = new URL("/settings", req.url);

  if (!code || !businessId) {
    settingsUrl.searchParams.set("calendar_error", "Missing code or business reference from Google.");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    await connectGoogleCalendar(businessId, code);
    settingsUrl.searchParams.set("calendar_connected", "1");
  } catch (err) {
    console.error("Google Calendar connect failed:", err);
    settingsUrl.searchParams.set("calendar_error", "Couldn't connect Google Calendar — please try again.");
  }

  return NextResponse.redirect(settingsUrl);
}
