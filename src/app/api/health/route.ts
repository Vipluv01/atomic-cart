import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { logger } from "@/lib/logger";

const PING_TIMEOUT_MS = 3000;

async function checkDatabase(): Promise<"connected" | "disconnected"> {
  try {
    const conn = await connectToDatabase();
    const db = conn.connection.db;
    if (!db) return "disconnected";

    // A hanging DB shouldn't hang the health check itself — an uptime
    // monitor timing out on /api/health is a worse signal than a fast,
    // honest "disconnected".
    await Promise.race([
      db.admin().ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("ping timeout")), PING_TIMEOUT_MS)),
    ]);
    return "connected";
  } catch {
    return "disconnected";
  }
}

// Stripe/S3 readiness are configuration checks, not live API calls — a
// health endpoint that's potentially polled every few seconds by an
// uptime monitor shouldn't be making a real Stripe API request or S3
// call on every hit. What actually matters operationally is "is this
// deployment missing a required secret", which a live call wouldn't
// tell you any faster than checking the env var is even present.
function checkStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith("sk_"));
}

function checkS3Configured(): boolean {
  return Boolean(
    process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
  );
}

export async function GET() {
  const start = performance.now();

  const [database, stripeConfigured, s3Configured] = [
    await checkDatabase(),
    checkStripeConfigured(),
    checkS3Configured(),
  ];

  // Three tiers, not a single healthy/unhealthy boolean: DB and Stripe are
  // required for the actual purchase path (browse, cart, checkout, pay) —
  // either one being down means the site genuinely can't do its job, so
  // that's "unhealthy" and a real 503. S3 only backs the admin
  // image-upload feature; missing it doesn't stop a single customer from
  // buying anything, so it's surfaced as "degraded" without flipping the
  // whole deployment to a failing status. An uptime monitor alerting on
  // every S3-misconfiguration the same way it alerts on "the database is
  // down" would train whoever's watching it to ignore real alerts.
  const criticalDown = database === "disconnected" || !stripeConfigured;
  const status = criticalDown ? "unhealthy" : s3Configured ? "healthy" : "degraded";
  const httpStatus = criticalDown ? 503 : 200;

  const body = {
    status,
    checks: {
      database,
      stripe: stripeConfigured ? "configured" : "not configured",
      s3: s3Configured ? "configured" : "not configured",
    },
    timestamp: new Date().toISOString(),
  };

  const durationMs = Math.round(performance.now() - start);
  logger[status === "healthy" ? "info" : "warn"]("health check", {
    path: "/api/health",
    method: "GET",
    durationMs,
    ...body.checks,
  });

  return NextResponse.json(body, { status: httpStatus });
}
