# Atomic Cart

A full-stack e-commerce demo (Next.js 16 App Router, TypeScript, MongoDB, Stripe, S3) built around the parts most e-commerce clones skip: **inventory correctness under concurrency, idempotent payment webhooks, and an explicit order state machine** — not just "connect Stripe and call it done."

## Why this exists

The original version of this project was a standard tutorial-shaped build: Next.js + MongoDB + Stripe + S3, wired together but with no engineering decision beyond "integrate service A with service B." This version keeps that stack but adds the five things that actually get probed in an interview:

1. **Concurrency-safe inventory** ([`src/lib/inventory.ts`](src/lib/inventory.ts)) — stock is decremented with a single atomic `findOneAndUpdate({ stock: { $gte: qty } }, { $inc: { stock: -qty } })`, so two simultaneous checkouts racing for the last unit can't both succeed. Verified by [`tests/inventory-concurrency.test.ts`](tests/inventory-concurrency.test.ts) (in-memory MongoDB) and re-verified by hand against a real MongoDB Atlas cluster over the network — same result: exactly one request wins, final stock is 0, never negative, never both succeeding.

   A standalone (non-replica-set) MongoDB has no multi-document ACID transactions, so a multi-item order can't decrement every line atomically as one unit. Instead, `reserveStock` reserves items one at a time and compensates (releases) already-reserved items if a later one fails — a manual saga instead of a DB transaction. Covered by the second case in the same test file.

2. **Idempotent Stripe webhooks** ([`src/app/api/webhooks/stripe/route.ts`](src/app/api/webhooks/stripe/route.ts)) — Stripe delivers webhooks *at-least-once*, so the same event can arrive twice. A unique index on `WebhookEvent.eventId` makes the dedup atomic: the first insert wins, a redelivered event hits a duplicate-key error and is treated as an expected no-op. Verified by [`tests/webhook-idempotency.test.ts`](tests/webhook-idempotency.test.ts) by delivering the identical event twice and asserting the order is only ever moved to `paid` once.

3. **Explicit order state machine** (`pending → paid | failed`, [`src/lib/models/Order.ts`](src/lib/models/Order.ts)) — driven by webhook events, not a boolean `paid` flag, so the race between the checkout redirect landing and the webhook arriving can't corrupt order state.

4. **On-demand cache invalidation** ([`src/lib/products.ts`](src/lib/products.ts), [`src/lib/revalidateProducts.ts`](src/lib/revalidateProducts.ts)) — product pages are cached with `unstable_cache` and invalidated via `revalidateTag` exactly when stock/price actually change (checkout, admin product creation), instead of guessing a time-based TTL that's either stale or wastefully short. Cache revalidation is deliberately best-effort (wrapped and swallowed on failure in [`checkout.ts`](src/app/actions/checkout.ts)'s `safeRevalidate`) — a stale product listing for a few minutes is a far smaller problem than aborting a paid transaction over a cache-layer hiccup.

5. **Rate-limited checkout + real auth** — `createCheckoutSession` rate-limits by IP ([`src/lib/rateLimit.ts`](src/lib/rateLimit.ts)); accounts use NextAuth (Credentials provider, bcrypt-hashed passwords, JWT sessions).

## HTTP-level load testing, not just the function

[`tests/inventory-concurrency.test.ts`](tests/inventory-concurrency.test.ts) and [`scripts/benchmark-concurrency.ts`](scripts/benchmark-concurrency.ts) both call `reserveStock()` directly, in-process — real proof the atomic guard works, but not proof the actual HTTP request pipeline holds up under concurrent load. The web UI's checkout is a Next.js Server Action, which uses React's Flight wire protocol — not something a plain HTTP client can drive, so a genuine HTTP-level concurrency test needed a genuine HTTP endpoint.

That's what `POST /api/checkout` ([`src/app/api/checkout/route.ts`](src/app/api/checkout/route.ts)) is: a real REST endpoint sharing the exact same business logic as the Server Action (both call `buildCheckoutSession()` in [`src/lib/checkoutCore.ts`](src/lib/checkoutCore.ts), extracted specifically so the two transports — form-based Server Action, plain REST — never duplicate the reservation/rollback logic between them.

[`scripts/load-test-http.ts`](scripts/load-test-http.ts) fires 75 real concurrent HTTP requests at a running server, racing for one unit of stock:

```
Status code distribution: { '303': 1, '409': 74 }
Succeeded (303):            1 (expected 1)
Insufficient stock (409):   74 (expected 74)
Unhandled server errors (500): 0 (expected 0)
Throughput: 43.0 req/s over 1745ms wall clock
p50: 807.8ms  p95: 1394.8ms  p99: 1723.1ms
Final stock: 0 (expected 0)
```

