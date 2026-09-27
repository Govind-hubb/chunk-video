import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import path from 'path';

const driver = process.env.STORAGE_DRIVER || 'local';
const port = process.env.PORT || 5000;
const serverUrl = process.env.SERVER_URL || `http://localhost:${port}`;

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
 * Generate a pre-signed PUT URL for uploading raw videos directly to storage
 */
export async function generateUploadUrl({ originalName, contentType }) {
  const extension = path.extname(originalName) || '.mp4';
  const fileKey = `raw/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`;

  if (driver === 's3' && s3Client) {
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: fileKey,
      ContentType: contentType || 'video/mp4',
    });

    // 15 minutes expiration
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
    return { uploadUrl, fileKey, driver: 's3' };
  }

  // Local storage driver fallback (Acts identically to S3 pre-signed PUT)
  const uploadUrl = `${serverUrl}/api/storage/upload?key=${encodeURIComponent(fileKey)}`;
  return {
    uploadUrl,
    fileKey,
    driver: 'local',
  };
}

/**
 * Get Public/CDN or direct access URL for transcoded HLS stream
 */
export function getStreamUrl(fileKey) {
  if (!fileKey) return null;
  if (fileKey.startsWith('http://') || fileKey.startsWith('https://')) {
    return fileKey;
  }
  if (driver === 's3') {
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    const region = process.env.AWS_REGION || 'us-east-1';
    return `https://${bucket}.s3.${region}.amazonaws.com/${fileKey}`;
  }
  return `${serverUrl}/storage/${fileKey}`;
}
