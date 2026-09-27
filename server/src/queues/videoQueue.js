import { Queue } from 'bullmq';
import { redisClient } from '../config/redis.js';

export const VIDEO_TRANSCODE_QUEUE = 'video-transcode-queue';

export const videoQueue = new Queue(VIDEO_TRANSCODE_QUEUE, {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 3600, // keep completed jobs for 1 hour
      count: 100,
    },
    removeOnFail: {
      age: 24 * 3600, // keep failed jobs for 24 hours
    },
  },
});

export async function addVideoTranscodeJob({ videoId, rawFileKey, title }) {
  const job = await videoQueue.add('transcode-hls', {
    videoId,
    rawFileKey,
    title,
    queuedAt: new Date().toISOString(),
  });
  console.log(`[Queue] Added transcode job #${job.id} for VideoID: ${videoId}`);
  return job;
}
