"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { buildCheckoutSession, type CartLine } from "@/lib/checkoutCore";

export type CheckoutResult = { error: string } | never;

export async function createCheckoutSession(
  cart: CartLine[],
  customerEmail: string
): Promise<CheckoutResult> {
  const requestHeaders = await headers();
  const clientIp = requestHeaders.get("x-forwarded-for") ?? "unknown";

  const outcome = await buildCheckoutSession(cart, customerEmail, clientIp);
  if ("error" in outcome) {
    return { error: outcome.error };
  }

  // Outside any try/catch: redirect() throws a Next.js control-flow
  // exception that must NOT be caught and treated as a checkout failure.
  redirect(outcome.sessionUrl);
}
