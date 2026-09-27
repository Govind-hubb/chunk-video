import Video from '../models/Video.js';
import { generateUploadUrl, getStreamUrl } from '../services/storageService.js';
import { addVideoTranscodeJob } from '../queues/videoQueue.js';

export async function getUploadPresignedUrl(req, res) {
  try {
    const { title, description, originalName, contentType, sizeBytes } = req.body;

    if (!title || !originalName) {
      return res.status(400).json({ error: 'Title and originalName are required' });
    }

    const { uploadUrl, fileKey, driver } = await generateUploadUrl({ originalName, contentType });

    // Create an initial video record in the database
    const video = await Video.create({
      title,
      description: description || '',
      rawFileKey: fileKey,
      sizeBytes: sizeBytes || 0,
      status: 'QUEUED',
      progress: 0,
    });

    res.status(200).json({
      videoId: video._id,
      uploadUrl,
      fileKey,
      driver,
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function confirmUploadAndStartTranscode(req, res) {
  try {
    const { videoId } = req.params;
    const video = await Video.findById(videoId);

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    video.status = 'QUEUED';
    video.progress = 0;
    await video.save();

    // Push task to BullMQ queue
    await addVideoTranscodeJob({
      videoId: video._id.toString(),
      rawFileKey: video.rawFileKey,
      title: video.title,
    });

    res.json({
      message: 'Video upload confirmed. Background transcoding started.',
      video,
    });
  } catch (error) {
    console.error('Error starting transcode job:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function getAllVideos(req, res) {
  try {
    const videos = await Video.find().sort({ createdAt: -1 });
    const formatted = videos.map((v) => {
      const doc = v.toObject();
      if (doc.hlsMasterPlaylistUrl) {
        doc.hlsMasterPlaylistUrl = getStreamUrl(doc.hlsMasterPlaylistUrl);
      }
      if (doc.thumbnailUrl) {
        doc.thumbnailUrl = getStreamUrl(doc.thumbnailUrl);
      }
      return doc;
    });
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function getVideoById(req, res) {
  try {
    const { id } = req.params;
    const video = await Video.findById(id);

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Increment view count
    video.views += 1;
    await video.save();

    const doc = video.toObject();
    if (doc.hlsMasterPlaylistUrl) {
      doc.hlsMasterPlaylistUrl = getStreamUrl(doc.hlsMasterPlaylistUrl);
    }
    if (doc.thumbnailUrl) {
      doc.thumbnailUrl = getStreamUrl(doc.thumbnailUrl);
    }
    if (doc.resolutions) {
      doc.resolutions = doc.resolutions.map((r) => ({
        ...r,
        playlistUrl: getStreamUrl(r.playlistUrl),
      }));
    }

    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteVideo(req, res) {
  try {
    const { id } = req.params;
    const video = await Video.findByIdAndDelete(id);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
