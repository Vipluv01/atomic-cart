import { Schema, model, models, type InferSchemaType } from "mongoose";

const productSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    priceCents: { type: Number, required: true, min: 0 },
    imageUrl: { type: String, required: true },
    // Source of truth for available inventory. Decremented atomically by
    // reserveStock() — never mutate this directly from request handlers.
    stock: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true }
);

export type ProductDoc = InferSchemaType<typeof productSchema>;

export const Product = models.Product || model("Product", productSchema);
