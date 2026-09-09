import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/products";
import { AddToCartButton } from "@/components/AddToCartButton";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return (
    <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-8 px-6 py-12 sm:grid-cols-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={product.imageUrl} alt={product.name} className="w-full rounded-lg object-cover" />
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">{product.name}</h1>
        <p className="text-zinc-600">{product.description}</p>
        <p className="text-xl font-medium">${(product.priceCents / 100).toFixed(2)}</p>
        <p className="text-sm text-zinc-500">
          {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
        </p>
        <AddToCartButton slug={product.slug} disabled={product.stock === 0} />
      </div>
    </div>
  );
}
