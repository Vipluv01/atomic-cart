import { Schema, model, models, type InferSchemaType } from "mongoose";

// pending: stock reserved, awaiting payment
// paid: webhook confirmed payment
// fulfilled: order shipped/completed (manual or future automation)
// failed: payment failed/expired, stock released back
export const ORDER_STATUSES = ["pending", "paid", "fulfilled", "failed"] as const;
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
  },
  { timestamps: true }
);

export type OrderDoc = InferSchemaType<typeof orderSchema>;

export const Order = models.Order || model("Order", orderSchema);
