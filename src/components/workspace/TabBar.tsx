'use client';

import React from 'react';
import { FileText, X, Check } from 'lucide-react';
import { OpenTab } from '@/types';

interface TabBarProps {
  tabs: OpenTab[];
  activeTabIdx: number;
  saveStatus: 'saved' | 'saving';
  onSelectTab: (idx: number) => void;
  onCloseTab: (idx: number, e: React.MouseEvent) => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabIdx,
  saveStatus,
  onSelectTab,
  onCloseTab,
}) => {
  return (
    <div className="flex h-10 items-center justify-between border-b border-slate-800/80 bg-slate-900/40 px-2 select-none">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab, idx) => (
          <div
            key={tab.path}
            onClick={() => onSelectTab(idx)}
            className={`group flex items-center gap-2 rounded-t-md px-3 py-1.5 text-xs font-medium cursor-pointer border-t-2 transition-all ${
              idx === activeTabIdx
                ? 'bg-slate-950 text-slate-100 border-indigo-500'
                : 'bg-slate-900/40 text-slate-400 hover:bg-slate-900/80 hover:text-slate-300 border-transparent'
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span className="truncate max-w-[130px]">{tab.name}</span>
            {tab.isDirty ? (
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
            ) : (
              <button
                onClick={(e) => onCloseTab(idx, e)}
                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 rounded p-0.5 transition-opacity"
                title="Close Tab"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400 pr-2 shrink-0">
        {saveStatus === 'saving' ? (
          <span className="flex items-center gap-1.5 text-amber-400 text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Saving...
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
            <Check className="h-3 w-3" />
            Saved
          </span>
        )}
      </div>
    </div>
  );
};
