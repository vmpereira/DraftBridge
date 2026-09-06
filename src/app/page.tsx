'use client';

import React, { useEffect, useState } from 'react';

export default function Home() {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    import('@/components/workspace/WorkspaceShell')
      .then((mod) => {
        setComponent(() => mod.WorkspaceShell);
      })
      .catch((err) => {
        console.error('Failed to load WorkspaceShell', err);
      });
  }, []);

  if (!Component) {
    return (
      <main className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-400">
        <div className="text-xs font-mono tracking-wider uppercase text-slate-500 animate-pulse">
          DraftBridge Loading...
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen w-screen overflow-hidden">
      <Component />
    </main>
  );
}

