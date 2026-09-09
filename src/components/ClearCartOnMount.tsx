"use client";

import { useEffect } from "react";
import { clearCart } from "@/lib/cartStorage";

/** Renders nothing — just empties the local cart once the success page mounts. */
export function ClearCartOnMount() {
  useEffect(() => {
    clearCart();
  }, []);

  return null;
}
