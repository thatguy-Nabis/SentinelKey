import { describe, it, expect } from 'vitest';
import {
  haversineDistance,
  calculateGeoVelocity,
  evaluateFailedLoginBurst,
  evaluateImpossibleTravel,
  evaluatePrivilegeEscalation,
  evaluateTokenReuse,
  evaluateMfaLockout,
  evaluateHeuristics,
  DEFAULT_HEURISTIC_CONFIG,
} from '../src/services/heuristics.service.js';
import type { ISecurityEvent, IGeoLocation } from '@sentinelkey/shared-types';

describe('Heuristics Engine (IDS Rules)', () => {
  const locNY: IGeoLocation = { city: 'New York', country: 'US', latitude: 40.7128, longitude: -74.006 };
  const locLondon: IGeoLocation = { city: 'London', country: 'UK', latitude: 51.5074, longitude: -0.1278 };
  const locTokyo: IGeoLocation = { city: 'Tokyo', country: 'JP', latitude: 35.6762, longitude: 139.6503 };

  describe('Haversine Distance & Velocity', () => {
    it('calculates accurate distance between New York and London (~5570 km)', () => {
      const dist = haversineDistance(locNY, locLondon);
      expect(dist).toBeGreaterThan(5500);
      expect(dist).toBeLessThan(5650);
    });

    it('calculates velocity correctly between two locations and timestamps', () => {
      const t1 = new Date('2026-09-27T10:00:00Z');
      const t2 = new Date('2026-09-27T12:00:00Z'); // 2 hours later

      const { distanceKm, timeHours, velocityKmH } = calculateGeoVelocity(locNY, t1, locLondon, t2);

      expect(timeHours).toBe(2);
      expect(distanceKm).toBeGreaterThan(5500);
      expect(velocityKmH).toBeCloseTo(distanceKm / 2, 0);
    });
  });

  describe('Rule 1: Failed Login Burst (Brute Force)', () => {
    it('generates alert when 10 failed logins occur in under a minute', () => {
      const baseTime = Date.now();
      const events: ISecurityEvent[] = [];

      // 9 previous failed attempts over 45 seconds from same IP
      for (let i = 0; i < 9; i++) {
        events.push({
          _id: `evt-fail-${i}`,
          type: 'AUTH_LOGIN_FAILED',
          ip: '198.51.100.25',
          timestamp: new Date(baseTime - (45 - i * 5) * 1000),
          severity: 'low',
          metadata: { email: 'victim@sentinelkey.local' },
        });
      }

      // 10th failed attempt right now
      const currentEvent: ISecurityEvent = {
        _id: 'evt-fail-10',
        type: 'AUTH_LOGIN_FAILED',
        ip: '198.51.100.25',
        timestamp: new Date(baseTime),
        severity: 'low',
        metadata: { email: 'victim@sentinelkey.local' },
      };

      const alert = evaluateFailedLoginBurst(currentEvent, events);

      expect(alert).not.toBeNull();
      expect(alert?.rule).toBe('FAILED_LOGIN_BURST');
      expect(alert?.severity).toBe('critical'); // >= 10 is critical
      expect(alert?.triggerEventIds).toHaveLength(10);
      expect(alert?.ip).toBe('198.51.100.25');
    });

    it('generates high severity alert when 5 failed logins occur', () => {
      const baseTime = Date.now();
      const events: ISecurityEvent[] = [];

      for (let i = 0; i < 4; i++) {
        events.push({
          _id: `evt-fail-${i}`,
          type: 'AUTH_LOGIN_FAILED',
          ip: '198.51.100.30',
          timestamp: new Date(baseTime - (30 - i * 5) * 1000),
          severity: 'low',
        });
      }

      const currentEvent: ISecurityEvent = {
        _id: 'evt-fail-5',
        type: 'AUTH_LOGIN_FAILED',
        ip: '198.51.100.30',
        timestamp: new Date(baseTime),
        severity: 'low',
      };

      const alert = evaluateFailedLoginBurst(currentEvent, events);

      expect(alert).not.toBeNull();
      expect(alert?.rule).toBe('FAILED_LOGIN_BURST');
      expect(alert?.severity).toBe('high');
      expect(alert?.triggerEventIds).toHaveLength(5);
    });

    it('does not trigger if failed logins are spread outside the 60s window', () => {
      const baseTime = Date.now();
      const events: ISecurityEvent[] = [
        {
          _id: 'evt-old-1',
          type: 'AUTH_LOGIN_FAILED',
          ip: '198.51.100.30',
          timestamp: new Date(baseTime - 120_000), // 2 minutes ago
          severity: 'low',
        },
      ];

      const currentEvent: ISecurityEvent = {
        _id: 'evt-current',
        type: 'AUTH_LOGIN_FAILED',
        ip: '198.51.100.30',
        timestamp: new Date(baseTime),
        severity: 'low',
      };

      const alert = evaluateFailedLoginBurst(currentEvent, events);
      expect(alert).toBeNull();
    });
  });

  describe('Rule 2: Geo-Velocity (Impossible Travel)', () => {
    it('triggers critical alert when logins from NY and London occur 15 minutes apart', () => {
      const t1 = new Date('2026-09-27T10:00:00Z');
      const t2 = new Date('2026-09-27T10:15:00Z'); // 15 minutes later

      const nyLogin: ISecurityEvent = {
        _id: 'login-ny',
        type: 'AUTH_LOGIN_SUCCESS',
        userId: 'user-traveler-1',
        ip: '198.51.100.1',
        timestamp: t1,
        severity: 'info',
        metadata: { location: locNY },
      };

      const londonLogin: ISecurityEvent = {
        _id: 'login-london',
        type: 'AUTH_LOGIN_SUCCESS',
        userId: 'user-traveler-1',
        ip: '198.51.100.2',
        timestamp: t2,
        severity: 'info',
        metadata: { location: locLondon },
      };

      const alert = evaluateImpossibleTravel(londonLogin, [nyLogin]);

      expect(alert).not.toBeNull();
      expect(alert?.rule).toBe('GEO_VELOCITY_IMPOSSIBLE_TRAVEL');
      expect(alert?.severity).toBe('critical');
      expect(alert?.userId).toBe('user-traveler-1');
      expect(alert?.metadata.calculatedVelocityKmH).toBeGreaterThan(20000); // ~22,000 km/h!
      expect(alert?.triggerEventIds).toEqual(['login-ny', 'login-london']);
    });

    it('does not trigger for physically plausible travel (NY to London 10 hours later)', () => {
      const t1 = new Date('2026-09-27T10:00:00Z');
      const t2 = new Date('2026-09-27T20:00:00Z'); // 10 hours later (average flight ~7-8h)

      const nyLogin: ISecurityEvent = {
        _id: 'login-ny',
        type: 'AUTH_LOGIN_SUCCESS',
        userId: 'user-traveler-2',
        ip: '198.51.100.1',
        timestamp: t1,
        severity: 'info',
        metadata: { location: locNY },
      };

      const londonLogin: ISecurityEvent = {
        _id: 'login-london',
        type: 'AUTH_LOGIN_SUCCESS',
        userId: 'user-traveler-2',
        ip: '198.51.100.2',
        timestamp: t2,
        severity: 'info',
        metadata: { location: locLondon },
      };

      const alert = evaluateImpossibleTravel(londonLogin, [nyLogin]);
      expect(alert).toBeNull();
    });
  });

  describe('Rule 3: Privilege Escalation Pattern', () => {
    it('triggers alert on 3 permission denials within 5 minutes', () => {
      const now = Date.now();
      const events: ISecurityEvent[] = [
        {
          _id: 'denial-1',
          type: 'PERMISSION_DENIED',
          userId: 'user-attacker',
          ip: '203.0.113.5',
          timestamp: new Date(now - 120_000),
          severity: 'medium',
          metadata: { path: '/admin/settings', requiredPermission: 'settings:manage' },
        },
        {
          _id: 'denial-2',
          type: 'PERMISSION_DENIED',
          userId: 'user-attacker',
          ip: '203.0.113.5',
          timestamp: new Date(now - 60_000),
          severity: 'medium',
          metadata: { path: '/admin/roles', requiredPermission: 'roles:write' },
        },
      ];

      const currentEvent: ISecurityEvent = {
        _id: 'denial-3',
        type: 'PERMISSION_DENIED',
        userId: 'user-attacker',
        ip: '203.0.113.5',
        timestamp: new Date(now),
        severity: 'medium',
        metadata: { path: '/admin/users', requiredPermission: 'users:delete' },
      };

      const alert = evaluatePrivilegeEscalation(currentEvent, events);

      expect(alert).not.toBeNull();
      expect(alert?.rule).toBe('PRIVILEGE_ESCALATION_BURST');
      expect(alert?.userId).toBe('user-attacker');
      expect(alert?.triggerEventIds).toHaveLength(3);
    });
  });

  describe('Rule 4: Token Reuse Anomaly', () => {
    it('immediately triggers critical alert on token reuse event', () => {
      const reuseEvent: ISecurityEvent = {
        _id: 'evt-reuse',
        type: 'AUTH_TOKEN_REUSE',
        userId: 'victim-user-id',
        ip: '198.51.100.99',
        timestamp: new Date(),
        severity: 'critical',
      };

      const alert = evaluateTokenReuse(reuseEvent);

      expect(alert).not.toBeNull();
      expect(alert?.rule).toBe('TOKEN_REUSE_ANOMALY');
      expect(alert?.severity).toBe('critical');
      expect(alert?.triggerEventIds).toEqual(['evt-reuse']);
    });
  });

  describe('Rule 5: MFA Lockout Anomaly', () => {
    it('immediately triggers high severity alert on MFA lockout event', () => {
      const lockoutEvent: ISecurityEvent = {
        _id: 'evt-lockout',
        type: 'MFA_LOCKOUT',
        userId: 'user-locked-out',
        ip: '203.0.113.44',
        timestamp: new Date(),
        severity: 'high',
        metadata: { failedAttempts: 5 },
      };

      const alert = evaluateMfaLockout(lockoutEvent);

      expect(alert).not.toBeNull();
      expect(alert?.rule).toBe('MFA_LOCKOUT_ANOMALY');
      expect(alert?.severity).toBe('high');
      expect(alert?.triggerEventIds).toEqual(['evt-lockout']);
    });
  });

  describe('evaluateHeuristics (Master Dispatcher)', () => {
    it('evaluates and collects all triggered alerts', () => {
      const event: ISecurityEvent = {
        _id: 'evt-mfa-lockout-test',
        type: 'MFA_LOCKOUT',
        userId: 'user-lockout-123',
        ip: '192.168.1.1',
        timestamp: new Date(),
        severity: 'high',
      };

      const alerts = evaluateHeuristics(event, []);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].rule).toBe('MFA_LOCKOUT_ANOMALY');
    });
  });
});
