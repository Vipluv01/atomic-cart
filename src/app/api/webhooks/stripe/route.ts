import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { connectToDatabase } from "@/lib/db";
import { WebhookEvent } from "@/lib/models/WebhookEvent";
import { Order } from "@/lib/models/Order";
import { releaseStock } from "@/lib/inventory";
import { revalidateProductCache } from "@/lib/revalidateProducts";
import Stripe from "stripe";

// Route Handlers are not cached and receive the raw request stream, which
// is required here: Stripe's signature is computed over the exact raw
// body bytes, so the body must be read as text before any JSON parsing.
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  await connectToDatabase();

  // Idempotency: the unique index on eventId means only one process can
  // ever successfully insert a given event.id. A duplicate delivery hits
  // the duplicate-key error and is treated as an intentional, expected
  // no-op — not a failure — so Stripe still gets a 200 and won't retry.
  try {
    await WebhookEvent.create({ eventId: event.id, type: event.type });
  } catch (err) {
    const isDuplicateKey = (err as { code?: number }).code === 11000;
    if (isDuplicateKey) {
      return NextResponse.json({ received: true, deduped: true });
    }
    throw err;
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      if (orderId) {
        // Guard on status==='pending' so a redelivered event (should be
        // caught by the eventId check above already, but defense in depth)
        // can never move a 'failed'/already-'paid' order backward.
        await Order.updateOne({ _id: orderId, status: "pending" }, { $set: { status: "paid" } });
      }
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      if (orderId) {
        const order = await Order.findOne({ _id: orderId, status: "pending" });
        if (order) {
          await releaseStock(
            order.items.map((i: { productId: unknown; slug: string; quantity: number }) => ({
              productId: String(i.productId),
              slug: i.slug,
              quantity: i.quantity,
            }))
          );
          order.status = "failed";
          order.stockReserved = false;
          await order.save();
          revalidateProductCache();
        }
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
