import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const storageRoot = path.resolve('storage');

// Create storage directory if missing
if (!fs.existsSync(storageRoot)) {
  fs.mkdirSync(storageRoot, { recursive: true });
}

// Simulates S3 Pre-signed HTTP PUT
router.put('/upload', (req, res) => {
  const fileKey = req.query.key;
  if (!fileKey) {
    return res.status(400).json({ error: 'Missing file key query parameter' });
  }

  const targetPath = path.join(storageRoot, fileKey);
  const targetDir = path.dirname(targetPath);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const writeStream = fs.createWriteStream(targetPath);

  req.pipe(writeStream);

  writeStream.on('finish', () => {
    console.log(`[Storage] Uploaded binary file directly to ${fileKey}`);
    res.status(200).json({ message: 'File uploaded successfully', fileKey });
  });

  writeStream.on('error', (err) => {
    console.error('[Storage] Write error:', err);
    res.status(500).json({ error: 'Failed to write file' });
  });
});

export default router;
