import React from 'react';
import { MapPin, RotateCcw, LogOut, CheckCircle, Package, FileSpreadsheet, Clock } from 'lucide-react';
import type { ManifestMetadata } from '../types';

interface HeaderProps {
  totalCount: number;
  filteredCount: number;
  onReset: () => void;
  user?: { firstName?: string; username?: string };
  manifestMeta?: ManifestMetadata | null;
}

export const Header: React.FC<HeaderProps> = ({ totalCount, filteredCount, onReset, user, manifestMeta }) => {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-3.5 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 grid place-items-center text-white shadow-sm shadow-blue-500/25 shrink-0">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base sm:text-lg tracking-tight text-slate-900">Routing Assistant</h1>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Ops Utility
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">ACED Division · SpeedX & Logistics Engine</p>
          </div>
        </div>

        {/* Status Counters & Actions */}
        <div className="flex items-center gap-3">
          {manifestMeta && manifestMeta.rawFilename && (
            <div className="hidden lg:flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700">
              <FileSpreadsheet className="h-4 w-4 text-blue-600 shrink-0" />
              <span className="font-mono text-slate-800 max-w-[170px] truncate" title={manifestMeta.rawFilename}>
                {manifestMeta.rawFilename}
              </span>
              {manifestMeta.formattedDate ? (
                <span className="inline-flex items-center gap-1 text-blue-700 font-semibold border-l border-slate-200 pl-2">
                  <Clock className="h-3 w-3 text-blue-600" />
                  <span>{manifestMeta.formattedDate}</span>
                </span>
              ) : null}
            </div>
          )}

          {totalCount > 0 && (
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700">
              <Package className="h-4 w-4 text-slate-400" />
              <span>{totalCount} total</span>
              <span className="text-slate-300">/</span>
              <span className="text-blue-600 font-bold">{filteredCount} selected</span>
            </div>
          )}

          {totalCount > 0 && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-all shadow-xs cursor-pointer"
              title="Clear current stops and start over"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              <span>Start Afresh</span>
            </button>
          )}

          {/* User profile / Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <span className="text-xs text-slate-600 font-medium hidden md:inline">
              {user?.firstName || user?.username || 'Operator'}
            </span>
            <a
              href="/logout"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
