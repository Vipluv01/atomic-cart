"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AddToCartButton } from "@/components/AddToCartButton";
import { PRODUCT_CATEGORIES } from "@/lib/productCategories";
import type { ProductSummary } from "@/lib/products";

const TABS = ["All", ...PRODUCT_CATEGORIES] as const;
type SortOrder = "none" | "price-asc" | "price-desc";

// Client-side filtering, not a server round-trip per keystroke: the whole
// catalog is a handful of products, already fetched once by the server
// component that renders this. A dedicated search endpoint would be the
// right call at catalog sizes this approach doesn't scale to.
export function ProductsGrid({ products }: { products: ProductSummary[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof TABS)[number]>("All");
  const [sort, setSort] = useState<SortOrder>("none");

  const visible = useMemo(() => {
    let result = products;

    if (category !== "All") {
      result = result.filter((p) => p.category === category);
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }

    if (sort === "price-asc") {
      result = [...result].sort((a, b) => a.priceCents - b.priceCents);
    } else if (sort === "price-desc") {
      result = [...result].sort((a, b) => b.priceCents - a.priceCents);
    }

    return result;
  }, [products, category, query, sort]);

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          placeholder="Search products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-indigo-500"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOrder)}
          className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-300 outline-none focus:border-indigo-500"
        >
          <option value="none">Sort: Featured</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
        </select>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setCategory(tab)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              category === tab
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                : "text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 text-center">
          <p className="text-zinc-400 text-sm">No products match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((product) => (
            <div
              key={product.slug}
              className="group relative flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 backdrop-blur-sm transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900/90 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-800 mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center rounded-full bg-zinc-950/80 px-2.5 py-1 text-[10px] font-semibold text-zinc-300 backdrop-blur-md border border-zinc-700/50">
                    {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <Link href={`/products/${product.slug}`}>
                    <h3 className="font-semibold text-zinc-100 text-base line-clamp-1 group-hover:text-indigo-400 transition-colors">
                      {product.name}
                    </h3>
                  </Link>

                  <p className="mt-1.5 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                    {product.description}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between pt-4 border-t border-zinc-800/80">
                  <span className="text-xl font-bold text-white">
                    ${(product.priceCents / 100).toFixed(2)}
                  </span>
                  <AddToCartButton slug={product.slug} disabled={product.stock === 0} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
