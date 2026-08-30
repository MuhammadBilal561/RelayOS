import { NextRequest, NextResponse } from "next/server";
import { getCurrentBusiness } from "@/lib/current-business";
import { getGoogleAuthUrl } from "@/lib/google-calendar";

/**
 * Authenticated dashboard route: redirects the business owner to Google's
 * consent screen. getCurrentBusiness() already enforces they're logged in
 * and own a business before we hand out an auth URL for it.
 */
export async function GET(_req: NextRequest) {
  const business = await getCurrentBusiness();
  const url = getGoogleAuthUrl(business.id);
  return NextResponse.redirect(url);
}
