"use client";

import { useEffect } from "react";

// global-error replaces the root layout entirely when it fires, so it
// does NOT get globals.css (no Tailwind classes render here) — inline
// styles are the only reliable option, per the Next.js docs for this file.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "error",
        message: "Unhandled root layout error",
        errorStack: error.stack,
        digest: error.digest,
      })
    );
  }, [error]);

  return (
    <html>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          fontFamily: "system-ui, sans-serif",
          backgroundColor: "#09090b",
          color: "#fafafa",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Something went wrong</h1>
        <p style={{ fontSize: "0.875rem", color: "#a1a1aa", maxWidth: "28rem" }}>
          An unexpected error occurred while loading the application. This has been logged.
          {error.digest && (
            <span style={{ display: "block", marginTop: "0.25rem", fontSize: "0.75rem", color: "#52525b" }}>
              Reference: {error.digest}
            </span>
          )}
        </p>
        <button
          onClick={() => retry()}
          style={{
            borderRadius: "9999px",
            backgroundColor: "#fafafa",
            color: "#09090b",
            padding: "0.5rem 1.5rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            border: "none",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
