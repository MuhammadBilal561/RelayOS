// Standalone Gemini API connectivity check (Phase 3 preflight).
// Reads .env.local manually — no Next.js runtime needed.
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

const apiKey = env.GEMINI_API_KEY;
const chatModel = env.GEMINI_CHAT_MODEL || "gemini-3.5-flash-lite";
const embedModel = env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
console.log("Chat model:", chatModel);
console.log("Embedding model:", embedModel);

// 1. Chat generation check
const chatRes = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${chatModel}:generateContent?key=${apiKey}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: "Say OK" }] }] }),
  }
);
console.log("Chat status:", chatRes.status);
if (!chatRes.ok) console.log("Chat error:", (await chatRes.text()).slice(0, 500));
else console.log("Chat reply:", (await chatRes.json()).candidates?.[0]?.content?.parts?.[0]?.text);

// 2. Embedding check (768 dims to match pgvector column)
const embedName = embedModel.startsWith("models/") ? embedModel : `models/${embedModel}`;
const embRes = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/${embedName}:embedContent?key=${apiKey}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: { parts: [{ text: "test embedding" }] },
      outputDimensionality: 768,
    }),
  }
);
console.log("Embed status:", embRes.status);
if (!embRes.ok) console.log("Embed error:", (await embRes.text()).slice(0, 500));
else console.log("Embed dims:", (await embRes.json()).embedding?.values?.length);
