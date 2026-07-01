import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { isLanRequest } from "./lan.js";

const SESSION_COOKIE = "georgette_session";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function isAuthEnabled(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD?.trim());
}

function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD?.trim() ?? "";
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret) return secret;
  const password = getAdminPassword();
  if (password) return crypto.createHash("sha256").update(`georgette:${password}`).digest("hex");
  return "georgette-dev-insecure";
}

function sessionToken(): string {
  return crypto.createHmac("sha256", getSessionSecret()).update("georgette-authenticated").digest("hex");
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const cookies: Record<string, string> = {};
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

export function hasValidSession(req: Request): boolean {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return false;
  const expected = sessionToken();
  if (token.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export function verifyAdminPassword(password: string): boolean {
  const expected = getAdminPassword();
  if (!expected) return false;
  const provided = password ?? "";
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export function setSessionCookie(res: Response): void {
  const secure = process.env.NODE_ENV === "production";
  const maxAge = Math.floor(SESSION_MAX_AGE_MS / 1000);
  const token = sessionToken();
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

export function clearSessionCookie(res: Response): void {
  const secure = process.env.NODE_ENV === "production";
  const parts = [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (secure) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

export function getAuthStatus(req: Request): {
  enabled: boolean;
  required: boolean;
  authenticated: boolean;
  lan: boolean;
} {
  const enabled = isAuthEnabled();
  const lan = isLanRequest(req);
  const authenticated = !enabled || lan || hasValidSession(req);
  return {
    enabled,
    required: enabled && !lan,
    authenticated,
    lan,
  };
}

function isPublicApiPath(path: string): boolean {
  return path === "/api/health" || path.startsWith("/api/auth");
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!isAuthEnabled()) {
    next();
    return;
  }

  if (isPublicApiPath(req.path)) {
    next();
    return;
  }

  const status = getAuthStatus(req);
  if (status.authenticated) {
    next();
    return;
  }

  if (req.path.startsWith("/api/")) {
    res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
    return;
  }

  next();
}
