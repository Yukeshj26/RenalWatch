import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children }) {
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', onKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-ink/50 backdrop-blur-sm transition-opacity"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-xl max-h-[92vh] sm:max-h-[88vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-teal/15 animate-slideUpSheet sm:animate-popModal pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-0"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile Pull-Down Drag Bar */}
        <div className="pt-2 sm:hidden flex justify-center">
          <div className="w-12 h-1.5 bg-line rounded-full" />
        </div>

        {/* Sticky Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 bg-white/95 backdrop-blur-md border-b border-line">
          <h2 className="text-lg sm:text-xl font-bold font-heading text-ink flex items-center gap-2">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-tint-light hover:bg-risk-highBg hover:text-risk-high text-mute transition-all active:scale-95 touch-manipulation"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
