import Stripe from "stripe";

// Lazy on purpose: Next.js evaluates route modules (including this one,
// transitively) while statically analyzing routes at build time, before
// any runtime secret is necessarily available. A top-level `new Stripe(...)`
// that throws on a missing key turns "the build ran on a machine without
// STRIPE_SECRET_KEY yet" into "the build is broken" — the two aren't the
// same thing. Construction (and the missing-key check) is deferred until
// the client is actually used, which only happens at request time.
let cached: Stripe | null = null;

function getStripeClient(): Stripe {
  if (cached) return cached;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }

  cached = new Stripe(secretKey);
  return cached;
}

export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripeClient(), prop, receiver);
  },
});
