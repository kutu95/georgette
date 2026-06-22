import type { Express, Request, Response, NextFunction } from "express";

export function installProcessHandlers(): void {
  process.on("unhandledRejection", (reason) => {
    console.error("[api] Unhandled promise rejection (server continues):", reason);
  });

  process.on("uncaughtException", (err) => {
    console.error("[api] Uncaught exception (server continues):", err);
  });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (res.headersSent) return;

  const message = err instanceof Error ? err.message : "Internal server error";
  console.error("[api] Request error:", message);
  res.status(500).json({ error: message });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: "Not found" });
}

export function attachErrorHandlers(app: Express): void {
  app.use(notFoundHandler);
  app.use(errorHandler);
}
