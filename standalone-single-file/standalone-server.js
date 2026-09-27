/**
 * Standalone Video Chunking & HTTP Range Streaming Server
 * -------------------------------------------------------
 * Pure Node.js (ZERO external dependencies, no npm install required)
 * Run: node standalone-server.js
 * Access: http://localhost:4000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 4000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const CHUNKS_DIR = path.join(__dirname, 'temp_chunks');

// Ensure directories exist
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(CHUNKS_DIR)) fs.mkdirSync(CHUNKS_DIR, { recursive: true });

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, x-chunk-index, x-total-chunks, x-file-name');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // 1. Serve Frontend UI
  if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
    const htmlPath = path.join(__dirname, 'standalone-chunk-upload.html');
    if (fs.existsSync(htmlPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(htmlPath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('HTML UI file not found');
    }
    return;
  }

  // 2. Upload Video Chunk
  if (req.method === 'POST' && pathname === '/upload-chunk') {
    const chunkIndex = parseInt(req.headers['x-chunk-index']);
    const totalChunks = parseInt(req.headers['x-total-chunks']);
    const rawFileName = req.headers['x-file-name'] || 'uploaded-video.mp4';
    const sanitizedFileName = path.basename(decodeURIComponent(rawFileName)).replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileSessionDir = path.join(CHUNKS_DIR, sanitizedFileName);

    if (!fs.existsSync(fileSessionDir)) {
      fs.mkdirSync(fileSessionDir, { recursive: true });
    }

    const chunkPath = path.join(fileSessionDir, `chunk_${chunkIndex}`);
    const writeStream = fs.createWriteStream(chunkPath);

    req.pipe(writeStream);

    writeStream.on('finish', () => {
      // Check if all chunks have arrived
      const existingChunks = fs.readdirSync(fileSessionDir).filter(f => f.startsWith('chunk_'));
      
      if (existingChunks.length === totalChunks) {
        // Merge all chunks in order
        const finalFilePath = path.join(UPLOAD_DIR, sanitizedFileName);
        const finalWriteStream = fs.createWriteStream(finalFilePath);

        for (let i = 0; i < totalChunks; i++) {
          const currentChunkPath = path.join(fileSessionDir, `chunk_${i}`);
          if (fs.existsSync(currentChunkPath)) {
            const data = fs.readFileSync(currentChunkPath);
            finalWriteStream.write(data);
            fs.unlinkSync(currentChunkPath);
          }
        }
        finalWriteStream.end();

        try {
          fs.rmdirSync(fileSessionDir);
        } catch (e) {}

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'completed',
          message: 'All chunks merged successfully!',
          fileName: sanitizedFileName,
          streamUrl: `/stream?file=${encodeURIComponent(sanitizedFileName)}`
        }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'chunk_received',
          chunkIndex,
          totalChunks,
          receivedChunks: existingChunks.length
        }));
      }
    });

    writeStream.on('error', (err) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    });
    return;
  }

  // 3. List Uploaded Videos
  if (req.method === 'GET' && pathname === '/videos') {
    const files = fs.readdirSync(UPLOAD_DIR).map(name => {
      const stats = fs.statSync(path.join(UPLOAD_DIR, name));
      return {
        fileName: name,
        sizeBytes: stats.size,
        sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
        streamUrl: `/stream?file=${encodeURIComponent(name)}`
      };
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ videos: files }));
    return;
  }

  // 4. Chunked Video Stream via HTTP 206 Partial Content (Byte-Range)
  if (req.method === 'GET' && pathname === '/stream') {
    const fileName = path.basename(parsedUrl.query.file || '');
    const videoPath = path.join(UPLOAD_DIR, fileName);

    if (!fileName || !fs.existsSync(videoPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Video not found');
      return;
    }

    const videoStat = fs.statSync(videoPath);
    const videoSize = videoStat.size;
    const range = req.headers.range;

    if (range) {
      // Parse Range header (e.g., "bytes=32324-")
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const CHUNK_SIZE = 10 ** 6; // 1 MB buffer chunk for smooth streaming
      const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + CHUNK_SIZE, videoSize - 1);

      const contentLength = end - start + 1;
      const headers = {
        'Content-Range': `bytes ${start}-${end}/${videoSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': contentLength,
        'Content-Type': 'video/mp4',
      };

      res.writeHead(206, headers);
      const stream = fs.createReadStream(videoPath, { start, end });
      stream.pipe(res);
    } else {
      const headers = {
        'Content-Length': videoSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, headers);
      fs.createReadStream(videoPath).pipe(res);
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Route not found');
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Standalone Video Chunking & Streaming Server Ready!`);
  console.log(` Web UI : http://localhost:${PORT}`);
  console.log(` Mode   : Zero external dependencies (Native Node.js)`);
  console.log(`====================================================`);
});
