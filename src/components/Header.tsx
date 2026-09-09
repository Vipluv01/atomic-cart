"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { readCart, cartItemCount, onCartUpdated } from "@/lib/cartStorage";
import { Button } from "@/components/ui/button";

export function Header() {
  const { data: session, status } = useSession();
  // Lazy initializer (not an effect): readCart() is guarded for SSR, so
  // this is safe on both the server render and the client hydration
  // render, matching the same pattern used on the cart page itself.
  const [count, setCount] = useState(() => cartItemCount(readCart()));

  useEffect(() => {
    const update = () => setCount(cartItemCount(readCart()));
    return onCartUpdated(update);
  }, []);

  return (
    <header className="border-b border-zinc-200 bg-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold">
          Atomic Cart
        </Link>
        <div className="flex items-center gap-6 text-sm font-medium text-zinc-600">
          <Link href="/products">Products</Link>
          <Link href="/cart">Cart{count > 0 ? ` (${count})` : ""}</Link>
          {status === "authenticated" ? (
            <>
              <Link href="/admin/products/new">Admin</Link>
              <span className="text-zinc-400">{session.user.email}</span>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                Sign out
              </Button>
            </>
          ) : (
            <Link href="/login">Login</Link>
          )}
        </div>
      </nav>
    </header>
  );
}
