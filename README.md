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

## A bug the tests actually caught

The first version of `createCheckoutSession` called `revalidateProductCache()` and `Order.create()` *between* the stock-reservation try/catch and the Stripe-session try/catch, both outside any rollback boundary. Writing [`tests/checkout-rollback.test.ts`](tests/checkout-rollback.test.ts) — which forces a real Stripe API failure (an invalid key against the live Stripe API, not a mock) — caught it immediately: stock was reserved, then a failure in that gap left it decremented forever with no order ever created to release it. The fix wraps order creation and Stripe session creation in one rollback boundary, and makes cache revalidation swallow its own errors so a non-critical failure there can never abort the transaction. See the git history on `src/app/actions/checkout.ts` for the before/after.

## A behavior that only showed up under a live server, not tests

Every automated test imports the checkout/webhook code directly, which never exercises Next.js's actual runtime cache. To check that `revalidateTag` really refreshes a *running* server (not just that the function is called), I built, seeded, and started the app for real, then: bumped a product's stock directly in MongoDB (bypassing the app, to prove staleness), sent a genuinely signed `checkout.session.expired` webhook to the live server (releasing 2 more units), and curled the product page immediately after.

The first request after the webhook **still showed the old, cached number** — `revalidateTag` uses stale-while-revalidate semantics (confirmed in the Next.js 16 docs, easy to miss on a skim): the cached page is served as-is while a fresh copy renders in the background, and only the *next* request sees the update. A second curl a few seconds later showed the correct value.

This is cosmetic staleness only, not a correctness bug: the actual stock guard in `reserveStock` always reads live from MongoDB — a customer can never oversell against a stale cached number, because checkout doesn't trust the cached page, it re-queries the database. What can be briefly stale is what a *browsing* customer sees on the product page, for at most one request's worth of lag.

Also found the same way: NextAuth v5 refused every request with `UntrustedHost` until `AUTH_TRUST_HOST=true` was set — Vercel sets this automatically, but a self-hosted deployment (or, as here, a non-default port during local testing) needs it explicitly. Documented in `.env.example`.

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
