import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { DecisionBadge } from '../components/DecisionBadge';
import { EmptyState } from '../components/EmptyState';
import {
  History,
  Search,
  Filter,
  ArrowRight,
  Trash2,
  FileCheck2,
  Calendar,
  AlertCircle,
  PlusCircle,
  RefreshCw,
} from 'lucide-react';

export function ReviewHistory({ onOpenReview, onNewReview }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [decisionFilter, setDecisionFilter] = useState('all');
  const [feedback, setFeedback] = useState(null);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const data = await api.getReviews();
      setReviews(data);
    } catch (err) {
      console.error('Failed to load reviews:', err);
      setFeedback({ type: 'error', message: 'Failed to retrieve saved review history from SQLite database.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleDeleteReview = async (id, title, e) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete review "${title}"?`)) return;

    try {
      await api.deleteReview(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setFeedback({ type: 'success', message: 'Review deleted successfully.' });
    } catch (err) {
      console.error('Delete review error:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to delete review.' });
    }
  };

  // Filter and search
  const filteredReviews = reviews.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.guideline_name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (decisionFilter === 'all') return true;
    if (decisionFilter === 'pending') return !r.final_decision;
    return r.final_decision === decisionFilter;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Review History & Audit Trail
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Permanent records of evaluated marketing copy, rule findings, and recorded human decisions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadReviews}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={onNewReview}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-2xs"
          >
            <PlusCircle className="w-4 h-4" />
            New Content Review
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-lg text-sm flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-xs font-semibold underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title or guideline policy..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
        </div>

        {/* Decision Filters */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-2xs font-semibold uppercase tracking-wider text-slate-400 mr-1">
            Decision:
          </span>
          <button
            type="button"
            onClick={() => setDecisionFilter('all')}
            className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
              decisionFilter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All ({reviews.length})
          </button>
          <button
            type="button"
            onClick={() => setDecisionFilter('approved')}
            className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
              decisionFilter === 'approved'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Approved
          </button>
          <button
            type="button"
            onClick={() => setDecisionFilter('changes_required')}
            className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
              decisionFilter === 'changes_required'
                ? 'bg-amber-700 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Changes Required
          </button>
          <button
            type="button"
            onClick={() => setDecisionFilter('rejected')}
            className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
              decisionFilter === 'rejected'
                ? 'bg-rose-700 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Rejected
          </button>
          <button
            type="button"
            onClick={() => setDecisionFilter('pending')}
            className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
              decisionFilter === 'pending'
                ? 'bg-slate-700 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Pending
          </button>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {filteredReviews.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={History}
              title={reviews.length === 0 ? 'No reviews recorded yet' : 'No matching reviews found'}
              description={
                reviews.length === 0
                  ? 'All evaluated copy and recorded human review decisions will appear here.'
                  : 'Try adjusting your search query or decision filter.'
              }
              action={
                reviews.length === 0 ? (
                  <button
                    type="button"
                    onClick={onNewReview}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Review Copy Now
                  </button>
                ) : null
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Content Title</th>
                  <th className="px-6 py-3.5">Guideline Policy</th>
                  <th className="px-6 py-3.5">Findings Breakdown</th>
                  <th className="px-6 py-3.5">Human Decision</th>
                  <th className="px-6 py-3.5">Date & Time</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReviews.map((rev) => (
                  <tr
                    key={rev.id}
                    onClick={() => onOpenReview(rev.id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 font-semibold text-slate-900 max-w-xs truncate">
                      {rev.title}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {rev.guideline_name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-800">
                          {rev.findings_count} total
                        </span>
                        {rev.rule_violations_count > 0 && (
                          <span className="text-2xs text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            {rev.rule_violations_count} violations
                          </span>
                        )}
                        {rev.heuristic_count > 0 && (
                          <span className="text-2xs text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                            {rev.heuristic_count} warnings
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <DecisionBadge decision={rev.final_decision} status={rev.status} />
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(rev.created_at).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onOpenReview(rev.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors inline-flex items-center gap-1"
                        >
                          Inspect <ArrowRight className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteReview(rev.id, rev.title, e)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Delete review record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
