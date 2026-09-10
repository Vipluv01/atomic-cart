"use server";

import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { Order, type OrderStatus } from "@/lib/models/Order";
import { revalidatePath } from "next/cache";

// Same reasoning as safeRevalidate() in checkout.ts: cache invalidation
// failing (e.g. outside a real request context) shouldn't crash a real
// state-changing action — the order is fulfilled either way, and an
// admin dashboard page being briefly stale is a far smaller problem.
function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch (err) {
    console.error(`revalidatePath(${path}) failed (non-fatal):`, err);
  }
}

export type OrderSummary = {
  id: string;
  items: { name: string; priceCents: number; quantity: number }[];
  totalCents: number;
  status: OrderStatus;
  customerEmail: string;
  receiptUrl?: string;
  createdAt: string;
};

function serialize(doc: Record<string, unknown>): OrderSummary {
  return {
    id: String(doc._id),
    items: (doc.items as OrderSummary["items"]) ?? [],
    totalCents: doc.totalCents as number,
    status: doc.status as OrderStatus,
    customerEmail: doc.customerEmail as string,
    receiptUrl: doc.receiptUrl as string | undefined,
    createdAt: doc.createdAt ? (doc.createdAt as Date).toISOString() : new Date(0).toISOString(),
  };
}

/** Orders belonging to the currently signed-in user, by session email. */
export async function getMyOrders(): Promise<OrderSummary[]> {
  const session = await auth();
  if (!session?.user?.email) return [];

  await connectToDatabase();
  const orders = await Order.find({ customerEmail: session.user.email }).sort({ createdAt: -1 }).lean();
  return orders.map(serialize);
}

async function requireAdminSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "admin") throw new Error("403 Forbidden: admin role required");
  return session;
}

/** All orders, optionally filtered by status. Admin only. */
export async function getAllOrders(statusFilter?: OrderStatus): Promise<OrderSummary[]> {
  await requireAdminSession();
  await connectToDatabase();

  const query = statusFilter ? { status: statusFilter } : {};
  const orders = await Order.find(query).sort({ createdAt: -1 }).lean();
  return orders.map(serialize);
}

/** Moves an order from paid -> fulfilled. Admin only. */
export async function markOrderFulfilled(orderId: string): Promise<{ error: string } | { success: true }> {
  await requireAdminSession();
  await connectToDatabase();

  const result = await Order.updateOne({ _id: orderId, status: "paid" }, { $set: { status: "fulfilled" } });
  if (result.matchedCount === 0) {
    return { error: "Order not found or not in a paid state." };
  }

  safeRevalidatePath("/admin/orders");
  return { success: true };
}
