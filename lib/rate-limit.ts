/**
 * Minimal in-memory rate limiter — good enough for a single Vercel
 * serverless instance during a demo, NOT good enough for real multi-
 * instance production traffic (each instance has its own memory).
 * For a real client deployment, swap this for Upstash Redis's free
 * tier (a few lines: https://upstash.com/docs/redis/sdks/ratelimit-ts).
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12;

const hits = new Map<string, number[]>();

export function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const timestamps = (hits.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    hits.set(key, timestamps);
    return { allowed: false, remaining: 0 };
  }

  timestamps.push(now);
  hits.set(key, timestamps);
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - timestamps.length };
}
