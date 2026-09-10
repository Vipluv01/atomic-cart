/**
 * Structured JSON logging to stdout/stderr. Deliberately not a logging
 * library (pino, winston) — Vercel and most container platforms already
 * capture stdout/stderr as logs, so the only thing worth adding is a
 * consistent JSON shape they can be filtered/queried on.
 */
type LogLevel = "info" | "warn" | "error";

export type LogFields = {
  requestId?: string;
  path?: string;
  method?: string;
  durationMs?: number;
  errorStack?: string;
  [key: string]: unknown;
};

function write(level: LogLevel, message: string, fields: LogFields = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, fields?: LogFields) => write("info", message, fields),
  warn: (message: string, fields?: LogFields) => write("warn", message, fields),
  error: (message: string, err?: unknown, fields?: LogFields) => {
    const errorStack = err instanceof Error ? err.stack : err ? String(err) : undefined;
    write("error", message, { ...fields, errorStack });
  },
};

/** requestId propagated through a single request's log lines. */
export function newRequestId(): string {
  return crypto.randomUUID();
}
