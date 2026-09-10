import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMyOrders } from "@/app/actions/orders";
import { StatusPill } from "@/components/StatusPill";

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/orders");
  }

  const orders = await getMyOrders();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="mb-8 text-2xl font-semibold text-white">Your orders</h1>
      {orders.length === 0 ? (
        <p className="text-zinc-500">No orders yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <div key={order.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusPill status={order.status} />
                  <span className="text-xs text-zinc-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <span className="font-medium text-white">${(order.totalCents / 100).toFixed(2)}</span>
              </div>
              <ul className="mt-3 flex flex-col gap-1 text-sm text-zinc-400">
                {order.items.map((item, i) => (
                  <li key={i}>
                    {item.quantity}× {item.name} — ${((item.priceCents * item.quantity) / 100).toFixed(2)}
                  </li>
                ))}
              </ul>
              {order.receiptUrl && (
                <a
                  href={order.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-xs font-medium text-indigo-400 hover:text-indigo-300 underline"
                >
                  View Stripe receipt
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
