"use client";

const CART_KEY = "atomic-cart_cart";
// The native `storage` event only fires in OTHER tabs, never the tab that
// made the change — so a same-tab listener (e.g. the header's cart badge)
// needs its own signal. This custom event is that signal.
const CART_UPDATED_EVENT = "atomic-cart:cart-updated";

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
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

export function onCartUpdated(callback: () => void): () => void {
  window.addEventListener(CART_UPDATED_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CART_UPDATED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function cartItemCount(cart: CartLine[]): number {
  return cart.reduce((sum, c) => sum + c.quantity, 0);
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
