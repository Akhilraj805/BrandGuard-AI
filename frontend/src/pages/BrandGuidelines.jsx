import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { SeverityBadge } from '../components/SeverityBadge';
import { EmptyState } from '../components/EmptyState';
import {
  BookOpenCheck,
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
  Save,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';

export function BrandGuidelines({ onGuidelineChanged }) {
  const [guidelines, setGuidelines] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Form editing state for selected guideline
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    prohibited_terms: [],
    required_terms: [],
    tone_rules: [],
    custom_rules: [],
  });

  // Active section tab: 'prohibited', 'required', 'tone', 'custom'
  const [activeTab, setActiveTab] = useState('prohibited');

  // Input states for adding new terms/rules
  const [newProhibited, setNewProhibited] = useState({ term: '', severity: 'high', reason: '', suggested: '' });
  const [newRequired, setNewRequired] = useState({ term: '', severity: 'medium', reason: '', suggested: '' });
  const [newTone, setNewTone] = useState({ rule_name: '', description: '', flagged_patterns: '', severity: 'medium', suggestion: '' });
  const [newCustom, setNewCustom] = useState({ rule_name: '', description: '', flagged_patterns: '', severity: 'high', suggestion: '' });

  const loadGuidelines = async () => {
    setLoading(true);
    try {
      const data = await api.getGuidelines();
      setGuidelines(data);
      if (data.length > 0) {
        const active = data.find((g) => g.is_active) || data[0];
        selectGuideline(active);
      }
    } catch (err) {
      console.error('Failed to load guidelines:', err);
      setFeedback({ type: 'error', message: 'Failed to retrieve guidelines from backend database.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGuidelines();
  }, []);

  const selectGuideline = (g) => {
    setSelectedId(g.id);
    setFormData({
      name: g.name,
      description: g.description,
      is_active: g.is_active,
      prohibited_terms: [...(g.prohibited_terms || [])],
      required_terms: [...(g.required_terms || [])],
      tone_rules: [...(g.tone_rules || [])],
      custom_rules: [...(g.custom_rules || [])],
    });
    setFeedback(null);
  };

  const handleCreateNewProfile = () => {
    const newProfile = {
      name: 'New Custom Brand Guideline',
      description: 'Custom governance rules configured for specific product line or marketing campaign.',
      is_active: false,
      prohibited_terms: [
        {
          id: `p_${Date.now()}`,
          term: 'revolutionary',
          severity: 'medium',
          reason: 'Overused marketing buzzword lacking concrete technical evidence.',
          suggested: 'innovative',
        },
      ],
      required_terms: [
        {
          id: `r_${Date.now()}`,
          term: 'all rights reserved',
          severity: 'low',
          reason: 'Standard copyright notice required on all public collateral.',
          suggested: 'all rights reserved',
        },
      ],
      tone_rules: [],
      custom_rules: [],
    };

    setFormData(newProfile);
    setSelectedId('NEW');
    setFeedback({ type: 'info', message: 'Drafting new guideline profile. Click Save to persist to SQLite database.' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFeedback({ type: 'error', message: 'Guideline name cannot be empty.' });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      let saved;
      if (selectedId === 'NEW') {
        saved = await api.createGuideline(formData);
      } else {
        saved = await api.updateGuideline(selectedId, formData);
      }

      await loadGuidelines();
      setSelectedId(saved.id);
      setFeedback({ type: 'success', message: 'Brand guideline policy saved and active in the analysis engine.' });
      if (onGuidelineChanged) onGuidelineChanged();
    } catch (err) {
      console.error('Save error:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to save guideline.' });
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (id) => {
    try {
      await api.activateGuideline(id);
      await loadGuidelines();
      setFeedback({ type: 'success', message: 'Active brand guideline profile updated successfully.' });
      if (onGuidelineChanged) onGuidelineChanged();
    } catch (err) {
      console.error('Activation error:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to activate guideline.' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this brand guideline profile?')) return;
    try {
      await api.deleteGuideline(id);
      await loadGuidelines();
      setFeedback({ type: 'success', message: 'Guideline profile deleted successfully.' });
      if (onGuidelineChanged) onGuidelineChanged();
    } catch (err) {
      console.error('Delete error:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to delete guideline.' });
    }
  };

  // Add Prohibited Term
  const handleAddProhibited = () => {
    if (!newProhibited.term.trim()) return;
    const item = {
      id: `p_${Date.now()}`,
      term: newProhibited.term.trim(),
      severity: newProhibited.severity,
      reason: newProhibited.reason.trim() || 'This phrase violates brand guidelines.',
      suggested: newProhibited.suggested.trim(),
    };
    setFormData((prev) => ({ ...prev, prohibited_terms: [...prev.prohibited_terms, item] }));
    setNewProhibited({ term: '', severity: 'high', reason: '', suggested: '' });
  };

  const handleRemoveProhibited = (id) => {
    setFormData((prev) => ({
      ...prev,
      prohibited_terms: prev.prohibited_terms.filter((t) => t.id !== id),
    }));
  };

  // Add Required Term
  const handleAddRequired = () => {
    if (!newRequired.term.trim()) return;
    const item = {
      id: `r_${Date.now()}`,
      term: newRequired.term.trim(),
      severity: newRequired.severity,
      reason: newRequired.reason.trim() || 'Mandatory approved brand disclosure.',
      suggested: newRequired.suggested.trim(),
    };
    setFormData((prev) => ({ ...prev, required_terms: [...prev.required_terms, item] }));
    setNewRequired({ term: '', severity: 'medium', reason: '', suggested: '' });
  };

  const handleRemoveRequired = (id) => {
    setFormData((prev) => ({
      ...prev,
      required_terms: prev.required_terms.filter((t) => t.id !== id),
    }));
  };

  // Add Tone Rule
  const handleAddTone = () => {
    if (!newTone.rule_name.trim()) return;
    const patterns = newTone.flagged_patterns
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    const item = {
      id: `t_${Date.now()}`,
      rule_name: newTone.rule_name.trim(),
      description: newTone.description.trim() || 'Tone of voice policy check.',
      flagged_patterns: patterns,
      severity: newTone.severity,
      suggestion: newTone.suggestion.trim(),
    };
    setFormData((prev) => ({ ...prev, tone_rules: [...prev.tone_rules, item] }));
    setNewTone({ rule_name: '', description: '', flagged_patterns: '', severity: 'medium', suggestion: '' });
  };

  const handleRemoveTone = (id) => {
    setFormData((prev) => ({
      ...prev,
      tone_rules: prev.tone_rules.filter((t) => t.id !== id),
    }));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Configurable Brand Guidelines
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Rules configured here are directly enforced in SQLite by the deterministic analysis engine.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateNewProfile}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          Create New Guideline Profile
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-lg text-sm flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : feedback.type === 'info'
              ? 'bg-blue-50 text-blue-800 border border-blue-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-xs font-semibold underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Two Column Layout: Profile Selector (Left) + Rule Editor (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Guidelines Profile List */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Guideline Profiles ({guidelines.length})
          </h3>

          <div className="space-y-2">
            {guidelines.map((g) => {
              const isSelected = selectedId === g.id;
              return (
                <div
                  key={g.id}
                  onClick={() => selectGuideline(g)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer bg-white ${
                    isSelected
                      ? 'border-blue-600 ring-2 ring-blue-100 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="text-sm font-semibold text-slate-900 leading-tight">
                      {g.name}
                    </h4>
                    {g.is_active && (
                      <span className="shrink-0 inline-flex items-center gap-1 text-2xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                    {g.description || 'No description provided.'}
                  </p>

                  <div className="flex items-center justify-between text-2xs text-slate-400 pt-2 border-t border-slate-100">
                    <span>
                      {g.prohibited_terms?.length || 0} prohibited &bull; {g.required_terms?.length || 0} required
                    </span>
                    {!g.is_active && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActivate(g.id);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        Set as Active
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Rule Configurator */}
        <div className="lg:col-span-8">
          <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedId === 'NEW' ? 'Create New Brand Guideline' : 'Edit Brand Guideline'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update rules to change what the analysis engine checks.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {selectedId !== 'NEW' && guidelines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedId)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg text-rose-600 border border-rose-200 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Profile
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-2xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving...' : 'Save Guideline'}
                </button>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Profile Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Enterprise Standard Guidelines"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </label>
                <div className="flex items-center gap-3 h-10">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span>Active Profile for Marketing Content Reviews</span>
                  </label>
                </div>
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Profile Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Briefly describe what this policy governs..."
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>

            {/* Rules Tabs */}
            <div className="space-y-4 pt-2">
              <div className="flex border-b border-slate-200 gap-6 text-sm font-medium">
                <button
                  type="button"
                  onClick={() => setActiveTab('prohibited')}
                  className={`pb-2.5 transition-colors border-b-2 ${
                    activeTab === 'prohibited'
                      ? 'border-blue-600 text-blue-600 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Prohibited Terms ({formData.prohibited_terms.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('required')}
                  className={`pb-2.5 transition-colors border-b-2 ${
                    activeTab === 'required'
                      ? 'border-blue-600 text-blue-600 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Required Approved Terms ({formData.required_terms.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('tone')}
                  className={`pb-2.5 transition-colors border-b-2 ${
                    activeTab === 'tone'
                      ? 'border-blue-600 text-blue-600 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Tone of Voice ({formData.tone_rules.length})
                </button>
              </div>

              {/* Tab 1: Prohibited Terms */}
              {activeTab === 'prohibited' && (
                <div className="space-y-4">
                  {/* Add form */}
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200/80 space-y-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Add Prohibited Term or Phrase
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <input
                          type="text"
                          value={newProhibited.term}
                          onChange={(e) => setNewProhibited({ ...newProhibited, term: e.target.value })}
                          placeholder="Term (e.g. guaranteed)"
                          className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
                        />
                      </div>
                      <div>
                        <select
                          value={newProhibited.severity}
                          onChange={(e) => setNewProhibited({ ...newProhibited, severity: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
                        >
                          <option value="high">High Severity</option>
                          <option value="medium">Medium Severity</option>
                          <option value="low">Low Severity</option>
                        </select>
                      </div>
                      <div>
                        <input
                          type="text"
                          value={newProhibited.suggested}
                          onChange={(e) => setNewProhibited({ ...newProhibited, suggested: e.target.value })}
                          placeholder="Suggested replacement (e.g. quality-tested)"
                          className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newProhibited.reason}
                        onChange={(e) => setNewProhibited({ ...newProhibited, reason: e.target.value })}
                        placeholder="Explanation / Regulatory Reason..."
                        className="flex-1 px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddProhibited}
                        className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-white hover:bg-slate-700"
                      >
                        Add Term
                      </button>
                    </div>
                  </div>

                  {/* List of Prohibited Terms */}
                  <div className="space-y-2">
                    {formData.prohibited_terms.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              "{item.term}"
                            </span>
                            <SeverityBadge severity={item.severity} />
                            {item.suggested && (
                              <span className="text-2xs text-slate-500">
                                Suggest: <strong className="text-blue-700">{item.suggested}</strong>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{item.reason}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveProhibited(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 2: Required Approved Terms */}
              {activeTab === 'required' && (
                <div className="space-y-4">
                  {/* Add form */}
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200/80 space-y-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Add Required Approved Term
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <input
                          type="text"
                          value={newRequired.term}
                          onChange={(e) => setNewRequired({ ...newRequired, term: e.target.value })}
                          placeholder="Required Term (e.g. quality-tested)"
                          className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
                        />
                      </div>
                      <div>
                        <select
                          value={newRequired.severity}
                          onChange={(e) => setNewRequired({ ...newRequired, severity: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
                        >
                          <option value="high">High Severity (Mandatory)</option>
                          <option value="medium">Medium Severity</option>
                          <option value="low">Low Severity</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newRequired.reason}
                        onChange={(e) => setNewRequired({ ...newRequired, reason: e.target.value })}
                        placeholder="Why is this term mandatory? (e.g. Legal disclaimer compliance)"
                        className="flex-1 px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddRequired}
                        className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-white hover:bg-slate-700"
                      >
                        Add Required Term
                      </button>
                    </div>
                  </div>

                  {/* List of Required Terms */}
                  <div className="space-y-2">
                    {formData.required_terms.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              "{item.term}"
                            </span>
                            <SeverityBadge severity={item.severity} />
                          </div>
                          <p className="text-xs text-slate-500">{item.reason}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveRequired(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: Tone of Voice Rules */}
              {activeTab === 'tone' && (
                <div className="space-y-4">
                  {/* Add form */}
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200/80 space-y-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Add Tone of Voice Rule
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <input
                          type="text"
                          value={newTone.rule_name}
                          onChange={(e) => setNewTone({ ...newTone, rule_name: e.target.value })}
                          placeholder="Rule Name (e.g. Avoid Artificial Urgency)"
                          className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
                        />
                      </div>
                      <div>
                        <select
                          value={newTone.severity}
                          onChange={(e) => setNewTone({ ...newTone, severity: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
                        >
                          <option value="high">High Severity</option>
                          <option value="medium">Medium Severity</option>
                          <option value="low">Low Severity</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={newTone.flagged_patterns}
                        onChange={(e) => setNewTone({ ...newTone, flagged_patterns: e.target.value })}
                        placeholder="Flagged phrases, comma-separated (e.g. act now, last chance forever)"
                        className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTone.suggestion}
                        onChange={(e) => setNewTone({ ...newTone, suggestion: e.target.value })}
                        placeholder="Recommended tone guidance..."
                        className="flex-1 px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddTone}
                        className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 text-white hover:bg-slate-700"
                      >
                        Add Tone Rule
                      </button>
                    </div>
                  </div>

                  {/* List of Tone Rules */}
                  <div className="space-y-2">
                    {formData.tone_rules.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-800">
                              {item.rule_name}
                            </span>
                            <SeverityBadge severity={item.severity} />
                          </div>
                          <p className="text-xs text-slate-500">
                            Flagged patterns: {(item.flagged_patterns || []).join(', ')}
                          </p>
                          <p className="text-2xs text-blue-700">Guidance: {item.suggestion}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveTone(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
