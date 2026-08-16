// Phase 4: Booking / Google Calendar verification (read-only, programmatic).
// Checks against the EXISTING booking that was created via the live widget:
//  1. calendar_connections row exists with non-null access_token/refresh_token
//  2. bookings row exists with non-null calendar_event_id
//  3. The associated lead has status = 'booked'
//  4. In the conversation messages, check_availability was called BEFORE
//     create_booking (tool_calls order) — the prompt-adherence check
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const out = [];
const log = (s) => { out.push(s); console.log(s); };

async function main() {
  // 1. Calendar connection
  log("=== 1. calendar_connections ===");
  const { data: conns, error: connErr } = await service
    .from("calendar_connections")
    .select("business_id, access_token, refresh_token, token_expires_at, calendar_id, connected_email");
  if (connErr) { log(`  ERR: ${connErr.message}`); }
  else if (!conns.length) { log("  NONE — no calendar connected"); }
  else {
    for (const c of conns) {
      const hasToken = !!c.access_token && c.access_token.length > 0;
      const hasRefresh = !!c.refresh_token && c.refresh_token.length > 0;
      const notExpired = new Date(c.token_expires_at).getTime() > Date.now();
      log(`  business=${c.business_id} calendar=${c.calendar_id} email=${c.connected_email ?? "null"}`);
      log(`  access_token non-null: ${hasToken} | refresh_token non-null: ${hasRefresh} | not expired: ${notExpired}`);
    }
  }

  // 2. Bookings
  log("\n=== 2. bookings ===");
  const { data: bookings, error: bookErr } = await service
    .from("bookings")
    .select("id, business_id, start_time, end_time, calendar_event_id, status");
  if (bookErr) { log(`  ERR: ${bookErr.message}`); }
  else if (!bookings.length) { log("  NONE — no bookings"); }
  else {
    for (const b of bookings) {
      const hasEventId = !!b.calendar_event_id;
      log(`  id=${b.id} business=${b.business_id} start=${b.start_time} end=${b.end_time}`);
      log(`  calendar_event_id non-null: ${hasEventId} | status=${b.status}`);
    }
  }

  // 3. Leads with status 'booked' (find the lead tied to the booking)
  log("\n=== 3. leads.status == 'booked' ===");
  const { data: leads, error: leadErr } = await service
    .from("leads")
    .select("id, business_id, name, email, status, score");
  if (leadErr) { log(`  ERR: ${leadErr.message}`); }
  else {
    const booked = leads.filter((l) => l.status === "booked");
    if (!booked.length) { log("  No leads with status='booked'"); }
    else {
      for (const l of booked) {
        log(`  lead=${l.id} business=${l.business_id} name=${l.name ?? "null"} email=${l.email ?? "null"} status=${l.status} score=${l.score}`);
      }
    }
  }

  // 4. Tool-call ordering: check_availability BEFORE create_booking
  log("\n=== 4. tool_calls ordering (check_availability before create_booking) ===");
  const { data: msgs, error: msgErr } = await service
    .from("messages")
    .select("conversation_id, role, content, tool_calls, created_at")
    .not("tool_calls", "is", null)
    .order("created_at", { ascending: true });
  if (msgErr) { log(`  ERR: ${msgErr.message}`); }
  else if (!msgs.length) { log("  No messages with tool_calls found"); }
  else {
    // Group by conversation
    const byConv = {};
    for (const m of msgs) {
      if (!byConv[m.conversation_id]) byConv[m.conversation_id] = [];
      byConv[m.conversation_id].push(m);
    }
    for (const [convId, convMsgs] of Object.entries(byConv)) {
      const toolNames = [];
      for (const m of convMsgs) {
        let calls = m.tool_calls;
        if (typeof calls === "string") { try { calls = JSON.parse(calls); } catch { continue; } }
        // The widget route stores tool_calls as { calls: [...] } — unwrap it.
        if (calls && typeof calls === "object" && !Array.isArray(calls) && Array.isArray(calls.calls)) {
          calls = calls.calls;
        }
        if (Array.isArray(calls)) {
          for (const c of calls) {
            const name = c?.function?.name ?? c?.name ?? (typeof c === "string" ? c : null);
            if (name) toolNames.push(name);
          }
        }
      }
      const hasCheck = toolNames.includes("check_availability");
      const hasCreate = toolNames.includes("create_booking");
      const checkIdx = toolNames.indexOf("check_availability");
      const createIdx = toolNames.indexOf("create_booking");
      const orderOk = hasCheck && hasCreate && checkIdx < createIdx;
      log(`  conv=${convId} tool_calls=[${toolNames.join(", ")}]`);
      log(`  check_availability before create_booking: ${orderOk ? "YES (good)" : "NO (prompt-adherence bug!)"}`);
    }
  }

  writeFileSync("phase4-result.txt", out.join("\n"), "utf8");
  log("\nResults written to phase4-result.txt");
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
