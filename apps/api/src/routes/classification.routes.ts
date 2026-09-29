import { Router } from 'express';
import { authenticateOrSiteKey } from '../middleware/authenticate-site-key.js';
import { authorize } from '../middleware/authorize.js';
import { apiRateLimiter } from '../middleware/rate-limiter.js';
import {
  classifyEvent,
  classifyFile,
  classifyEmail,
  listClassificationHistory,
} from '../controllers/classification.controller.js';

const router = Router();

router.post('/event', authenticateOrSiteKey, apiRateLimiter, authorize('classify:write'), classifyEvent);
router.post('/file', authenticateOrSiteKey, apiRateLimiter, authorize('classify:write'), classifyFile);
router.post('/email', authenticateOrSiteKey, apiRateLimiter, authorize('classify:write'), classifyEmail);
router.get('/history', authenticateOrSiteKey, apiRateLimiter, authorize('classify:read'), listClassificationHistory);

export default router;
