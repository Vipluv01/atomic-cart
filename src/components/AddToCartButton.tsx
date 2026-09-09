"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/lib/cartStorage";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Check } from "lucide-react";

export function AddToCartButton({ slug, disabled }: { slug: string; disabled: boolean }) {
  const [added, setAdded] = useState(false);
  const router = useRouter();

  return (
    <Button
      type="button"
      size="sm"
      disabled={disabled}
      className={`relative overflow-hidden font-medium text-xs rounded-xl px-4 py-2 transition-all duration-200 ${
        disabled
          ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50"
          : added
          ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
          : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/25 active:scale-95"
      }`}
      onClick={() => {
        addToCart(slug, 1);
        setAdded(true);
        router.refresh();
        setTimeout(() => setAdded(false), 2000);
      }}
    >
      {disabled ? (
        "Out of stock"
      ) : added ? (
        <span className="flex items-center gap-1.5 font-semibold">
          <Check className="w-3.5 h-3.5" />
          Added
        </span>
      ) : (
        <span className="flex items-center gap-1.5 font-semibold">
          <ShoppingBag className="w-3.5 h-3.5" />
          Add to Cart
        </span>
      )}
    </Button>
  );
}

