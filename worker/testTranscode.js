import path from 'path';
import fs from 'fs-extra';
import ffmpeg from './src/transcoder/ffmpegConfig.js';
import { processVideoToHls } from './src/transcoder/hlsTranscoder.js';

async function runPipelineTest() {
  console.log('🧪 Starting FFmpeg HLS Transcoding Pipeline Test...');

  const testDir = path.resolve('test-artifacts');
  await fs.ensureDir(testDir);

  const sampleVideoPath = path.join(testDir, 'sample_test_input.mp4');
  const hlsOutputDir = path.join(testDir, 'hls_output');

  // 1. Generate a 5-second test MP4 using FFmpeg testsrc filter
  console.log('📹 Step 1: Generating a 5-second test video with FFmpeg testsrc...');
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input('testsrc=size=1280x720:rate=24')
      .inputFormat('lavfi')
      .input('sine=frequency=1000:duration=5')
      .inputFormat('lavfi')
      .outputOptions(['-t 5', '-pix_fmt yuv420p', '-c:v libx264', '-c:a aac'])
      .output(sampleVideoPath)
      .on('end', () => {
        console.log(`✅ Sample test video generated at ${sampleVideoPath}`);
        resolve();
      })
      .on('error', (err) => reject(err))
      .run();
  });

  // 2. Run through HLS Transcoding Pipeline
  console.log('\n⚙️ Step 2: Running through multi-bitrate HLS Transcoding engine...');
  const result = await processVideoToHls({
    inputPath: sampleVideoPath,
    outputDir: hlsOutputDir,
    videoId: 'test-video-101',
    onProgress: (percent) => {
      process.stdout.write(`\rTranscoding Progress: ${percent}%`);
    },
  });

  console.log('\n\n✅ Transcoding Output Summary:');
  console.log(' - Duration:', result.duration, 'seconds');
  console.log(' - Renditions:', result.renditions.map((r) => r.resolution).join(', '));

  const generatedFiles = await fs.readdir(hlsOutputDir);
  console.log(' - Generated Files in HLS output directory:');
  generatedFiles.forEach((file) => console.log(`   * ${file}`));

  // Verify key files exist
  const masterExists = await fs.pathExists(path.join(hlsOutputDir, 'master.m3u8'));
  const thumbExists = await fs.pathExists(path.join(hlsOutputDir, 'thumbnail.jpg'));
  const segmentsExist = generatedFiles.some((f) => f.endsWith('.ts'));

  if (masterExists && thumbExists && segmentsExist) {
    console.log('\n🎉 ALL TESTS PASSED! The HLS Transcoding Engine is fully functional!');
  } else {
    console.error('\n❌ Test failed: Missing expected HLS output files.');
  }
}

runPipelineTest().catch((err) => {
  console.error('❌ Pipeline test failed:', err);
});
