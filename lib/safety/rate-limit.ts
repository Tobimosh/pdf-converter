import { appConfig } from "@/lib/config";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string) {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    const resetAt = now + appConfig.rateLimitWindowMs;
    buckets.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: appConfig.rateLimitMaxRequests - 1,
      resetAt,
    };
  }

  existing.count += 1;
  const remaining = appConfig.rateLimitMaxRequests - existing.count;
  return {
    allowed: existing.count <= appConfig.rateLimitMaxRequests,
    remaining: Math.max(remaining, 0),
    resetAt: existing.resetAt,
  };
}
