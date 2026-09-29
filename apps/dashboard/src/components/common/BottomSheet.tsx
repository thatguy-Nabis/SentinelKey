import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxHeight?: string | number;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxHeight = '85vh',
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    // Prevent body scrolling while sheet is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="bottom-sheet-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Dialog'}
    >
      <div
        className="bottom-sheet"
        style={{ maxHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab Handle */}
        <div className="bottom-sheet-handle-wrap" onClick={onClose}>
          <div className="bottom-sheet-handle" />
        </div>

        {/* Header */}
        {(title || subtitle) && (
          <div className="bottom-sheet-header">
            <div>
              {title && <h3 className="bottom-sheet-title">{title}</h3>}
              {subtitle && <p className="bottom-sheet-subtitle">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="bottom-sheet-close-btn"
              aria-label="Close sheet"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="bottom-sheet-content">{children}</div>
      </div>
    </div>
  );
};
