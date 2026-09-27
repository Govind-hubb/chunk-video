import fs from 'fs-extra';
import path from 'path';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { pipeline } from 'stream/promises';

const driver = process.env.STORAGE_DRIVER || 'local';

let s3Client = null;
if (driver === 's3') {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  });
}

/**
 * Downloads a raw video file from S3 or local storage to a local temporary working directory
 */
export async function downloadRawFile(fileKey, destinationPath) {
  await fs.ensureDir(path.dirname(destinationPath));

  if (driver === 's3' && s3Client) {
    console.log(`[Storage Helper] Downloading s3://${process.env.AWS_S3_BUCKET_NAME}/${fileKey}`);
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: fileKey,
    });
    const response = await s3Client.send(command);
    const writeStream = fs.createWriteStream(destinationPath);
    await pipeline(response.Body, writeStream);
    return destinationPath;
  }

  // Local storage resolution
  // Assuming storage folder is at the root / server level
  const possiblePaths = [
    path.resolve('..', 'server', 'storage', fileKey),
    path.resolve('storage', fileKey),
    path.resolve('..', 'storage', fileKey),
  ];

  let sourcePath = possiblePaths.find((p) => fs.existsSync(p));
  if (!sourcePath) {
    throw new Error(`Local source file not found at keys: ${possiblePaths.join(', ')}`);
  }

  await fs.copy(sourcePath, destinationPath);
  console.log(`[Storage Helper] Copied local raw file from ${sourcePath} to ${destinationPath}`);
  return destinationPath;
}

/**
 * Uploads an entire directory of generated HLS chunks and playlists to S3 or local storage
 */
export async function uploadHlsDirectory(localHlsDir, targetBaseKey) {
  const files = await fs.readdir(localHlsDir);

  for (const file of files) {
    const localFilePath = path.join(localHlsDir, file);
    const stat = await fs.stat(localFilePath);

    if (stat.isFile()) {
      const destinationKey = `${targetBaseKey}/${file}`;

      if (driver === 's3' && s3Client) {
        let contentType = 'application/octet-stream';
        if (file.endsWith('.m3u8')) contentType = 'application/vnd.apple.mpegurl';
        else if (file.endsWith('.ts')) contentType = 'video/MP2T';
        else if (file.endsWith('.jpg') || file.endsWith('.jpeg')) contentType = 'image/jpeg';
        else if (file.endsWith('.png')) contentType = 'image/png';

        const fileBuffer = await fs.readFile(localFilePath);
        await s3Client.send(new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: destinationKey,
          Body: fileBuffer,
          ContentType: contentType,
        }));
      } else {
        // Local storage destination
        const destPath = path.resolve('..', 'server', 'storage', destinationKey);
        await fs.ensureDir(path.dirname(destPath));
        await fs.copy(localFilePath, destPath);
      }
    }
  }

  console.log(`[Storage Helper] Successfully uploaded HLS output to ${targetBaseKey}`);
}
