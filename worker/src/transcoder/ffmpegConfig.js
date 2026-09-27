import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

// Automatically configure bundled FFmpeg and FFprobe binary paths
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

console.log(`[Worker FFmpeg] Configured binary path: ${ffmpegInstaller.path}`);
console.log(`[Worker FFprobe] Configured binary path: ${ffprobeInstaller.path}`);

export default ffmpeg;
