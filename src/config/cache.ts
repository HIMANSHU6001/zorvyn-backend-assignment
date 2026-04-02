import { ensureRedisConnected, redis } from './redis';

const DEFAULT_TTL_SECONDS = 300;

export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<void> {
  await ensureRedisConnected();
  const payload = JSON.stringify(value);

  if (ttlSeconds > 0) {
    await redis.set(key, payload, { EX: ttlSeconds });
    return;
  }

  await redis.set(key, payload);
}

export async function getCache<T>(key: string): Promise<T | null> {
  await ensureRedisConnected();
  const payload = await redis.get(key);

  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(payload) as T;
  } catch {
    return null;
  }
}

export async function delCache(key: string): Promise<number> {
  await ensureRedisConnected();
  return redis.del(key);
}