import Redis from 'ioredis';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: false,
  retryStrategy(times) {
    // Retry every 3 seconds, cap at 10 seconds
    return Math.min(times * 1000, 10000);
  },
};

export const redisConnection = new Redis(redisConfig);
export const redisPublisher = new Redis(redisConfig);

redisConnection.on('connect', () => {
  console.log('✅ Worker: Connected to Redis');
});

redisConnection.on('error', (err) => {
  console.warn('⚠️ Worker Redis Connection Warning (Start Docker / Redis to process queue):', err.message);
});

redisPublisher.on('error', (err) => {
  console.warn('⚠️ Worker Redis Publisher Warning:', err.message);
});
