export default function CheckoutSuccessPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold">Payment received</h1>
      <p className="text-zinc-600">
        Your order is confirmed once Stripe&apos;s webhook lands — this can take a few seconds.
      </p>
    </div>
  );
}
