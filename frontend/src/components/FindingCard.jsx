import React from 'react';
import { SeverityBadge } from './SeverityBadge';
import { Check, X, Eye, ArrowRight, AlertCircle, Info, Sparkles } from 'lucide-react';

export function FindingCard({
  finding,
  onAcceptSuggestion,
  onUpdateStatus,
  isSelected,
  onSelect,
}) {
  const isMissingTerm = finding.finding_type === 'missing_required_term';
  const hasSuggestion = Boolean(finding.suggestion && finding.suggestion.trim());

  return (
    <div
      onClick={onSelect}
      className={`border rounded-lg p-4 transition-all bg-white cursor-pointer ${
        isSelected
          ? 'border-blue-600 ring-2 ring-blue-100 shadow-sm'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <SeverityBadge severity={finding.severity} isHeuristic={finding.is_heuristic} />
          <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
            {finding.rule_name}
          </span>
        </div>

        <div className="shrink-0">
          {finding.review_status === 'accepted' && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <Check className="w-3 h-3" /> Accepted
            </span>
          )}
          {finding.review_status === 'dismissed' && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              <X className="w-3 h-3" /> Dismissed
            </span>
          )}
          {finding.review_status === 'reviewed' && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              <Eye className="w-3 h-3" /> Reviewed
            </span>
          )}
          {finding.review_status === 'unreviewed' && (
            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              Unreviewed
            </span>
          )}
        </div>
      </div>

      {/* Matched text or missing phrase callout */}
      <div className="mb-3">
        {isMissingTerm ? (
          <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-50/70 border border-amber-200 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Missing Required Term: </span>
              <span className="font-mono font-medium underline decoration-amber-400">{finding.rule_name.replace("Missing Approved Term: ", "")}</span>
              <p className="mt-0.5 text-amber-800">This mandatory approved terminology was not detected anywhere in the submitted copy.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
            <span className="text-xs text-slate-400 font-normal">Matched text:</span>
            <span className="font-mono text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-semibold">
              "{finding.matched_text}"
            </span>
          </div>
        )}
      </div>

      {/* Explanation */}
      <div className="mb-3 text-sm text-slate-600 leading-relaxed bg-slate-50/60 p-2.5 rounded border border-slate-100">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Evidence & Governance Context</p>
        <p>{finding.explanation}</p>
      </div>

      {/* Suggested Action */}
      {hasSuggestion && (
        <div className="mb-3 p-2.5 rounded-md bg-blue-50/50 border border-blue-100 text-xs text-blue-900">
          <div className="flex items-center gap-1.5 font-semibold text-blue-800 mb-1">
            <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
            Recommended Action:
          </div>
          <p className="text-blue-950 font-medium">{finding.suggestion}</p>
        </div>
      )}

      {/* Action Controls */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5">
          {hasSuggestion && !isMissingTerm && (
            <button
              type="button"
              onClick={() => onAcceptSuggestion(finding)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-2xs"
              title="Apply suggested correction to content editor"
            >
              <Check className="w-3.5 h-3.5" />
              Apply Suggestion
            </button>
          )}

          <button
            type="button"
            onClick={() => onUpdateStatus(finding.id, finding.review_status === 'reviewed' ? 'unreviewed' : 'reviewed')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
              finding.review_status === 'reviewed'
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            {finding.review_status === 'reviewed' ? 'Marked Reviewed' : 'Mark Reviewed'}
          </button>
        </div>

        <div>
          <button
            type="button"
            onClick={() => onUpdateStatus(finding.id, finding.review_status === 'dismissed' ? 'unreviewed' : 'dismissed')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
              finding.review_status === 'dismissed'
                ? 'bg-slate-200 text-slate-800 border-slate-300'
                : 'bg-white text-slate-500 border-slate-200 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <X className="w-3.5 h-3.5" />
            {finding.review_status === 'dismissed' ? 'Dismissed' : 'Dismiss'}
          </button>
        </div>
      </div>
    </div>
  );
}
