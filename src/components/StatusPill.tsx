import type { OrderStatus } from "@/lib/models/Order";

const STYLES: Record<OrderStatus, string> = {
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  paid: "bg-green-500/10 text-green-400 border-green-500/30",
  fulfilled: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  failed: "bg-red-500/10 text-red-400 border-red-500/30",
  refunded: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
};

const EMOJI: Record<OrderStatus, string> = {
  pending: "🟡",
  paid: "🟢",
  fulfilled: "🔵",
  failed: "🔴",
  refunded: "⚪",
};

export function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${STYLES[status]}`}
    >
      <span>{EMOJI[status]}</span>
      {status}
    </span>
  );
}
