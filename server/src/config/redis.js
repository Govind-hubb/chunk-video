import Redis from 'ioredis';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: false,
  retryStrategy(times) {
    return Math.min(times * 1000, 10000);
  },
};

export const redisClient = new Redis(redisConfig);
export const redisSubscriber = new Redis(redisConfig);

redisClient.on('connect', () => {
  console.log('✅ Server: Redis Client Connected');
});

redisClient.on('error', (err) => {
  console.warn('⚠️ Server Redis Warning (BullMQ queue waiting for Redis):', err.message);
});

redisSubscriber.on('connect', () => {
  console.log('✅ Server: Redis Subscriber Connected');
});

redisSubscriber.on('error', (err) => {
  console.warn('⚠️ Server Redis Subscriber Warning:', err.message);
});

export const getRedisConnection = () => redisClient;
