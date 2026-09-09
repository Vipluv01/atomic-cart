import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold">Checkout canceled</h1>
      <p className="text-zinc-600">
        Your reserved stock is released automatically when the Stripe session expires.
      </p>
      <Link href="/cart" className="text-sm font-medium underline">
        Back to cart
      </Link>
    </div>
  );
}