Each request carries a distinct `X-Forwarded-For` — not a rate-limit bypass, but the realistic scenario: a flash-sale stampede is many different customers hitting the same item at once, not one client hammering the endpoint. Without distinct IPs, the existing per-IP rate limiter (a real anti-abuse feature) would reject most of the batch with 429 before ever reaching the stock check, testing the rate limiter instead of the concurrency guarantee.

The latency numbers above (p50 ~800ms) are real and reported as-is, not smoothed over — they reflect a single `next start` instance with no reverse proxy or clustering in front of it, plus the one winning request making a genuine Stripe API call. What matters for the correctness claim held regardless: exactly one winner, zero 500s, stock never negative.

The same script was also run against the actual live production deployment (`atomic-cart-ashen.vercel.app`), not just localhost:

```
Status code distribution: { '303': 1, '409': 49 }
Succeeded (303):            1 (expected 1)
Insufficient stock (409):   49 (expected 49)
Unhandled server errors (500): 0 (expected 0)
Throughput: 6.0 req/s over 8400ms wall clock
p50: 7833.1ms  p95: 8071.1ms  p99: 8391.6ms
Final stock: 0 (expected 0)
```

Same perfect correctness result — but the latency is dramatically higher (p50 ~7.8s vs ~800ms locally), and that's reported honestly rather than only showing the flattering local number. That gap is Vercel's serverless cold-start/concurrency behavior on the Hobby tier under 50 simultaneous invocations of the same function, not a flaw in the guarantee itself, which held exactly as well under real production conditions as it did locally.

## Production observability

