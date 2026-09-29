import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authenticateOrSiteKey } from '../middleware/authenticate-site-key.js';
import { authorize } from '../middleware/authorize.js';
import { apiRateLimiter } from '../middleware/rate-limiter.js';
import {
  uploadFile,
  downloadFile,
  listFiles,
  rotateFile,
  getKeyStatus,
  rotateMasterKey,
  encryptField,
  decryptField,
} from '../controllers/files.controller.js';

const router = Router();

// Key & Field encryption routes
router.get(['/keys/status', '/key/status'], authenticateOrSiteKey, apiRateLimiter, authorize('encryption:read'), getKeyStatus);
router.post('/keys/rotate', authenticate, authorize('encryption:write'), rotateMasterKey);
router.post(['/encrypt-field', '/encrypt'], authenticateOrSiteKey, apiRateLimiter, authorize('encryption:write'), encryptField);
router.post(['/decrypt-field', '/decrypt'], authenticateOrSiteKey, apiRateLimiter, authorize('encryption:read'), decryptField);

// File management routes
router.post('/upload', authenticateOrSiteKey, apiRateLimiter, authorize('files:write'), uploadFile);
router.get('/', authenticateOrSiteKey, apiRateLimiter, authorize('files:read'), listFiles);
router.get('/:id/download', authenticateOrSiteKey, apiRateLimiter, authorize('files:read'), downloadFile);
router.post('/:id/rotate', authenticateOrSiteKey, apiRateLimiter, authorize('files:write'), rotateFile);

export default router;
