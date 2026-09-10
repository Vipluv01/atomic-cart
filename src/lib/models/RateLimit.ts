import { Schema, model, models } from "mongoose";

// One document per (key, fixed-window bucket) pair, e.g.
// "checkout:203.0.113.99|29050123" — the bucket index makes concurrent
// requests in the same window naturally converge on the same document
// (and thus the same atomic $inc) instead of racing to decide who
// "started" the window, which a naive read-then-write approach would.
const rateLimitSchema = new Schema({
  _id: { type: String, required: true },
  count: { type: Number, required: true, default: 0 },
  // TTL index: MongoDB deletes the document once expiresAt passes, so
  // this collection self-cleans instead of growing forever.
  expiresAt: { type: Date, required: true },
});

rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimit = models.RateLimit || model("RateLimit", rateLimitSchema);
