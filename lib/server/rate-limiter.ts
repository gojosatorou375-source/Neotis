import { NextRequest } from "next/server";

const LIMITS = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,     // max 10 LLM requests per window per IP/user
};

// Simple in-memory storage for rate limits
const requestMap = new Map<string, number[]>();

/**
 * Checks if a given key (IP or user ID) is rate-limited.
 * Returns true if rate limited, false otherwise.
 */
export function checkRateLimit(
  key: string,
  maxRequests = LIMITS.maxRequests,
  windowMs = LIMITS.windowMs
): boolean {
  const now = Date.now();
  const timestamps = requestMap.get(key) || [];

  // Filter out timestamps outside the active window
  const activeTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (activeTimestamps.length >= maxRequests) {
    return true;
  }

  activeTimestamps.push(now);
  requestMap.set(key, activeTimestamps);
  return false;
}

/**
 * Retrieves the client's IP address from request headers.
 */
export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return "127.0.0.1";
}
