# SentinelKey Mobile Security Console: Audit & Implementation Plan

## Executive Summary
This document outlines the presentation-layer transformation of the SentinelKey Security Operations Console (`apps/dashboard`) into a purpose-built mobile security console for mobile screens (360px–430px) and tablets (768px), while keeping the desktop experience 100% visually and functionally unchanged.

---

## Step 1: Frontend Route & Component Audit (at 390px Viewport)

| Route / Screen / Component | Current Desktop Behavior | What Breaks on a 390px Screen |
| :--- | :--- | :--- |
| **Global Layout & Navigation** (`App.tsx`, `Sidebar.tsx`, `Navbar.tsx`) | 260px fixed left sidebar with navigation and branding; sticky top navbar with user profile badges, status indicators, and logout. | Fixed 260px sidebar permanently covers 67% of a 390px screen. Content margin (`margin-left: 260px`) crushes the viewport to 130px. Header badges (roles, MFA status, email) wrap chaotically and overflow horizontally. No safe-area padding for notch/home indicators. |
| **Security Overview** (`OverviewView.tsx`) | Multi-column metrics grid (`stats-grid`), 2-column chart grid (`charts-grid`), and horizontal action bar with test telemetry triggers. | Telemetry selector bar wraps into 5 stacked awkward rows. Chart.js canvases trigger horizontal scrolling, dense tick labels collide, and tooltips depend on hover (unusable on touch). Bottom grid (`gridTemplateColumns: '1.2fr 1fr'`) crushes the IP chart and Service Guide into unreadable ~180px slivers. |
| **IDS Alerts Triage** (`AlertsView.tsx`) | Status filter tabs bar with inline select; alert cards with right-aligned action buttons (`minWidth: 130`) side-by-side with description. | Filter bar overflows horizontally. Alert cards with side-by-side flexbox squish the title and description into an unusable narrow strip. Long IP addresses and trigger event IDs overflow. Buttons lack 44px thumb targets. |
| **Security Event Audit Stream** (`LogsView.tsx`) | 7-column wide data table (`Timestamp`, `Event Type`, `Severity`, `IP`, `User ID`, `Details`, `Inspect`) with search and dual dropdowns. | 7-column table causes extreme horizontal scroll (~800px+). Filter controls stack and overflow. Modal details dialog opens in a fixed desktop box with tiny code text and unpadded borders. |
| **MFA Configuration** (`MfaSettingsView.tsx`) | Two-column setup layout: 180px QR code beside instructions; 4-column grid for backup recovery codes. | Side-by-side QR layout exceeds 390px viewport width and causes horizontal scroll. 4-column backup code grid clips 8-character codes into ~65px boxes. Verification form buttons squish together. |
| **Access Control (RBAC)** (`AdminView.tsx`) | 4-column matrix table displaying 16 permission keys against Admin, Analyst, and Viewer checkmarks. | Wide matrix table causes horizontal scrolling and tiny tap targets for viewing permissions. |
| **Authentication Modal** (`AuthModal.tsx`) | Centered modal overlay with fixed max-width and standard 14px inputs. | Inputs trigger iOS Safari auto-zoom (<16px font-size). Virtual keyboard covers submit buttons. Modal margins create awkward letterboxing on mobile screens. |

---

## Step 2: Screen-by-Screen Mobile Transformation Plan

### 1. Navigation & Layout
- **Desktop**: Preserves fixed 260px sidebar and desktop top navbar.
- **Mobile (<768px)**:
  - Sidebar hidden.
  - Sticky compact mobile header with page title, live IDS pulse indicator, real-time alert badge, and quick menu trigger.
  - Native bottom tab bar with 4 primary destinations:
    1. **Dashboard** (`Overview`)
    2. **Alerts** (`IDS Alerts` with dynamic open badge count)
    3. **Activity** (`Security Logs`)
    4. **More** (opens smooth slide-over drawer with MFA Config, RBAC Matrix, User Profile info, and Sign Out).
  - Safe-area insets (`env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`), `dvh` units, and container padding.

### 2. Dashboard (`OverviewView.tsx`)
- **Top Glanceable Status**: Immediate system posture card with bold count of open/critical threats as large touchable cards that jump directly to triage.
- **Urgency-Ordered Single Flow**:
  1. Urgent IDS Alerts & Critical Threats summary cards.
  2. Live Telemetry Target selector with a compact action trigger that opens a bottom sheet to trigger clean pings or attack simulations.
  3. Responsive activity chart (simplified axes, larger touch points, tap-to-reveal tooltip).
  4. Severity doughnut chart with touch legend.
  5. Top Flagged IPs rendered as ranked cards with tap-to-copy IP pills.
  6. Service Guide collapsed in an accessible accordion section.

### 3. Alerts Triage (`AlertsView.tsx`)
- **Card-Based Triage**: Each alert renders as an urgency card with a prominent severity indicator combining Color + Icon (ShieldAlert, AlertTriangle, Info) + Text ("CRITICAL", "HIGH", etc.) — never color alone.
- **Tap-to-Copy**: Source IPs formatted as copyable pills with instant feedback.
- **Action Bar**: Large 44px+ thumb targets for "Acknowledge" and "Resolve" positioned at the bottom of the card for easy single-hand reach.
- **Filters**: Sticky filter bar with active filter chips (`Status: Open ✕`, `Severity: Critical ✕`) and a button triggering a bottom sheet filter drawer.

### 4. Security Event Audit Stream (`LogsView.tsx`)
- **Desktop**: 7-column table stays unchanged.
- **Mobile (<768px)**: DO NOT shrink tables. Convert each event into a purpose-built Mobile Event Card with severity badge, monospace event type, formatted timestamp, tap-to-copy IP pill, and user metadata.
- **Event Detail Inspector**: Replaces centered modal with a slide-up bottom sheet with full formatted JSON, metadata, and back gesture.
- **Thumb Controls**: Sticky search bar, filter bottom sheet, and 44px pagination buttons.

### 5. MFA Settings (`MfaSettingsView.tsx`)
- **Single-Column Flow**: Centered QR code with tap-to-copy manual secret key.
- **Backup Codes**: 2-column mobile grid with tap-to-copy and one-click "Copy All".
- **Inputs**: 16px font-size to prevent iOS Safari auto-zoom, with `inputMode="numeric"` and `autoComplete="one-time-code"`.
- **Destructive Actions**: Disable MFA opens in a confirmation sheet with generous spacing between "Cancel" and "Confirm Disable".

### 6. RBAC Matrix (`AdminView.tsx`)
- **Mobile (<768px)**: Rendered as categorized permission cards grouped by functional domain (Users, Incident Alerts, Audit Logs, Encryption, Classification) showing clear role tags (Admin, Analyst, Viewer).

### 7. Auth & Login (`AuthModal.tsx`)
- Full-height minimal view using `100dvh`.
- 16px inputs to prevent zoom, proper `autocomplete` and `inputmode`.
- Large 48px thumb-friendly primary action button.
