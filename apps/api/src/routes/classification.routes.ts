import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import {
  classifyEvent,
  classifyFile,
  classifyEmail,
  listClassificationHistory,
} from '../controllers/classification.controller.js';

const router = Router();

router.post('/event', authenticate, authorize('classify:write'), classifyEvent);
router.post('/file', authenticate, authorize('classify:write'), classifyFile);
router.post('/email', authenticate, authorize('classify:write'), classifyEmail);
router.get('/history', authenticate, authorize('classify:read'), listClassificationHistory);

export default router;
