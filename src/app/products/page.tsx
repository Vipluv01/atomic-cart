import Link from "next/link";
import { getAllProducts } from "@/lib/products";
import { AddToCartButton } from "@/components/AddToCartButton";

export default async function ProductsPage() {
  const products = await getAllProducts();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 px-6 py-12">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-10">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Complete Storefront</span>
          <h1 className="mt-1 text-3xl md:text-4xl font-extrabold tracking-tight text-white">All Hardware & Gear</h1>
          <p className="mt-2 text-sm text-zinc-400">
            High-performance tools for your setup with atomic concurrency protection.
          </p>
        </div>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 text-center">
            <p className="text-zinc-400 text-sm">No products found — please run `npm run seed` in your terminal.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
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
      </div>
    </div>
  );
}

