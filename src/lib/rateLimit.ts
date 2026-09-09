/**
 * Fixed-window rate limiter, in-memory. This deliberately does NOT reach
 * for Redis: it's scoped to a single Next.js instance, which is enough to
 * stop a single client hammering the checkout endpoint but does not hold
 * across multiple server instances behind a load balancer. Documented
 * limitation, not an oversight — see README.
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

const hits = new Map<string, { count: number; windowStart: number }>();

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    hits.set(key, { count: 1, windowStart: now });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_REQUESTS;
}
