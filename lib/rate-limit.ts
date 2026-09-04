/**
 * Rate Limiter Interface
 * 
 * This abstraction allows swapping between different rate limiting backends:
 * - In-memory (development/demo only)
 * - Upstash Redis (production)
 * - Custom implementations
 * 
 * IMPORTANT: The in-memory implementation is NOT suitable for production
 * multi-instance deployments because each serverless instance has its own
 * memory. For production, you MUST configure a distributed backend.
 */

export interface RateLimiter {
  check(key: string): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTimeMs?: number;
}

export interface RateLimiterConfig {
  windowMs: number;
  maxRequests: number;
  prefix?: string;
}

/**
 * In-memory rate limiter — for development and single-instance demos ONLY.
 * NOT suitable for production multi-instance deployments.
 */
export class InMemoryRateLimiter implements RateLimiter {
  private hits = new Map<string, number[]>();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly prefix: string;

  constructor(config: RateLimiterConfig) {
    this.windowMs = config.windowMs;
    this.maxRequests = config.maxRequests;
    this.prefix = config.prefix ?? "rl:";
    
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[RATE LIMITER WARNING] InMemoryRateLimiter is active in production! " +
        "This is NOT suitable for multi-instance deployments. " +
        "Configure a distributed backend (e.g., Upstash Redis) via RATE_LIMITER_BACKEND."
      );
    }
  }

  async check(key: string): Promise<RateLimitResult> {
    const prefixedKey = `${this.prefix}${key}`;
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const timestamps = (this.hits.get(prefixedKey) ?? []).filter((t) => t > windowStart);

    if (timestamps.length >= this.maxRequests) {
      this.hits.set(prefixedKey, timestamps);
      const oldestInWindow = timestamps[0];
      return {
        allowed: false,
        remaining: 0,
        resetTimeMs: oldestInWindow + this.windowMs,
      };
    }

    timestamps.push(now);
    this.hits.set(prefixedKey, timestamps);
    return {
      allowed: true,
      remaining: this.maxRequests - timestamps.length,
      resetTimeMs: now + this.windowMs,
    };
  }

  async reset(key: string): Promise<void> {
    const prefixedKey = `${this.prefix}${key}`;
    this.hits.delete(prefixedKey);
  }
}

/**
 * Creates a rate limiter instance based on configuration.
 * 
 * Configuration via environment variables:
 * - RATE_LIMITER_BACKEND: "memory" | "upstash-redis" | "custom"
 * - UPSTASH_REDIS_REST_URL: Required for Upstash Redis backend
 * - UPSTASH_REDIS_REST_TOKEN: Required for Upstash Redis backend
 * - RATE_LIMIT_WINDOW_MS: Window in milliseconds (default: 60000)
 * - RATE_LIMIT_MAX_REQUESTS: Max requests per window (default: 12)
 * 
 * For production, set RATE_LIMITER_BACKEND=upstash-redis and provide
 * the Upstash credentials.
 */
export function createRateLimiter(): RateLimiter {
  const backend = process.env.RATE_LIMITER_BACKEND ?? "memory";
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "60000", 10);
  const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? "12", 10);
  const prefix = process.env.RATE_LIMIT_PREFIX ?? "rl:";

  if (!Number.isSafeInteger(windowMs) || windowMs <= 0) {
    throw new Error("RATE_LIMIT_WINDOW_MS must be a positive integer");
  }
  if (!Number.isSafeInteger(maxRequests) || maxRequests <= 0) {
    throw new Error("RATE_LIMIT_MAX_REQUESTS must be a positive integer");
  }
  if (process.env.NODE_ENV === "production" && backend === "memory") {
    throw new Error(
      "The in-memory rate limiter is not safe for production. Set RATE_LIMITER_BACKEND=upstash-redis " +
        "and configure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
    );
  }

  const config: RateLimiterConfig = { windowMs, maxRequests, prefix };

  switch (backend) {
    case "memory":
      return new InMemoryRateLimiter(config);
    
    case "upstash-redis":
      return createUpstashRateLimiter(config);
    
    case "custom":
      return createCustomRateLimiter(config);
    
    default:
      throw new Error(
        `Unknown RATE_LIMITER_BACKEND: ${backend}. ` +
        `Valid options: "memory", "upstash-redis", "custom"`
      );
  }
}

/**
 * Creates an Upstash Redis-backed rate limiter.
 * Requires @upstash/ratelimit and @upstash/redis packages.
 * 
 * Install with: npm install @upstash/ratelimit @upstash/redis
 */
function createUpstashRateLimiter(config: RateLimiterConfig): RateLimiter {
  // Dynamic import to avoid requiring the package when not used
  let Ratelimit: any;
  let Redis: any;
  
  try {
    // Keep optional production dependencies out of the bundle when the memory
    // backend is selected. They are resolved only in deployments that opt in.
    const loadOptionalModule = (name: string) => (0, eval)("require")(name) as Record<string, any>;
    const ratelimitModule = loadOptionalModule("@upstash/ratelimit");
    const redisModule = loadOptionalModule("@upstash/redis");
    Ratelimit = ratelimitModule.Ratelimit;
    Redis = redisModule.Redis;
  } catch {
    throw new Error(
      "Upstash Redis backend selected but @upstash/ratelimit and/or @upstash/redis not installed. " +
      "Run: npm install @upstash/ratelimit @upstash/redis"
    );
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Upstash Redis backend requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables"
    );
  }

  const redis = new Redis({ url, token });
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.maxRequests, `${config.windowMs} ms`),
    prefix: config.prefix,
  });

  return {
    async check(key: string) {
      const result = await ratelimit.limit(key);
      return {
        allowed: result.success,
        remaining: result.remaining,
        resetTimeMs: result.reset,
      };
    },
    async reset(key: string) {
      await ratelimit.reset(key);
    },
  };
}

/**
 * Placeholder for custom rate limiter implementations.
 * Extend this to add your own backend.
 */
function createCustomRateLimiter(_config: RateLimiterConfig): RateLimiter {
  throw new Error(
    'Custom rate limiter backend not implemented. ' +
    'Implement createCustomRateLimiter() in lib/rate-limit.ts'
  );
}

// Singleton instance for backward compatibility
let _rateLimiter: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!_rateLimiter) {
    _rateLimiter = createRateLimiter();
  }
  return _rateLimiter;
}

/**
 * Backward-compatible function for existing code.
 * @deprecated Use getRateLimiter().check() instead
 */
export async function checkRateLimit(key: string): Promise<{ allowed: boolean; remaining: number }> {
  const limiter = getRateLimiter();
  const result = await limiter.check(key);
  return { allowed: result.allowed, remaining: result.remaining };
}