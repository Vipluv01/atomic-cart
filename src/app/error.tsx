"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Structured client-side error logging: fields match src/lib/logger.ts's
    // shape so these entries can be filtered/queried the same way as
    // server-side logs, even though they run in the browser.
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "error",
        message: "Unhandled render error",
        errorStack: error.stack,
        digest: error.digest,
      })
    );
  }, [error]);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold text-white">Something went wrong</h1>
      <p className="text-sm text-zinc-400">
        An unexpected error occurred. This has been logged.
        {error.digest && <span className="block mt-1 text-xs text-zinc-600">Reference: {error.digest}</span>}
      </p>
      <Button onClick={() => retry()}>Try again</Button>
    </div>
  );
}
