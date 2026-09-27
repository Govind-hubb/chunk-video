import { redisPublisher } from '../config/redis.js';

/**
 * Parses FFmpeg stderr progress lines and computes overall completion percentage
 */
export function createProgressReporter(videoId, totalDurationSec, onProgressCallback) {
  let lastReportedPercent = -1;

  return function handleProgress(progress) {
    if (!totalDurationSec || totalDurationSec <= 0) return;

    let currentSeconds = 0;
    if (progress.timemark) {
      // Format: "00:01:23.45"
      const parts = progress.timemark.split(':');
      if (parts.length === 3) {
        currentSeconds = parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
      }
    } else if (progress.percent) {
      currentSeconds = (progress.percent / 100) * totalDurationSec;
    }

    const percent = Math.min(99, Math.max(1, Math.round((currentSeconds / totalDurationSec) * 100)));

    // Emit every 1% change
    if (percent > lastReportedPercent) {
      lastReportedPercent = percent;

      const payload = {
        videoId,
        progress: percent,
        currentSeconds: Math.round(currentSeconds),
        totalSeconds: Math.round(totalDurationSec),
        timestamp: new Date().toISOString(),
      };

      // Publish to Redis channel
      redisPublisher.publish(`video:progress:${videoId}`, JSON.stringify(payload));

      if (onProgressCallback) {
        onProgressCallback(percent, payload);
      }
    }
  };
}
