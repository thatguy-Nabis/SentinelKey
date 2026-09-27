import type {
  ISecurityEvent,
  IGeoLocation,
  HeuristicRule,
  AlertSeverity,
} from '@sentinelkey/shared-types';

export interface IAlertCandidate {
  title: string;
  description: string;
  rule: HeuristicRule;
  severity: AlertSeverity;
  userId?: string;
  ip: string;
  triggerEventIds: string[];
  metadata: Record<string, unknown>;
}

export interface IHeuristicConfig {
  failedLoginThreshold: number; // e.g. 5
  failedLoginCriticalThreshold: number; // e.g. 10
  failedLoginWindowMs: number; // e.g. 60,000 ms (1 minute)
  maxPlausibleVelocityKmH: number; // e.g. 800 km/h (commercial flight)
  minDistanceForVelocityCheckKm: number; // e.g. 100 km (ignore minor IP geo-location noise)
  privilegeEscalationThreshold: number; // e.g. 3
  privilegeEscalationWindowMs: number; // e.g. 300,000 ms (5 minutes)
}

export const DEFAULT_HEURISTIC_CONFIG: IHeuristicConfig = {
  failedLoginThreshold: 5,
  failedLoginCriticalThreshold: 10,
  failedLoginWindowMs: 60_000, // 1 minute
  maxPlausibleVelocityKmH: 800, // 800 km/h
  minDistanceForVelocityCheckKm: 100, // 100 km
  privilegeEscalationThreshold: 3,
  privilegeEscalationWindowMs: 300_000, // 5 minutes
};

/**
 * Calculate the great-circle distance between two geographic coordinates using the Haversine formula.
 * Returns distance in kilometers.
 */
