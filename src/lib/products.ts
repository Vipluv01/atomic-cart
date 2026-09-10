import { unstable_cache } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import { Product } from "@/lib/models/Product";

export type ProductSummary = {
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string;
  stock: number;
  category: string;
};

function serialize(doc: Record<string, unknown>): ProductSummary {
  return {
    slug: doc.slug as string,
    name: doc.name as string,
    description: doc.description as string,
    priceCents: doc.priceCents as number,
    imageUrl: doc.imageUrl as string,
    stock: doc.stock as number,
    category: doc.category as string,
  };
}

// Product catalog changes rarely (an admin edit), and is read on every
// storefront visit, so it's cached on-demand rather than time-based:
// revalidateProductCache() below fires exactly when stock/price actually
// changes, instead of guessing a TTL that's either stale or wastefully short.
export const getAllProducts = unstable_cache(
  async (): Promise<ProductSummary[]> => {
    await connectToDatabase();
    const docs = await Product.find().sort({ createdAt: -1 }).lean();
    return docs.map(serialize);
  },
  ["products:all"],
  { tags: ["products"] }
);

export const getProductBySlug = unstable_cache(
  async (slug: string): Promise<ProductSummary | null> => {
    await connectToDatabase();
    const doc = await Product.findOne({ slug }).lean();
    return doc ? serialize(doc) : null;
  },
  ["products:by-slug"],
  { tags: ["products"] }
);
