import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { connectToDatabase } from "@/lib/db";
import { WebhookEvent } from "@/lib/models/WebhookEvent";
import { Order } from "@/lib/models/Order";
import { releaseStock, type ReserveItem } from "@/lib/inventory";
import { revalidateProductCache } from "@/lib/revalidateProducts";
import Stripe from "stripe";

function toReserveItems(items: { productId: unknown; slug: string; quantity: number }[]): ReserveItem[] {
  return items.map((i) => ({ productId: String(i.productId), slug: i.slug, quantity: i.quantity }));
}

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
        const paymentIntentId =
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;

        // The webhook payload doesn't include the charge's receipt_url, so
        // it's fetched with one follow-up API call rather than left unset —
        // this is what lets a customer's order history link to their real
        // Stripe receipt instead of requiring a dashboard login.
        let receiptUrl: string | undefined;
        if (paymentIntentId) {
          try {
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
              expand: ["latest_charge"],
            });
            const charge = paymentIntent.latest_charge;
            receiptUrl = typeof charge === "object" && charge ? (charge.receipt_url ?? undefined) : undefined;
          } catch (err) {
            console.error("Failed to fetch receipt_url (non-fatal):", err);
          }
        }

        // Guard on status==='pending' so a redelivered event (should be
        // caught by the eventId check above already, but defense in depth)
        // can never move a 'failed'/already-'paid' order backward.
        await Order.updateOne(
          { _id: orderId, status: "pending" },
          { $set: { status: "paid", paymentIntentId, receiptUrl } }
        );
      }
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      if (orderId) {
        const order = await Order.findOne({ _id: orderId, status: "pending" });
        if (order) {
          await releaseStock(toReserveItems(order.items));
          order.status = "failed";
          order.stockReserved = false;
          await order.save();
          revalidateProductCache();
        }
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata?.orderId;
      if (orderId) {
        const order = await Order.findOne({ _id: orderId, status: "pending" });
        if (order) {
          await releaseStock(toReserveItems(order.items));
          order.status = "failed";
          order.stockReserved = false;
          order.paymentIntentId = paymentIntent.id;
          await order.save();
          revalidateProductCache();
        }
      }
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId =
        typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (paymentIntentId) {
        // Only orders still holding stock get it released — a refund
        // delivered twice (Stripe redelivery) is already blocked by the
        // eventId uniqueness check above, but this guard means a refund on
        // an order this webhook already processed is a clean no-op too.
        const order = await Order.findOne({ paymentIntentId, stockReserved: true });
        if (order) {
          await releaseStock(toReserveItems(order.items));
          order.status = "refunded";
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
