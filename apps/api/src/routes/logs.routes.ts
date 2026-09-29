import { Router } from 'express';
import { getLogs } from '../controllers/logs.controller.js';
import { authenticateOrSiteKey } from '../middleware/authenticate-site-key.js';
import { authorize } from '../middleware/authorize.js';
import { apiRateLimiter } from '../middleware/rate-limiter.js';

const router = Router();

// GET /logs — requires logs:read permission
router.get('/', authenticateOrSiteKey, apiRateLimiter, authorize('logs:read'), getLogs);

export default router;
