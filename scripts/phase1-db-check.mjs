// Phase 1: Database reality check (READ-ONLY).
// Loads .env.local manually, connects via service-role key, runs read-only checks.
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

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SECRET_KEY;
if (!url || !serviceKey) {
  console.log("ERROR: missing SUPABASE URL or SECRET key");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const out = [];
const log = (s) => { out.push(s); console.log(s); };

async function check() {
  // 1. Tables that should exist
  const expectedTables = [
    "organizations","users","businesses","kb_documents","kb_chunks","leads",
    "conversations","messages","calendar_connections","bookings","automation_events"
  ];
  log("=== 1. Tables ===");
  for (const t of expectedTables) {
    try {
      const { data, error } = await supabase.from(t).select("*").limit(1);
      if (error) log(`  ${t}: ERROR ${error.message}`);
      else log(`  ${t}: EXISTS (sample rows: ${data ? data.length : 0})`);
    } catch (e) {
      log(`  ${t}: ERROR ${e.message}`);
    }
  }

  // 2. businesses columns
  log("\n=== 2. businesses columns (via select) ===");
  try {
    const { data, error } = await supabase.from("businesses").select("*").limit(1);
    if (error) {
      log(`  businesses select ERROR: ${error.message}`);
    } else if (data && data[0]) {
      const cols = Object.keys(data[0]);
      log(`  columns: ${cols.join(", ")}`);
      log(`  has n8n_webhook_url: ${cols.includes("n8n_webhook_url")}`);
      log(`  has avg_job_value: ${cols.includes("avg_job_value")}`);
    } else {
      log("  businesses table empty — cannot introspect columns");
    }
  } catch (e) { log(`  businesses ERROR: ${e.message}`); }

  // 3. Seed business check
  log("\n=== 3. Seed business ===");
  try {
    const { data, error } = await supabase
      .from("businesses")
      .select("id,name,public_widget_key")
      .eq("id","00000000-0000-0000-0000-000000000002");
    if (error) log(`  ERROR: ${error.message}`);
    else if (data && data.length) {
      for (const b of data) log(`  FOUND: ${b.name} | widgetKey=${b.public_widget_key}`);
    } else log("  NOT FOUND (no row with that id)");
  } catch (e) { log(`  ERROR: ${e.message}`); }

  // 4. match_kb_chunks function existence via RPC call
  log("\n=== 4. match_kb_chunks function ===");
  try {
    const dims = new Array(768).fill(0);
    const { data, error } = await supabase.rpc("match_kb_chunks", {
      p_business_id: "00000000-0000-0000-0000-000000000002",
      p_query_embedding: dims,
      p_match_count: 1,
    });
    if (error) {
      if (/not found|does not exist|Could not find/i.test(error.message)) {
        log("  MISSING — function does not exist");
      } else {
        log(`  EXISTS (rpc responded; error if any: ${error.message.slice(0,200)})`);
      }
    } else {
      log(`  EXISTS (rpc returned ${data ? data.length : 0} rows)`);
    }
  } catch (e) { log(`  ERROR: ${e.message.slice(0,300)}`); }

  // 5. pgvector / embedding column check via kb_chunks sample
  log("\n=== 5. pgvector (kb_chunks embedding column) ===");
  try {
    const { data, error } = await supabase.from("kb_chunks").select("id,embedding").limit(1);
    if (error) log(`  ERROR: ${error.message}`);
    else if (data && data[0]) {
      const emb = data[0].embedding;
      const isVec = Array.isArray(emb) ? `array[${emb.length}]` : typeof emb;
      log(`  embedding column PRESENT (sample type: ${isVec})`);
    } else log("  kb_chunks empty — cannot confirm embedding column; but table exists");
  } catch (e) { log(`  ERROR: ${e.message}`); }

  // 6. RLS behavior check via anon key (indirect: anon should see 0 rows if RLS on)
  log("\n=== 6. RLS behavior (publishable-key visibility) ===");
  const anonKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!anonKey) {
    log("  SKIP — no publishable key available");
  } else {
    const anon = createClient(url, anonKey, { auth: { persistSession: false } });
    for (const t of ["leads","conversations","messages","businesses","bookings","kb_chunks","automation_events"]) {
      try {
        const { data, error } = await anon.from(t).select("*").limit(5);
        if (error) log(`  ${t}: ERROR ${error.message.slice(0,150)}`);
        else log(`  ${t}: anon sees ${data ? data.length : 0} rows (0 = RLS filtering OK)`);
      } catch (e) { log(`  ${t}: ERROR ${e.message.slice(0,150)}`); }
    }
  }

  writeFileSync("phase1-result.txt", out.join("\n"), "utf8");
  log("\nResults written to phase1-result.txt");
}

check().catch((e) => { console.error("Fatal:", e); process.exit(1); });
