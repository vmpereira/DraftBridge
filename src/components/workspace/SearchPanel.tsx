'use client';

import React from 'react';
import { FileText } from 'lucide-react';

interface SearchPanelProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  results: Array<{ title: string; path: string }>;
  onSelectNote: (path: string) => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
  searchQuery,
  onSearchChange,
  results,
  onSelectNote,
}) => {
  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Search note title..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-colors"
      />
      <div className="space-y-1">
        {results.length === 0 ? (
          <div className="px-2 py-4 text-xs text-slate-500 text-center">
            {searchQuery ? 'No matching notes found.' : 'Type to search notes...'}
          </div>
        ) : (
          results.map((note) => (
            <div
              key={note.path}
              onClick={() => onSelectNote(note.path)}
              className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800/60 cursor-pointer transition-colors"
            >
              <FileText className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <div className="truncate">
                <div className="font-medium truncate">{note.title}</div>
                <div className="text-[10px] text-slate-500 truncate">{note.path}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
