"use server";

import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/db";
import { Product } from "@/lib/models/Product";
import { Order } from "@/lib/models/Order";
import { reserveStock, releaseStock, InsufficientStockError, type ReserveItem } from "@/lib/inventory";
import { revalidateProductCache } from "@/lib/revalidateProducts";
import { stripe } from "@/lib/stripe";
import { isRateLimited } from "@/lib/rateLimit";
import { headers } from "next/headers";

export type CartLine = { slug: string; quantity: number };

export type CheckoutResult = { error: string } | never;

// Cache invalidation is best-effort: a stale product listing for a few
// minutes is a far smaller problem than aborting a real transaction over
// it, so failures here are logged and swallowed rather than thrown.
function safeRevalidate() {
  try {
    revalidateProductCache();
  } catch (err) {
    console.error("revalidateProductCache failed (non-fatal):", err);
  }
}

export async function createCheckoutSession(
  cart: CartLine[],
  customerEmail: string
): Promise<CheckoutResult> {
  const requestHeaders = await headers();
  const clientIp = requestHeaders.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(`checkout:${clientIp}`)) {
    return { error: "Too many checkout attempts. Try again in a minute." };
  }

  if (cart.length === 0) {
    return { error: "Cart is empty." };
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
    if (!product) return { error: `Product ${line.slug} not found.` };
    items.push({
      productId: product._id.toString(),
      slug: product.slug,
      name: product.name,
      priceCents: product.priceCents,
      quantity: line.quantity,
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
      return { error: `Not enough stock for ${err.slug}.` };
    }
    throw err;
  }
  safeRevalidate();

  // From here on, stock is reserved. Everything below — creating the
  // order, creating the Stripe session — must be inside one rollback
  // boundary: if any step fails, the reservation is released. Without
  // this, a DB blip on Order.create() would decrement stock permanently
  // with no order to ever release it.
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  let sessionUrl: string;

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
            product_data: { name: i.name },
            unit_amount: i.priceCents,
          },
          quantity: i.quantity,
        })),
        metadata: { orderId: order._id.toString() },
        success_url: `${baseUrl}/checkout/success?orderId=${order._id.toString()}`,
        cancel_url: `${baseUrl}/checkout/cancel?orderId=${order._id.toString()}`,
        // Stripe expires an unpaid session automatically after 24h; the
        // webhook handler releases the reserved stock when that happens.
      });

      order.stripeSessionId = session.id;
      await order.save();
      sessionUrl = session.url!;
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

  // Outside every try/catch above: redirect() throws a Next.js
  // control-flow exception that must NOT be caught and treated as a
  // checkout failure.
  redirect(sessionUrl);
}
