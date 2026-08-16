// Phase 2 (part 2): Authenticated tenant-isolation check.
// 1. Sign in as the Phase 2 test user (org A member).
// 2. Attempt to read the SEED business (Aurora HVAC, org 00000000-...-0002) — which is NOT the user's org.
// 3. Attempt to read another org's business by id.
// 4. Verify the user CAN read their own org's business.
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
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const out = [];
const log = (s) => { out.push(s); console.log(s); };

const service = createClient(url, serviceKey, { auth: { persistSession: false } });

// The seed business belongs to org 00000000-0000-0000-0000-000000000002 (Aurora HVAC).
const SEED_ORG = "00000000-0000-0000-0000-000000000002";

async function main() {
  // Find the most recent Phase 2 test user (owner of a fresh org)
  const { data: users, error: usersErr } = await service
    .from("users")
    .select("id, email, organization_id")
    .ilike("email", "phase2-%@test.local")
    .order("created_at", { ascending: false })
    .limit(1);
  if (usersErr || !users || !users.length) {
    log(`Could not find a Phase 2 test user: ${usersErr?.message || "none"}`);
    writeFileSync("phase2-tenant-result.txt", out.join("\n"), "utf8");
    return;
  }
  const testUser = users[0];
  log(`Test user: ${testUser.email} (org ${testUser.organization_id})`);

  // Sign in as the test user using the anon key (password-reset style not available, so use the standard sign-in)
  // We need the password. The phase2 script used "TestPass123!" — try it.
  const authRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anonKey },
    body: JSON.stringify({ email: testUser.email, password: "TestPass123!" }),
  });
  const authData = await authRes.json();
  if (!authRes.ok || !authData.access_token) {
    log(`SIGN-IN FAILED: ${authData.error_description || authData.msg || authRes.status}`);
    log(`  (Email confirmation may be required, or the password differs.)`);
    writeFileSync("phase2-tenant-result.txt", out.join("\n"), "utf8");
    return;
  }
  log("Sign-in OK.");
  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${authData.access_token}` } },
  });

  // 1. Try to read the SEED business (belongs to a DIFFERENT org) — expect 0 rows / RLS block
  log("\n=== 1. Read seed business (different org) — expect 0 rows ===");
  const { data: b1, error: e1 } = await userClient
    .from("businesses")
    .select("id, organization_id")
    .eq("id", "00000000-0000-0000-0000-000000000002");
  log(`  rows=${b1?.length ?? 0} error=${e1?.message || "none"}`);
  log(`  Isolated (cannot read other org's business): ${b1?.length === 0}`);

  // 2. Try to read leads belonging to the seed org — expect 0 rows
  log("\n=== 2. Read seed-org leads — expect 0 rows ===");
  const { data: l1, error: l1e } = await userClient
    .from("leads")
    .select("id")
    .eq("business_id", "00000000-0000-0000-0000-000000000002");
  log(`  rows=${l1?.length ?? 0} error=${l1e?.message || "none"}`);
  log(`  Isolated (cannot read other org's leads): ${l1?.length === 0}`);

  // 3. Try to read the test user's OWN org businesses — expect >= 1 row
  log("\n=== 3. Read own-org businesses — expect >= 1 row ===");
  const { data: b2, error: e2 } = await userClient
    .from("businesses")
    .select("id, organization_id")
    .eq("organization_id", testUser.organization_id);
  log(`  rows=${b2?.length ?? 0} error=${e2?.message || "none"}`);
  log(`  Can read own org: ${(b2?.length ?? 0) >= 1}`);

  const pass = b1?.length === 0 && l1?.length === 0 && (b2?.length ?? 0) >= 1;
  log(`\nTENANT ISOLATION: ${pass ? "PASS" : "FAIL"}`);

  writeFileSync("phase2-tenant-result.txt", out.join("\n"), "utf8");
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
