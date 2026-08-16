import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    const key = "test:allows-under-limit";
    for (let i = 0; i < 12; i++) {
      expect(checkRateLimit(key).allowed).toBe(true);
    }
  });

  it("blocks the 13th request within the same 60s window", () => {
    const key = "test:blocks-over-limit";
    for (let i = 0; i < 12; i++) checkRateLimit(key);
    const result = checkRateLimit(key);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("tracks separate keys independently", () => {
    const keyA = "test:widget-a";
    const keyB = "test:widget-b";
    for (let i = 0; i < 12; i++) checkRateLimit(keyA);

    expect(checkRateLimit(keyA).allowed).toBe(false);
    expect(checkRateLimit(keyB).allowed).toBe(true); // a different widget's quota is untouched
  });

  it("allows requests again once the 60s window has passed", () => {
    const key = "test:window-resets";
    for (let i = 0; i < 12; i++) checkRateLimit(key);
    expect(checkRateLimit(key).allowed).toBe(false);

    vi.advanceTimersByTime(61_000);

    expect(checkRateLimit(key).allowed).toBe(true);
  });

  it("decrements the remaining count as requests come in", () => {
    const key = "test:remaining-count";
    const first = checkRateLimit(key);
    const second = checkRateLimit(key);
    expect(second.remaining).toBe(first.remaining - 1);
  });
});
