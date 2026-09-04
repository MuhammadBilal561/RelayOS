import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { InMemoryRateLimiter, checkRateLimit, createRateLimiter } from "@/lib/rate-limit";

describe("InMemoryRateLimiter", () => {
  let limiter: InMemoryRateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    limiter = new InMemoryRateLimiter({ windowMs: 60_000, maxRequests: 12, prefix: "test:" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", async () => {
    const key = "allows-under-limit";
    for (let i = 0; i < 12; i++) {
      const result = await limiter.check(key);
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks the 13th request within the same 60s window", async () => {
    const key = "blocks-over-limit";
    for (let i = 0; i < 12; i++) await limiter.check(key);
    const result = await limiter.check(key);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("tracks separate keys independently", async () => {
    const keyA = "widget-a";
    const keyB = "widget-b";
    for (let i = 0; i < 12; i++) await limiter.check(keyA);

    expect((await limiter.check(keyA)).allowed).toBe(false);
    expect((await limiter.check(keyB)).allowed).toBe(true); // a different widget's quota is untouched
  });

  it("allows requests again once the 60s window has passed", async () => {
    const key = "window-resets";
    for (let i = 0; i < 12; i++) await limiter.check(key);
    expect((await limiter.check(key)).allowed).toBe(false);

    vi.advanceTimersByTime(61_000);

    expect((await limiter.check(key)).allowed).toBe(true);
  });

  it("decrements the remaining count as requests come in", async () => {
    const key = "remaining-count";
    const first = await limiter.check(key);
    const second = await limiter.check(key);
    expect(second.remaining).toBe(first.remaining - 1);
  });

  it("resets a key", async () => {
    const key = "reset-test";
    for (let i = 0; i < 12; i++) await limiter.check(key);
    expect((await limiter.check(key)).allowed).toBe(false);

    await limiter.reset(key);

    expect((await limiter.check(key)).allowed).toBe(true);
  });

  it("includes resetTimeMs in response", async () => {
    const key = "reset-time-test";
    const result = await limiter.check(key);
    expect(result.resetTimeMs).toBeDefined();
    expect(result.resetTimeMs).toBeGreaterThan(Date.now());
  });
});

describe("checkRateLimit (backward compatibility)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    // Reset singleton by creating a new limiter instance
    // The singleton is module-scoped, so we need to re-import
  });

  describe("production Upstash configuration", () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("initializes Upstash when packages and credentials are available", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("RATE_LIMITER_BACKEND", "upstash-redis");
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
      vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");

      expect(() => createRateLimiter()).not.toThrow();
    });

    it("fails with a configuration error when Upstash credentials are missing", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("RATE_LIMITER_BACKEND", "upstash-redis");
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
      vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");

      expect(() => createRateLimiter()).toThrow(/requires UPSTASH_REDIS_REST_URL/);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", async () => {
    const key = "compat:allows-under-limit";
    for (let i = 0; i < 12; i++) {
      expect((await checkRateLimit(key)).allowed).toBe(true);
    }
  });

  it("blocks the 13th request within the same 60s window", async () => {
    const key = "compat:blocks-over-limit";
    for (let i = 0; i < 12; i++) await checkRateLimit(key);
    const result = await checkRateLimit(key);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});
