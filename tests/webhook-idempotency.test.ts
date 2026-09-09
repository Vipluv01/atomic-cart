import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";

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

describe("Stripe webhook idempotency", () => {
  it("processes a checkout.session.completed event exactly once even if delivered twice", async () => {
    // Dynamic imports: STRIPE_WEBHOOK_SECRET must be set (above) before
    // stripe.ts's module-scope client construction runs.
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const { stripe } = await import("@/lib/stripe");
    const { connectToDatabase } = await import("@/lib/db");
    const { Order } = await import("@/lib/models/Order");
    const { Product } = await import("@/lib/models/Product");
    const { WebhookEvent } = await import("@/lib/models/WebhookEvent");
    const { NextRequest } = await import("next/server");

    await connectToDatabase();

    const product = await Product.create({
      slug: "widget",
      name: "Widget",
      description: "A widget.",
      priceCents: 1000,
      imageUrl: "https://example.com/widget.png",
      stock: 5,
    });

    const order = await Order.create({
      items: [{ productId: product._id, slug: product.slug, name: product.name, priceCents: 1000, quantity: 1 }],
      totalCents: 1000,
      status: "pending",
      customerEmail: "buyer@example.com",
      stripeSessionId: "cs_test_123",
      stockReserved: true,
    });

    const eventPayload = {
      id: "evt_test_completed_1",
      object: "event",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          object: "checkout.session",
          metadata: { orderId: order._id.toString() },
        },
      },
    };

    const payload = JSON.stringify(eventPayload);
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET!,
    });

    function makeRequest() {
      return new NextRequest("http://localhost/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": signature, "content-type": "application/json" },
        body: payload,
      });
    }

    const firstResponse = await POST(makeRequest());
    const firstBody = await firstResponse.json();
    expect(firstBody.deduped).toBeFalsy();

    const afterFirst = await Order.findById(order._id);
    expect(afterFirst!.status).toBe("paid");

    // Simulate Stripe redelivering the exact same event (at-least-once delivery).
    const secondResponse = await POST(makeRequest());
    const secondBody = await secondResponse.json();
    expect(secondBody.deduped).toBe(true);

    const eventCount = await WebhookEvent.countDocuments({ eventId: eventPayload.id });
    expect(eventCount).toBe(1);

    // Status stays 'paid', not double-processed into some other state.
    const afterSecond = await Order.findById(order._id);
    expect(afterSecond!.status).toBe("paid");
  });
});
