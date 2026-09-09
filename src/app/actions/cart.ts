"use server";

import { getProductBySlug, type ProductSummary } from "@/lib/products";

export async function getCartProductDetails(slugs: string[]): Promise<ProductSummary[]> {
  const products = await Promise.all(slugs.map((slug) => getProductBySlug(slug)));
  return products.filter((p): p is ProductSummary => p !== null);
}