export function haversineDistance(loc1: IGeoLocation, loc2: IGeoLocation): number {
  const EARTH_RADIUS_KM = 6371;

  const toRad = (degrees: number) => (degrees * Math.PI) / 180;

  const lat1Rad = toRad(loc1.latitude);
  const lat2Rad = toRad(loc2.latitude);
  const deltaLat = toRad(loc2.latitude - loc1.latitude);
  const deltaLon = toRad(loc2.longitude - loc1.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Calculate travel velocity between two timestamped geographic locations.
 */
export function calculateGeoVelocity(
  loc1: IGeoLocation,
  time1: Date | string,
  loc2: IGeoLocation,
  time2: Date | string,
): { distanceKm: number; timeHours: number; velocityKmH: number } {
  const distanceKm = haversineDistance(loc1, loc2);
  const t1 = new Date(time1).getTime();
  const t2 = new Date(time2).getTime();
  const elapsedMs = Math.abs(t2 - t1);

  // Avoid division by zero: minimum 1 second (1000ms)
  const timeHours = Math.max(elapsedMs, 1000) / (1000 * 60 * 60);
  const velocityKmH = distanceKm / timeHours;

  return { distanceKm, timeHours, velocityKmH };
}

/**
 * Rule 1: Failed Login Burst (Brute Force Detection).
 * Checks if failed logins reach or exceed the threshold within the configured time window.
 */
export function evaluateFailedLoginBurst(
  currentEvent: ISecurityEvent,
  recentEvents: ISecurityEvent[],
  config: IHeuristicConfig = DEFAULT_HEURISTIC_CONFIG,
): IAlertCandidate | null {
  if (currentEvent.type !== 'AUTH_LOGIN_FAILED' && currentEvent.type !== 'MFA_LOGIN_FAILED') {
    return null;
  }

  const currentTime = new Date(currentEvent.timestamp).getTime();
  const windowStart = currentTime - config.failedLoginWindowMs;

  // Filter events matching the same IP or same target user/email within window
  const currentEmail = currentEvent.metadata?.email;
  const currentIp = currentEvent.ip;

  const relatedFailures = recentEvents.filter(e => {
    const isFailed = e.type === 'AUTH_LOGIN_FAILED' || e.type === 'MFA_LOGIN_FAILED';
    if (!isFailed) return false;

    const eTime = new Date(e.timestamp).getTime();
    if (eTime < windowStart || eTime > currentTime) return false;

    const matchesIp = e.ip === currentIp;
    const matchesEmail = currentEmail && e.metadata?.email === currentEmail;
    const matchesUser = currentEvent.userId && e.userId === currentEvent.userId;

    return matchesIp || matchesEmail || matchesUser;
  });

  // Include current event in the count
  const allFailures = [
    ...relatedFailures.filter(e => e._id !== currentEvent._id),
    currentEvent,
  ];

  if (allFailures.length >= config.failedLoginThreshold) {
    const isCritical = allFailures.length >= config.failedLoginCriticalThreshold;
    const severity: AlertSeverity = isCritical ? 'critical' : 'high';

    return {
      title: `Brute-force login burst detected (${allFailures.length} attempts in ${config.failedLoginWindowMs / 1000}s)`,
      description: `Detected ${allFailures.length} failed login attempts from IP ${currentIp}${currentEmail ? ` targeting ${currentEmail}` : ''} within ${config.failedLoginWindowMs / 1000} seconds. Potential credential stuffing or brute-force attack.`,
      rule: 'FAILED_LOGIN_BURST',
      severity,
      userId: currentEvent.userId,
      ip: currentIp,
      triggerEventIds: allFailures.map(e => e._id),
      metadata: {
        attemptCount: allFailures.length,
        timeWindowMs: config.failedLoginWindowMs,
        targetEmail: currentEmail,
      },
    };
  }

  return null;
}

/**
 * Rule 2: Geo-Velocity Check (Impossible Travel).
 * Compares current successful login against recent successful logins for the same user.
 */
export function evaluateImpossibleTravel(
  currentEvent: ISecurityEvent,
  recentEvents: ISecurityEvent[],
  config: IHeuristicConfig = DEFAULT_HEURISTIC_CONFIG,
): IAlertCandidate | null {
  if (currentEvent.type !== 'AUTH_LOGIN_SUCCESS' && currentEvent.type !== 'MFA_LOGIN_SUCCESS') {
    return null;
  }

  const currentLoc = currentEvent.metadata?.location;
  if (!currentLoc || typeof currentLoc.latitude !== 'number' || typeof currentLoc.longitude !== 'number') {
    return null;
  }

  if (!currentEvent.userId) {
    return null;
  }

  const currentTime = new Date(currentEvent.timestamp).getTime();

  // Find previous successful login events for this user with location
  const previousLogins = recentEvents.filter(e => {
    if (e._id === currentEvent._id) return false;
    if (e.userId !== currentEvent.userId) return false;
    const isSuccess = e.type === 'AUTH_LOGIN_SUCCESS' || e.type === 'MFA_LOGIN_SUCCESS';
    if (!isSuccess) return false;

    const loc = e.metadata?.location;
    if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') return false;

    const eTime = new Date(e.timestamp).getTime();
    return eTime <= currentTime;
  });

  // Sort descending by time to inspect the most recent previous login
  previousLogins.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (previousLogins.length === 0) {
    return null;
  }

  const lastLogin = previousLogins[0];
  const lastLoc = lastLogin.metadata!.location!;

  const { distanceKm, timeHours, velocityKmH } = calculateGeoVelocity(
    lastLoc,
    lastLogin.timestamp,
    currentLoc,
    currentEvent.timestamp,
  );

  // Check if distance is significant and velocity exceeds plausible physical travel speed
  if (
    distanceKm >= config.minDistanceForVelocityCheckKm &&
    velocityKmH > config.maxPlausibleVelocityKmH
  ) {
    const roundedDistance = Math.round(distanceKm);
    const roundedVelocity = Math.round(velocityKmH);
    const elapsedMinutes = Math.max(1, Math.round(timeHours * 60));

    return {
      title: `Impossible travel detected (~${roundedVelocity} km/h between logins)`,
      description: `User ${currentEvent.userId} logged in from ${currentLoc.city ?? 'Location B'} (${currentEvent.ip}) only ${elapsedMinutes} minute(s) after logging in from ${lastLoc.city ?? 'Location A'} (${lastLogin.ip}). Travel distance is ${roundedDistance} km, requiring an implausible speed of ~${roundedVelocity} km/h.`,
      rule: 'GEO_VELOCITY_IMPOSSIBLE_TRAVEL',
      severity: 'critical',
      userId: currentEvent.userId,
      ip: currentEvent.ip,
      triggerEventIds: [lastLogin._id, currentEvent._id],
      metadata: {
        distanceKm: roundedDistance,
        elapsedMinutes,
        calculatedVelocityKmH: roundedVelocity,
        previousLocation: lastLoc,
        currentLocation: currentLoc,
        previousIp: lastLogin.ip,
        currentIp: currentEvent.ip,
      },
    };
  }

  return null;
}

/**
 * Rule 3: Privilege Escalation Attempt Pattern.
 * Detects multiple 403 Forbidden events on sensitive routes in a short window.
 */
export function evaluatePrivilegeEscalation(
  currentEvent: ISecurityEvent,
  recentEvents: ISecurityEvent[],
  config: IHeuristicConfig = DEFAULT_HEURISTIC_CONFIG,
): IAlertCandidate | null {
  if (currentEvent.type !== 'PERMISSION_DENIED') {
    return null;
  }

  const currentTime = new Date(currentEvent.timestamp).getTime();
  const windowStart = currentTime - config.privilegeEscalationWindowMs;

  const relatedDenials = recentEvents.filter(e => {
    if (e.type !== 'PERMISSION_DENIED') return false;
    const eTime = new Date(e.timestamp).getTime();
    if (eTime < windowStart || eTime > currentTime) return false;

    const matchesUser = currentEvent.userId && e.userId === currentEvent.userId;
    const matchesIp = e.ip === currentEvent.ip;
    return matchesUser || matchesIp;
  });

  const allDenials = [
    ...relatedDenials.filter(e => e._id !== currentEvent._id),
    currentEvent,
  ];

  if (allDenials.length >= config.privilegeEscalationThreshold) {
    return {
      title: `Privilege escalation pattern detected (${allDenials.length} permission denials)`,
      description: `Multiple authorization failures (${allDenials.length} attempts in ${config.privilegeEscalationWindowMs / 1000}s) from ${currentEvent.userId ? `user ${currentEvent.userId}` : `IP ${currentEvent.ip}`}. Potential permission enumeration or escalation attempt.`,
      rule: 'PRIVILEGE_ESCALATION_BURST',
      severity: 'medium',
      userId: currentEvent.userId,
      ip: currentEvent.ip,
      triggerEventIds: allDenials.map(e => e._id),
      metadata: {
        denialCount: allDenials.length,
        paths: allDenials.map(e => e.metadata?.path).filter(Boolean),
        requiredPermissions: allDenials.map(e => e.metadata?.requiredPermission).filter(Boolean),
      },
    };
  }

  return null;
}

/**
 * Rule 4: Refresh Token Reuse Anomaly.
 * Instant high-priority alert when a previously consumed refresh token is presented.
 */
export function evaluateTokenReuse(currentEvent: ISecurityEvent): IAlertCandidate | null {
  if (currentEvent.type !== 'AUTH_TOKEN_REUSE') {
    return null;
  }

  return {
    title: 'Refresh token reuse detected (Session Hijacking risk)',
    description: `A previously rotated refresh token was reused by IP ${currentEvent.ip}${currentEvent.userId ? ` for user ${currentEvent.userId}` : ''}. All sessions were automatically revoked as a protective measure. Credential theft or replay attack suspected.`,
    rule: 'TOKEN_REUSE_ANOMALY',
    severity: 'critical',
    userId: currentEvent.userId,
    ip: currentEvent.ip,
    triggerEventIds: [currentEvent._id],
    metadata: {
      timestamp: currentEvent.timestamp,
      actionTaken: 'ALL_SESSIONS_REVOKED',
    },
  };
}

/**
 * Rule 5: MFA Lockout Anomaly.
 * Instant alert when a user exceeds maximum failed MFA attempts.
 */
export function evaluateMfaLockout(currentEvent: ISecurityEvent): IAlertCandidate | null {
  if (currentEvent.type !== 'MFA_LOCKOUT') {
    return null;
  }

  return {
    title: `MFA account lockout triggered (IP: ${currentEvent.ip})`,
    description: `User account ${currentEvent.userId ?? 'unknown'} was locked after exceeding maximum failed MFA attempts from IP ${currentEvent.ip}. Potential second-factor brute-force attempt.`,
    rule: 'MFA_LOCKOUT_ANOMALY',
    severity: 'high',
    userId: currentEvent.userId,
    ip: currentEvent.ip,
    triggerEventIds: [currentEvent._id],
    metadata: {
      failedAttempts: currentEvent.metadata?.failedAttempts,
    },
  };
}

/**
 * Main evaluation entrypoint: evaluates all heuristic rules against incoming event and history.
 */
export function evaluateHeuristics(
  currentEvent: ISecurityEvent,
  recentEvents: ISecurityEvent[] = [],
  config: IHeuristicConfig = DEFAULT_HEURISTIC_CONFIG,
): IAlertCandidate[] {
  const alerts: IAlertCandidate[] = [];

  const burstAlert = evaluateFailedLoginBurst(currentEvent, recentEvents, config);
  if (burstAlert) alerts.push(burstAlert);

  const travelAlert = evaluateImpossibleTravel(currentEvent, recentEvents, config);
  if (travelAlert) alerts.push(travelAlert);

  const privAlert = evaluatePrivilegeEscalation(currentEvent, recentEvents, config);
  if (privAlert) alerts.push(privAlert);

  const reuseAlert = evaluateTokenReuse(currentEvent);
  if (reuseAlert) alerts.push(reuseAlert);

  const mfaLockoutAlert = evaluateMfaLockout(currentEvent);
  if (mfaLockoutAlert) alerts.push(mfaLockoutAlert);

  return alerts;
}
