import React, { useState } from 'react';
import axios from 'axios';
import { X, UploadCloud, Film, CheckCircle2, AlertCircle, Loader2, Cpu } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

export default function UploadModal({ isOpen, onClose, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stage, setStage] = useState('idle'); // idle | uploading_s3 | queued_transcoding | done | error
  const [uploadPercent, setUploadPercent] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdVideoId, setCreatedVideoId] = useState(null);

  const { activeProgressMap } = useSocket();

  if (!isOpen) return null;

  const currentTranscodePercent = createdVideoId ? (activeProgressMap[createdVideoId] || 0) : 0;

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleStartUpload = async (e) => {
    e.preventDefault();
    if (!file || !title) return;

    try {
      setStage('uploading_s3');
      setUploadPercent(0);
      setErrorMessage('');

      // Step 1: Request Pre-signed Upload URL
      const { data: presignData } = await axios.post('/api/videos/upload-url', {
        title,
        description,
        originalName: file.name,
        contentType: file.type || 'video/mp4',
        sizeBytes: file.size,
      });

      const { uploadUrl, videoId } = presignData;
      setCreatedVideoId(videoId);

      // Step 2: Direct Binary PUT upload to Storage (S3 / Local emulator)
      await axios.put(uploadUrl, file, {
        headers: {
          'Content-Type': file.type || 'video/mp4',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadPercent(percent);
          }
        },
      });

      // Step 3: Notify API server that upload finished, triggering the BullMQ FFmpeg queue
      setStage('queued_transcoding');
      await axios.post(`/api/videos/${videoId}/confirm-upload`);

      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      console.error('Upload failed:', err);
      setStage('error');
      setErrorMessage(err.response?.data?.error || err.message || 'Upload failed');
    }
  };

  const handleReset = () => {
    setFile(null);
    setTitle('');
    setDescription('');
    setStage('idle');
    setUploadPercent(0);
    setCreatedVideoId(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <UploadCloud className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-white">Upload & Transcode Video</h2>
          </div>
          <button
            onClick={handleReset}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Stages */}
        {stage === 'idle' && (
          <form onSubmit={handleStartUpload} className="mt-4 space-y-4">
            {/* File Dropzone */}
            <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-950/50 p-6 text-center transition hover:border-emerald-500/50 hover:bg-slate-950 cursor-pointer">
              <Film className="h-10 w-10 text-slate-500 mb-2" />
              <span className="text-sm font-medium text-slate-200">
                {file ? file.name : 'Click to select or drag video file'}
              </span>
              <span className="text-xs text-slate-400 mt-1">
                {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'MP4, MOV, MKV up to 2GB'}
              </span>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
                required
              />
            </label>

            {/* Title Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Video Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. System Design Masterclass"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Add details about this video..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Submit */}
            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!file || !title}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 disabled:opacity-50 transition"
              >
                <UploadCloud className="h-4 w-4" />
                <span>Upload & Start Pipeline</span>
              </button>
            </div>
          </form>
        )}

        {/* Uploading Stage */}
        {stage === 'uploading_s3' && (
          <div className="mt-6 space-y-4 text-center py-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
              <UploadCloud className="h-7 w-7 animate-bounce" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Uploading Directly to Storage</h3>
              <p className="text-xs text-slate-400 mt-1">Streaming via S3 Pre-signed URL without server memory overhead</p>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-150 ease-out"
                style={{ width: `${uploadPercent}%` }}
              />
            </div>
            <p className="text-sm font-bold text-emerald-400">{uploadPercent}% Uploaded</p>
          </div>
        )}

        {/* Queued / Transcoding Stage */}
        {stage === 'queued_transcoding' && (
          <div className="mt-6 space-y-4 text-center py-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
              <Cpu className="h-7 w-7 animate-spin text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Asynchronous HLS Transcoding in Progress</h3>
              <p className="text-xs text-slate-400 mt-1">BullMQ Worker is generating 360p, 720p, 1080p chunks</p>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full transition-all duration-300 ease-out"
                style={{ width: `${currentTranscodePercent || 5}%` }}
              />
            </div>
            <p className="text-sm font-bold text-indigo-400">
              {currentTranscodePercent > 0 ? `${currentTranscodePercent}% Encoded` : 'Worker dispatched...'}
            </p>

            <button
              onClick={handleReset}
              className="mt-4 rounded-xl bg-slate-800 px-5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
            >
              Continue in Background
            </button>
          </div>
        )}

        {/* Error Stage */}
        {stage === 'error' && (
          <div className="mt-6 space-y-4 text-center py-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
              <AlertCircle className="h-7 w-7" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Upload Failed</h3>
              <p className="text-xs text-rose-400 mt-1">{errorMessage}</p>
            </div>
            <button
              onClick={() => setStage('idle')}
              className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
