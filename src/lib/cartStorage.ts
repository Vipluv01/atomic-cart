"use client";

const CART_KEY = "nextshop_cart";

export type CartLine = { slug: string; quantity: number };

export function readCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

function writeCart(cart: CartLine[]) {
  window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function addToCart(slug: string, quantity = 1) {
  const cart = readCart();
  const existing = cart.find((c) => c.slug === slug);
  if (existing) existing.quantity += quantity;
  else cart.push({ slug, quantity });
  writeCart(cart);
}

export function setQuantity(slug: string, quantity: number) {
  const cart = readCart().map((c) => (c.slug === slug ? { ...c, quantity } : c));
  writeCart(cart.filter((c) => c.quantity > 0));
}

export function removeFromCart(slug: string) {
  writeCart(readCart().filter((c) => c.slug !== slug));
}

export function clearCart() {
  writeCart([]);
}
