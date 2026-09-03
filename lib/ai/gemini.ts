import { GoogleGenAI } from "@google/genai";

// Free-tier-first model choice. Flash-Lite has the most generous free
// rate limits (RPM/RPD) as of 2026 — swap via env var if you upgrade to
// a paid tier or want Flash's stronger reasoning for a given deployment.
function envOr(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value || fallback;
}

const RETIRED_CHAT_MODELS: Record<string, string> = {
  "gemini-2.5-flash-lite": "gemini-3.5-flash-lite",
  "models/gemini-2.5-flash-lite": "gemini-3.5-flash-lite",
};

function chatModel(): string {
  const requested = envOr("GEMINI_CHAT_MODEL", "gemini-3.5-flash-lite");
  return RETIRED_CHAT_MODELS[requested] ?? requested;
}

export const CHAT_MODEL = chatModel();
export const EMBEDDING_MODEL = envOr("GEMINI_EMBEDDING_MODEL", "text-embedding-004");

// pgvector column in supabase/migrations/0001_init.sql is vector(768) —
// keep this in sync if you change dimensionality.
export const EMBEDDING_DIMENSIONS = 768;

let client: GoogleGenAI | null = null;

/**
 * Lazily-created singleton so the API key is only read at request time
 * (never at build time / module load), which keeps `next build` working
 * even before GEMINI_API_KEY is configured.
 */
export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not set. Get a free key at https://aistudio.google.com/apikey and add it to .env.local"
      );
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

/**
 * Embed a piece of text for storage in kb_chunks, or for a live query
 * against match_kb_chunks(). Uses the same model + dimensionality for
 * both so cosine similarity is meaningful.
 */
export async function embedText(text: string): Promise<number[]> {
  const ai = getGeminiClient();
  const result = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: { outputDimensionality: EMBEDDING_DIMENSIONS },
  });

  // The JS SDK returns `embeddings: [{ values: number[] }]`.
  const values = result.embeddings?.[0]?.values;
  if (!values) {
    throw new Error("Gemini embedding response did not include values — check SDK version/response shape.");
  }
  return values;
}
