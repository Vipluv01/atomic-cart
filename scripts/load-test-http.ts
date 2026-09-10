/**
 * Real HTTP-level concurrency test, distinct from
 * scripts/benchmark-concurrency.ts (which calls reserveStock() directly,
 * in-process). This one fires genuine HTTP requests at a running server's
 * POST /api/checkout endpoint — the actual network + routing + Server
 * Action... no, Route Handler stack, not just the isolated function.
 *
 * POST /api/checkout exists specifically to make this possible: the web
 * UI's checkout flow is a Next.js Server Action, which uses React's Flight
 * wire protocol — not something a plain HTTP client can drive. Both the
 * Server Action and this REST endpoint call the same buildCheckoutSession()
 * (src/lib/checkoutCore.ts), so this test exercises the identical business
 * logic the UI uses, just reachable over plain HTTP.
 *
 * Each concurrent request is given a distinct X-Forwarded-For value. This
 * isn't a rate-limit bypass hack — it's what makes the test realistic: a
 * flash-sale stampede is many different customers hitting the same item at
 * once, not one client hammering the endpoint. Without distinct IPs, the
 * existing per-IP rate limiter (a real, load-bearing anti-abuse feature)
 * would reject most of the batch with 429 before ever reaching the stock
 * check, which would test the rate limiter instead of the concurrency
 * guarantee this script is actually here to verify.
 *
 * Usage:
 *   MONGODB_URI=... npx tsx scripts/load-test-http.ts [targetUrl] [concurrency]
 *
 * Requires a running server (npm run dev / npm start) at targetUrl
 * (default http://localhost:3000), and MONGODB_URI pointing at the SAME
 * database that server is using, so this script can seed the one-unit
 * product the requests will race for.
 */
import mongoose from "mongoose";

const TARGET_URL = process.argv[2] ?? "http://localhost:3000";
const CONCURRENCY = Number(process.argv[3] ?? 75);
const SLUG = "load-test-http-item";

function percentile(sortedMs: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sortedMs.length) - 1;
  return sortedMs[Math.max(0, Math.min(idx, sortedMs.length - 1))];
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set — must match the target server's database.");

  await mongoose.connect(uri);
  const { Product } = await import("../src/lib/models/Product");
  const { Order } = await import("../src/lib/models/Order");

  const product = await Product.findOneAndUpdate(
    { slug: SLUG },
    {
      $set: {
        name: "Load Test Item",
        description: "Created by scripts/load-test-http.ts — safe to delete.",
        priceCents: 100,
        imageUrl: "https://example.com/load-test.png",
        category: "Accessories",
        stock: 1,
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  console.log(`Target: ${TARGET_URL}/api/checkout`);
  console.log(`Firing ${CONCURRENCY} concurrent HTTP checkout requests for stock: 1 ...`);

  const latenciesMs: number[] = [];
  const statusCounts: Record<number, number> = {};

  const wallClockStart = performance.now();

  const requests = Array.from({ length: CONCURRENCY }, async (_, i) => {
    const start = performance.now();
    let status: number;
    try {
      const res = await fetch(`${TARGET_URL}/api/checkout`, {
        method: "POST",
        redirect: "manual", // don't follow the 303 to Stripe's hosted page
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": `10.0.0.${i + 1}`, // distinct simulated client per request — see file header
        },
        body: JSON.stringify({
          cart: [{ slug: SLUG, quantity: 1 }],
          customerEmail: `loadtest-${i}@example.com`,
        }),
      });
      status = res.status;
    } catch (err) {
      console.error(`Request ${i} threw a network-level error:`, err);
      status = -1;
    }
    latenciesMs.push(performance.now() - start);
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    return status;
  });

  await Promise.all(requests);
  const wallClockMs = performance.now() - wallClockStart;

  latenciesMs.sort((a, b) => a - b);
  const p50 = percentile(latenciesMs, 50);
  const p95 = percentile(latenciesMs, 95);
  const p99 = percentile(latenciesMs, 99);
  const rps = (CONCURRENCY / wallClockMs) * 1000;

  const succeeded = statusCounts[303] ?? 0;
  const insufficientStock = statusCounts[409] ?? 0;
  const serverErrors = statusCounts[500] ?? 0;

  console.log("");
  console.log("Status code distribution:", statusCounts);
  console.log("");
  console.log(`Succeeded (303):            ${succeeded} (expected 1)`);
  console.log(`Insufficient stock (409):   ${insufficientStock} (expected ${CONCURRENCY - 1})`);
  console.log(`Unhandled server errors (500): ${serverErrors} (expected 0)`);
  console.log("");
  console.log(`Throughput: ${rps.toFixed(1)} req/s over ${wallClockMs.toFixed(0)}ms wall clock`);
  console.log("HTTP response latency:");
  console.log(`  p50: ${p50.toFixed(1)}ms`);
  console.log(`  p95: ${p95.toFixed(1)}ms`);
  console.log(`  p99: ${p99.toFixed(1)}ms`);

  const finalProduct = await Product.findById(product._id);
  console.log("");
  console.log(`Final stock: ${finalProduct!.stock} (expected 0)`);

  const passed = succeeded === 1 && serverErrors === 0 && finalProduct!.stock === 0;
  console.log("");
  console.log(passed ? "PASS" : "FAIL");

  // Clean up: the product and whatever orders this run created.
  await Order.deleteMany({ customerEmail: { $regex: /^loadtest-\d+@example\.com$/ } });
  await Product.deleteOne({ _id: product._id });

  await mongoose.disconnect();
  if (!passed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
