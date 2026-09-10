import { NextRequest, NextResponse } from "next/server";
import { buildCheckoutSession, type CartLine } from "@/lib/checkoutCore";
import { logger, newRequestId } from "@/lib/logger";

/**
 * A plain REST entry point into the same checkout logic the web UI's
 * Server Action uses (both call buildCheckoutSession — see
 * src/lib/checkoutCore.ts). Exists for programmatic/API clients and for
 * scripts/load-test-http.ts: Server Actions use React's Flight wire
 * protocol, which isn't practical to drive from a plain HTTP load-testing
 * script, so a real REST endpoint is what makes an actual HTTP-level
 * concurrency test possible at all.
 */
export async function POST(request: NextRequest) {
  const requestId = newRequestId();
  const start = performance.now();

  let body: { cart?: CartLine[]; customerEmail?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { cart, customerEmail } = body;
  if (!Array.isArray(cart) || !customerEmail) {
    return NextResponse.json({ error: "Request must include cart[] and customerEmail." }, { status: 400 });
  }

  const clientIp = request.headers.get("x-forwarded-for") ?? "unknown";

  try {
    const outcome = await buildCheckoutSession(cart, customerEmail, clientIp);
    const durationMs = Math.round(performance.now() - start);

    if ("error" in outcome) {
      logger.info("checkout rejected", {
        requestId,
        path: "/api/checkout",
        method: "POST",
        durationMs,
        status: outcome.status,
        reason: outcome.error,
      });
      return NextResponse.json({ error: outcome.error, requestId }, { status: outcome.status });
    }

    logger.info("checkout succeeded", {
      requestId,
      path: "/api/checkout",
      method: "POST",
      durationMs,
    });

    // 303 See Other: the correct redirect status after a POST that
    // created a resource, telling any client (browser or script) to
    // follow up with a GET rather than replaying the POST.
    return NextResponse.redirect(outcome.sessionUrl, { status: 303 });
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    logger.error("checkout failed unexpectedly", err, {
      requestId,
      path: "/api/checkout",
      method: "POST",
      durationMs,
    });
    return NextResponse.json({ error: "Internal error.", requestId }, { status: 500 });
  }
}
