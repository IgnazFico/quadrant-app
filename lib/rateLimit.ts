/**
 * lib/rateLimit.ts
 *
 * Lightweight rate-limiting utility for sensitive authentication routes.
 * Supports Upstash Redis REST API when configured, with an in-memory sliding-window
 * fallback for local environments and serverless edge execution without extra infrastructure.
 */

interface RateLimitConfig {
  intervalMs: number;
  maxRequests: number;
}

interface WindowRecord {
  timestamps: number[];
}

const memoryStore = new Map<string, WindowRecord>();

// Cleanup stale entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 600000);
      if (record.timestamps.length === 0) {
        memoryStore.delete(key);
      }
    }
  }, 300000);
}

export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { intervalMs: 60000, maxRequests: 15 },
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // 1. Upstash Redis REST Path (if configured in production)
  if (upstashUrl && upstashToken) {
    try {
      const now = Date.now();
      const key = `ratelimit:${identifier}`;
      const windowStart = now - config.intervalMs;

      // Clean old and add current timestamp via Redis pipeline
      const pipelineUrl = `${upstashUrl}/pipeline`;
      const res = await fetch(pipelineUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["ZREMRANGEBYSCORE", key, "0", windowStart.toString()],
          ["ZADD", key, now.toString(), `${now}-${Math.random()}`],
          ["ZCARD", key],
          ["EXPIRE", key, Math.ceil(config.intervalMs / 1000).toString()],
        ]),
      });

      if (res.ok) {
        const results = await res.json();
        const count = results[2]?.result ?? 1;
        const success = count <= config.maxRequests;
        return {
          success,
          limit: config.maxRequests,
          remaining: Math.max(0, config.maxRequests - count),
          reset: Math.ceil(config.intervalMs / 1000),
        };
      }
    } catch {
      // Fallback gracefully to in-memory store if Redis request fails
    }
  }

  // 2. In-Memory Sliding Window Implementation
  const now = Date.now();
  const windowStart = now - config.intervalMs;
  let record = memoryStore.get(identifier);

  if (!record) {
    record = { timestamps: [] };
    memoryStore.set(identifier, record);
  }

  // Filter timestamps within the current window
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (record.timestamps.length >= config.maxRequests) {
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      reset: Math.ceil((record.timestamps[0] + config.intervalMs - now) / 1000),
    };
  }

  record.timestamps.push(now);
  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - record.timestamps.length,
    reset: Math.ceil(config.intervalMs / 1000),
  };
}
