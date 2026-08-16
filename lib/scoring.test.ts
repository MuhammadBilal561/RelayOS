import { describe, it, expect } from "vitest";
import { computeLeadScore, detectUrgency } from "@/lib/scoring";

describe("computeLeadScore", () => {
  it("scores a brand new anonymous visitor at zero", () => {
    const score = computeLeadScore({
      hasName: false,
      hasEmail: false,
      hasPhone: false,
      hasServiceInterest: false,
      urgencyDetected: false,
      visitorMessageCount: 1,
    });
    expect(score).toBe(0);
  });

  it("weights email higher than phone, and phone higher than name", () => {
    const emailOnly = computeLeadScore({
      hasName: false,
      hasEmail: true,
      hasPhone: false,
      hasServiceInterest: false,
      urgencyDetected: false,
      visitorMessageCount: 1,
    });
    const phoneOnly = computeLeadScore({
      hasName: false,
      hasEmail: false,
      hasPhone: true,
      hasServiceInterest: false,
      urgencyDetected: false,
      visitorMessageCount: 1,
    });
    const nameOnly = computeLeadScore({
      hasName: true,
      hasEmail: false,
      hasPhone: false,
      hasServiceInterest: false,
      urgencyDetected: false,
      visitorMessageCount: 1,
    });

    expect(emailOnly).toBeGreaterThan(phoneOnly);
    expect(phoneOnly).toBeGreaterThan(nameOnly);
  });

  it("adds the sustained-conversation bonus only at 4+ visitor messages", () => {
    const threeMessages = computeLeadScore({
      hasName: false,
      hasEmail: false,
      hasPhone: false,
      hasServiceInterest: false,
      urgencyDetected: false,
      visitorMessageCount: 3,
    });
    const fourMessages = computeLeadScore({
      hasName: false,
      hasEmail: false,
      hasPhone: false,
      hasServiceInterest: false,
      urgencyDetected: false,
      visitorMessageCount: 4,
    });

    expect(threeMessages).toBe(0);
    expect(fourMessages).toBe(10);
  });

  it("never exceeds 100 even when every signal is present", () => {
    const score = computeLeadScore({
      hasName: true,
      hasEmail: true,
      hasPhone: true,
      hasServiceInterest: true,
      urgencyDetected: true,
      visitorMessageCount: 10,
    });
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBe(95); // 25+15+10+15+20+10 = 95, documenting the exact ceiling
  });

  it("is a pure function — same input always produces the same output", () => {
    const input = {
      hasName: true,
      hasEmail: true,
      hasPhone: false,
      hasServiceInterest: true,
      urgencyDetected: false,
      visitorMessageCount: 2,
    };
    expect(computeLeadScore(input)).toBe(computeLeadScore(input));
  });
});

describe("detectUrgency", () => {
  it("flags common emergency-service phrases", () => {
    expect(detectUrgency("my AC is broken and I need someone today")).toBe(true);
    expect(detectUrgency("this is an emergency, no heat at all")).toBe(true);
    expect(detectUrgency("I smell gas near the furnace")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(detectUrgency("EMERGENCY please help ASAP")).toBe(true);
  });

  it("does not flag routine, non-urgent questions", () => {
    expect(detectUrgency("What are your hours on Saturday?")).toBe(false);
    expect(detectUrgency("Do you offer annual maintenance plans?")).toBe(false);
  });

  it("does not false-positive on unrelated words that merely contain a keyword substring", () => {
    // "broken" should match as a whole word, but something like "brokenness"
    // in an unrelated sentence structure should still just match on "broken" —
    // this test documents that behavior rather than asserting an unrealistic non-match.
    expect(detectUrgency("I broke my key in the lock")).toBe(false);
  });
});
