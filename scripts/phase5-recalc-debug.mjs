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

const URGENCY_PATTERN =
  /\b(asap|emergency|urgent|right away|today|tonight|no heat|no ac|no air|leaking|flooding|broken|not working|won't turn on|smells? (?:of |like )?gas)\b/i;

const out = [];
const log = (s) => { out.push(s); console.log(s); };

async function main() {
  const LEAD_ID = "7e5361d9-dd89-4e7b-a12a-d7698a79fc1e";
  const CONV_ID = "d3cea414-7501-478c-b71a-636fe3ca3ddf";

  // Replicate exactly what recalculateLeadScore does
  const [{ data: lead }, { data: visitorMessages }] = await Promise.all([
    service.from("leads").select("name, email, phone, service_interest").eq("id", LEAD_ID).single(),
    service.from("messages").select("content").eq("conversation_id", CONV_ID).eq("role", "visitor"),
  ]);

  log("=== recalculateLeadScore replication ===");
  log("lead:", JSON.stringify(lead));
  log("visitorMessages count:", visitorMessages?.length ?? 0);
  log("visitorMessages:", JSON.stringify(visitorMessages, null, 2));

  const combinedVisitorText = (visitorMessages ?? []).map((m) => m.content).join(" ");
  const urgency = URGENCY_PATTERN.test(combinedVisitorText);
  log("urgencyDetected:", urgency);

  let score = 0;
  if (lead?.name) score += 10;
  if (lead?.email) score += 25;
  if (lead?.phone) score += 15;
  if (lead?.service_interest) score += 15;
  if (urgency) score += 20;
  if ((visitorMessages?.length ?? 0) >= 4) score += 10;
  score = Math.min(100, score);

  log("computed score (would be persisted):", score);

  // Now actually persist it (this is what the route does automatically)
  const { data: updated, error: updErr } = await service
    .from("leads")
    .update({ score, last_scored_at: new Date().toISOString() })
    .eq("id", LEAD_ID)
    .select("id, score");
  log("persisted:", JSON.stringify(updated), "err:", updErr?.message ?? "none");

  writeFileSync("phase5-recalc-debug.txt", out.join("\n"), "utf8");
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
