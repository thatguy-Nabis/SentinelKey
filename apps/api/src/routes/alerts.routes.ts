import { Router } from 'express';
import { listAlerts, acknowledge, resolve } from '../controllers/alerts.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

// GET /alerts — requires alerts:read permission
router.get('/', authenticate, authorize('alerts:read'), listAlerts);

// POST /alerts/:id/acknowledge — requires alerts:write permission
router.post('/:id/acknowledge', authenticate, authorize('alerts:write'), acknowledge);

// POST /alerts/:id/resolve — requires alerts:write permission
router.post('/:id/resolve', authenticate, authorize('alerts:write'), resolve);

export default router;
