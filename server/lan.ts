import type { Request } from "express";

/** Strip IPv4-mapped IPv6 prefix (::ffff:192.168.1.1 → 192.168.1.1). */
export function normalizeClientIp(ip: string): string {
  const trimmed = ip.trim();
  if (trimmed.startsWith("::ffff:")) return trimmed.slice(7);
  if (trimmed === "::1") return "127.0.0.1";
  return trimmed;
}

export function isPrivateLanIp(ip: string): boolean {
  const normalized = normalizeClientIp(ip);

  // Loopback is used by Cloudflare tunnel / local reverse proxy — treat as external.
  if (normalized === "127.0.0.1") return false;

  if (normalized.startsWith("10.")) return true;
  if (normalized.startsWith("192.168.")) return true;
  if (normalized.startsWith("169.254.")) return true;

  const match = /^172\.(\d+)\./.exec(normalized);
  if (match) {
    const second = Number(match[1]);
    if (second >= 16 && second <= 31) return true;
  }

  return false;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return normalizeClientIp(first);
  }

  if (Array.isArray(forwarded) && forwarded[0]) {
    return normalizeClientIp(forwarded[0]);
  }

  const socketIp = req.socket.remoteAddress ?? req.ip ?? "";
  return normalizeClientIp(socketIp);
}

export function isLanRequest(req: Request): boolean {
  return isPrivateLanIp(getClientIp(req));
}
