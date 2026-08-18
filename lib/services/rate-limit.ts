import { prisma } from "@/lib/prisma";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 12;

export async function checkRateLimit(key: string): Promise<{
  allowed: boolean;
  retryAfterSeconds?: number;
}> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS);

  const existing = await prisma.rateLimitBucket.findUnique({ where: { key } });

  if (!existing || existing.windowStart < windowStart) {
    await prisma.rateLimitBucket.upsert({
      where: { key },
      create: {
        key,
        count: 1,
        windowStart: now,
        expiresAt: new Date(now.getTime() + WINDOW_MS * 2),
      },
      update: {
        count: 1,
        windowStart: now,
        expiresAt: new Date(now.getTime() + WINDOW_MS * 2),
      },
    });
    return { allowed: true };
  }

  if (existing.count >= MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil(
      (existing.windowStart.getTime() + WINDOW_MS - now.getTime()) / 1000,
    );
    return { allowed: false, retryAfterSeconds: Math.max(retryAfterSeconds, 1) };
  }

  await prisma.rateLimitBucket.update({
    where: { key },
    data: { count: { increment: 1 } },
  });

  return { allowed: true };
}

export async function purgeExpiredRateLimits() {
  await prisma.rateLimitBucket.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}
