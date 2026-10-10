import React from 'react';
import { MapPin, RotateCcw, LogOut, CheckCircle, Package } from 'lucide-react';

interface HeaderProps {
  totalCount: number;
  filteredCount: number;
  onReset: () => void;
  user?: { firstName?: string; username?: string };
}

export const Header: React.FC<HeaderProps> = ({ totalCount, filteredCount, onReset, user }) => {
  return (
    <header className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur sticky top-0 z-30 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 grid place-items-center text-white shadow-lg shadow-emerald-950/40">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base tracking-tight text-zinc-100">Routing Assistant</h1>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Ops Utility
              </span>
            </div>
            <p className="text-xs text-zinc-400">ACED Division · SpeedX & Logistics Engine</p>
          </div>
        </div>

        {/* Status Counters & Actions */}
        <div className="flex items-center gap-3">
          {totalCount > 0 && (
            <div className="hidden sm:flex items-center gap-2 bg-zinc-800/80 border border-zinc-700/60 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300">
              <Package className="h-3.5 w-3.5 text-zinc-400" />
              <span>{totalCount} total</span>
              <span className="text-zinc-500">/</span>
              <span className="text-emerald-400 font-semibold">{filteredCount} selected</span>
            </div>
          )}

          {totalCount > 0 && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors cursor-pointer"
              title="Clear current stops and start over"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Start Afresh</span>
            </button>
          )}

          {/* User profile / Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
            <span className="text-xs text-zinc-400 hidden md:inline">
              {user?.firstName || user?.username || 'Operator'}
            </span>
            <a
              href="/logout"
              className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};
