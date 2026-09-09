import { Schema, model, models } from "mongoose";

// Stripe delivers webhooks at-least-once, so the same event.id can arrive
// more than once (retries, redelivery after a timeout). The unique index on
// eventId is what makes idempotency atomic: two concurrent inserts for the
// same event race at the database level, and exactly one wins — there is no
// read-then-write gap to race in application code.
const webhookEventSchema = new Schema(
  {
    eventId: { type: String, required: true, unique: true },
    type: { type: String, required: true },
  },
  { timestamps: true }
);

export const WebhookEvent = models.WebhookEvent || model("WebhookEvent", webhookEventSchema);
