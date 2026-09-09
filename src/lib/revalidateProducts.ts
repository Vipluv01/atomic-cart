import { revalidateTag } from "next/cache";

/** Call after any write that changes product price/stock/details. */
export function revalidateProductCache() {
  revalidateTag("products", "max");
}
