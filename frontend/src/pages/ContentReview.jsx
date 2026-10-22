import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { FindingCard } from '../components/FindingCard';
import { HighlightedText } from '../components/HighlightedText';
import { SeverityBadge } from '../components/SeverityBadge';
import { DecisionBadge } from '../components/DecisionBadge';
import { EmptyState } from '../components/EmptyState';
import {
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Check,
  Send,
  HelpCircle,
  FileText,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';

export function ContentReview({ initialReviewId, onClearReviewSelection }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [guidelines, setGuidelines] = useState([]);
  const [selectedGuidelineId, setSelectedGuidelineId] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  // Active review result
  const [currentReview, setCurrentReview] = useState(null);
  const [selectedFindingId, setSelectedFindingId] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('all');

  // Human Review Form State
  const [finalDecision, setFinalDecision] = useState('');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [isSavingDecision, setIsSavingDecision] = useState(false);
  const [decisionFeedback, setDecisionFeedback] = useState(null);

  // Load guidelines on mount
  useEffect(() => {
    async function fetchGuidelines() {
      try {
        const data = await api.getGuidelines();
        setGuidelines(data);
        const active = data.find((g) => g.is_active) || data[0];
        if (active) {
          setSelectedGuidelineId(active.id);
        }
      } catch (err) {
        console.error('Failed to fetch guidelines:', err);
      }
    }
    fetchGuidelines();
  }, []);

  // If initialReviewId is provided (e.g. from Dashboard or History), load it
  useEffect(() => {
    if (initialReviewId) {
      loadReviewById(initialReviewId);
    }
  }, [initialReviewId]);

  const loadReviewById = async (id) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const rev = await api.getReview(id);
      setCurrentReview(rev);
      setTitle(rev.title);
      setContent(rev.content);
      setSelectedGuidelineId(rev.guideline_id);
      setFinalDecision(rev.final_decision || '');
      setReviewerNotes(rev.reviewer_notes || '');
      if (rev.findings && rev.findings.length > 0) {
        setSelectedFindingId(rev.findings[0].id);
      }
    } catch (err) {
      console.error('Failed to load review:', err);
      setAnalysisError(err.message || 'Unable to retrieve review record.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Preset demo test cases
  const applyPreset = (type) => {
    if (type === 'test_a') {
      setTitle('Q4 Growth Campaign Ad Copy');
      setContent(
        'Our new platform delivers a guaranteed 40% increase in pipeline velocity for all B2B teams. Sign up today and experience the best in the world customer support with 100% risk-free onboarding.'
      );
    } else if (type === 'test_b') {
      setTitle('Enterprise Architecture Brief');
      setContent(
        'Our quality-tested data pipelines deliver verified throughput for demanding enterprise workloads. Terms and conditions apply.'
      );
    } else if (type === 'test_c') {
      setTitle('Cloud Security Press Release');
      setContent(
        'Built with unrivaled accuracy and completely unhackable security, our system double your revenue without any architectural modifications.'
      );
    } else if (type === 'clear') {
      setTitle('');
      setContent('');
      setCurrentReview(null);
      setAnalysisError(null);
      setDecisionFeedback(null);
      if (onClearReviewSelection) onClearReviewSelection();
    }
  };

  const handleReviewContent = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      setAnalysisError('Please enter marketing content to analyze.');
      return;
    }
    if (!title.trim()) {
      setAnalysisError('Please enter a content title.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setDecisionFeedback(null);

    try {
      const response = await api.analyzeContent({
        title: title.trim(),
        content: content.trim(),
        guideline_id: selectedGuidelineId || undefined,
      });

      setCurrentReview(response);
      setFinalDecision(response.final_decision || '');
      setReviewerNotes(response.reviewer_notes || '');
      if (response.findings && response.findings.length > 0) {
        setSelectedFindingId(response.findings[0].id);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setAnalysisError(err.message || 'Analysis failed. Please check the backend connection.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateFindingStatus = async (findingId, newStatus) => {
    if (!currentReview) return;
    try {
      const updatedFinding = await api.updateFindingStatus(currentReview.id, findingId, newStatus);
      setCurrentReview((prev) => ({
        ...prev,
        findings: prev.findings.map((f) => (f.id === findingId ? updatedFinding : f)),
      }));
    } catch (err) {
      console.error('Failed to update finding status:', err);
    }
  };

  const handleAcceptSuggestion = async (finding) => {
    if (!finding.suggestion || !finding.matched_text) return;

    // Apply suggested replacement in content text
    const regex = new RegExp(finding.matched_text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const newContent = content.replace(regex, finding.suggestion);
    setContent(newContent);

    // Mark finding as accepted
    await handleUpdateFindingStatus(finding.id, 'accepted');
  };

  const handleSaveDecision = async () => {
    if (!currentReview) return;
    if (!finalDecision) {
      setDecisionFeedback({ type: 'error', message: 'Please select a decision (Approved, Changes Required, or Rejected).' });
      return;
    }

    setIsSavingDecision(true);
    setDecisionFeedback(null);
    try {
      const updated = await api.recordDecision(currentReview.id, {
        final_decision: finalDecision,
        reviewer_notes: reviewerNotes.trim() || undefined,
      });
      setCurrentReview(updated);
      setDecisionFeedback({ type: 'success', message: 'Human review decision and audit notes saved successfully.' });
    } catch (err) {
      console.error('Failed to save decision:', err);
      setDecisionFeedback({ type: 'error', message: err.message || 'Failed to save review decision.' });
    } finally {
      setIsSavingDecision(false);
    }
  };

  // Word & character stats
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  // Filter findings
  const filteredFindings = (currentReview?.findings || []).filter((f) => {
    if (filterSeverity === 'all') return true;
    if (filterSeverity === 'violations') return !f.is_heuristic;
    if (filterSeverity === 'heuristics') return f.is_heuristic;
    if (filterSeverity === 'high') return f.severity === 'high';
    if (filterSeverity === 'unreviewed') return f.review_status === 'unreviewed';
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Marketing Content Governance Review
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Deterministic rule engine checks marketing copy against configured brand guidelines with human verification.
          </p>
        </div>

        {/* Demo Quick Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-1">
            Presets:
          </span>
          <button
            type="button"
            onClick={() => applyPreset('test_a')}
            className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 transition-colors"
            title="Load sample containing prohibited 'guaranteed' and missing 'quality-tested'"
          >
            Test A (Violations)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('test_b')}
            className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
            title="Load clean marketing copy that satisfies all brand guidelines"
          >
            Test B (Clean Copy)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('test_c')}
            className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 transition-colors"
            title="Load copy with unsupported absolute marketing claims"
          >
            Heuristic Warnings
          </button>
          {(title || content || currentReview) && (
            <button
              type="button"
              onClick={() => applyPreset('clear')}
              className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Analysis Error Alert */}
      {analysisError && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Review Error: </span>
            {analysisError}
          </div>
        </div>
      )}

      {/* Editor & Configuration Section */}
      <form onSubmit={handleReviewContent} className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label htmlFor="content-title" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Content Title / Campaign Name
              </label>
              <input
                id="content-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q4 Cloud Analytics Launch Brief"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="guideline-select" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Brand Guideline Policy
              </label>
              <select
                id="guideline-select"
                value={selectedGuidelineId}
                onChange={(e) => setSelectedGuidelineId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
              >
                {guidelines.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} {g.is_active ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Marketing Copy Editor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="marketing-copy" className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Marketing Copy
              </label>
              <div className="text-2xs text-slate-400 font-mono">
                {wordCount} words &bull; {charCount} characters
              </div>
            </div>
            <textarea
              id="marketing-copy"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste or type marketing copy, product announcements, email newsletters, or website copy here..."
              className="w-full p-4 text-sm font-sans rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 leading-relaxed"
              required
            />
          </div>

          {/* Action Row */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <div className="text-xs text-slate-400">
              Evaluated strictly against configured brand policies. No unverified AI hallucinations.
            </div>

            <button
              type="submit"
              disabled={isAnalyzing || !content.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-2xs"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Running Brand Governance Engine...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Review Content
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Review Results & Findings Inspection */}
      {currentReview && (
        <div className="space-y-6 pt-4 border-t border-slate-200">
          {/* Summary Stat Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-slate-900">{currentReview.title}</h2>
                  <DecisionBadge decision={currentReview.final_decision} status={currentReview.status} />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Evaluated using <span className="font-semibold text-slate-700">{currentReview.guideline_name}</span> &bull; Audit ID: <span className="font-mono text-slate-500">{currentReview.id}</span>
                </p>
              </div>

              {/* Counts Badge Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  Total Findings: <strong>{currentReview.summary?.total || 0}</strong>
                </span>
                <span className="px-3 py-1 rounded-md text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                  Rule Violations: <strong>{currentReview.summary?.rule_violations || 0}</strong>
                </span>
                <span className="px-3 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                  Heuristic Warnings: <strong>{currentReview.summary?.heuristic_warnings || 0}</strong>
                </span>
                <span className="px-3 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  High Severity: <strong>{currentReview.summary?.high || 0}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Clean Content Callout if 0 findings */}
          {currentReview.findings?.length === 0 && (
            <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-semibold text-base">All Configured Brand Rules Satisfied</h3>
                <p className="text-sm text-emerald-800 leading-relaxed">
                  No prohibited terms, missing required terminology, or tone discrepancies were detected.
                  Note: Deterministic rule verification checks against configured guidelines; human oversight is still required before publication.
                </p>
              </div>
            </div>
          )}

          {/* Split View: Highlighted Copy (Left) + Explainable Findings (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Highlighted Original Text */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Interactive Content Evidence Map
                  </h3>
                  <span className="text-2xs text-slate-400">
                    Click any highlighted term to jump to evidence
                  </span>
                </div>

                <div className="p-4 bg-slate-50/70 rounded-lg border border-slate-200/80 min-h-[220px]">
                  <HighlightedText
                    content={currentReview.content}
                    findings={currentReview.findings}
                    selectedFindingId={selectedFindingId}
                    onSelectFinding={(id) => setSelectedFindingId(id)}
                  />
                </div>

                {/* Highlight Legend */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-3 text-2xs text-slate-500 flex-wrap">
                  <span className="font-semibold uppercase tracking-wider text-slate-400">Legend:</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-200 border border-rose-400" />
                    High Violation
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-200 border border-amber-400" />
                    Medium Violation
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-purple-200 border border-purple-400 border-dashed" />
                    Heuristic Warning
                  </span>
                </div>
              </div>

              {/* Human Review Decision Panel */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-slate-900">Human Governance Decision</h3>
                  </div>
                  <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider">
                    Human Oversight
                  </span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Rule analysis results do not automatically imply publication approval. A qualified reviewer must evaluate the findings and record a human decision.
                </p>

                {decisionFeedback && (
                  <div
                    className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
                      decisionFeedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {decisionFeedback.type === 'success' ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    {decisionFeedback.message}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Decision Outcome
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setFinalDecision('approved')}
                        className={`px-3 py-2 text-xs font-medium rounded-lg border text-center transition-all flex items-center justify-center gap-1.5 ${
                          finalDecision === 'approved'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approved
                      </button>

                      <button
                        type="button"
                        onClick={() => setFinalDecision('changes_required')}
                        className={`px-3 py-2 text-xs font-medium rounded-lg border text-center transition-all flex items-center justify-center gap-1.5 ${
                          finalDecision === 'changes_required'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Changes Required
                      </button>

                      <button
                        type="button"
                        onClick={() => setFinalDecision('rejected')}
                        className={`px-3 py-2 text-xs font-medium rounded-lg border text-center transition-all flex items-center justify-center gap-1.5 ${
                          finalDecision === 'rejected'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Rejected
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reviewer-notes" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Reviewer Governance Notes (Optional)
                    </label>
                    <textarea
                      id="reviewer-notes"
                      rows={3}
                      value={reviewerNotes}
                      onChange={(e) => setReviewerNotes(e.target.value)}
                      placeholder="e.g. Author must verify pipeline throughput benchmark before final publication..."
                      className="w-full p-2.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveDecision}
                    disabled={isSavingDecision || !finalDecision}
                    className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-2xs flex items-center justify-center gap-2"
                  >
                    {isSavingDecision ? (
                      'Saving Decision to Audit Database...'
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Record Human Review Decision
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Explainable Findings Panel */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Explainable Findings & Actions
                    </h3>
                    <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {filteredFindings.length} of {currentReview.findings?.length || 0}
                    </span>
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex items-center gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setFilterSeverity('all')}
                      className={`px-2 py-1 rounded text-2xs font-medium transition-colors ${
                        filterSeverity === 'all'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterSeverity('violations')}
                      className={`px-2 py-1 rounded text-2xs font-medium transition-colors ${
                        filterSeverity === 'violations'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      Violations
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterSeverity('heuristics')}
                      className={`px-2 py-1 rounded text-2xs font-medium transition-colors ${
                        filterSeverity === 'heuristics'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      Heuristics
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterSeverity('high')}
                      className={`px-2 py-1 rounded text-2xs font-medium transition-colors ${
                        filterSeverity === 'high'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      High
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterSeverity('unreviewed')}
                      className={`px-2 py-1 rounded text-2xs font-medium transition-colors ${
                        filterSeverity === 'unreviewed'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      Unreviewed
                    </button>
                  </div>
                </div>

                {filteredFindings.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No findings match the current filter criteria.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                    {filteredFindings.map((finding) => (
                      <FindingCard
                        key={finding.id}
                        finding={finding}
                        isSelected={selectedFindingId === finding.id}
                        onSelect={() => setSelectedFindingId(finding.id)}
                        onAcceptSuggestion={handleAcceptSuggestion}
                        onUpdateStatus={handleUpdateFindingStatus}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
