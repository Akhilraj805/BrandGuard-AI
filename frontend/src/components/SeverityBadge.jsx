import React from 'react';

export function SeverityBadge({ severity, isHeuristic = false }) {
  if (isHeuristic) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
        Heuristic Warning
      </span>
    );
  }

  const s = (severity || 'medium').toLowerCase();
  if (s === 'high') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        High Severity
      </span>
    );
  }
  if (s === 'medium') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
        Medium Severity
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
      Low Severity
    </span>
  );
}
