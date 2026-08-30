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

const out = [];
const log = (s) => { out.push(s); console.log(s); };

async function main() {
  const LEAD_ID = "7e5361d9-dd89-4e7b-a12a-d7698a79fc1e";
  const { data: L } = await service.from("leads").select("id,status,score,name,email,phone,service_interest").eq("id", LEAD_ID);
  log("=== Lead ===");
  log(JSON.stringify(L, null, 2));

  const { data: C } = await service.from("conversations").select("id").eq("lead_id", LEAD_ID);
  log("\n=== Conversations for lead ===");
  log(JSON.stringify(C, null, 2));

  for (const c of C ?? []) {
    const { data: M } = await service.from("messages").select("role").eq("conversation_id", c.id).order("created_at");
    const visitor = (M ?? []).filter((m) => m.role === "visitor").length;
    log(`\nconv=${c.id} total_msgs=${M?.length ?? 0} visitor_msgs=${visitor}`);
  }

  // Also verify: does scoring only count messages in the passed conversationId?
  writeFileSync("phase5-debug.txt", out.join("\n"), "utf8");
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });

