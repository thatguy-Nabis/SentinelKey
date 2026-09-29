import { Router } from 'express';
import { listAlerts, acknowledge, resolve } from '../controllers/alerts.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authenticateOrSiteKey } from '../middleware/authenticate-site-key.js';
import { authorize } from '../middleware/authorize.js';
import { apiRateLimiter } from '../middleware/rate-limiter.js';

const router = Router();

// GET /alerts — requires alerts:read permission
router.get('/', authenticateOrSiteKey, apiRateLimiter, authorize('alerts:read'), listAlerts);

// POST /alerts/:id/acknowledge — requires alerts:write permission
router.post('/:id/acknowledge', authenticate, authorize('alerts:write'), acknowledge);

// POST /alerts/:id/resolve — requires alerts:write permission
router.post('/:id/resolve', authenticate, authorize('alerts:write'), resolve);

export default router;
