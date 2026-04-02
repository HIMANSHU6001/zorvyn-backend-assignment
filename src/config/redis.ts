import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = createClient({ url: redisUrl });

redis.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redis.on('connect', () => {
  console.log('Redis connected');
});

let connected = false;

export async function ensureRedisConnected() {
  if (!connected) {
    await redis.connect();
    connected = true;
  }
}

export async function disconnectRedis() {
  if (connected) {
    await redis.quit();
    connected = false;
    console.log('Redis disconnected');
  }
}