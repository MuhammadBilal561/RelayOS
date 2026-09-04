// One-time backfill: encrypt existing plaintext Google Calendar tokens.
// Usage: node scripts/backfill-encrypted-calendar-tokens.mjs
// Reads .env.local, uses service-role key, requires ENCRYPTION_KEY.
// Safe to re-run: already-encrypted (v1:) rows are skipped.

import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { randomBytes, createCipheriv } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const VERSION_PREFIX = "v1:";

function getEncryptionKey(keyHex) {
  keyHex = String(keyHex ?? "").trim().replace(/^['"]|['"]$/g, "");
  if (!keyHex) {
    throw new Error("ENCRYPTION_KEY environment variable is not set. Generate with: openssl rand -hex 32");
  }
  if (keyHex.length !== 64 || !/^[0-9a-f]+$/i.test(keyHex)) {
    throw new Error("ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)");
  }
  return Buffer.from(keyHex, "hex");
}

function encryptToken(plaintext, encryptionKey) {
  const key = getEncryptionKey(encryptionKey);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const encoded = Buffer.concat([iv, ciphertext, authTag]).toString("base64");
  return VERSION_PREFIX + encoded;
}

function isEncrypted(value) {
  return typeof value === "string" && value.startsWith(VERSION_PREFIX);
}

function loadEnv() {
  const envPath = new URL("../.env.local", import.meta.url);
  if (!existsSync(envPath)) return {};
  const content = readFileSync(envPath, "utf8");
  const env = Object.fromEntries(
    content
      .split(/\r?\n/)
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      })
  );
  return env;
}

async function main() {
  console.log("=== Google Calendar Token Encryption Backfill ===");
  console.log("This script encrypts plaintext access_token and refresh_token in calendar_connections.");
  console.log("Already-encrypted (v1:) rows are skipped. Safe to re-run.\n");

  const env = loadEnv();
  const encryptionKey = process.env.ENCRYPTION_KEY ?? env.ENCRYPTION_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SECRET_KEY;

  if (!encryptionKey) {
    console.error("ERROR: ENCRYPTION_KEY is not set.");
    console.error("Set it in .env.local or export ENCRYPTION_KEY=... before running.");
    process.exit(1);
  }

  if (!url || !serviceKey) {
    console.error("ERROR: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  console.log("Scanning calendar_connections table...\n");

  const { data: rows, error } = await supabase
    .from("calendar_connections")
    .select("id, business_id, access_token, refresh_token");

  if (error) {
    console.error("Failed to fetch calendar_connections:", error.message);
    process.exit(1);
  }

  if (!rows || rows.length === 0) {
    console.log("No calendar_connections rows found. Nothing to do.");
    return;
  }

  let scanned = 0;
  let migrated = 0;
  let alreadyEncrypted = 0;
  let skipped = 0;

  for (const row of rows) {
    scanned++;

    const accessPlain = !isEncrypted(row.access_token);
    const refreshPlain = !isEncrypted(row.refresh_token);

    if (!accessPlain && !refreshPlain) {
      alreadyEncrypted++;
      continue;
    }

    const updates = {};
    if (accessPlain) {
      updates.access_token = encryptToken(row.access_token, encryptionKey);
    }
    if (refreshPlain) {
      updates.refresh_token = encryptToken(row.refresh_token, encryptionKey);
    }
    updates.updated_at = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("calendar_connections")
      .update(updates)
      .eq("id", row.id);

    if (updateError) {
      console.error(`  Failed to update row ${row.id}:`, updateError.message);
      skipped++;
      continue;
    }

    migrated++;
  }

  console.log("\n=== Backfill Summary ===");
  console.log(`Rows scanned:        ${scanned}`);
  console.log(`Rows migrated:       ${migrated}`);
  console.log(`Already encrypted:   ${alreadyEncrypted}`);
  console.log(`Skipped/failed:      ${skipped}`);

  if (skipped > 0) {
    console.log("\nWARNING: Some rows could not be updated. Check errors above.");
    process.exit(1);
  }

  console.log("\nBackfill completed successfully.");
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});