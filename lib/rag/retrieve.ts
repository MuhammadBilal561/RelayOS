import { embedText } from "@/lib/ai/gemini";
import { getKnowledgeBaseChunks } from "@/lib/server-data";

export interface RetrievedChunk {
  id: string;
  chunk_text: string;
  similarity: number;
}

const MIN_SIMILARITY = 0.55; // below this, treat as "no relevant knowledge found"

/**
 * Embeds the visitor's message and finds the most semantically similar
 * knowledge-base chunks for this business via the match_kb_chunks()
 * Postgres function (pgvector cosine distance under the hood).
 *
 * This is what grounds the AI's answers in the business's real content
 * instead of letting the model improvise prices, policies, or hours.
 */
export async function retrieveRelevantChunks(
  businessId: string,
  query: string,
  matchCount = 5
): Promise<RetrievedChunk[]> {
  try {
    const queryEmbedding = await embedText(query);
    const data = await getKnowledgeBaseChunks(businessId, queryEmbedding, matchCount);
    return (data ?? []).filter((chunk: RetrievedChunk) => chunk.similarity >= MIN_SIMILARITY);
  } catch (err) {
    console.error("Knowledge-base retrieval failed:", err);
    return [];
  }
}

/** Formats retrieved chunks into a block the system prompt can cite. */
export function formatChunksForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "No relevant knowledge-base content was found for this question.";
  }
  return chunks
    .map((c, i) => `[Source ${i + 1}] ${c.chunk_text}`)
    .join("\n\n");
}
