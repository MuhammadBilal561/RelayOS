/**
 * Phase 5 — live urgency-language test.
 *
 * 1. Investigate lead 7e5361d9 (5 visitor messages, score 0) — is it stale
 *    data or a recalc bug? Print its conversation + message history.
 * 2. Send an urgent message through the widget API on the seed business and
 *    confirm the returned score increases (detectUrgency +20 fires).
 */
import { readFileSync } from "node:fs";
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
  // 1. Investigate the mismatched lead
  log("=== 1. Investigate lead 7e5361d9 (visitorMsgs=5, score=0) ===");
  const { data: lead, error: leadErr } = await service
    .from("leads")
    .select("id, business_id, name, email, phone, service_interest, status, score, last_scored_at, created_at, source")
    .eq("id", "7e5361d9-dd89-4e7b-a12a-d7698a79fc1e")
    .single();
  if (leadErr) { log(`  ERR: ${leadErr.message}`); }
  else {
    log(`  lead: ${lead.id}`);
    log(`    business=${lead.business_id} source=${lead.source}`);
    log(`    status=${lead.status} score=${lead.score}`);
    log(`    last_scored_at=${lead.last_scored_at ?? "null"} created_at=${lead.created_at}`);
  }

  const { data: convs } = await service
    .from("conversations")
    .select("id, status, created_at")
    .eq("lead_id", "7e5361d9-dd89-4e7b-a12a-d7698a79fc1e");
  log(`  conversations: ${(convs ?? []).length}`);
  for (const c of convs ?? []) {
    const { data: msgs } = await service
      .from("messages")
      .select("role, content, created_at")
      .eq("conversation_id", c.id)
      .order("created_at");
    log(`    conv=${c.id} status=${c.status}`);
    for (const m of msgs ?? []) {
      log(`      [${m.role} @ ${m.created_at}] ${m.content.slice(0, 80)}`);
    }
  }

  // 2. Live urgency test through the widget API
  log("\n=== 2. Live urgency-language test (widget API) ===");
  const widgetKey = "demo-widget-key";
  const sessionId = `phase5-urgent-${Date.now()}`;

  // First a neutral message to establish baseline
  const baseResp = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/widget/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ widgetKey, sessionId, message: "What are your hours?" }),
  });
  const baseJson = await baseResp.json();
  log(`  baseline score after neutral msg: ${baseJson.score}`);

  // Now an urgent message
  const urgentResp = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/widget/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ widgetKey, sessionId, message: "My AC is broken, I need someone today!" }),
  });
  const urgentJson = await urgentResp.json();
  log(`  score after urgent msg: ${urgentJson.score}`);
  log(`  urgency increased score: ${urgentJson.score > baseJson.score ? "YES" : "NO"}`);

  // Also give name+email to show full weighted scoring
  const infoResp = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/widget/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ widgetKey, sessionId, message: "My name is Urgent Test, email urgent@test.com, I need AC repair today" }),
  });
  const infoJson = await infoResp.json();
  log(`  score after name+email+interest+urgency: ${infoJson.score}`);

  writeFileSync("phase5-urgency-result.txt", out.join("\n"), "utf8");
  log("\nResults written to phase5-urgency-result.txt");
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
