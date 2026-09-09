import Link from "next/link";
import { getAllProducts } from "@/lib/products";

export default async function ProductsPage() {
  const products = await getAllProducts();

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <h1 className="mb-8 text-2xl font-semibold">Products</h1>
      {products.length === 0 ? (
        <p className="text-zinc-500">No products yet — run the seed script.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {products.map((product) => (
            <Link
              key={product.slug}
              href={`/products/${product.slug}`}
              className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-400"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.imageUrl}
                alt={product.name}
                className="aspect-square w-full rounded object-cover"
              />
              <span className="font-medium">{product.name}</span>
              <span className="text-sm text-zinc-500">
                ${(product.priceCents / 100).toFixed(2)}
              </span>
              <span className="text-xs text-zinc-400">
                {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
