import React from 'react';

export function HighlightedText({ content, findings, selectedFindingId, onSelectFinding }) {
  if (!content) {
    return <p className="text-slate-400 italic">No content to preview.</p>;
  }

  // Filter only findings that have valid character positions
  const positionalFindings = findings
    .filter(f => f.start_pos >= 0 && f.end_pos > f.start_pos)
    .sort((a, b) => a.start_pos - b.start_pos);

  if (positionalFindings.length === 0) {
    return (
      <div className="whitespace-pre-wrap font-sans text-sm text-slate-800 leading-relaxed">
        {content}
      </div>
    );
  }

  // Segment the content into slices of text and highlights
  const elements = [];
  let currentIndex = 0;

  for (let i = 0; i < positionalFindings.length; i++) {
    const finding = positionalFindings[i];
    const { start_pos, end_pos, id, severity, is_heuristic } = finding;

    // Skip if start position is behind current index (e.g. overlapping)
    if (start_pos < currentIndex) {
      continue;
    }

    // Add plain text before this match
    if (start_pos > currentIndex) {
      elements.push(
        <span key={`text-${currentIndex}`}>
          {content.slice(currentIndex, start_pos)}
        </span>
      );
    }

    // Determine highlight color class
    let highlightClass = 'brand-highlight-medium';
    if (is_heuristic) {
      highlightClass = 'brand-highlight-heuristic';
    } else if (severity === 'high') {
      highlightClass = 'brand-highlight-high';
    } else if (severity === 'low') {
      highlightClass = 'brand-highlight-low';
    }

    const isSelected = selectedFindingId === id;

    elements.push(
      <mark
        key={`match-${id}-${start_pos}`}
        onClick={() => onSelectFinding && onSelectFinding(id)}
        className={`${highlightClass} ${
          isSelected ? 'ring-2 ring-blue-500 font-semibold' : ''
        } transition-all`}
        title={`Rule: ${finding.rule_name} (Click to inspect finding)`}
      >
        {content.slice(start_pos, end_pos)}
      </mark>
    );

    currentIndex = end_pos;
  }

  // Add any trailing plain text
  if (currentIndex < content.length) {
    elements.push(
      <span key={`text-end-${currentIndex}`}>
        {content.slice(currentIndex)}
      </span>
    );
  }

  return (
    <div className="whitespace-pre-wrap font-sans text-sm text-slate-800 leading-relaxed select-text">
      {elements}
    </div>
  );
}
