"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { readCart, cartItemCount, onCartUpdated } from "@/lib/cartStorage";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Sparkles, User, LogOut, PlusCircle, Receipt, LayoutDashboard } from "lucide-react";

export function Header() {
  const { data: session, status } = useSession();
  const [count, setCount] = useState(() => cartItemCount(readCart()));

  useEffect(() => {
    const update = () => setCount(cartItemCount(readCart()));
    return onCartUpdated(update);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl transition-all">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 font-bold text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-white group-hover:text-indigo-300 transition-colors">
            Atomic Cart
          </span>
        </Link>

        <div className="flex items-center gap-6 text-sm font-medium text-zinc-300">
          <Link href="/products" className="hover:text-white transition-colors">
            Products
          </Link>

          <Link href="/cart" className="relative flex items-center gap-1.5 hover:text-white transition-colors">
            <ShoppingBag className="w-4 h-4 text-zinc-400" />
            <span>Cart</span>
            {count > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-1.5 text-[11px] font-extrabold text-white shadow-sm shadow-indigo-500/50 animate-pulse">
                {count}
              </span>
            )}
          </Link>

          {status === "authenticated" ? (
            <div className="flex items-center gap-4 border-l border-zinc-800 pl-4">
              <Link href="/orders" className="flex items-center gap-1 hover:text-white transition-colors">
                <Receipt className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Orders</span>
              </Link>
              {session.user.role === "admin" && (
                <>
                  <Link href="/admin/orders" className="flex items-center gap-1 hover:text-white transition-colors">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Admin Orders</span>
                  </Link>
                  <Link href="/admin/products/new" className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 border border-indigo-500/30 px-3 py-1.5 rounded-lg">
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>New Product</span>
                  </Link>
                </>
              )}
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <User className="w-3.5 h-3.5 text-zinc-500" />
                <span className="max-w-[120px] truncate">{session.user.email}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="h-8 px-2.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <LogOut className="w-3.5 h-3.5 mr-1" />
                Sign out
              </Button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-zinc-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 transition-colors border border-zinc-700/50"
            >
              Login
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

