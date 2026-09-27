import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import {
  listPolicies,
  getPolicyById,
  updatePolicy,
} from '../controllers/classification.controller.js';

const router = Router();

router.get('/', authenticate, authorize('classify:read'), listPolicies);
router.get('/:id', authenticate, authorize('classify:read'), getPolicyById);
router.put('/:id', authenticate, authorize('classify:write'), updatePolicy);

export default router;
