import React from 'react';
import { PlusCircle, Shield, AlertTriangle } from 'lucide-react';

export function Header({ currentTab, onNewReview, activeGuideline, isConnected }) {
  const titles = {
    dashboard: 'Operational Dashboard',
    review: 'Marketing Content Review',
    guidelines: 'Brand Guidelines Management',
    history: 'Review History & Audit Trail',
    settings: 'System Status & Architecture',
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
          {titles[currentTab] || 'BrandGuard AI'}
        </h2>
        {activeGuideline && (
          <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            Active: {activeGuideline.name}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {!isConnected && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            Backend Offline (Port 8000)
          </div>
        )}

        {currentTab !== 'review' && (
          <button
            type="button"
            onClick={onNewReview}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-2xs"
          >
            <PlusCircle className="w-4 h-4" />
            New Content Review
          </button>
        )}
      </div>
    </header>
  );
}
