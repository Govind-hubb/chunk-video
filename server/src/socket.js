import { Server } from 'socket.io';
import { redisSubscriber } from './config/redis.js';

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    socket.on('join-video-room', (videoId) => {
      socket.join(`video:${videoId}`);
      console.log(`[Socket.io] Client ${socket.id} joined room video:${videoId}`);
    });

    socket.on('leave-video-room', (videoId) => {
      socket.leave(`video:${videoId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  // Subscribe to Redis PubSub for transcoding updates
  setupRedisSubscriber();

  return io;
}

function setupRedisSubscriber() {
  redisSubscriber.psubscribe('video:progress:*', 'video:status:*', (err, count) => {
    if (err) {
      console.warn('[Socket.io] Failed to subscribe to Redis patterns:', err.message);
    } else {
      console.log(`[Socket.io] Subscribed to ${count} Redis Pub/Sub channels for video progress`);
    }
  });

  redisSubscriber.on('pmessage', (pattern, channel, message) => {
    try {
      const data = JSON.parse(message);
      if (channel.startsWith('video:progress:')) {
        const videoId = channel.split(':')[2];
        // Emit to specific video room AND global broadcast
        io.to(`video:${videoId}`).emit('video-progress', data);
        io.emit('global-video-progress', data);
      } else if (channel.startsWith('video:status:')) {
        const videoId = channel.split(':')[2];
        io.to(`video:${videoId}`).emit('video-status-changed', data);
        io.emit('global-video-status-changed', data);
      }
    } catch (e) {
      console.error('[Socket.io] Error processing Redis pubsub message:', e);
    }
  });
}

export function getIO() {
  return io;
}
