import { Router } from 'express';
import { getLogs } from '../controllers/logs.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

// GET /logs — requires logs:read permission
router.get('/', authenticate, authorize('logs:read'), getLogs);

export default router;
