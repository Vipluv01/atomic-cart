import Link from "next/link";
import { expireOrderAndReleaseStock } from "@/lib/checkoutCore";

export default async function CheckoutCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;

  if (orderId) {
    // Idempotent (guarded by status: "pending" in the action itself), so
    // it's safe to run this on every render of this page rather than only
    // once — no separate "already handled" tracking needed here.
    await expireOrderAndReleaseStock(orderId);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold">Checkout canceled</h1>
      <p className="text-zinc-600">
        Your reserved stock has been released back into inventory.
      </p>
      <Link href="/cart" className="text-sm font-medium underline">
        Back to cart
      </Link>
    </div>
  );
}
