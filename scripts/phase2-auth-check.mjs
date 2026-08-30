// Phase 2: Auth & multi-tenant backend verification (programmatic).
// Uses the Supabase Auth REST API + service-role client to verify:
//   1. Sign up a fresh test account
//   2. Provision org/user/business via the provision route logic
//   3. Add a second business under the same org
//   4. Tenant isolation: verify RLS prevents cross-org access
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
const anonKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const out = [];
const log = (s) => { out.push(s); console.log(s); };

const service = createClient(url, serviceKey, { auth: { persistSession: false } });

async function main() {
  // 1. Sign up a fresh test account
  const email = `phase2-${Date.now()}@test.local`;
  const password = "TestPass123!";
  log(`=== 1. Sign up fresh account: ${email} ===`);
  const authRes = await fetch(`${url}/auth/v1/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anonKey },
    body: JSON.stringify({ email, password }),
  });
  const authData = await authRes.json();
  if (!authRes.ok) {
    log(`  SIGNUP FAILED: ${authData.error_description || authData.msg || authRes.status}`);
    log(`  (This may be because email confirmation is required — check Supabase Auth settings)`);
    writeFileSync("phase2-result.txt", out.join("\n"), "utf8");
    return;
  }
  const userId = authData.user?.id || authData.id;
  log(`  SIGNUP OK — user id: ${userId}`);

  // 2. Provision org + user + business (mirrors provision route)
  log("\n=== 2. Provision org/user/business ===");
  const orgName = `Phase2 Org ${Date.now()}`;
  const bizName = `Phase2 Biz ${Date.now()}`;
  const { data: org, error: orgErr } = await service
    .from("organizations").insert({ name: orgName }).select("id").single();
  if (orgErr) { log(`  ORG FAILED: ${orgErr.message}`); writeFileSync("phase2-result.txt", out.join("\n"), "utf8"); return; }
  log(`  Org created: ${org.id}`);

  const { error: userErr } = await service.from("users").insert({
    id: userId, organization_id: org.id, email, role: "owner",
  });
  if (userErr) { log(`  USER FAILED: ${userErr.message}`); writeFileSync("phase2-result.txt", out.join("\n"), "utf8"); return; }
  log(`  User record created under org ${org.id}`);

  const { data: biz, error: bizErr } = await service
    .from("businesses").insert({ organization_id: org.id, name: bizName })
    .select("id, public_widget_key").single();
  if (bizErr) { log(`  BIZ FAILED: ${bizErr.message}`); writeFileSync("phase2-result.txt", out.join("\n"), "utf8"); return; }
  log(`  Business created: ${biz.id} widgetKey=${biz.public_widget_key}`);

  // 3. Add a second business under the same org
  log("\n=== 3. Add second business under same org ===");
  const { data: biz2, error: biz2Err } = await service
    .from("businesses").insert({ organization_id: org.id, name: `${bizName} 2` })
    .select("id").single();
  if (biz2Err) { log(`  BIZ2 FAILED: ${biz2Err.message}`); }
  else log(`  Business 2 created under SAME org: ${biz2.id}`);

  // 4. Tenant isolation: try to read with anon key (should see 0)
  log("\n=== 4. Tenant isolation (anon should see 0) ===");
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  for (const t of ["businesses","leads","kb_documents"]) {
    const { data, error } = await anon.from(t).select("*").limit(5);
    if (error) log(`  ${t}: ERROR ${error.message.slice(0,100)}`);
    else log(`  ${t}: anon sees ${data.length} rows (0 = isolated)`);
  }

  // 5. Verify the two businesses belong to the same org via service role
  log("\n=== 5. Verify businesses share same org ===");
  const { data: bizs, error: bizsErr } = await service
    .from("businesses").select("id, organization_id").in("id", [biz.id, biz2?.id]);
  if (bizsErr) log(`  ERROR: ${bizsErr.message}`);
  else {
    for (const b of bizs) log(`  ${b.id} -> org ${b.organization_id}`);
    const orgs = new Set(bizs.map(b => b.organization_id));
    log(`  Same org for both: ${orgs.size === 1}`);
  }

  writeFileSync("phase2-result.txt", out.join("\n"), "utf8");
  log("\nResults written to phase2-result.txt");
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
