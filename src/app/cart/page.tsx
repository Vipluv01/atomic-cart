"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { readCart, setQuantity, removeFromCart, type CartLine } from "@/lib/cartStorage";
import { getCartProductDetails } from "@/app/actions/cart";
import { createCheckoutSession } from "@/app/actions/checkout";
import type { ProductSummary } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Trash2, ArrowRight, Lock } from "lucide-react";

export default function CartPage() {
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
      if (result && "error" in result) setError(result.error);
    });
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-12">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="mb-8 text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <ShoppingCart className="w-7 h-7 text-indigo-400" />
          <span>Shopping Cart</span>
        </h1>

        {rows.length === 0 ? (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-12 text-center backdrop-blur-md">
            <ShoppingCart className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-lg font-medium text-zinc-300">Your cart is empty</p>
            <p className="text-xs text-zinc-500 mt-1">Explore our catalog and find setup hardware for your desk.</p>
            <Link
              href="/products"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/25"
            >
              <span>Explore Products</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items List */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {rows.map((row) => (
                <div
                  key={row.slug}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={row.imageUrl}
                      alt={row.name}
                      className="w-16 h-16 rounded-xl object-cover bg-zinc-800 border border-zinc-700/50 flex-shrink-0"
                    />
                    <div>
                      <Link href={`/products/${row.slug}`}>
                        <p className="font-semibold text-white text-sm hover:text-indigo-400 transition-colors">
                          {row.name}
                        </p>
                      </Link>
                      <p className="text-xs text-zinc-400 mt-0.5">${(row.priceCents / 100).toFixed(2)} each</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      min={1}
                      max={row.stock}
                      value={row.quantity}
                      onChange={(e) => updateQuantity(row.slug, Number(e.target.value))}
                      className="w-16 bg-zinc-950 border-zinc-700 text-white text-xs text-center rounded-lg"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(row.slug)}
                      className="text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Checkout Summary Card */}
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-md flex flex-col justify-between h-fit">
              <div>
                <h2 className="text-lg font-bold text-white mb-4">Order Summary</h2>

                <div className="flex items-center justify-between text-xs text-zinc-400 py-2 border-b border-zinc-800">
                  <span>Subtotal</span>
                  <span>${(totalCents / 100).toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-400 py-2 border-b border-zinc-800">
                  <span>Shipping</span>
                  <span className="text-emerald-400 font-medium">FREE</span>
                </div>

                <div className="flex items-center justify-between text-base font-bold text-white py-4">
                  <span>Total</span>
                  <span className="text-indigo-400">${(totalCents / 100).toFixed(2)}</span>
                </div>

                <div className="mt-2">
                  <label className="text-xs font-medium text-zinc-300 mb-1.5 block">Customer Email</label>
                  <Input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-zinc-950 border-zinc-700 text-white text-xs rounded-xl"
                  />
                </div>

                {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
              </div>

              <div className="mt-6">
                <Button
                  onClick={checkout}
                  disabled={isPending || !email}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-xs py-3 rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25"
                >
                  {isPending ? "Redirecting to Stripe..." : "Proceed to Checkout →"}
                </Button>

                <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-zinc-500">
                  <Lock className="w-3 h-3 text-indigo-400" />
                  <span>256-Bit Encrypted Stripe Checkout</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

