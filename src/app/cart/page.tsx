"use client";

import { useEffect, useState, useTransition } from "react";
import { readCart, setQuantity, removeFromCart, type CartLine } from "@/lib/cartStorage";
import { getCartProductDetails } from "@/app/actions/cart";
import { createCheckoutSession } from "@/app/actions/checkout";
import type { ProductSummary } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CartPage() {
  // Lazy initializer instead of an effect: readCart() is guarded for SSR
  // (returns [] when window is undefined), so this is safe on both the
  // server render and the client hydration render — no cascading setState.
  const [lines, setLines] = useState<CartLine[]>(() => readCart());
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (lines.length > 0) {
      getCartProductDetails(lines.map((c) => c.slug)).then(setProducts);
    }
    // Only re-fetch when the set of slugs actually changes, not on every
    // quantity tweak.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines.map((l) => l.slug).join(",")]);

  const rows = lines
    .map((line) => {
      const product = products.find((p) => p.slug === line.slug);
      return product ? { ...product, quantity: line.quantity } : null;
    })
    .filter((r): r is ProductSummary & { quantity: number } => r !== null);

  const totalCents = rows.reduce((sum, r) => sum + r.priceCents * r.quantity, 0);

  function updateQuantity(slug: string, quantity: number) {
    setQuantity(slug, quantity);
    setLines(readCart());
  }

  function remove(slug: string) {
    removeFromCart(slug);
    setLines(readCart());
  }

  function checkout() {
    setError(null);
    startTransition(async () => {
      const result = await createCheckoutSession(
        rows.map((r) => ({ slug: r.slug, quantity: r.quantity })),
        email
      );
      // createCheckoutSession redirects on success, so reaching here means
      // it returned an error instead of throwing a redirect.
      if (result && "error" in result) setError(result.error);
    });
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="mb-8 text-2xl font-semibold">Cart</h1>
      {rows.length === 0 ? (
        <p className="text-zinc-500">Your cart is empty.</p>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {rows.map((row) => (
              <div key={row.slug} className="flex items-center justify-between border-b border-zinc-200 pb-4">
                <div>
                  <p className="font-medium">{row.name}</p>
                  <p className="text-sm text-zinc-500">${(row.priceCents / 100).toFixed(2)} each</p>
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={row.stock}
                    value={row.quantity}
                    onChange={(e) => updateQuantity(row.slug, Number(e.target.value))}
                    className="w-16"
                  />
                  <Button variant="ghost" size="sm" onClick={() => remove(row.slug)} className="text-destructive">
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-lg font-medium">Total: ${(totalCents / 100).toFixed(2)}</p>

          <Input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-4"
          />

          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

          <Button onClick={checkout} disabled={isPending || !email} size="lg" className="mt-4 w-fit">
            {isPending ? "Redirecting to Stripe..." : "Checkout"}
          </Button>
        </>
      )}
    </div>
  );
}
