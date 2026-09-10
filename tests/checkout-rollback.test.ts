import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// headers()/redirect() rely on Next.js's per-request AsyncLocalStorage
// context, which doesn't exist when calling a Server Action directly from
// a test. Mocking them is what lets this test exercise the actual
// rollback logic instead of failing on an unrelated invariant.
vi.mock("next/headers", () => ({
  headers: async () => new Map([["x-forwarded-for", "127.0.0.1"]]),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

// An invalid-but-well-formed key so the Stripe SDK makes a real network
// call to api.stripe.com and gets a genuine 401, instead of mocking the
// failure — this proves the rollback path fires on an actual API error,
// not just a hand-crafted throw.
process.env.STRIPE_SECRET_KEY = "sk_test_invalid_key_for_rollback_test";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";

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

describe("createCheckoutSession rollback", () => {
  it("releases reserved stock and marks the order failed when Stripe session creation fails", async () => {
    const { connectToDatabase } = await import("@/lib/db");
    const { Product } = await import("@/lib/models/Product");
    const { Order } = await import("@/lib/models/Order");
    const { createCheckoutSession } = await import("@/app/actions/checkout");

    await connectToDatabase();

    const product = await Product.create({
      slug: "rollback-test-item",
      name: "Rollback Test Item",
      description: "Used to test the Stripe-failure rollback path.",
      priceCents: 1500,
      imageUrl: "https://example.com/x.png",
      stock: 3,
      category: "Accessories",
    });

    let threw = false;
    try {
      await createCheckoutSession([{ slug: product.slug, quantity: 2 }], "buyer@example.com");
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);

    const finalProduct = await Product.findOne({ slug: product.slug });
    expect(finalProduct!.stock).toBe(3); // reserved 2, then released back to 3

    const order = await Order.findOne({ "items.slug": product.slug });
    expect(order!.status).toBe("failed");
  });
});
