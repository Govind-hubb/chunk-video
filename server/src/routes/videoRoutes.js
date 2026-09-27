import express from 'express';
import {
  getUploadPresignedUrl,
  confirmUploadAndStartTranscode,
  getAllVideos,
  getVideoById,
  deleteVideo,
} from '../controllers/videoController.js';

const router = express.Router();

router.get('/', getAllVideos);
router.post('/upload-url', getUploadPresignedUrl);
router.post('/:videoId/confirm-upload', confirmUploadAndStartTranscode);
router.get('/:id', getVideoById);
router.delete('/:id', deleteVideo);

export default router;
