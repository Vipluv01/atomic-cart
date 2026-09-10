/**
 * Stress-tests the atomic stock reservation under real concurrency and
 * reports latency percentiles. Run with:
 *
 *   npx tsx scripts/benchmark-concurrency.ts
 *
 * Design note: this exercises reserveStock() directly rather than the full
 * createCheckoutSession() Server Action. createCheckoutSession depends on
 * Next.js request-scoped APIs (headers(), redirect(), revalidateTag() via
 * safeRevalidate) that only resolve inside Next's own request context or
 * vitest's module mocks — neither of which exists in a plain standalone
 * script. reserveStock() is the actual atomic operation the concurrency
 * claim is about; Stripe API calls and IP rate-limiting are unrelated to
 * whether two racing requests can both claim the same unit of stock.
 */
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

const CONCURRENT_REQUESTS = 50;

function percentile(sortedMs: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sortedMs.length) - 1;
  return sortedMs[Math.max(0, Math.min(idx, sortedMs.length - 1))];
}

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();

  const { connectToDatabase } = await import("../src/lib/db");
  const { Product } = await import("../src/lib/models/Product");
  const { reserveStock, InsufficientStockError } = await import("../src/lib/inventory");

  await connectToDatabase();

  const product = await Product.create({
    slug: "benchmark-item",
    name: "Benchmark Item",
    description: "Used only by scripts/benchmark-concurrency.ts.",
    priceCents: 100,
    imageUrl: "https://example.com/x.png",
    stock: 1,
    category: "Accessories",
  });

  const item = { productId: product._id.toString(), slug: product.slug, quantity: 1 };

  console.log(`Firing ${CONCURRENT_REQUESTS} simultaneous reservation attempts for stock: 1 ...`);

  const latenciesMs: number[] = [];
  const attempts = Array.from({ length: CONCURRENT_REQUESTS }, async () => {
    const start = performance.now();
    try {
      await reserveStock([item]);
      latenciesMs.push(performance.now() - start);
      return { ok: true as const };
    } catch (err) {
      latenciesMs.push(performance.now() - start);
      if (err instanceof InsufficientStockError) return { ok: false as const };
      throw err;
    }
  });

  const results = await Promise.all(attempts);
  const succeeded = results.filter((r) => r.ok).length;
  const failed = results.length - succeeded;

  const finalProduct = await Product.findById(product._id);
  const finalStock = finalProduct!.stock;

  latenciesMs.sort((a, b) => a - b);
  const p50 = percentile(latenciesMs, 50);
  const p95 = percentile(latenciesMs, 95);
  const p99 = percentile(latenciesMs, 99);

  console.log("");
  console.log(`Succeeded: ${succeeded} (expected 1)`);
  console.log(`Failed:    ${failed} (expected ${CONCURRENT_REQUESTS - 1})`);
  console.log(`Final stock: ${finalStock} (expected 0)`);
  console.log("");
  console.log("Reservation latency (in-memory MongoDB, single process):");
  console.log(`  p50: ${p50.toFixed(2)}ms`);
  console.log(`  p95: ${p95.toFixed(2)}ms`);
  console.log(`  p99: ${p99.toFixed(2)}ms`);

  const passed = succeeded === 1 && failed === CONCURRENT_REQUESTS - 1 && finalStock === 0;
  console.log("");
  console.log(passed ? "PASS: no overselling under concurrency." : "FAIL: overselling detected.");

  await mongoose.disconnect();
  await mongod.stop();

  if (!passed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
