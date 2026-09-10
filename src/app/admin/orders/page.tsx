import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getAllOrders } from "@/app/actions/orders";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/models/Order";
import { StatusPill } from "@/components/StatusPill";
import { MarkFulfilledButton } from "@/components/MarkFulfilledButton";

const TABS: { label: string; value: OrderStatus | "all" }[] = [
  { label: "All", value: "all" },
  ...ORDER_STATUSES.map((s) => ({ label: s[0].toUpperCase() + s.slice(1), value: s })),
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/admin/orders");
  }
  if (session.user.role !== "admin") {
    return (
      <div className="mx-auto w-full max-w-lg px-6 py-24 text-center">
        <p className="text-zinc-400">403 — admin access required.</p>
      </div>
    );
  }

  const { status } = await searchParams;
  const activeFilter = (ORDER_STATUSES as readonly string[]).includes(status ?? "")
    ? (status as OrderStatus)
    : undefined;

  const orders = await getAllOrders(activeFilter);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <h1 className="mb-6 text-2xl font-semibold text-white">Admin — Orders</h1>

      <div className="mb-6 flex gap-2 border-b border-zinc-800 pb-3">
        {TABS.map((tab) => {
          const isActive = tab.value === "all" ? !activeFilter : activeFilter === tab.value;
          const href = tab.value === "all" ? "/admin/orders" : `/admin/orders?status=${tab.value}`;
          return (
            <Link
              key={tab.value}
              href={href}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                isActive ? "bg-indigo-500/20 text-indigo-300" : "text-zinc-400 hover:text-white"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {orders.length === 0 ? (
        <p className="text-zinc-500">No orders match this filter.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
            >
              <div>
                <div className="flex items-center gap-3">
                  <StatusPill status={order.status} />
                  <span className="text-sm text-zinc-300">{order.customerEmail}</span>
                  <span className="text-xs text-zinc-500">{new Date(order.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {order.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium text-white">${(order.totalCents / 100).toFixed(2)}</span>
                {order.status === "paid" && <MarkFulfilledButton orderId={order.id} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
