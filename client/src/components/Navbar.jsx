import React from 'react';
import { Link } from 'react-router-dom';
import { PlaySquare, UploadCloud, Radio, Sparkles } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

export default function Navbar({ onOpenUpload }) {
  const { connected } = useSocket();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5 transition hover:opacity-90">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20">
            <PlaySquare className="h-6 w-6 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold text-lg text-white tracking-tight">
              StreamFlow
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                HLS Engine
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Distributed Chunked Video Transcoder</p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {/* Real-time Socket Indicator */}
          <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${connected ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="hidden md:inline">{connected ? 'Live Gateway Connected' : 'Connecting...'}</span>
          </div>

          {/* Upload Button */}
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400 active:scale-95"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Upload Video</span>
          </button>
        </div>
      </div>
    </header>
  );
}
