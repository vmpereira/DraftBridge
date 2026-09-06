'use client';

import React, { useState } from 'react';
import {
  Folder,
  FileText,
  ChevronRight,
  ChevronDown,
  Edit2,
  Trash2,
  Plus,
  FolderPlus,
} from 'lucide-react';
import { FileNode } from '@/types';
import { joinPath, getDirname } from '@/utils/path';

export interface FileOperations {
  onOpenFile: (path: string) => void;
  onRenameFile: (oldPath: string, newPath: string) => void;
  onDeleteFile: (path: string) => void;
}

interface ExplorerViewProps {
  workspacePath: string | null;
  fileTree: FileNode[];
  activeFilePath?: string;
  operations: FileOperations;
  onOpenFolderDialog: () => void;
  onCreateNote: () => void;
  onCreateFolder?: () => void;
}

interface TreeNodeProps {
  node: FileNode;
  depth: number;
  activeFilePath?: string;
  operations: FileOperations;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  depth,
  activeFilePath,
  operations,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentName = node.name;
    const newName = prompt('Rename to:', currentName);
    if (!newName || newName === currentName) return;

    const parentDir = getDirname(node.path);
    const finalName = newName.endsWith('.md') || node.isDirectory ? newName : `${newName}.md`;
    const newPath = joinPath(parentDir, finalName);
    operations.onRenameFile(node.path, newPath);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirm = window.confirm(`Delete ${node.name}? This action cannot be undone.`);
    if (confirm) {
      operations.onDeleteFile(node.path);
    }
  };

  if (node.isDirectory) {
    return (
      <div className="select-none">
        <div
          onClick={() => setCollapsed(!collapsed)}
          style={{ paddingLeft: `${depth * 12 + 6}px` }}
          className="group flex items-center justify-between rounded px-2 py-1 text-xs text-slate-300 hover:bg-slate-800/60 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-1.5 truncate">
            {collapsed ? (
              <ChevronRight className="h-3 w-3 text-slate-500 shrink-0" />
            ) : (
              <ChevronDown className="h-3 w-3 text-slate-500 shrink-0" />
            )}
            <Folder className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <span className="truncate font-medium text-slate-200">{node.name}</span>
          </div>
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
            <button
              onClick={handleRename}
              className="p-0.5 text-slate-500 hover:text-slate-200 rounded transition-colors"
              title="Rename Folder"
            >
              <Edit2 className="h-3 w-3" />
            </button>
            <button
              onClick={handleDelete}
              className="p-0.5 text-slate-500 hover:text-red-400 rounded transition-colors"
              title="Delete Folder"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        {!collapsed && node.children && (
          <div className="space-y-0.5">
            {node.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                activeFilePath={activeFilePath}
                operations={operations}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // File node
  const isActive = activeFilePath === node.path;

  return (
    <div
      onClick={() => operations.onOpenFile(node.path)}
      style={{ paddingLeft: `${depth * 12 + 18}px` }}
      className={`group flex items-center justify-between rounded px-2 py-1 text-xs cursor-pointer transition-colors ${
        isActive
          ? 'bg-indigo-600/20 text-indigo-300 font-medium'
          : 'text-slate-300 hover:bg-slate-800/60'
      }`}
    >
      <div className="flex items-center gap-1.5 truncate">
        <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        <span className="truncate">{node.name}</span>
      </div>

      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
        <button
          onClick={handleRename}
          className="p-0.5 text-slate-500 hover:text-slate-200 rounded transition-colors"
          title="Rename"
        >
          <Edit2 className="h-3 w-3" />
        </button>
        <button
          onClick={handleDelete}
          className="p-0.5 text-slate-500 hover:text-red-400 rounded transition-colors"
          title="Delete"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};

export const ExplorerView: React.FC<ExplorerViewProps> = ({
  workspacePath,
  fileTree,
  activeFilePath,
  operations,
  onOpenFolderDialog,
  onCreateNote,
  onCreateFolder,
}) => {
  if (!workspacePath) {
    return (
      <div className="px-3 py-6 text-center">
        <p className="text-xs text-slate-400 mb-3">No folder opened.</p>
        <button
          onClick={onOpenFolderDialog}
          className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors shadow-sm"
        >
          Open Folder
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {fileTree.length === 0 ? (
        <div className="px-2 py-6 text-xs text-slate-500 text-center space-y-2">
          <div>No markdown files found.</div>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={onCreateNote}
              className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:underline"
            >
              <Plus className="h-3 w-3" /> Note
            </button>
            {onCreateFolder && (
              <button
                onClick={onCreateFolder}
                className="inline-flex items-center gap-1 text-xs text-slate-400 hover:underline"
              >
                <FolderPlus className="h-3 w-3" /> Folder
              </button>
            )}
          </div>
        </div>
      ) : (
        fileTree.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            depth={0}
            activeFilePath={activeFilePath}
            operations={operations}
          />
        ))
      )}
    </div>
  );
};
