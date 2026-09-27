import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Clock, CheckCircle2, AlertTriangle, Cpu, Eye } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function VideoCard({ video, onDelete }) {
  const { activeProgressMap } = useSocket();

  // If active transcoding progress is reported via WebSocket, override DB progress
  const liveProgress = activeProgressMap[video._id] !== undefined 
    ? activeProgressMap[video._id] 
    : video.progress;

  const isProcessing = video.status === 'PROCESSING' || (video.status === 'QUEUED' && liveProgress > 0);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-slate-700 hover:shadow-xl hover:shadow-slate-950/50">
      {/* Thumbnail Area */}
      <Link to={video.status === 'READY' ? `/watch/${video._id}` : '#'} className="relative aspect-video w-full overflow-hidden bg-slate-950">
        {video.thumbnailUrl && video.status === 'READY' ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-600">
            {isProcessing ? (
              <div className="flex flex-col items-center gap-2">
                <Cpu className="h-8 w-8 animate-spin text-indigo-400" />
                <span className="text-xs font-semibold text-indigo-300">Transcoding {liveProgress}%</span>
              </div>
            ) : video.status === 'FAILED' ? (
              <div className="flex flex-col items-center gap-2 text-rose-400">
                <AlertTriangle className="h-8 w-8" />
                <span className="text-xs font-semibold">Transcoding Failed</span>
              </div>
            ) : (
              <Play className="h-10 w-10 text-slate-700 transition group-hover:text-emerald-400" />
            )}
          </div>
        )}

        {/* Duration Pill */}
        {video.duration > 0 && video.status === 'READY' && (
          <span className="absolute bottom-2.5 right-2.5 rounded-lg bg-black/80 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
            {formatDuration(video.duration)}
          </span>
        )}

        {/* Live Status Pill */}
        <div className="absolute top-2.5 left-2.5">
          {video.status === 'READY' && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 backdrop-blur-md">
              <CheckCircle2 className="h-3 w-3" />
              HLS Stream Ready
            </span>
          )}
          {isProcessing && (
            <span className="flex items-center gap-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-300 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              Encoding {liveProgress}%
            </span>
          )}
          {video.status === 'QUEUED' && !isProcessing && (
            <span className="flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300 backdrop-blur-md">
              <Clock className="h-3 w-3" />
              Queued
            </span>
          )}
          {video.status === 'FAILED' && (
            <span className="flex items-center gap-1 rounded-full bg-rose-500/20 border border-rose-500/40 px-2.5 py-0.5 text-[11px] font-semibold text-rose-400 backdrop-blur-md">
              <AlertTriangle className="h-3 w-3" />
              Failed
            </span>
          )}
        </div>
      </Link>

      {/* Details */}
      <div className="flex flex-1 flex-col p-4">
        <Link
          to={video.status === 'READY' ? `/watch/${video._id}` : '#'}
          className="font-bold text-slate-100 line-clamp-1 transition group-hover:text-emerald-400"
        >
          {video.title}
        </Link>
        <p className="mt-1 text-xs text-slate-400 line-clamp-2">
          {video.description || 'No description provided.'}
        </p>

        <div className="mt-auto pt-3 flex items-center justify-between border-t border-slate-800/60 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {video.views || 0} views
          </span>
          <span>
            {new Date(video.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
