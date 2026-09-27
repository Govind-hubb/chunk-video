import fs from 'fs-extra';
import path from 'path';
import ffmpeg from './ffmpegConfig.js';
import { createProgressReporter } from './progressParser.js';

export function probeVideo(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);
      const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
      const duration = parseFloat(metadata.format.duration || videoStream?.duration || 0);
      const width = videoStream?.width || 1280;
      const height = videoStream?.height || 720;
      resolve({ duration, width, height, metadata });
    });
  });
}

export function generateThumbnail(inputPath, outputDir, timestampSec = 1) {
  return new Promise((resolve, reject) => {
    const filename = 'thumbnail.jpg';
    ffmpeg(inputPath)
      .screenshots({
        timestamps: [timestampSec],
        filename,
        folder: outputDir,
        size: '640x360',
      })
      .on('end', () => resolve(path.join(outputDir, filename)))
      .on('error', (err) => reject(err));
  });
}

export function transcodeRendition({ inputPath, outputDir, resolutionName, width, height, videoBitrate, audioBitrate, totalDuration, videoId, onProgress }) {
  return new Promise((resolve, reject) => {
    const playlistFilename = `${resolutionName}.m3u8`;
    const segmentFilename = `${resolutionName}_%03d.ts`;
    const outputPath = path.join(outputDir, playlistFilename);

    const progressHandler = createProgressReporter(videoId, totalDuration, onProgress);

    ffmpeg(inputPath)
      .outputOptions([
        `-vf scale=w=${width}:h=${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
        '-c:v libx264',
        `-b:v ${videoBitrate}`,
        '-preset fast',
        '-g 48', // Keyframe interval (2 seconds at 24fps)
        '-sc_threshold 0',
        '-c:a aac',
        `-b:a ${audioBitrate}`,
        '-ac 2',
        '-hls_time 6', // 6-second segment chunking
        '-hls_playlist_type vod',
        `-hls_segment_filename ${path.join(outputDir, segmentFilename)}`,
      ])
      .output(outputPath)
      .on('progress', progressHandler)
      .on('end', () => {
        console.log(`[Transcoder] Finished rendition ${resolutionName}`);
        resolve({
          resolution: resolutionName,
          playlistFilename,
          width,
          height,
          bitrate: parseInt(videoBitrate.replace('k', ''), 10) * 1000,
        });
      })
      .on('error', (err, stdout, stderr) => {
        console.error(`[Transcoder] Error on rendition ${resolutionName}:`, err.message);
        console.error(stderr);
        reject(err);
      })
      .run();
  });
}

export function writeMasterPlaylist(outputDir, renditions) {
  let content = '#EXTM3U\n#EXT-X-VERSION:3\n\n';

  for (const r of renditions) {
    const bandwidth = r.bitrate + 128000; // video + audio
    content += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${r.width}x${r.height},NAME="${r.resolution}"\n`;
    content += `${r.playlistFilename}\n\n`;
  }

  const masterPath = path.join(outputDir, 'master.m3u8');
  fs.writeFileSync(masterPath, content, 'utf8');
  console.log(`[Transcoder] Generated master playlist at ${masterPath}`);
  return masterPath;
}

/**
 * Full Transcoding Pipeline for a Video
 */
export async function processVideoToHls({ inputPath, outputDir, videoId, onProgress }) {
  await fs.ensureDir(outputDir);

  // 1. Probe input video
  console.log(`[Transcoder] Probing video file: ${inputPath}`);
  const { duration, width, height } = await probeVideo(inputPath);
  console.log(`[Transcoder] Video probed: duration=${duration}s, resolution=${width}x${height}`);

  // 2. Generate thumbnail at 10% or 1st second
  const thumbTime = duration > 2 ? Math.min(2, duration / 2) : 0.5;
  await generateThumbnail(inputPath, outputDir, thumbTime);

  // 3. Define target renditions based on source dimensions
  const renditionConfigs = [
    { name: '360p', width: 640, height: 360, vBitrate: '800k', aBitrate: '96k' },
    { name: '720p', width: 1280, height: 720, vBitrate: '2200k', aBitrate: '128k' },
  ];

  if (height >= 1000 || width >= 1800) {
    renditionConfigs.push({ name: '1080p', width: 1920, height: 1080, vBitrate: '4500k', aBitrate: '192k' });
  }

  const completedRenditions = [];

  // Transcode each rendition sequentially (or parallel based on CPU)
  for (let i = 0; i < renditionConfigs.length; i++) {
    const cfg = renditionConfigs[i];
    console.log(`[Transcoder] Starting rendition [${i + 1}/${renditionConfigs.length}]: ${cfg.name}`);

    const result = await transcodeRendition({
      inputPath,
      outputDir,
      resolutionName: cfg.name,
      width: cfg.width,
      height: cfg.height,
      videoBitrate: cfg.vBitrate,
      audioBitrate: cfg.aBitrate,
      totalDuration: duration,
      videoId,
      onProgress: (pct) => {
        // Overall weighted progress
        const overallProgress = Math.round(((i * 100) + pct) / renditionConfigs.length);
        if (onProgress) onProgress(overallProgress);
      },
    });

    completedRenditions.push(result);
  }

  // 4. Generate Master.m3u8 Playlist
  writeMasterPlaylist(outputDir, completedRenditions);

  return {
    duration,
    width,
    height,
    renditions: completedRenditions,
  };
}
