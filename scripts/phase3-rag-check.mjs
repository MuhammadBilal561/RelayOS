// Phase 3: AI widget + RAG verification (programmatic).
//  1. Ingest a document with a specific checkable fact into the seed business
//  2. Confirm kb_documents + kb_chunks rows with non-null embeddings
//  3. Exercise the real widget message endpoint asking about the fact — must be grounded
//  4. Ask something NOT in the KB — must refuse (hallucination check)
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
const geminiKey = env.GEMINI_API_KEY;
const out = [];
const log = (s) => { out.push(s); console.log(s); };

const service = createClient(url, serviceKey, { auth: { persistSession: false } });

// Seed business (Aurora HVAC) widget key
const SEED_BUSINESS_ID = "00000000-0000-0000-0000-000000000002";
const WIDGET_KEY = "demo-widget-key";

// Real Gemini embedding via REST (avoids TS import issue)
async function embedTextRest(text) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/gemini-embedding-001",
        content: { parts: [{ text }] },
        outputDimensionality: 768,
      }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini embed failed ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.embedding?.values;
}

// Call the live widget endpoint
async function askWidget(sessionId, message) {
  const res = await fetch("http://localhost:3000/api/widget/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ widgetKey: WIDGET_KEY, sessionId, message }),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { status: res.status, data };
}

async function main() {
  // 1. Ingest a document with a specific checkable fact
  log("=== 1. Ingest document with checkable fact ===");
  const fact = "The Phase3 Test Package costs exactly $499 and includes a full system inspection and one filter replacement.";
  const uniqueTitle = `Phase3 Test Doc ${Date.now()}`;
  const { data: doc, error: docErr } = await service
    .from("kb_documents")
    .insert({ business_id: SEED_BUSINESS_ID, title: uniqueTitle, source_type: "manual", content_text: fact })
    .select("id")
    .single();
  if (docErr) { log(`  DOC FAILED: ${docErr.message}`); writeFileSync("phase3-result.txt", out.join("\n"), "utf8"); return; }
  log(`  Document created: ${doc.id}`);

  // Embed the chunk and insert into kb_chunks (mirrors ingest.ts)
  log("\n=== 2. Embed chunk + insert into kb_chunks ===");
  try {
    const embedding = await embedTextRest(fact);
    log(`  Embedding computed, dims=${embedding.length}`);
    const { data: chunk, error: chunkErr } = await service
      .from("kb_chunks")
      .insert({ document_id: doc.id, business_id: SEED_BUSINESS_ID, chunk_text: fact, embedding })
      .select("id, embedding")
      .single();
    if (chunkErr) { log(`  CHUNK FAILED: ${chunkErr.message}`); }
    else {
      const nonNull = chunk.embedding && Array.isArray(chunk.embedding) && chunk.embedding.length > 0;
      log(`  Chunk created: ${chunk.id}, embedding non-null & ${chunk.embedding.length} dims: ${nonNull}`);
    }
  } catch (e) {
    log(`  EMBED FAILED: ${e.message}`);
  }

  // 3. Ask the widget about the fact (grounded answer check)
  log("\n=== 3. Widget: ask about the fact (grounded answer expected) ===");
  const session1 = `phase3-${Date.now()}`;
  const r1 = await askWidget(session1, "How much does the Phase3 Test Package cost?");
  log(`  HTTP ${r1.status}`);
  if (r1.data.reply) {
    log(`  Reply: ${r1.data.reply}`);
    const grounded = /499|Phase3|inspection|filter/i.test(r1.data.reply);
    log(`  Mentions $499 / Phase3: ${grounded ? "YES (grounded)" : "NO (not grounded!)"}`);
  } else {
    log(`  Response: ${JSON.stringify(r1.data).slice(0, 300)}`);
  }

  // 4. Ask something NOT in the KB (hallucination-refusal check)
  log("\n=== 4. Widget: ask something NOT in the KB (must refuse) ===");
  const session2 = `phase3-${Date.now()}`;
  const r2 = await askWidget(session2, "What is the capital of France?");
  log(`  HTTP ${r2.status}`);
  if (r2.data.reply) {
    log(`  Reply: ${r2.data.reply}`);
    const refusal = /not (sure|certain)|don't (know|have)|can't (say|answer)|connect|team|human|isn't in|not in|knowledge/i.test(r2.data.reply);
    const hallucinated = /Paris/i.test(r2.data.reply);
    log(`  Refusal signal: ${refusal ? "YES" : "NO"}`);
    log(`  Hallucinated (said Paris): ${hallucinated ? "YES — BUG" : "NO (good)"}`);
  } else {
    log(`  Response: ${JSON.stringify(r2.data).slice(0, 300)}`);
  }

  writeFileSync("phase3-result.txt", out.join("\n"), "utf8");
  log("\nResults written to phase3-result.txt");
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
