import React from 'react';
import { Activity, AlertOctagon, FileText, Menu } from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openAlertCount: number;
  onOpenMore: () => void;
  isMoreOpen: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  setCurrentTab,
  openAlertCount,
  onOpenMore,
  isMoreOpen,
}) => {
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Bottom Navigation">
      <button
        type="button"
        className={`mobile-nav-btn ${currentTab === 'overview' && !isMoreOpen ? 'active' : ''}`}
        onClick={() => setCurrentTab('overview')}
        aria-label="Dashboard"
      >
        <div className="mobile-nav-icon-wrap">
          <Activity size={20} />
        </div>
        <span className="mobile-nav-label">Dashboard</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-btn ${currentTab === 'alerts' && !isMoreOpen ? 'active' : ''}`}
        onClick={() => setCurrentTab('alerts')}
        aria-label={`Alerts (${openAlertCount} open)`}
      >
        <div className="mobile-nav-icon-wrap">
          <AlertOctagon size={20} />
          {openAlertCount > 0 && (
            <span className="mobile-nav-badge" aria-label={`${openAlertCount} active alerts`}>
              {openAlertCount > 99 ? '99+' : openAlertCount}
            </span>
          )}
        </div>
        <span className="mobile-nav-label">Alerts</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-btn ${currentTab === 'logs' && !isMoreOpen ? 'active' : ''}`}
        onClick={() => setCurrentTab('logs')}
        aria-label="Security Logs"
      >
        <div className="mobile-nav-icon-wrap">
          <FileText size={20} />
        </div>
        <span className="mobile-nav-label">Activity</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-btn ${(currentTab === 'mfa' || currentTab === 'admin' || isMoreOpen) ? 'active' : ''}`}
        onClick={onOpenMore}
        aria-label="More navigation and settings"
      >
        <div className="mobile-nav-icon-wrap">
          <Menu size={20} />
        </div>
        <span className="mobile-nav-label">More</span>
      </button>
    </nav>
  );
};
