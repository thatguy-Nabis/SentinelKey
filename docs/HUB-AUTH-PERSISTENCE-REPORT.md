# Investigation & Architecture Report: Hub Auth Persistence & Credential Storage

> The full feature report has been saved to:
> [`docs/feature-reports/hub-auth-persistence-report.md`](file:///d:/Projects/SentinelKey/docs/feature-reports/hub-auth-persistence-report.md)

---

## Implemented Local Resolutions (100% Local, Zero External Dependencies)

1. **Local Persistent Database (`data/mongo-dev`)**:
   - `MongoMemoryServer` in [`apps/api/src/db/memory-mongo.ts`](file:///d:/Projects/SentinelKey/apps/api/src/db/memory-mongo.ts) now writes WiredTiger database files directly to `data/mongo-dev/` on local disk during dev mode.
   - User registrations, passwords, and sessions now survive all dev server reboots and code reload cycles with **zero Docker or external Mongo requirements**.

2. **Synchronous Session Restoration & Race Guard**:
   - In [`apps/website/src/services/api.ts`](file:///d:/Projects/SentinelKey/apps/website/src/services/api.ts) and [`AuthContext.tsx`](file:///d:/Projects/SentinelKey/apps/website/src/context/AuthContext.tsx), `accessToken` and user profile are persisted in web storage (`sessionStorage` and `localStorage`).
   - Page reloads (`F5`) no longer suffer from token dropouts or 401 refresh token collisions.

3. **Real Password Update Endpoint**:
   - Implemented `POST /auth/change-password` in [`apps/api/src/routes/auth.routes.ts`](file:///d:/Projects/SentinelKey/apps/api/src/routes/auth.routes.ts).
   - Connected [`apps/website/src/pages/SettingsPage.tsx`](file:///d:/Projects/SentinelKey/apps/website/src/pages/SettingsPage.tsx) to update the real bcrypt hash in MongoDB, allowing immediate logins with the new password.

4. **Protected Route Guards**:
   - Created [`apps/website/src/components/auth/ProtectedRoute.tsx`](file:///d:/Projects/SentinelKey/apps/website/src/components/auth/ProtectedRoute.tsx) and wrapped `/app`, `/app/billing`, and `/app/settings`. Unauthenticated visits are cleanly redirected to `/login`.

---

See the comprehensive report at:
[`docs/feature-reports/hub-auth-persistence-report.md`](file:///d:/Projects/SentinelKey/docs/feature-reports/hub-auth-persistence-report.md)
