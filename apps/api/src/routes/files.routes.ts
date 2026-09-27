import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
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
router.get('/keys/status', authenticate, authorize('encryption:read'), getKeyStatus);
router.post('/keys/rotate', authenticate, authorize('encryption:write'), rotateMasterKey);
router.post('/encrypt-field', authenticate, authorize('encryption:write'), encryptField);
router.post('/decrypt-field', authenticate, authorize('encryption:read'), decryptField);

// File management routes
router.post('/upload', authenticate, authorize('files:write'), uploadFile);
router.get('/', authenticate, authorize('files:read'), listFiles);
router.get('/:id/download', authenticate, authorize('files:read'), downloadFile);
router.post('/:id/rotate', authenticate, authorize('files:write'), rotateFile);

export default router;
