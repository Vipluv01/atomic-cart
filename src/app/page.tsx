import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto flex max-w-5xl flex-1 flex-col items-start justify-center gap-4 px-6 py-24">
      <h1 className="text-4xl font-bold tracking-tight">Atomic Cart</h1>
      <p className="max-w-xl text-zinc-600">
        A full-stack storefront demo focused on the parts most e-commerce clones skip:
        concurrency-safe inventory, idempotent payment webhooks, and an explicit order
        state machine.
      </p>
      <Link
        href="/products"
        className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Browse products
      </Link>
    </div>
  );
}
