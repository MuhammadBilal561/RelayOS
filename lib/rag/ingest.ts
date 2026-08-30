import { embedText } from "@/lib/ai/gemini";
import { ingestKnowledgeDocument } from "@/lib/server-data";

const CHUNK_SIZE = 800; // characters — small enough for precise retrieval, large enough for context
const CHUNK_OVERLAP = 120;

/**
 * Splits long text into overlapping chunks. Simple character-based
 * splitting is intentional for Phase 1 — swap in a token-aware or
 * markdown-heading-aware splitter later if documents get more complex.
 */
export function chunkText(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= CHUNK_SIZE) return [clean];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + CHUNK_SIZE, clean.length);
    chunks.push(clean.slice(start, end));
    if (end === clean.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

/**
 * Ingests one knowledge-base document: stores it, chunks it, embeds
 * every chunk, and writes the vectors to kb_chunks. Called from
 * app/api/v1/knowledge-base/documents/route.ts after a business owner
 * uploads or pastes content in the dashboard.
 */
export async function ingestDocument(params: {
  businessId: string;
  title: string;
  sourceType: string;
  contentText: string;
}) {
  const chunks = chunkText(params.contentText);
  const chunksWithEmbeddings = await Promise.all(
    chunks.map(async (chunk) => ({
      chunk_text: chunk,
      embedding: await embedText(chunk),
    }))
  );

  return ingestKnowledgeDocument(params.businessId, {
    title: params.title,
    source_type: params.sourceType,
    content_text: params.contentText,
    chunks: chunksWithEmbeddings,
  });
}
