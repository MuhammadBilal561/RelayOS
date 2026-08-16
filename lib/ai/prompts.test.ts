import { describe, it, expect } from "vitest";
import { buildSystemInstruction } from "@/lib/ai/prompts";

const baseCtx = {
  businessName: "Aurora HVAC & Air",
  businessTimezone: "America/Chicago",
  systemPersona: null as string | null,
  retrievedChunks: [],
};

describe("buildSystemInstruction", () => {
  it("falls back to a generic persona when the business hasn't set a custom one", () => {
    const prompt = buildSystemInstruction(baseCtx);
    expect(prompt).toContain("Aurora HVAC & Air");
    expect(prompt).toContain("front-desk assistant");
  });

  it("uses the business's custom persona verbatim when one is set", () => {
    const prompt = buildSystemInstruction({
      ...baseCtx,
      systemPersona: "You are Max, the friendly robot at Aurora HVAC.",
    });
    expect(prompt).toContain("You are Max, the friendly robot at Aurora HVAC.");
  });

  it("includes the business's current local time so relative dates can be resolved", () => {
    const prompt = buildSystemInstruction(baseCtx);
    expect(prompt).toContain("America/Chicago");
    expect(prompt).toMatch(/current date\/time/i);
  });

  it("instructs the agent to never fabricate prices or policies", () => {
    const prompt = buildSystemInstruction(baseCtx);
    expect(prompt.toLowerCase()).toContain("never invent a price");
  });

  it("requires check_availability before create_booking", () => {
    const prompt = buildSystemInstruction(baseCtx);
    expect(prompt).toContain("Never call create_booking without first");
  });

  it("surfaces retrieved knowledge-base chunks in the prompt", () => {
    const prompt = buildSystemInstruction({
      ...baseCtx,
      retrievedChunks: [{ id: "1", chunk_text: "AC repair starts at $89.", similarity: 0.9 }],
    });
    expect(prompt).toContain("AC repair starts at $89.");
  });

  it("tells the agent when no relevant knowledge was found, instead of staying silent about it", () => {
    const prompt = buildSystemInstruction(baseCtx);
    expect(prompt).toMatch(/no relevant knowledge-base content/i);
  });

  it("forbids answering general-knowledge questions from training data (hallucination guard)", () => {
    const prompt = buildSystemInstruction(baseCtx);
    const lower = prompt.toLowerCase();
    // The prompt must instruct the agent to answer ONLY from KB context and
    // never from its own training data, so it refuses off-topic questions
    // like "what is the capital of France?" instead of hallucinating.
    expect(lower).toContain("only from the \"knowledge base context\"");
    expect(lower).toMatch(/never answer general-knowledge/);
    expect(lower).toMatch(/from your own training data/);
  });
});
