import { Schema, model, models, type InferSchemaType } from "mongoose";

// pending: stock reserved, awaiting payment
// paid: webhook confirmed payment
// fulfilled: order shipped/completed (manual, via markOrderFulfilled)
// failed: payment never completed (checkout expired or payment_intent failed), stock released back
// refunded: payment succeeded then was reversed (charge.refunded), stock released back
export const ORDER_STATUSES = ["pending", "paid", "fulfilled", "failed", "refunded"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    slug: { type: String, required: true },
    name: { type: String, required: true },
    priceCents: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    items: { type: [orderItemSchema], required: true },
    totalCents: { type: Number, required: true },
    status: { type: String, enum: ORDER_STATUSES, default: "pending", index: true },
    customerEmail: { type: String, required: true },
    stripeSessionId: { type: String, index: true, sparse: true },
    // Set once stock has been decremented for this order, so a retry or a
    // partially-processed order never double-releases or double-reserves.
    stockReserved: { type: Boolean, default: false },
    // Captured from Stripe when checkout.session.completed fires, so a
    // customer's order history can link to their actual receipt instead of
    // requiring a Stripe dashboard login.
    receiptUrl: { type: String },
    // Set by payment_intent.payment_failed / charge.refunded, so those two
    // "payment problem" paths can be distinguished from an expired session
    // in the order history UI.
    paymentIntentId: { type: String, index: true, sparse: true },
  },
  { timestamps: true }
);

export type OrderDoc = InferSchemaType<typeof orderSchema>;

export const Order = models.Order || model("Order", orderSchema);
