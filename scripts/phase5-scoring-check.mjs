/**
 * Phase 5 — Lead scoring & escalation verification (read-only where possible).
 *
 * Checks against the live database from Phases 3/4:
 *  1. leads.score is non-zero and consistent with signals (email/phone/name/
 *     service_interest/urgency/4+ messages) per lib/scoring.ts weights.
 *  2. detectUrgency() behavior on real recorded messages (urgency language
 *     like "my AC is broken, I need someone today").
 *  3. Escalation state: any lead with status='escalated' has a matching
 *     conversation with status='escalated' and a non-null summary_text.
 */
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

const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

// Mirror of lib/scoring.ts weights + urgency pattern (kept in sync manually).
const URGENCY_PATTERN =
  /\b(asap|emergency|urgent|right away|today|tonight|no heat|no ac|no air|leaking|flooding|broken|not working|won't turn on|smells? (?:of |like )?gas)\b/i;

function detectUrgency(text) {
  return URGENCY_PATTERN.test(text);
}

const WEIGHTS = { hasEmail: 25, hasPhone: 15, hasName: 10, hasServiceInterest: 15, urgency: 20, sustainedConversation: 10 };

function computeExpectedScore(lead, visitorMessageCount) {
  let score = 0;
  if (lead.email) score += WEIGHTS.hasEmail;
  if (lead.phone) score += WEIGHTS.hasPhone;
  if (lead.name) score += WEIGHTS.hasName;
  if (lead.service_interest) score += WEIGHTS.hasServiceInterest;
  if (detectUrgency((lead.visitorText ?? ""))) score += WEIGHTS.urgency;
  if (visitorMessageCount >= 4) score += WEIGHTS.sustainedConversation;
  return Math.min(100, score);
}

const out = [];
const log = (s) => { out.push(s); console.log(s); };

async function main() {
  // 1. Leads with scores
  log("=== 1. leads.score (non-zero, consistent with signals) ===");
  const { data: leads, error: leadErr } = await service
    .from("leads")
    .select("id, business_id, name, email, phone, service_interest, status, score")
    .order("created_at");
  if (leadErr) { log(`  ERR: ${leadErr.message}`); }
  else if (!leads.length) { log("  No leads found."); }
  else {
    for (const l of leads) {
      // The lead's own conversation(s) — linked via conversations.lead_id
      const { data: convs } = await service
        .from("conversations")
        .select("id")
        .eq("lead_id", l.id);
      const convIds = (convs ?? []).map((c) => c.id);
      let visitorText = "";
      let visitorCount = 0;
      if (convIds.length) {
        const { data: msgs } = await service
          .from("messages")
          .select("content, role")
          .in("conversation_id", convIds)
          .eq("role", "visitor");
        visitorText = (msgs ?? []).map((m) => m.content).join(" ");
        visitorCount = (msgs ?? []).length;
      }
      const expected = computeExpectedScore({ ...l, visitorText }, visitorCount);
      const match = l.score === expected ? "OK" : `MISMATCH (expected ${expected})`;
      const urgent = detectUrgency(visitorText);
      log(`  lead=${l.id} status=${l.status} score=${l.score} ${match}`);
      log(`    name=${l.name ? "yes" : "no"} email=${l.email ? "yes" : "no"} phone=${l.phone ? "yes" : "no"} interest=${l.service_interest ? "yes" : "no"} urgency=${urgent} visitorMsgs=${visitorCount}`);
    }
  }

  // 2. Urgency detection on the recorded messages
  log("\n=== 2. detectUrgency on visitor messages ===");
  const { data: allMsgs, error: msgErr } = await service
    .from("messages")
    .select("conversation_id, role, content")
    .eq("role", "visitor");
  if (msgErr) { log(`  ERR: ${msgErr.message}`); }
  else if (!allMsgs.length) { log("  No visitor messages found."); }
  else {
    for (const m of allMsgs) {
      const urgent = detectUrgency(m.content);
      if (urgent) {
        log(`  URGENT: conv=${m.conversation_id} "${m.content.slice(0, 80)}"`);
      }
    }
    log(`  Total visitor messages scanned: ${allMsgs.length}`);
  }

  // 3. Escalation state
  log("\n=== 3. escalation state (status='escalated' + summary_text) ===");
  const { data: escalatedLeads, error: escLeadErr } = await service
    .from("leads")
    .select("id, business_id, name, status, score, created_at")
    .eq("status", "escalated");
  if (escLeadErr) { log(`  ERR: ${escLeadErr.message}`); }
  else if (!escalatedLeads.length) { log("  No escalated leads found — escalation not yet exercised live."); }
  else {
    for (const l of escalatedLeads) {
      log(`  lead=${l.id} business=${l.business_id} name=${l.name ?? "null"} status=${l.status} score=${l.score}`);
      const { data: convs } = await service
        .from("conversations")
        .select("id, status, summary_text")
        .eq("business_id", l.business_id);
      for (const c of convs ?? []) {
        const hasSummary = !!c.summary_text && c.summary_text.length > 0;
        log(`    conv=${c.id} status=${c.status} summary_text non-null+non-empty: ${hasSummary}`);
        if (c.summary_text) log(`      summary="${c.summary_text.slice(0, 120)}"`);
      }
    }
  }

  writeFileSync("phase5-result.txt", out.join("\n"), "utf8");
  log("\nResults written to phase5-result.txt");
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
