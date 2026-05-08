import { createHash } from "crypto";
import { NextRequest } from "next/server";

export function normalizeCode(code: string) {
  return code.trim().toLowerCase();
}

export function isValidCode(code: string) {
  return /^[a-z0-9_-]{4,64}$/.test(code);
}

export function isSafeDestinationUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || isLocalhostHttp(url);
  } catch {
    return false;
  }
}

function isLocalhostHttp(url: URL) {
  return (
    process.env.NODE_ENV !== "production" &&
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
  );
}

export function hashIp(ip: string | null) {
  if (!ip) return null;

  const salt = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export function getClientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")
  );
}

export function getRequestOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) return null;

  try {
    const originUrl = new URL(origin);
    return originUrl.host === host ? origin : null;
  } catch {
    return null;
  }
}
