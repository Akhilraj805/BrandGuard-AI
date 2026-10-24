
import React from 'react';
import {
  ShieldCheck,
  LayoutDashboard,
  FileCheck2,
  BookOpenCheck,
  History,
  Sliders,
  Menu,
  X,
} from 'lucide-react';

export function Sidebar({
  currentTab,
  setCurrentTab,
  activeGuideline,
  isConnected,
  mobileOpen = false,
  setMobileOpen = () => {},
}) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'review', label: 'Content Review', icon: FileCheck2 },
    { id: 'guidelines', label: 'Brand Guidelines', icon: BookOpenCheck },
    { id: 'history', label: 'Review History', icon: History },
    { id: 'settings', label: 'System & Status', icon: Sliders },
  ];

  const handleNavigation = (tab) => {
    setCurrentTab(tab);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        aria-label="Open navigation menu"
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-40 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-800 shadow-md md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-slate-200 transition-transform duration-200 md:static md:z-auto md:w-64 md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand identity */}
        <div className="flex items-center justify-between border-b border-slate-800/80 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-none tracking-tight text-white">
                BrandGuard AI
              </h1>
              <p className="mt-1 text-xs font-medium text-slate-400">
                Content Governance
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Governance Workflow
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigation(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Active guideline */}
        {activeGuideline && (
          <div className="mx-3 mb-3 rounded-lg border border-slate-700/60 bg-slate-800/80 p-3 text-xs">
            <p className="mb-1 font-semibold uppercase tracking-wider text-slate-400">
              Active Governance Policy
            </p>
            <div
              className="truncate font-medium text-slate-200"
              title={activeGuideline.name}
            >
              {activeGuideline.name}
            </div>
            <p className="mt-1 text-slate-400">
              {activeGuideline.prohibited_terms?.length || 0} prohibited
              {' · '}
              {activeGuideline.required_terms?.length || 0} required
            </p>
          </div>
        )}

        {/* Backend status */}
        <div className="flex items-center justify-between border-t border-slate-800/80 bg-slate-950/40 p-4 text-xs">
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                isConnected ? 'bg-emerald-400' : 'bg-rose-400'
              }`}
            />
            <span className="text-slate-400">
              {isConnected ? 'Backend Online' : 'Connecting API...'}
            </span>
          </div>
          <span className="font-mono text-slate-400">v1.0.0</span>
        </div>
      </aside>
    </>
  );
}
