import React from 'react';
import {
  ShieldCheck,
  LayoutDashboard,
  FileCheck2,
  BookOpenCheck,
  History,
  Sliders,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export function Sidebar({ currentTab, setCurrentTab, activeGuideline, isConnected }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'review', label: 'Content Review', icon: FileCheck2 },
    { id: 'guidelines', label: 'Brand Guidelines', icon: BookOpenCheck },
    { id: 'history', label: 'Review History', icon: History },
    { id: 'settings', label: 'System & Status', icon: Sliders },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col shrink-0 border-r border-slate-800">
      {/* Brand Identity */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm ring-1 ring-blue-400/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-semibold text-white text-base tracking-tight leading-none">
              BrandGuard AI
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-medium">Content Governance</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1">
        <div className="px-3 py-2 text-2xs font-semibold uppercase tracking-wider text-slate-400">
          Governance Workflow
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Active Guideline Profile Pill */}
      {activeGuideline && (
        <div className="p-3 mx-3 mb-3 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
          <p className="text-2xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
            Active Governance Policy
          </p>
          <div className="font-medium text-slate-200 truncate" title={activeGuideline.name}>
            {activeGuideline.name}
          </div>
          <p className="text-2xs text-slate-400 mt-1">
            {activeGuideline.prohibited_terms?.length || 0} prohibited &bull; {activeGuideline.required_terms?.length || 0} required
          </p>
        </div>
      )}

      {/* Backend Health Status Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-400 ring-4 ring-emerald-950' : 'bg-rose-400 ring-4 ring-rose-950'
            }`}
          />
          <span className="text-slate-400">
            {isConnected ? 'Backend Online' : 'Connecting API...'}
          </span>
        </div>
        <span className="text-2xs text-slate-400 font-mono">v1.0.0</span>
      </div>
    </aside>
  );
}
