
import React from 'react';
import { PlusCircle, AlertTriangle } from 'lucide-react';

export function Header({ currentTab, onNewReview, activeGuideline, isConnected }) {
  const titles = {
    dashboard: 'Operational Dashboard',
    review: 'Marketing Content Review',
    guidelines: 'Brand Guidelines Management',
    history: 'Review History & Audit Trail',
    settings: 'System Status & Architecture',
  };

  return (
    <header className="min-h-16 bg-white border-b border-slate-200 pl-16 pr-3 sm:px-6 py-2 flex items-center justify-between gap-2 shrink-0">
      <div className="flex-1 min-w-0">
        <h2 className="text-sm sm:text-lg font-semibold text-slate-900 tracking-tight truncate">
          {titles[currentTab] || 'BrandGuard AI'}
        </h2>

        {activeGuideline && (
          <span className="hidden md:inline-flex items-center px-2.5 py-0.5 mt-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            Active: {activeGuideline.name}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!isConnected && (
          <div
            title="Backend Offline"
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="hidden sm:inline">Backend Offline</span>
          </div>
        )}

        {currentTab !== 'review' && (
          <button
            type="button"
            onClick={onNewReview}
            className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-2xs whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span className="sm:hidden">New Review</span>
            <span className="hidden sm:inline">New Content Review</span>
          </button>
        )}
      </div>
    </header>
  );
}
