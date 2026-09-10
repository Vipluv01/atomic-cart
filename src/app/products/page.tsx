import { getAllProducts } from "@/lib/products";
import { ProductsGrid } from "@/components/ProductsGrid";

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
          <ProductsGrid products={products} />
        )}
      </div>
    </div>
  );
}
