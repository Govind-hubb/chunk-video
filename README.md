# 🎥 StreamFlow — Chunked Video Streaming & Async Transcoding Engine

A production-grade, distributed MERN-stack video processing and adaptive bitrate streaming platform engineered to handle multi-gigabyte video uploads with zero server memory overhead and buffer-free HLS playback.

---

## 🏗️ System Architecture

```
                                +---------------------------+
                                |    React Client (Vite)    |
                                +-------------+-------------+
                                              |
                   1. Request Pre-signed URL  |  3. Direct PUT Upload (0 Server RAM)
                                              v
      +---------------------+        +--------------------+        +---------------------+
      |   Express API       |        | AWS S3 / Storage   | <------+ Browser Direct PUT  |
      |   (Port 5000)       |        | (Raw Video Bucket) |        +---------------------+
      +----------+----------+        +---------+----------+
                 |                             |
                 | 4. Dispatch Job             | 5. Download Raw Video
                 v                             v
      +---------------------+        +--------------------+
      |  BullMQ / Redis     +------->| FFmpeg Transcoder  |
      |  (Job Queue)        |        | Worker Node        |
      +----------+----------+        +---------+----------+
                 |                             |
                 | 6. Real-time PubSub         | 7. Multi-bitrate HLS Slicing
                 v                             |    (360p, 720p, 1080p + .m3u8)
      +---------------------+                  v
      |  Socket.io Server   |        +--------------------+
      |  (Progress Stream)  |        | Transcoded Storage |
      +----------+----------+        | (HLS .ts Chunks)   |
                 |                   +---------+----------+
                 | 8. Live Progress (45%)      |
                 v                             | 9. Adaptive Bitrate Stream
      +---------------------+                  |
      |   React Hls.js      |<-----------------+
      |   Custom Player     |
      +---------------------+
```

---

## ⚡ Core Engineering Features (Why It Stands Out)

1. **Zero-Memory Ingestion Pipeline (S3 Pre-signed URLs):**
   * Eliminates the traditional `multer` memory bottleneck.
   * Large multi-gigabyte video files stream directly from the user's browser to Cloud Object Storage via cryptographically signed PUT URLs.
   * Express API server memory usage remains negligible regardless of file size.

2. **Decoupled Asynchronous Worker Microservice:**
   * Isolates compute-heavy FFmpeg transcoding from HTTP API traffic.
   * Managed via **BullMQ** backed by **Redis**, providing exponential backoff retries, concurrency controls, and failure recovery.

3. **HTTP Live Streaming (HLS) Adaptive Bitrate Packaging:**
   * Automatically inspects video aspect ratio and generates multi-resolution renditions:
     * **360p (SD):** For weak mobile networks (800 kbps)
     * **720p (HD):** For standard broadband (2200 kbps)
     * **1080p (FHD):** For high-speed connections (4500 kbps)
   * Assembles a master `#EXT-X-STREAM-INF` playlist index for buffer-free dynamic bitrate switching.

4. **Real-Time Transcoding Telemetry:**
   * Streams live encoding percentage to connected clients via **Redis Pub/Sub** and **Socket.io**.
   * Custom HLS player features real-time stream stats, bandwidth detection, and manual quality overrides.

---

## 🚀 Quick Start & Installation

### Prerequisites
* **Node.js**: v18+ (tested on v22)
* **Docker** (for Redis & MongoDB containers) or local Redis/Mongo instances

### 1. Clone & Install Dependencies
```bash
# In the project root:
cd video-streaming-pipeline

# Install all workspace dependencies
npm run install:all
```

### 2. Start Infrastructure (Redis & MongoDB)
```bash
# Start Redis and MongoDB in the background via Docker
docker compose up -d
```
*(If you already have Redis and MongoDB running locally on default ports 6379 and 27017, you can skip docker-compose)*

### 3. Run the Services
Open 3 terminal tabs (or run concurrently):

* **Terminal 1 (Backend API):**
  ```bash
  cd server
  npm run dev
  ```
  *Runs on http://localhost:5000*

* **Terminal 2 (FFmpeg Transcoder Worker):**
  ```bash
  cd worker
  npm run dev
  ```
  *Listens for video transcoding jobs on Redis*

* **Terminal 3 (React Client):**
  ```bash
  cd client
  npm run dev
  ```
  *Runs on http://localhost:5173*

---

## 🛠️ Tech Stack & Dependencies

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, TailwindCSS | Modern reactive dashboard & upload interface |
| **Video Engine** | `hls.js`, HTML5 Video API | Adaptive bitrate streaming & custom controls |
| **Backend API** | Node.js, Express, Socket.io | Pre-signed URL signer & metadata manager |
| **Database** | MongoDB, Mongoose | Video metadata, resolution schemas, job statuses |
| **Queue & Cache** | Redis 7, BullMQ | Fault-tolerant job queue & Pub/Sub telemetry |
| **Media Processing** | FFmpeg, `@ffmpeg-installer` | Multi-bitrate HLS segmentation & thumbnail generation |
| **Cloud Storage** | AWS S3 SDK v3 (or Local Emulator) | Scalable object storage for raw & chunked media |

---


