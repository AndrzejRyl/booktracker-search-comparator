import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function AppShell() {
  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <Suspense fallback={<div className="animate-pulse text-zinc-500 text-sm">Loading…</div>}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
