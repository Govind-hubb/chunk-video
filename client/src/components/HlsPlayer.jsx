import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Activity,
  Check,
  RotateCcw,
} from 'lucide-react';

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function HlsPlayer({ src, poster }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [buffered, setBuffered] = useState(0);

  // HLS Qualities
  const [levels, setLevels] = useState([]); // [{ id, height, bitrate, name }]
  const [currentLevel, setCurrentLevel] = useState(-1); // -1 = Auto
  const [activeBitrate, setActiveBitrate] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });

      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log('✅ HLS Manifest parsed, renditions found:', data.levels);
        const parsedLevels = data.levels.map((lvl, index) => ({
          id: index,
          height: lvl.height,
          name: `${lvl.height}p`,
          bitrate: lvl.bitrate,
        }));
        setLevels(parsedLevels);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        const levelData = hls.levels[data.level];
        if (levelData) {
          setActiveBitrate(Math.round(levelData.bitrate / 1000));
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('Fatal network error, attempting recovery...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('Fatal media error, attempting recovery...');
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari HLS support
      video.src = src;
    }
  }, [src]);

  // Video time & buffer tracking
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);

    if (video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      setBuffered((bufferedEnd / (video.duration || 1)) * 100);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const seekTime = (parseFloat(e.target.value) / 100) * duration;
    video.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    const video = videoRef.current;
    if (!video) return;
    video.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const switchQuality = (levelIndex) => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = levelIndex;
    setCurrentLevel(levelIndex);
    setShowSettings(false);
  };

  return (
    <div
      ref={containerRef}
      className="group relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl border border-slate-800"
    >
      <video
        ref={videoRef}
        poster={poster}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={togglePlay}
        className="h-full w-full object-contain cursor-pointer"
        playsInline
      />

      {/* Stats Overlay (Nerd Stats) */}
      {showStats && (
        <div className="absolute top-4 left-4 rounded-xl bg-black/85 p-3 text-xs font-mono text-emerald-400 backdrop-blur-md border border-emerald-500/20 z-30">
          <div className="flex items-center gap-1.5 font-bold mb-2 text-white">
            <Activity className="h-4 w-4 text-emerald-400" />
            HLS Stream Telemetry
          </div>
          <p>Current Bitrate: {activeBitrate ? `${activeBitrate} kbps` : 'Estimating...'}</p>
          <p>Active Level: {currentLevel === -1 ? `Auto (${hlsRef.current?.currentLevel ?? 'detecting'}p)` : `${levels[currentLevel]?.name}`}</p>
          <p>Available Renditions: {levels.length}</p>
          <p>Buffer Ahead: {((buffered / 100) * duration - currentTime).toFixed(1)}s</p>
        </div>
      )}

      {/* Control Bar Overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex flex-col gap-2">
        {/* Progress Scrubber */}
        <div className="relative flex items-center h-2 cursor-pointer">
          {/* Buffer track */}
          <div
            className="absolute h-1.5 bg-slate-600/50 rounded-full transition-all"
            style={{ width: `${buffered}%` }}
          />
          {/* Play track */}
          <div
            className="absolute h-1.5 bg-emerald-500 rounded-full pointer-events-none"
            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
          />
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={(currentTime / (duration || 1)) * 100 || 0}
            onChange={handleSeek}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between text-white text-sm">
          <div className="flex items-center gap-3">
            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              className="rounded-lg p-1.5 hover:bg-white/10 transition"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <button onClick={toggleMute} className="rounded-lg p-1.5 hover:bg-white/10 transition">
                {isMuted || volume === 0 ? <VolumeX className="h-5 w-5 text-rose-400" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-slate-700 rounded-lg accent-emerald-500 cursor-pointer hidden sm:block"
              />
            </div>

            {/* Time Stamp */}
            <div className="text-xs font-medium text-slate-300">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center gap-2 relative">
            {/* Stats toggle */}
            <button
              onClick={() => setShowStats(!showStats)}
              title="Stream Telemetry"
              className={`rounded-lg p-1.5 transition ${showStats ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-white/10 text-slate-300'}`}
            >
              <Activity className="h-4 w-4" />
            </button>

            {/* Settings / Quality Picker */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-white/10 transition text-slate-300"
              >
                <Settings className="h-4 w-4" />
                <span>{currentLevel === -1 ? 'Auto' : levels[currentLevel]?.name}</span>
              </button>

              {/* Quality Dropdown Menu */}
              {showSettings && (
                <div className="absolute bottom-10 right-0 w-36 rounded-xl border border-slate-800 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-md z-40">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 mb-1">
                    Quality
                  </div>
                  <button
                    onClick={() => switchQuality(-1)}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition"
                  >
                    <span>Auto (Adaptive)</span>
                    {currentLevel === -1 && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                  </button>
                  {levels.map((lvl) => (
                    <button
                      key={lvl.id}
                      onClick={() => switchQuality(lvl.id)}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition"
                    >
                      <span>{lvl.name}</span>
                      {currentLevel === lvl.id && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="rounded-lg p-1.5 hover:bg-white/10 transition text-slate-300"
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
