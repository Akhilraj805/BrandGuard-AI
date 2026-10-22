import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { DecisionBadge } from '../components/DecisionBadge';
import { EmptyState } from '../components/EmptyState';
import {
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  BookOpenCheck,
  PlusCircle,
  ArrowRight,
  Clock,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export function Dashboard({ onNavigateToReview, onOpenReview, onNavigateToGuidelines }) {
  const [stats, setStats] = useState(null);
  const [recentReviews, setRecentReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, reviewsData] = await Promise.all([
        api.getStats(),
        api.getReviews(),
      ]);
      setStats(statsData);
      setRecentReviews(reviewsData.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message || 'Unable to connect to the BrandGuard AI backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Brand Governance Overview
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time compliance audit logs and human review oversight across marketing copy.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadDashboardData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={onNavigateToReview}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-2xs"
          >
            <PlusCircle className="w-4 h-4" />
            Start Content Review
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800 flex items-start justify-between">
          <div>
            <span className="font-semibold">Backend Connection Alert: </span>
            {error}
          </div>
          <button
            onClick={loadDashboardData}
            className="text-xs font-semibold underline hover:text-rose-950 ml-4"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Reviews</span>
            <FileCheck2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stats ? stats.total_reviews : '-'}
          </div>
          <p className="text-xs text-slate-500 mt-1">Recorded audit sessions</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Attention Required</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700">
            {stats ? stats.attention_reviews : '-'}
          </div>
          <p className="text-xs text-slate-500 mt-1">Pending or flagged changes</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Approved Reviews</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            {stats ? stats.approved_reviews : '-'}
          </div>
          <p className="text-xs text-slate-500 mt-1">Cleared for publication</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Active Policy Rules</span>
            <BookOpenCheck className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stats ? stats.total_guidelines : '-'}
          </div>
          <p className="text-xs text-slate-500 mt-1">Configured brand profiles</p>
        </div>
      </div>

      {/* First-time guidance if 0 reviews */}
      {!loading && stats && stats.total_reviews === 0 && (
        <div className="p-6 rounded-xl bg-blue-50/60 border border-blue-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-blue-950">
              Welcome to BrandGuard AI Content Governance
            </h3>
            <p className="text-sm text-blue-800/80 max-w-2xl leading-relaxed">
              BrandGuard AI protects your brand reputation through explainable, evidence-based review.
              Test copy against deterministic guidelines, inspect triggered evidence, and record human publication decisions.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onNavigateToGuidelines}
              className="px-3.5 py-2 text-xs font-medium rounded-lg border border-blue-200 bg-white text-blue-900 hover:bg-blue-50 transition-colors"
            >
              Inspect Rules
            </button>
            <button
              type="button"
              onClick={onNavigateToReview}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-2xs"
            >
              Run First Review
            </button>
          </div>
        </div>
      )}

      {/* Recent Reviews Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 text-base">Recent Content Reviews</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live audit trail of marketing copy submissions and decisions.
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateToReview}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
          >
            Review New Copy <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentReviews.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={FileCheck2}
              title="No content reviews recorded yet"
              description="Submit your first piece of marketing copy to run deterministic guideline checks."
              action={
                <button
                  type="button"
                  onClick={onNavigateToReview}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  Run First Review
                </button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Content Title</th>
                  <th className="px-5 py-3">Guideline Policy</th>
                  <th className="px-5 py-3">Findings</th>
                  <th className="px-5 py-3">Human Decision</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentReviews.map((rev) => (
                  <tr key={rev.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {rev.title}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {rev.guideline_name}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        {rev.findings_count} findings
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <DecisionBadge decision={rev.final_decision} status={rev.status} />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400">
                      {new Date(rev.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenReview(rev.id)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800"
                      >
                        Inspect Review
                      </button>
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
