import { connectToDatabase } from "@/lib/db";
import { Product } from "@/lib/models/Product";
import { Order } from "@/lib/models/Order";
import { reserveStock, releaseStock, InsufficientStockError, type ReserveItem } from "@/lib/inventory";
import { revalidateProductCache } from "@/lib/revalidateProducts";
import { stripe } from "@/lib/stripe";
import { isRateLimited } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

export type CartLine = { slug: string; quantity: number };

export type CheckoutOutcome =
  | { sessionUrl: string }
  | { error: string; status: 400 | 409 | 429 };

// Cache invalidation is best-effort: a stale product listing for a few
// minutes is a far smaller problem than aborting a real transaction over
// it, so failures here are logged and swallowed rather than thrown.
function safeRevalidate() {
  try {
    revalidateProductCache();
  } catch (err) {
    logger.warn("revalidateProductCache failed (non-fatal)", { errorStack: err instanceof Error ? err.stack : String(err) });
  }
}

/**
 * The actual checkout business logic — reserve stock, create the order,
 * create the Stripe session, roll back on failure — with no dependency on
 * how it was invoked. Deliberately transport-agnostic: it takes clientIp
 * as a plain argument rather than calling next/headers itself, so it can
 * be called from a Server Action (which reads the IP via headers()) or a
 * Route Handler (which reads it directly off the NextRequest) without
 * duplicating the reservation/rollback logic between them.
 */
export async function buildCheckoutSession(
  cart: CartLine[],
  customerEmail: string,
  clientIp: string
): Promise<CheckoutOutcome> {
  if (isRateLimited(`checkout:${clientIp}`)) {
    return { error: "Too many checkout attempts. Try again in a minute.", status: 429 };
  }

  if (cart.length === 0) {
    return { error: "Cart is empty.", status: 400 };
  }

  await connectToDatabase();

  // Prices and stock are always re-read from the database here — the
  // client-submitted cart only supplies slug + quantity. Trusting a
  // client-submitted price would let anyone pay whatever they want.
  const products = await Product.find({ slug: { $in: cart.map((c) => c.slug) } });
  const productBySlug = new Map(products.map((p) => [p.slug, p]));

  const items = [];
  for (const line of cart) {
    const product = productBySlug.get(line.slug);
    if (!product) return { error: `Product ${line.slug} not found.`, status: 400 };
    items.push({
      productId: product._id.toString(),
      slug: product.slug,
      name: product.name,
      priceCents: product.priceCents,
      quantity: line.quantity,
      // Not part of the Order schema (Mongoose drops unknown fields on
      // .create()) — carried alongside just to build the Stripe line item
      // below, so Stripe's hosted checkout page can show a thumbnail.
      imageUrl: product.imageUrl,
    });
  }

  const totalCents = items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
  const reserveItems: ReserveItem[] = items.map((i) => ({
    productId: i.productId,
    slug: i.slug,
    quantity: i.quantity,
  }));

  try {
    await reserveStock(reserveItems);
  } catch (err) {
    if (err instanceof InsufficientStockError) {
      return { error: `Not enough stock for ${err.slug}.`, status: 409 };
    }
    throw err;
  }
  safeRevalidate();

  // From here on, stock is reserved. Everything below — creating the
  // order, creating the Stripe session — must be inside one rollback
  // boundary: if any step fails, the reservation is released. Without
  // this, a DB blip on Order.create() would decrement stock permanently
  // with no order to ever release it.
  // Falls back to the deployed production URL, not localhost — a missing
  // env var in production should still produce a working redirect target
  // instead of silently sending Stripe's callback to an unreachable host.
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ??
    (process.env.NODE_ENV === "production" ? "https://atomic-cart-ashen.vercel.app" : "http://localhost:3000");

  try {
    const order = await Order.create({
      items,
      totalCents,
      status: "pending",
      customerEmail,
      stockReserved: true,
    });

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: customerEmail,
        line_items: items.map((i) => ({
          price_data: {
            currency: "usd",
            product_data: {
              name: i.name,
              // Stripe needs a publicly reachable HTTPS URL — fine for the
              // seeded Unsplash images, but a locally-uploaded MinIO image
              // (http://127.0.0.1:...) won't render on Stripe's hosted page.
              images: i.imageUrl.startsWith("https://") ? [i.imageUrl] : undefined,
            },
            unit_amount: i.priceCents,
          },
          quantity: i.quantity,
        })),
        metadata: { orderId: order._id.toString() },
        // Also stamped on the PaymentIntent itself, not just the session:
        // payment_intent.payment_failed fires on the PaymentIntent object,
        // which doesn't inherit the session's metadata automatically, so
        // without this the webhook has no way to find the order.
        payment_intent_data: { metadata: { orderId: order._id.toString() } },
        success_url: `${baseUrl}/checkout/success?orderId=${order._id.toString()}`,
        cancel_url: `${baseUrl}/checkout/cancel?orderId=${order._id.toString()}`,
        // Stripe expires an unpaid session automatically after 24h; the
        // webhook handler releases the reserved stock when that happens.
      });

      order.stripeSessionId = session.id;
      await order.save();
      return { sessionUrl: session.url! };
    } catch (err) {
      order.status = "failed";
      await order.save();
      throw err;
    }
  } catch (err) {
    await releaseStock(reserveItems);
    safeRevalidate();
    throw err;
  }
}

/**
 * Called when a user lands on /checkout/cancel. Without this, stock stays
 * reserved for up to 24h (until Stripe's own session expiry fires the
 * webhook) even though the customer has already visibly abandoned checkout
 * — a real availability problem for low-stock items. Guarded by
 * `status: "pending"` so it's a no-op for an already-paid or already-failed
 * order, and safe to call on every render of the cancel page.
 */
export async function expireOrderAndReleaseStock(orderId: string): Promise<void> {
  await connectToDatabase();

  const order = await Order.findOne({ _id: orderId, status: "pending" });
  if (!order) return;

  if (order.stripeSessionId) {
    try {
      await stripe.checkout.sessions.expire(order.stripeSessionId);
    } catch (err) {
      // Already expired/completed on Stripe's side, or a transient API
      // error — either way, the DB-side release below is what actually
      // matters for inventory correctness.
      logger.warn("stripe.checkout.sessions.expire failed (non-fatal)", {
        errorStack: err instanceof Error ? err.stack : String(err),
      });
    }
  }

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
  safeRevalidate();
}
