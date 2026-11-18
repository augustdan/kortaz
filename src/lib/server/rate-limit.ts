interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function checkRateLimit(params: {
  key: string;
  maxRequests?: number;
  windowMs?: number;
}): { allowed: boolean; remaining: number; resetAt: number } {
  const maxRequests = params.maxRequests ?? 120;
  const windowMs = params.windowMs ?? 60_000;
  const now = Date.now();

  const existing = buckets.get(params.key);
  if (!existing || existing.resetAt <= now) {
    const fresh: Bucket = { count: 1, resetAt: now + windowMs };
    buckets.set(params.key, fresh);
    return { allowed: true, remaining: maxRequests - 1, resetAt: fresh.resetAt };
  }

  if (existing.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: maxRequests - existing.count, resetAt: existing.resetAt };
}
