import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = await mongoose.connection.db!.collections();
    for (const c of collections) await c.deleteMany({});
  }
});

describe("reserveStock concurrency", () => {
  it("allows only one of two simultaneous requests to claim the last unit", async () => {
    const { connectToDatabase } = await import("@/lib/db");
    const { Product } = await import("@/lib/models/Product");
    const { reserveStock, InsufficientStockError } = await import("@/lib/inventory");

    await connectToDatabase();

    const product = await Product.create({
      slug: "last-unit",
      name: "Last Unit",
      description: "Only one left.",
      priceCents: 500,
      imageUrl: "https://example.com/x.png",
      stock: 1,
      category: "Accessories",
    });

    const item = { productId: product._id.toString(), slug: product.slug, quantity: 1 };

    const results = await Promise.allSettled([reserveStock([item]), reserveStock([item])]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(InsufficientStockError);

    const finalProduct = await Product.findById(product._id);
    expect(finalProduct!.stock).toBe(0); // never goes negative, never both succeed
  });

  it("rolls back already-reserved items when a later item in the same order is out of stock", async () => {
    const { connectToDatabase } = await import("@/lib/db");
    const { Product } = await import("@/lib/models/Product");
    const { reserveStock, InsufficientStockError } = await import("@/lib/inventory");

    await connectToDatabase();

    const inStock = await Product.create({
      slug: "in-stock",
      name: "In Stock",
      description: "Plenty.",
      priceCents: 500,
      imageUrl: "https://example.com/a.png",
      stock: 10,
      category: "Accessories",
    });
    const outOfStock = await Product.create({
      slug: "out-of-stock",
      name: "Out of Stock",
      description: "None left.",
      priceCents: 500,
      imageUrl: "https://example.com/b.png",
      stock: 0,
      category: "Accessories",
    });

    await expect(
      reserveStock([
        { productId: inStock._id.toString(), slug: inStock.slug, quantity: 2 },
        { productId: outOfStock._id.toString(), slug: outOfStock.slug, quantity: 1 },
      ])
    ).rejects.toBeInstanceOf(InsufficientStockError);

    const finalInStock = await Product.findById(inStock._id);
    // Compensated back to 10, not left decremented at 8.
    expect(finalInStock!.stock).toBe(10);
  });
});
