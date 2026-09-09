import Link from "next/link";
import { getAllProducts } from "@/lib/products";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ShieldCheck, Zap, Lock, Layers, ArrowRight, Sparkles, CheckCircle2, Webhook } from "lucide-react";

export default async function Home() {
  const products = await getAllProducts();
  const featuredProducts = products.slice(0, 4);

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100 selection:bg-indigo-500 selection:text-white">
      {/* Glow Ambient Backdrop */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/20 to-pink-500/10 blur-[120px] opacity-70 rounded-full" />
      </div>

      {/* Hero Section */}
      <section className="relative px-6 pt-20 pb-16 md:pt-28 md:pb-24 border-b border-zinc-800/80">
        <div className="mx-auto max-w-6xl text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium backdrop-blur-md mb-8 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>2026 Creator Gear • Atomic Inventory Safe</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.1] text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-100 to-zinc-400">
            Hardware Designed for Peak Performance.
          </h1>

          <p className="mt-6 text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Curated mechanical keyboards, ergonomic mice, Thunderbolt docks, and pro audio gear — built for developers, creators, and power users.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium text-sm hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Explore Catalog</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-300 font-medium text-sm hover:bg-zinc-800 hover:text-white transition-all backdrop-blur-md"
            >
              Learn Architecture
            </a>
          </div>

          {/* Quick Perks Bar */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8 border-t border-zinc-800/60 text-xs font-medium text-zinc-400">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Concurrency Safe</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Webhook className="w-4 h-4 text-indigo-400" />
              <span>Idempotent Webhooks</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Lock className="w-4 h-4 text-purple-400" />
              <span>Stripe Checkout</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Auth-Protected Admin</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Grid */}
      <section className="px-6 py-20 bg-zinc-950">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Handpicked Hardware</span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mt-1">Featured Products</h2>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <span>View all {products.length} items</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <div
                key={product.slug}
                className="group relative flex flex-col rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 backdrop-blur-sm transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900/80 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-800/60 mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center rounded-full bg-zinc-950/80 px-2.5 py-1 text-[10px] font-semibold text-zinc-300 backdrop-blur-md border border-zinc-700/50">
                      {product.stock > 0 ? `${product.stock} left` : "Out of stock"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <Link href={`/products/${product.slug}`} className="focus:outline-none">
                      <h3 className="font-semibold text-zinc-100 text-base line-clamp-1 group-hover:text-indigo-400 transition-colors">
                        {product.name}
                      </h3>
                    </Link>

                    <p className="mt-1 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between pt-3 border-t border-zinc-800/60">
                    <span className="text-lg font-bold text-white">
                      ${(product.priceCents / 100).toFixed(2)}
                    </span>
                    <AddToCartButton slug={product.slug} disabled={product.stock === 0} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architectural Features Grid */}
      <section id="features" className="px-6 py-20 border-t border-zinc-800/80 bg-zinc-900/30">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">Technical Excellence</span>
            <h2 className="text-3xl font-bold tracking-tight text-white mt-1">Built for Scale & Reliability</h2>
            <p className="mt-3 text-zinc-400 text-sm">
              Atomic Cart isolates e-commerce bottlenecks using database-level guards and idempotent transaction processing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white text-base">Atomic Stock Reservation</h3>
              <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                Atomic MongoDB `$inc` filter queries prevent race conditions when multiple buyers checkout the last item simultaneously.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white text-base">Idempotent Webhooks</h3>
              <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                A unique-indexed event log deduplicates Stripe&apos;s at-least-once webhook delivery, so a retried event never double-processes an order.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 mb-4">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white text-base">Direct S3 Presigned Uploads</h3>
              <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                Product images stream directly to AWS S3 buckets via presigned authorization, avoiding Next.js server bottlenecks.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white text-base">NextAuth JWT Sessions</h3>
              <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                Stateless credentials authentication powered by NextAuth v5 with bcrypt password hashing and signed JWT sessions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Promotional Banner */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl rounded-3xl bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-zinc-900 border border-indigo-500/30 p-8 md:p-12 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">Full Catalog</span>
            <h2 className="text-2xl md:text-4xl font-bold text-white mt-2">Upgrade Your Desk Setup Today</h2>
            <p className="mt-3 text-zinc-300 text-sm leading-relaxed">
              Browse the full range of keyboards, mice, monitors, and audio gear — every purchase runs through the same concurrency-safe checkout.
            </p>
            <div className="mt-6">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-zinc-950 font-semibold text-sm hover:bg-zinc-100 transition-colors shadow-lg shadow-white/10"
              >
                <span>Shop Deals Now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-800/80 bg-zinc-950 px-6 py-12 text-zinc-400 text-xs">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              A
            </div>
            <span className="font-semibold text-white text-sm">Atomic Cart</span>
            <span className="text-zinc-600 ml-2">© 2026 Atomic Cart Inc.</span>
          </div>

          <div className="flex items-center gap-6 text-zinc-400">
            <Link href="/products" className="hover:text-white transition-colors">Products</Link>
            <Link href="/cart" className="hover:text-white transition-colors">Cart</Link>
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

