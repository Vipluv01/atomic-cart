import { Product } from "@/lib/models/Product";

export class InsufficientStockError extends Error {
  constructor(public readonly slug: string) {
    super(`Insufficient stock for product ${slug}`);
    this.name = "InsufficientStockError";
  }
}

export type ReserveItem = { productId: string; slug: string; quantity: number };

/**
 * Atomically decrements stock for each item, so two concurrent checkouts
 * racing for the last unit can't both succeed. Each decrement is a single
 * findOneAndUpdate with a `stock >= quantity` guard in the filter, which
 * MongoDB applies atomically per-document — the check and the write happen
 * as one operation, not a separate read-then-write with a gap to race in.
 *
 * A standalone (non-replica-set) MongoDB has no multi-document ACID
 * transaction support, so a multi-item order can't decrement all items in
 * one atomic unit. Instead, items are reserved one at a time and, if any
 * item fails, the ones already reserved are compensated (put back) before
 * throwing — a manual saga instead of a DB transaction.
 */
export async function reserveStock(items: ReserveItem[]): Promise<void> {
  const reserved: ReserveItem[] = [];

  for (const item of items) {
    const updated = await Product.findOneAndUpdate(
      { _id: item.productId, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } },
      { returnDocument: "after" }
    );

    if (!updated) {
      await releaseStock(reserved);
      throw new InsufficientStockError(item.slug);
    }

    reserved.push(item);
  }
}

/** Compensating action for reserveStock — puts decremented stock back. */
export async function releaseStock(items: ReserveItem[]): Promise<void> {
  for (const item of items) {
    await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.quantity } });
  }
}
