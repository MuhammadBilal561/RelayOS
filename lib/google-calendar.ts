import { google } from "googleapis";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { encryptToken, decryptToken, isEncrypted } from "@/lib/crypto";

const SCOPES = ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/calendar.readonly"];

function persistToken(token: string): string {
  // Never silently downgrade OAuth credentials to plaintext. A missing or
  // malformed encryption key must fail the connection instead.
  return encryptToken(token);
}

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI must be set — see README's Phase 2 setup section."
    );
  }
  try {
    const parsedRedirectUri = new URL(redirectUri);
    if (process.env.NODE_ENV === "production" && parsedRedirectUri.protocol !== "https:") {
      throw new Error("GOOGLE_REDIRECT_URI must use https in production");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("must use https")) throw error;
    throw new Error("GOOGLE_REDIRECT_URI must be a valid absolute URL");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Builds the Google consent screen URL. `state` carries the business id
 * through the OAuth round-trip so the callback route knows which
 * business to attach the resulting tokens to.
 */
export function getGoogleAuthUrl(businessId: string): string {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline", // required to receive a refresh_token
    prompt: "consent", // forces a refresh_token on every connect, even reconnects
    scope: SCOPES,
    state: businessId,
  });
}

/** Exchanges an OAuth `code` for tokens and stores them for the business. */
export async function connectGoogleCalendar(businessId: string, code: string) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token) {
    throw new Error("Google did not return an access token. Try disconnecting and reconnecting.");
  }

  const supabase = createServiceRoleClient();

  let refreshToken = tokens.refresh_token ?? null;
  if (!refreshToken) {
    const { data: existing, error: existingError } = await supabase
      .from("calendar_connections")
      .select("refresh_token")
      .eq("business_id", businessId)
      .maybeSingle();
    if (existingError) throw new Error(`Failed to read existing calendar connection: ${existingError.message}`);
    if (existing?.refresh_token) {
      refreshToken = isEncrypted(existing.refresh_token)
        ? decryptToken(existing.refresh_token)
        : existing.refresh_token;
    }
  }

  if (!refreshToken) {
    throw new Error("Google did not return a refresh token. Try disconnecting and reconnecting.");
  }

  const expiryDate = tokens.expiry_date ?? Date.now() + 3600_000;

  // We deliberately don't reuse the OAuth client for userinfo here — calling
  // oauth2.userinfo.get() with the freshly-set client can throw a transient
  // 401 on some Node/auth-library combos because the credentials aren't fully
  // applied to the underlying token store. Google exposes the same data via
  // a public tokeninfo endpoint that just needs the raw access token.
  const profileRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${tokens.access_token}`);
  let connectedEmail: string | null = null;
  if (profileRes.ok) {
    const profile = (await profileRes.json()) as { email?: string; email_verified?: string };
    // Google's tokeninfo returns email_verified as the string "true", not a boolean.
    if (profile.email_verified === "true" && profile.email) {
      connectedEmail = profile.email;
    }
  } else {
    // Non-fatal: we still save the tokens; the connected_email column just stays null.
    console.warn("tokeninfo lookup failed:", profileRes.status, await profileRes.text());
  }

  const { error } = await supabase.from("calendar_connections").upsert(
    {
      business_id: businessId,
      provider: "google",
      access_token: persistToken(tokens.access_token),
      refresh_token: persistToken(refreshToken),
      token_expires_at: new Date(expiryDate).toISOString(),
      calendar_id: "primary",
      connected_email: connectedEmail,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "business_id" }
  );

  if (error) throw new Error(`Failed to save calendar connection: ${error.message}`);
}

/**
 * Returns an authenticated Calendar API client for a business, refreshing
 * the access token first if it's expired. Returns null if the business
 * hasn't connected a calendar yet — callers should treat that as "booking
 * isn't available for this business" rather than throwing.
 */
async function getCalendarClientForBusiness(businessId: string) {
  const supabase = createServiceRoleClient();
  const { data: connection, error: connectionError } = await supabase
    .from("calendar_connections")
    .select("access_token, refresh_token, token_expires_at, calendar_id")
    .eq("business_id", businessId)
    .maybeSingle();

  if (connectionError) throw new Error(`Failed to load calendar connection: ${connectionError.message}`);
  if (!connection) return null;

  const accessToken = isEncrypted(connection.access_token)
    ? decryptToken(connection.access_token)
    : connection.access_token;
  const refreshToken = isEncrypted(connection.refresh_token)
    ? decryptToken(connection.refresh_token)
    : connection.refresh_token;

  const client = getOAuthClient();
  client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: new Date(connection.token_expires_at).getTime(),
  });

  // googleapis refreshes automatically on demand, but we persist the new
  // access token so we're not re-refreshing on every single call.
  client.on("tokens", (tokens) => {
    if (!tokens.access_token) return;
    void (async () => {
      const { error } = await supabase
        .from("calendar_connections")
        .update({
          access_token: persistToken(tokens.access_token as string),
          token_expires_at: new Date(tokens.expiry_date ?? Date.now() + 3600_000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("business_id", businessId);
      if (error) {
        console.error("Failed to persist refreshed Google access token:", error.message, { businessId });
      }
    })().catch((error: unknown) => {
      console.error("Failed to process refreshed Google access token:", error, { businessId });
    });
  });

  return { calendar: google.calendar({ version: "v3", auth: client }), calendarId: connection.calendar_id };
}

export interface AvailabilityResult {
  connected: boolean;
  available: boolean;
  suggestedStartIso?: string;
}

/**
 * Checks whether a specific slot is free, and if not, scans forward in
 * 30-minute steps (up to 4 hours) to suggest the next open slot — this is
 * what lets the agent say "that's booked, but 3pm is open" instead of
 * just "sorry, no."
 */
export async function checkAvailability(
  businessId: string,
  startIso: string,
  durationMinutes = 30
): Promise<AvailabilityResult> {
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || durationMinutes > 24 * 60) {
    throw new Error("durationMinutes must be between 1 and 1440");
  }
  const requestedStart = new Date(startIso);
  if (Number.isNaN(requestedStart.getTime())) {
    throw new Error("startIso must be a valid ISO 8601 datetime");
  }
  const ctx = await getCalendarClientForBusiness(businessId);
  if (!ctx) return { connected: false, available: false };

  const stepMs = 30 * 60_000;
  const durationMs = durationMinutes * 60_000;
  let cursorStart = requestedStart;

  for (let attempt = 0; attempt < 8; attempt++) {
    const cursorEnd = new Date(cursorStart.getTime() + durationMs);

    const { data } = await ctx.calendar.freebusy.query({
      requestBody: {
        timeMin: cursorStart.toISOString(),
        timeMax: cursorEnd.toISOString(),
        items: [{ id: ctx.calendarId }],
      },
    });

    const busy = data.calendars?.[ctx.calendarId]?.busy ?? [];
    if (busy.length === 0) {
      return {
        connected: true,
        available: attempt === 0,
        suggestedStartIso: cursorStart.toISOString(),
      };
    }
    cursorStart = new Date(cursorStart.getTime() + stepMs);
  }

  return { connected: true, available: false };
}

/** Creates the calendar event once a slot is confirmed. */
export async function createCalendarEvent(
  businessId: string,
  params: { startIso: string; endIso: string; summary: string; description?: string; attendeeEmail?: string }
): Promise<string | null> {
  const ctx = await getCalendarClientForBusiness(businessId);
  if (!ctx) return null;

  const { data, status } = await ctx.calendar.events.insert({
    calendarId: ctx.calendarId,
    requestBody: {
      summary: params.summary,
      description: params.description,
      start: { dateTime: params.startIso },
      end: { dateTime: params.endIso },
      attendees: params.attendeeEmail ? [{ email: params.attendeeEmail }] : undefined,
    },
  });

  if (!data.id) throw new Error(`Google Calendar created an event without an id (HTTP ${status ?? "unknown"})`);
  return data.id;
}
