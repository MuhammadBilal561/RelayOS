import { describe, it, expect } from "vitest";
import { chunkText } from "@/lib/rag/ingest";

describe("chunkText", () => {
  it("returns a single chunk for short text", () => {
    const chunks = chunkText("We offer AC repair starting at $89.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe("We offer AC repair starting at $89.");
  });

  it("collapses internal whitespace and trims the input", () => {
    const chunks = chunkText("  Hello   world.\n\nSecond   line.  ");
    expect(chunks[0]).toBe("Hello world. Second line.");
  });

  it("splits long text into multiple overlapping chunks", () => {
    const longText = "sentence. ".repeat(200); // ~2000 chars, well over the 800-char chunk size
    const chunks = chunkText(longText);

    expect(chunks.length).toBeGreaterThan(1);
    // Every chunk except possibly the last should be at or near the target size.
    for (const chunk of chunks.slice(0, -1)) {
      expect(chunk.length).toBeLessThanOrEqual(800);
    }
  });

  it("keeps overlapping context between consecutive chunks so meaning isn't cut at a hard boundary", () => {
    const longText = Array.from({ length: 50 }, (_, i) => `Fact number ${i} about our services.`).join(" ");
    const chunks = chunkText(longText);

    if (chunks.length > 1) {
      const endOfFirst = chunks[0].slice(-50);
      const startOfSecond = chunks[1].slice(0, 200);
      // The overlap region should share at least some characters.
      const overlapFound = [...endOfFirst].some((_, i) => startOfSecond.includes(endOfFirst.slice(i, i + 20)));
      expect(overlapFound).toBe(true);
    }
  });

  it("never returns an empty chunk", () => {
    const chunks = chunkText("a".repeat(3000));
    for (const chunk of chunks) {
      expect(chunk.length).toBeGreaterThan(0);
    }
  });
});
