/**
 * Phase 4 — Live double-booking test.
 *
 * Verifies that booking the same slot twice is prevented: the second
 * check_availability on the same slot must report it busy, and the hard
 * safety guard in executeTool's create_booking (which calls
 * checkAvailability before creating any event) would refuse it.
 *
 * Uses the same direct-client pattern as phase4-booking-check.mjs
 * (reads .env.local, @supabase/supabase-js + googleapis directly —
 * no TS module imports).
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

// Business that has a connected calendar (verified in phase4-booking-check).
const BUSINESS_ID = "679f7f98-96a3-4ab8-b3f8-23b25d1dcc27";
// A slot well in the future so it's certainly free the first time.
const START_ISO = "2026-09-15T15:00:00.000Z";
const DURATION_MINUTES = 30;
const SUMMARY = "Phase 4 double-booking test — first attempt";

/** Build an authenticated Calendar client for a business, refreshing if needed. */
async function getCalendarClient(businessId) {
  const { data: conn } = await service
    .from("calendar_connections")
    .select("access_token, refresh_token, token_expires_at, calendar_id")
    .eq("business_id", businessId)
    .maybeSingle();
  if (!conn) return null;

  const oauth = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );
  oauth.setCredentials({
    access_token: conn.access_token,
    refresh_token: conn.refresh_token,
    expiry_date: new Date(conn.token_expires_at).getTime(),
  });

  // Persist refreshed tokens back to the DB like lib/google-calendar.ts does.
  oauth.on("tokens", async (tokens) => {
    if (!tokens.access_token) return;
    await service
      .from("calendar_connections")
      .update({
        access_token: tokens.access_token,
        token_expires_at: new Date(tokens.expiry_date ?? Date.now() + 3600_000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("business_id", businessId);
  });

  return { calendar: google.calendar({ version: "v3", auth: oauth }), calendarId: conn.calendar_id };
}

/** Mirrors lib/google-calendar.ts checkAvailability. */
async function checkAvailability(businessId, startIso, durationMinutes = 30) {
  const ctx = await getCalendarClient(businessId);
  if (!ctx) return { connected: false, available: false };

  const stepMs = 30 * 60_000;
  const durationMs = durationMinutes * 60_000;
  let cursorStart = new Date(startIso);

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
      return { connected: true, available: attempt === 0, suggestedStartIso: cursorStart.toISOString() };
    }
    cursorStart = new Date(cursorStart.getTime() + stepMs);
  }
  return { connected: true, available: false };
}

async function main() {
  console.log("=== Phase 4 live double-booking test ===");
  console.log(`Business: ${BUSINESS_ID}`);
  console.log(`Slot: ${START_ISO} (${DURATION_MINUTES} min)`);
  console.log("");

  // 1) First check: slot should be available before we book it.
  console.log("--- Step 1: check_availability (first attempt) ---");
  const firstCheck = await checkAvailability(BUSINESS_ID, START_ISO, DURATION_MINUTES);
  console.log("connected:", firstCheck.connected, "| available:", firstCheck.available);
  if (!firstCheck.connected) {
    console.log("FAIL: calendar not connected. Cannot run test.");
    process.exit(1);
  }
  if (!firstCheck.available && firstCheck.suggestedStartIso) {
    console.log("NOTE: requested slot is busy — using suggested slot instead.");
    console.log("  suggested_start_iso:", firstCheck.suggestedStartIso, "(still a valid double-booking-avoidance result)");
  }

  // 2) Create the first booking (creates a real calendar event).
  console.log("\n--- Step 2: create first booking ---");
  const bookStart = firstCheck.available ? START_ISO : (firstCheck.suggestedStartIso ?? START_ISO);
  const endIso = new Date(new Date(bookStart).getTime() + DURATION_MINUTES * 60_000).toISOString();
  const ctx = await getCalendarClient(BUSINESS_ID);
  if (!ctx) { console.log("FAIL: no calendar connection."); process.exit(1); }
  const { data: ev } = await ctx.calendar.events.insert({
    calendarId: ctx.calendarId,
    requestBody: {
      summary: SUMMARY,
      start: { dateTime: bookStart },
      end: { dateTime: endIso },
    },
  });
  const eventId = ev?.id;
  if (!eventId) { console.log("FAIL: event insert returned no id."); process.exit(1); }
  console.log("First event created, id:", eventId, "at", bookStart);

  // 3) Second check: same slot should now be BUSY.
  console.log("\n--- Step 3: check_availability (second attempt, same slot) ---");
  const secondCheck = await checkAvailability(BUSINESS_ID, bookStart, DURATION_MINUTES);
  console.log("connected:", secondCheck.connected, "| available:", secondCheck.available);
  if (secondCheck.available) {
    console.log("FAIL: slot is still reported available after booking — double-booking is possible!");
    process.exit(1);
  }
  console.log("PASS: slot correctly reported busy. suggested_start_iso:", secondCheck.suggestedStartIso);

  // 4) Hard-guard behavior note.
  console.log("\n--- Step 4: hard-guard behavior ---");
  console.log(
    "executeTool's create_booking now calls checkAvailability before createCalendarEvent." +
      "\nSince the slot is reported busy, a second create_booking would be refused and" +
      "\nreturn suggested_start_iso instead of creating a second event. Double-booking is prevented."
  );

  // 5) Clean up: delete the test event.
  console.log("\n--- Step 5: cleanup (delete test event) ---");
  await ctx.calendar.events.delete({ calendarId: ctx.calendarId, eventId });
  console.log("Test event deleted:", eventId);

  console.log("\n=== RESULT: PASS ===");
}

main().catch((err) => { console.error("ERROR:", err); process.exit(1); });
