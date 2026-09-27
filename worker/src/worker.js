import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs-extra';
import { Worker } from 'bullmq';
import { redisConnection, redisPublisher } from './config/redis.js';
import { connectDB } from './config/db.js';
import Video from './models/Video.js';
import { downloadRawFile, uploadHlsDirectory } from './services/storageHelper.js';
import { processVideoToHls } from './transcoder/hlsTranscoder.js';

dotenv.config();

const QUEUE_NAME = 'video-transcode-queue';

async function startWorker() {
  await connectDB();

  console.log(`🎬 Video Transcoder Worker started. Listening on queue: "${QUEUE_NAME}"...`);

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { videoId, rawFileKey, title } = job.data;
      console.log(`\n========================================`);
      console.log(`[Job #${job.id}] Started transcoding: "${title}" (ID: ${videoId})`);
      console.log(`========================================`);

      const workDir = path.resolve('temp', videoId);
      const rawFilePath = path.join(workDir, 'raw-input.mp4');
      const hlsOutputDir = path.join(workDir, 'hls');

      try {
        // 1. Update Video status in DB
        await Video.findByIdAndUpdate(videoId, {
          status: 'PROCESSING',
          progress: 0,
          errorMessage: null,
        });

        redisPublisher.publish(
          `video:status:${videoId}`,
          JSON.stringify({ videoId, status: 'PROCESSING', progress: 0 })
        );

        // 2. Download raw file from S3 / Local storage
        console.log(`[Worker] Step 1: Downloading raw video...`);
        await downloadRawFile(rawFileKey, rawFilePath);

        // 3. Run multi-bitrate HLS Transcoding + Thumbnail generation
        console.log(`[Worker] Step 2: Running FFmpeg HLS transcoding...`);
        const { duration, renditions } = await processVideoToHls({
          inputPath: rawFilePath,
          outputDir: hlsOutputDir,
          videoId,
          onProgress: async (percent) => {
            await Video.findByIdAndUpdate(videoId, { progress: percent });
          },
        });

        // 4. Upload HLS files (master.m3u8, variant m3u8s, .ts segments, thumbnail.jpg)
        console.log(`[Worker] Step 3: Uploading HLS chunks to storage...`);
        const targetBaseKey = `hls/${videoId}`;
        await uploadHlsDirectory(hlsOutputDir, targetBaseKey);

        // 5. Update Video document with ready state and resolution links
        const formattedResolutions = renditions.map((r) => ({
          resolution: r.resolution,
          playlistUrl: `${targetBaseKey}/${r.playlistFilename}`,
          bitrate: r.bitrate,
          width: r.width,
          height: r.height,
        }));

        await Video.findByIdAndUpdate(videoId, {
          status: 'READY',
          progress: 100,
          duration,
          hlsMasterPlaylistUrl: `${targetBaseKey}/master.m3u8`,
          thumbnailUrl: `${targetBaseKey}/thumbnail.jpg`,
          resolutions: formattedResolutions,
        });

        redisPublisher.publish(
          `video:status:${videoId}`,
          JSON.stringify({
            videoId,
            status: 'READY',
            progress: 100,
            hlsMasterPlaylistUrl: `${targetBaseKey}/master.m3u8`,
            thumbnailUrl: `${targetBaseKey}/thumbnail.jpg`,
          })
        );

        console.log(`✅ [Job #${job.id}] Transcoding COMPLETED for "${title}"!`);
      } catch (error) {
        console.error(`❌ [Job #${job.id}] Failed:`, error);

        await Video.findByIdAndUpdate(videoId, {
          status: 'FAILED',
          errorMessage: error.message,
        });

        redisPublisher.publish(
          `video:status:${videoId}`,
          JSON.stringify({ videoId, status: 'FAILED', error: error.message })
        );

        throw error;
      } finally {
        // Cleanup local temp working directory
        try {
          await fs.remove(workDir);
          console.log(`[Worker] Cleaned up temporary files at: ${workDir}`);
        } catch (cleanupErr) {
          console.warn('[Worker] Temp cleanup error:', cleanupErr.message);
        }
      }
    },
    {
      connection: redisConnection,
      concurrency: 2, // Process up to 2 videos concurrently
      lockDuration: 300000, // 5 minutes lock
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[BullMQ] Job ${job?.id} failed with error:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[BullMQ] Worker encountered error:', err.message);
  });
}

startWorker().catch((err) => {
  console.error('Worker failed to initialize:', err);
  process.exit(1);
});
