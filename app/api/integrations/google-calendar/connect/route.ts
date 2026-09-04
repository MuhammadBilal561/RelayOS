import { NextRequest, NextResponse } from "next/server";
import { getCurrentBusiness } from "@/lib/current-business";
import { getGoogleAuthUrl } from "@/lib/google-calendar";
import { randomBytes } from "node:crypto";

const GOOGLE_OAUTH_STATE_COOKIE = "relayos_google_oauth_state";

/**
 * Authenticated dashboard route: redirects the business owner to Google's
 * consent screen. getCurrentBusiness() already enforces they're logged in
 * and own a business before we hand out an auth URL for it.
 */
export async function GET(_req: NextRequest) {
  const business = await getCurrentBusiness();
  const state = `${business.id}.${randomBytes(32).toString("hex")}`;
  const response = NextResponse.redirect(getGoogleAuthUrl(state));
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return response;
}
