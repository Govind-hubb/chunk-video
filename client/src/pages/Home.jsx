import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Film, Sparkles, Server, Zap, RefreshCw } from 'lucide-react';
import VideoCard from '../components/VideoCard';
import { useSocket } from '../context/SocketContext';

export default function Home({ onOpenUpload }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL | READY | PROCESSING

  const { socket } = useSocket();

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/videos');
      setVideos(data);
    } catch (err) {
      console.error('Failed to fetch videos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  // When a video completes or changes status, refresh the list
  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = () => {
      fetchVideos();
    };

    socket.on('global-video-status-changed', handleStatusUpdate);

    return () => {
      socket.off('global-video-status-changed', handleStatusUpdate);
    };
  }, [socket]);

  const filteredVideos = videos.filter((v) => {
    if (filter === 'READY') return v.status === 'READY';
    if (filter === 'PROCESSING') return v.status === 'PROCESSING' || v.status === 'QUEUED';
    return true;
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-8 sm:p-10 shadow-2xl mb-10">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 mb-4">
              <Zap className="h-3.5 w-3.5" />
              Direct S3 Ingestion • Async HLS Transcoding • BullMQ Worker
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Next-Gen Chunked Video Processing Pipeline
            </h1>
            <p className="mt-3 text-sm text-slate-300 sm:text-base leading-relaxed">
              Upload multi-gigabyte videos directly to cloud storage with zero server RAM bottleneck. 
              Decoupled worker nodes automatically segment videos into adaptive 360p, 720p, and 1080p HLS streams.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={onOpenUpload}
                className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition"
              >
                Upload Video Now
              </button>
              <button
                onClick={fetchVideos}
                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Feed
              </button>
            </div>
          </div>
        </div>

        {/* Filters & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Transcoded Media Library</h2>
            <p className="text-xs text-slate-400">Total Videos: {videos.length}</p>
          </div>

          <div className="flex items-center gap-2">
            {['ALL', 'READY', 'PROCESSING'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                  filter === tab
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Video Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-video w-full rounded-2xl bg-slate-900 animate-pulse border border-slate-800" />
            ))}
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 py-16 text-center">
            <Film className="h-12 w-12 text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-white">No Videos Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Upload your first video to see the S3 pre-signed ingestion and FFmpeg HLS chunking pipeline in action!
            </p>
            <button
              onClick={onOpenUpload}
              className="mt-4 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
            >
              Upload Video
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredVideos.map((video) => (
              <VideoCard key={video._id} video={video} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
