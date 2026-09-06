'use client';

import React, { useState } from 'react';
import { Tag, Plus, X, Calendar, ChevronDown, ChevronRight, Hash } from 'lucide-react';

interface PropertiesBannerProps {
  frontmatter: Record<string, any>;
  onChange: (newFrontmatter: Record<string, any>) => void;
  onTagClick?: (tag: string) => void;
}

export const PropertiesBanner: React.FC<PropertiesBannerProps> = ({
  frontmatter,
  onChange,
  onTagClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [newTagInput, setNewTagInput] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [isAddingField, setIsAddingField] = useState(false);

  const tags: string[] = Array.isArray(frontmatter.tags)
    ? frontmatter.tags
    : typeof frontmatter.tags === 'string'
    ? frontmatter.tags.split(',').map((t: string) => t.trim())
    : [];

  const handleAddTag = () => {
    const trimmed = newTagInput.trim().replace(/^#/, '');
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      onChange({ ...frontmatter, tags: [...tags, trimmed] });
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange({
      ...frontmatter,
      tags: tags.filter((t) => t !== tagToRemove),
    });
  };

  const handleFieldChange = (key: string, value: any) => {
    onChange({ ...frontmatter, [key]: value });
  };

  const handleRemoveField = (key: string) => {
    const updated = { ...frontmatter };
    delete updated[key];
    onChange(updated);
  };

  const handleAddNewProperty = () => {
    const k = newKey.trim();
    if (!k) return;
    onChange({ ...frontmatter, [k]: newValue.trim() });
    setNewKey('');
    setNewValue('');
    setIsAddingField(false);
  };

  // Skip rendering standard 'tags' key in generic key-value list since it has dedicated row
  const customKeys = Object.keys(frontmatter).filter(
    (k) => k !== 'tags' && k !== 'tag'
  );

  return (
    <div className="mb-6 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-300">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
        >
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          Note Properties
        </button>
        <span className="text-[11px] text-slate-500 font-mono">YAML Frontmatter</span>
      </div>

      {isExpanded && (
        <div className="space-y-3">
          {/* Tags Row */}
          <div className="flex items-start gap-3">
            <div className="flex items-center gap-1.5 w-24 shrink-0 text-slate-400 text-xs font-medium pt-1">
              <Tag className="h-3.5 w-3.5 text-indigo-400" />
              Tags
            </div>
            <div className="flex flex-wrap items-center gap-1.5 flex-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-xs font-medium text-indigo-300"
                >
                  <span
                    className="cursor-pointer hover:underline"
                    onClick={() => onTagClick && onTagClick(tag)}
                  >
                    #{tag}
                  </span>
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="text-indigo-400/70 hover:text-indigo-200"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <div className="inline-flex items-center gap-1">
                <input
                  type="text"
                  placeholder="Add tag..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  className="h-6 w-24 rounded border border-slate-700 bg-slate-800/80 px-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 focus:w-32 transition-all"
                />
                {newTagInput && (
                  <button
                    onClick={handleAddTag}
                    className="h-6 w-6 rounded bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-500"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Dynamic Properties */}
          {customKeys.map((key) => (
            <div key={key} className="flex items-center gap-3 group">
              <div className="flex items-center gap-1.5 w-24 shrink-0 text-slate-400 text-xs font-medium truncate capitalize">
                <Hash className="h-3 w-3 text-slate-500" />
                {key}
              </div>
              <input
                type="text"
                value={String(frontmatter[key] ?? '')}
                onChange={(e) => handleFieldChange(key, e.target.value)}
                className="h-7 flex-1 rounded border border-slate-800 bg-slate-950/60 px-2.5 text-xs text-slate-200 outline-none focus:border-slate-600 transition-colors"
              />
              <button
                onClick={() => handleRemoveField(key)}
                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 transition-opacity"
                title="Remove property"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {/* Add Property Row */}
          {isAddingField ? (
            <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
              <input
                type="text"
                placeholder="Key (e.g. status, author)"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="h-7 w-32 rounded border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                placeholder="Value"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="h-7 flex-1 rounded border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200 outline-none focus:border-indigo-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddNewProperty();
                }}
              />
              <button
                onClick={handleAddNewProperty}
                className="h-7 px-3 rounded bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500 transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => setIsAddingField(false)}
                className="h-7 px-2 text-slate-400 hover:text-slate-200 text-xs"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingField(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-indigo-400 pt-1 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add property
            </button>
          )}
        </div>
      )}
    </div>
  );
};
