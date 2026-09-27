import mongoose from 'mongoose';

const ResolutionSchema = new mongoose.Schema({
  resolution: { type: String, enum: ['360p', '720p', '1080p'], required: true },
  playlistUrl: { type: String, required: true },
  bitrate: { type: Number },
  width: { type: Number },
  height: { type: Number },
}, { _id: false });

const VideoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a video title'],
    trim: true,
    maxlength: 120,
  },
  description: {
    type: String,
    default: '',
    maxlength: 2000,
  },
  uploader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  status: {
    type: String,
    enum: ['QUEUED', 'PROCESSING', 'READY', 'FAILED'],
    default: 'QUEUED',
    index: true,
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  errorMessage: {
    type: String,
    default: null,
  },
  duration: {
    type: Number,
    default: 0,
  },
  rawFileKey: {
    type: String,
    required: true,
  },
  hlsMasterPlaylistUrl: {
    type: String,
    default: null,
  },
  thumbnailUrl: {
    type: String,
    default: null,
  },
  resolutions: [ResolutionSchema],
  views: {
    type: Number,
    default: 0,
  },
  sizeBytes: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

VideoSchema.index({ createdAt: -1, status: 1 });

export default mongoose.models.Video || mongoose.model('Video', VideoSchema);
