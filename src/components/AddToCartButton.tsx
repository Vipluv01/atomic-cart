"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/lib/cartStorage";
import { Button } from "@/components/ui/button";

export function AddToCartButton({ slug, disabled }: { slug: string; disabled: boolean }) {
  const [added, setAdded] = useState(false);
  const router = useRouter();

  return (
    <Button
      type="button"
      size="lg"
      disabled={disabled}
      className="w-fit"
      onClick={() => {
        addToCart(slug, 1);
        setAdded(true);
        router.refresh();
      }}
    >
      {disabled ? "Out of stock" : added ? "Added ✓" : "Add to cart"}
    </Button>
  );
}