- **Structured JSON logging** ([`src/lib/logger.ts`](src/lib/logger.ts)) — every log line is one JSON object (`timestamp`, `level`, `requestId`, `path`, `durationMs`, `errorStack`), wired into the checkout API, the Stripe webhook handler, and the health check. No logging library — Vercel and most container platforms already capture stdout/stderr, so the only thing worth adding is a consistent shape to filter on.
- **Health check** ([`src/app/api/health/route.ts`](src/app/api/health/route.ts)) — a real MongoDB ping (with a 3s timeout so a hanging DB can't hang the health check itself), plus Stripe/S3 *configuration* checks. Deliberately not live API calls to Stripe/S3: a health endpoint that might be polled every few seconds by an uptime monitor shouldn't be making a real external API request on every hit. Three tiers, not a single boolean: `unhealthy` (503) only when DB or Stripe is actually down — the real purchase path (browse, cart, checkout, pay) is broken; `degraded` (200) when only S3 is unconfigured, since that affects nothing but the admin image-upload feature and a single customer can still buy something; `healthy` (200) otherwise. This was deliberately reworked from an earlier all-or-nothing version while wiring up [automated uptime monitoring](#automated-uptime-monitoring) — a naive boolean would have paged on every S3 misconfiguration the same way it pages on a real database outage, training whoever's watching to ignore real alerts. Verified by actually breaking each dependency and confirming both the status code and the per-check breakdown flip correctly.
- **Error boundaries** ([`src/app/error.tsx`](src/app/error.tsx), [`src/app/global-error.tsx`](src/app/global-error.tsx)) — this Next.js version (16.3+) stabilized a `retry()` prop replacing the older `reset()` pattern; verified against the actual installed version's docs rather than assumed from training data. `global-error.tsx` replaces the root layout entirely when it fires, which means it does **not** get `globals.css` — Tailwind classes silently don't render there, so it uses inline styles instead of the rest of the app's component library. Verified by deliberately throwing in a force-dynamic test route and confirming the response carries a real error digest and a genuine HTTP 500 (not a silent 200) — the actual rendered fallback UI itself needs a real browser to see, which wasn't available to check directly.

## A bug the tests actually caught

The first version of `createCheckoutSession` called `revalidateProductCache()` and `Order.create()` *between* the stock-reservation try/catch and the Stripe-session try/catch, both outside any rollback boundary. Writing [`tests/checkout-rollback.test.ts`](tests/checkout-rollback.test.ts) — which forces a real Stripe API failure (an invalid key against the live Stripe API, not a mock) — caught it immediately: stock was reserved, then a failure in that gap left it decremented forever with no order ever created to release it. The fix wraps order creation and Stripe session creation in one rollback boundary, and makes cache revalidation swallow its own errors so a non-critical failure there can never abort the transaction. See the git history on `src/app/actions/checkout.ts` for the before/after.

## A behavior that only showed up under a live server, not tests

Every automated test imports the checkout/webhook code directly, which never exercises Next.js's actual runtime cache. To check that `revalidateTag` really refreshes a *running* server (not just that the function is called), I built, seeded, and started the app for real, then: bumped a product's stock directly in MongoDB (bypassing the app, to prove staleness), sent a genuinely signed `checkout.session.expired` webhook to the live server (releasing 2 more units), and curled the product page immediately after.

The first request after the webhook **still showed the old, cached number** — `revalidateTag` uses stale-while-revalidate semantics (confirmed in the Next.js 16 docs, easy to miss on a skim): the cached page is served as-is while a fresh copy renders in the background, and only the *next* request sees the update. A second curl a few seconds later showed the correct value.

This is cosmetic staleness only, not a correctness bug: the actual stock guard in `reserveStock` always reads live from MongoDB — a customer can never oversell against a stale cached number, because checkout doesn't trust the cached page, it re-queries the database. What can be briefly stale is what a *browsing* customer sees on the product page, for at most one request's worth of lag.

Also found the same way: NextAuth v5 refused every request with `UntrustedHost` until `AUTH_TRUST_HOST=true` was set — Vercel sets this automatically, but a self-hosted deployment (or, as here, a non-default port during local testing) needs it explicitly. Documented in `.env.example`.

**A stricter version of the same staleness, specific to Vercel:** after deleting stale products directly in Atlas (bypassing the app, so no `revalidateTag` ever fired) and separately firing a real webhook that *did* call `revalidateProductCache()`, `/products` still showed the old count on every request for several minutes. The response headers explained why: `x-nextjs-stale-time: 300` — Vercel's edge holds a prerendered page for a fixed window independent of when the underlying data tag was invalidated. Tag invalidation and edge-cache expiry are two different clocks; a mutation through the app doesn't necessarily make the *next* request fresh on Vercel the way it did against a locally-run server. Confirmed correct after waiting out the window. Worth knowing before assuming a revalidated tag means an immediately-fresh page in production.

## S3 upload, verified against a real S3-compatible server

Without real AWS credentials, `createPresignedUploadUrl` (`src/lib/s3.ts`) was still fully exercised — not just reviewed by eye — against a MinIO container (`docker run minio/minio`, pointed at via the `S3_ENDPOINT` override the module supports). The *actual* shipped function was imported directly and run: it generated a real presigned PUT URL, a real file was uploaded to it, and the bytes were read back and verified. Same code path production AWS S3 would run, different backend behind the S3-compatible API.

## The real Stripe happy path, finally

Every other checkout test in this repo deliberately exercises a *failure* path (invalid key, dedup). With a real Stripe test secret key, `createCheckoutSession` was run once against the actual Stripe API and the real Atlas cluster: it looked up the real product, reserved real stock, created a real `Order`, and got back a genuine `https://checkout.stripe.com/...` session URL — not a mock, not an assumption. Stock decremented by exactly the reserved quantity, matching the concurrency guarantee's own accounting. The test session was expired via the Stripe API afterward and the database reset to its seeded state, so no leftover test data (Atlas or Stripe dashboard) survives this run.

## Known limitations (documented, not accidental)

- **Rate limiting is in-memory, single-instance.** It stops one client hammering checkout but doesn't hold across multiple server instances behind a load balancer. A real horizontally-scaled deployment would move this to Redis.
- **No multi-document transactions.** `reserveStock`'s compensating-rollback approach (see #1 above) is a deliberate choice for a standalone MongoDB, not an oversight. A replica-set deployment could use a real session/transaction instead.
- **Manual admin auth.** Any logged-in user can currently create products via `/admin/products/new` — there's no role system. Fine for this project's scope; a real deployment needs an `isAdmin` flag checked in `requireSession()`.

## Running locally

```bash
docker compose up -d          # local MongoDB on :27017
cp .env.example .env.local    # fill in Stripe/AWS keys
npm install
npm run seed                  # seeds 4 sample products
npm run dev
```

Stripe webhooks locally: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`, and put the printed `whsec_...` in `.env.local`.

`docker compose up -d` has been run end-to-end for real (pulled `mongo:7`, started the container, connected the app to it, seeded and served real data) — not just written and assumed to work.

## Testing

```bash
npm test
```

Runs against an in-memory MongoDB (`mongodb-memory-server`) — no external services required. The checkout-rollback test does make a real network call to Stripe's API with a deliberately invalid key, to exercise an actual API failure rather than a mocked one.
