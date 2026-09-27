import type { Request, Response, NextFunction } from 'express';
import type { Permission } from '@sentinelkey/shared-types';

/**
 * Middleware factory: check that the authenticated user has a specific permission.
 * Must be used AFTER the `authenticate` middleware.
 *
 * Usage: router.get('/admin', authenticate, authorize('settings:manage'), handler);
 */
export function authorize(...requiredPermissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    const userPermissions = new Set(req.user.permissions);
    const missing = requiredPermissions.filter(p => !userPermissions.has(p));

    if (missing.length > 0) {
      const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
      import('../services/event-logger.service.js')
        .then(({ emitSecurityEvent }) => {
          emitSecurityEvent({
            type: 'PERMISSION_DENIED',
            ip,
            userId: req.user?.sub,
            severity: 'medium',
            metadata: {
              path: req.originalUrl || req.path,
              method: req.method,
              requiredPermission: requiredPermissions.join(', '),
              missingPermissions: missing.join(', '),
            },
          }).catch(() => {});
        })
        .catch(() => {});

      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          details: { required: requiredPermissions, missing },
        },
      });
      return;
    }

    next();
  };
}
