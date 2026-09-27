import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, CheckCircle2, Eye, Calendar, Layers, HardDrive } from 'lucide-react';
import HlsPlayer from '../components/HlsPlayer';

export default function Watch() {
  const { id } = useParams();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`/api/videos/${id}`);
        setVideo(data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load video');
      } finally {
        setLoading(false);
      }
    };
    fetchVideo();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-slate-950 p-4 text-center">
        <h2 className="text-xl font-bold text-white">Video Not Found</h2>
        <p className="mt-1 text-sm text-slate-400">{error || 'This video may still be processing or was deleted.'}</p>
        <Link to="/" className="mt-4 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700">
          Back to Library
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Back navigation */}
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to All Videos
        </Link>

        {/* Custom HLS Player */}
        <HlsPlayer
          src={video.hlsMasterPlaylistUrl}
          poster={video.thumbnailUrl}
        />

        {/* Video Info Header */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{video.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-emerald-400" />
                  {video.views} views
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(video.createdAt).toLocaleDateString(undefined, {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Adaptive HLS VOD
                </span>
              </div>
            </div>

            {/* Available Renditions Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5" />
                Renditions:
              </span>
              {video.resolutions && video.resolutions.length > 0 ? (
                video.resolutions.map((r, i) => (
                  <span
                    key={i}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-mono font-bold text-emerald-400"
                  >
                    {r.resolution}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">Auto Stream</span>
              )}
            </div>
          </div>

          {/* Description */}
          {video.description && (
            <div className="mt-6 border-t border-slate-800/80 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                About this video
              </h3>
              <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                {video.description}
              </p>
            </div>
          )}

          {/* Master Playlist Technical Reference */}
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1.5">
              <span>HLS Master Index:</span>
              <span className="text-[11px] text-emerald-400">#EXT-X-STREAM-INF Compliant</span>
            </div>
            <code className="block rounded-lg bg-slate-900 p-2.5 text-xs font-mono text-slate-300 break-all select-all">
              {video.hlsMasterPlaylistUrl}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
