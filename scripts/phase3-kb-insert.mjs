// Phase 3 KB insert + verify embedding + chat flow
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const base = env.NEXT_PUBLIC_SUPABASE_URL + "/rest/v1";
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const headers = { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json", Prefer: "return=representation" };

// 1. Insert KB document
const docRes = await fetch(base + "/kb_documents", {
  method: "POST",
  headers,
  body: JSON.stringify({
    business_id: "00000000-0000-0000-0000-000000000002",
    title: "AC Repair Pricing",
    source_type: "manual",
    content_text:
      "AC Repair Service starts at $89. This includes diagnosis and basic repair. Refrigerant recharge is an additional $45. Emergency after-hours service has a $75 surcharge. All prices are before tax.",
  }),
});
console.log("Document insert status:", docRes.status);
const docText = await docRes.text();
console.log("Raw response:", docText);
const doc = docText ? JSON.parse(docText) : null;
console.log("Document id:", doc?.[0]?.id ?? "INSERT_FAILED");

if (doc && doc[0]) {
  // 2. Embed + insert chunks via the same Gemini path the app uses
  const aiKey = env.GEMINI_API_KEY;
  const embedRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${aiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text: doc[0].content_text }] },
        outputDimensionality: 768,
      }),
    }
  );
  console.log("Embedding status:", embedRes.status);
  const embData = await embedRes.json();
  const values = embData.embedding?.values;
  console.log("Embedding dims:", values?.length);

  const chunkRes = await fetch(base + "/kb_chunks", {
    method: "POST",
    headers,
    body: JSON.stringify({
      document_id: doc[0].id,
      business_id: doc[0].business_id,
      chunk_text: doc[0].content_text,
      embedding: values,
    }),
  });
  console.log("Chunk insert status:", chunkRes.status);
  console.log("Chunk insert result:", await chunkRes.text());
}

// 3. Verify with count
const countRes = await fetch(
  base + "/kb_chunks?business_id=eq.00000000-0000-0000-0000-000000000002&select=id",
  { headers }
);
const chunks = await countRes.json();
console.log("Total chunks for demo business:", Array.isArray(chunks) ? chunks.length : chunks);