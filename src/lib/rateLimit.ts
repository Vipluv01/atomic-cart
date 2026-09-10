/**
 * Distributed fixed-window rate limiter, backed by MongoDB.
 *
 * The previous version kept counts in a module-scoped Map, which only
 * limits requests landing on the same warm serverless instance — verified
 * for real against the live Vercel deployment: 15 sequential requests from
 * one IP correctly got rate-limited after 10 (same instance stayed warm
 * across the burst), but truly concurrent parallel requests can be routed
 * to separate instances that never shared that Map, silently bypassing the
 * limit. Moving the counter into MongoDB — the datastore every instance
 * already shares — closes that gap regardless of which instance handles
 * which request.
 *
 * This is a fixed window, not a true sliding window: each (key, window)
 * pair gets one document, and requests within the same window bucket
 * atomically increment the same counter via a single findOneAndUpdate — no
 * read-then-write gap for concurrent requests to race in, the same
 * atomicity principle as reserveStock() in inventory.ts. A real sliding
 * window (weighted overlap between adjacent buckets) is meaningfully more
 * complex to make atomic and wasn't warranted here: fixed-window is what
 * the single-instance version already did, and the only property that
 * actually matters for abuse prevention — a hard cap per IP per minute —
 * holds either way.
 */
import { connectToDatabase } from "@/lib/db";
import { RateLimit } from "@/lib/models/RateLimit";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

export async function isRateLimited(key: string): Promise<boolean> {
  await connectToDatabase();

  const now = Date.now();
  const bucket = Math.floor(now / WINDOW_MS);
  const docId = `${key}|${bucket}`;

  const result = await RateLimit.findOneAndUpdate(
    { _id: docId },
    {
      $inc: { count: 1 },
      // Expire two windows out, not one — a document must still exist to
      // be read back if this write is the one that pushes count over the
      // limit near the very end of a window.
      $setOnInsert: { expiresAt: new Date(now + WINDOW_MS * 2) },
    },
    { upsert: true, returnDocument: "after" }
  );

  return result.count > MAX_REQUESTS;
}
