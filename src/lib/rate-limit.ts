const rateLimitMap = new Map<string, number[]>();

/**
 * Simple in-memory sliding window rate limiter.
 * @param identifier - Unique key (e.g. user ID or email)
 * @param limit - Max requests allowed in the window
 * @param windowMs - Time window in milliseconds
 */
export function rateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60_000
): { success: boolean; remaining: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  const timestamps = (rateLimitMap.get(identifier) ?? []).filter(
    (t) => t > windowStart
  );

  if (timestamps.length >= limit) {
    rateLimitMap.set(identifier, timestamps);
    return { success: false, remaining: 0 };
  }

  timestamps.push(now);
  rateLimitMap.set(identifier, timestamps);

  // Periodic cleanup: remove stale entries every 100 calls
  if (Math.random() < 0.01) {
    for (const [key, times] of rateLimitMap) {
      const fresh = times.filter((t) => t > windowStart);
      if (fresh.length === 0) {
        rateLimitMap.delete(key);
      } else {
        rateLimitMap.set(key, fresh);
      }
    }
  }

  return { success: true, remaining: limit - timestamps.length };
}
