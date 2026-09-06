'use client';

import React from 'react';
import { FileText, X } from 'lucide-react';

interface TagsPanelProps {
  tagsSummary: Array<{ tag: string; count: number; paths: string[] }>;
  selectedTagFilter: string | null;
  onSelectTag: (tag: string | null) => void;
  onOpenNote: (path: string) => void;
}

export const TagsPanel: React.FC<TagsPanelProps> = ({
  tagsSummary,
  selectedTagFilter,
  onSelectTag,
  onOpenNote,
}) => {
  const activeTagData = selectedTagFilter
    ? tagsSummary.find((t) => t.tag === selectedTagFilter)
    : null;

  return (
    <div className="space-y-3">
      {selectedTagFilter && (
        <div className="flex items-center justify-between rounded bg-indigo-950/60 border border-indigo-700/50 p-2 text-xs text-indigo-300">
          <span className="font-medium truncate">Filter: #{selectedTagFilter}</span>
          <button
            onClick={() => onSelectTag(null)}
            className="text-indigo-400 hover:text-indigo-200"
            title="Clear filter"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Tag Chips */}
      <div className="space-y-1">
        {tagsSummary.length === 0 ? (
          <div className="px-2 py-4 text-xs text-slate-500 text-center">
            No tags found in workspace.
          </div>
        ) : (
          tagsSummary.map((item) => (
            <div
              key={item.tag}
              onClick={() => onSelectTag(selectedTagFilter === item.tag ? null : item.tag)}
              className={`flex items-center justify-between rounded px-2 py-1.5 text-xs cursor-pointer transition-colors ${
                selectedTagFilter === item.tag
                  ? 'bg-indigo-600/30 text-indigo-300 font-medium'
                  : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <span className="truncate">#{item.tag}</span>
              <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-400">
                {item.count}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Matching notes for active tag filter */}
      {activeTagData && (
        <div className="pt-2 border-t border-slate-800/60 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
            Notes with #{activeTagData.tag}
          </div>
          {activeTagData.paths.map((p) => (
            <div
              key={p}
              onClick={() => onOpenNote(p)}
              className="flex items-center gap-2 rounded px-2 py-1 text-xs text-slate-300 hover:bg-slate-800/60 cursor-pointer transition-colors"
            >
              <FileText className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <span className="truncate">{p.split('/').pop() || p}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
