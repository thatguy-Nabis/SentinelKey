import { Router } from 'express';
import * as authCtrl from '../controllers/auth.controller.js';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate.js';
import { rateLimiter } from '../middleware/rate-limiter.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// POST /auth/register — public, rate-limited
router.post(
  '/register',
  rateLimiter,
  validate([
    { field: 'email', type: 'email', required: true },
    { field: 'password', type: 'string', required: true, minLength: 8, maxLength: 128 },
  ]),
  authCtrl.register,
);

// POST /auth/login — public, rate-limited
router.post(
  '/login',
  rateLimiter,
  validate([
    { field: 'email', type: 'email', required: true },
    { field: 'password', type: 'string', required: true },
  ]),
  authCtrl.login,
);

// POST /auth/refresh — public (requires refresh token in body)
router.post('/refresh', authCtrl.refreshToken);

// POST /auth/logout — authenticated
router.post('/logout', authenticate, authCtrl.logout);

// GET /auth/me — authenticated
router.get('/me', authenticate, authCtrl.getMe);

// POST /auth/mfa/setup — authenticated
router.post('/mfa/setup', authenticate, authCtrl.mfaSetup);

// POST /auth/mfa/verify — public (with mfaToken) or authenticated (setup confirmation)
router.post(
  '/mfa/verify',
  rateLimiter,
  optionalAuthenticate,
  validate([{ field: 'code', type: 'string', required: true }]),
  authCtrl.mfaVerify,
);

// POST /auth/mfa/disable — authenticated
router.post(
  '/mfa/disable',
  authenticate,
  validate([{ field: 'password', type: 'string', required: true }]),
  authCtrl.mfaDisable,
);

// POST /auth/change-password — authenticated, rate-limited
router.post(
  '/change-password',
  rateLimiter,
  authenticate,
  validate([
    { field: 'currentPassword', type: 'string', required: true },
    { field: 'newPassword', type: 'string', required: true, minLength: 8, maxLength: 128 },
  ]),
  authCtrl.changePassword,
);

export default router;
