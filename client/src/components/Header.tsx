import React, { useState, useEffect } from 'react';
import { MapPin, RotateCcw, LogOut, Package, FileSpreadsheet, Clock, ScanBarcode, ArrowDownUp, Boxes, User } from 'lucide-react';
import type { ManifestMetadata, AppMode } from '../types';

interface HeaderProps {
  totalCount: number;
  filteredCount: number;
  onReset: () => void;
  user?: { firstName?: string; username?: string };
  manifestMeta?: ManifestMetadata | null;
  activeMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalCount,
  filteredCount,
  onReset,
  user,
  manifestMeta,
  activeMode,
  onModeChange
}) => {
  // Live clock matching the design photo
  const [currentTime, setCurrentTime] = useState<string>(() => {
    return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
        {/* ROW 1 (Mobile) / LEFT (Desktop): Brand & Mobile Actions */}
        <div className="flex items-center justify-between gap-2">
          {/* Brand - ACED ROUTING ASSISTANT with Green Cube Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-emerald-600 grid place-items-center text-white shadow-sm shadow-emerald-500/25 shrink-0">
              <Boxes className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-[10px] sm:text-[11px] tracking-wider text-emerald-700 uppercase leading-none">
                ACED
              </span>
              <h1 className="font-bold text-sm sm:text-base tracking-tight text-slate-900 leading-tight">
                Routing Assistant
              </h1>
            </div>
          </div>

          {/* Mobile Right Badges & Actions */}
          <div className="flex sm:hidden items-center gap-1.5 shrink-0">
            {totalCount > 0 && (
              <div
                className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg text-xs font-semibold text-slate-700"
                title={`${totalCount} total packages`}
              >
                <Package className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span>{totalCount} pkgs</span>
                {activeMode === 'slicer' && filteredCount !== totalCount && (
                  <span className="text-blue-600 font-bold">({filteredCount})</span>
                )}
              </div>
            )}

            {totalCount > 0 && (
              <button
                onClick={onReset}
                className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Start Afresh"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}

            <a
              href="/logout"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* ROW 2 (Mobile) / CENTER (Desktop): 3-Mode Switcher Tabs */}
        <div className="flex items-center justify-center">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 w-full sm:w-auto shadow-2xs">
            <button
              type="button"
              onClick={() => onModeChange('slicer')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'slicer'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              <span>Route Slicer</span>
            </button>

            <button
              type="button"
              onClick={() => onModeChange('sorter')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'sorter'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownUp className="h-3.5 w-3.5" />
              <span>Package Sorter</span>
              <span
                className={`text-[9px] px-1 py-0.2 rounded font-black uppercase ${
                  activeMode === 'sorter'
                    ? 'bg-white/20 text-white'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                Sort
              </span>
            </button>

            <button
              type="button"
              onClick={() => onModeChange('cage_verifier')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'cage_verifier'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ScanBarcode className="h-3.5 w-3.5" />
              <span>Cage Verifier</span>
              <span
                className={`text-[9px] px-1 py-0.2 rounded font-black uppercase ${
                  activeMode === 'cage_verifier'
                    ? 'bg-white/20 text-white'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                Scan
              </span>
            </button>
          </div>
        </div>

        {/* ROW 3 (Mobile only): Manifest Filename & Timestamp Subline */}
        {manifestMeta && manifestMeta.rawFilename && (
          <div className="flex sm:hidden items-center justify-between gap-2 px-2.5 py-1 bg-slate-50 border border-slate-200/80 rounded-lg text-[11px] text-slate-700 font-medium">
            <div className="flex items-center gap-1.5 min-w-0">
              <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span className="font-mono truncate max-w-[170px]" title={manifestMeta.rawFilename}>
                {manifestMeta.rawFilename}
              </span>
            </div>
            {manifestMeta.formattedDate && (
              <span className="inline-flex items-center gap-1 text-blue-700 font-semibold shrink-0">
                <Clock className="h-3 w-3 text-blue-600" />
                <span>{manifestMeta.formattedDate}</span>
              </span>
            )}
          </div>
        )}

        {/* RIGHT (Desktop / Tablet): Online Status, Manifest File, Pkgs Pill, Reset & User */}
        <div className="hidden sm:flex items-center gap-2.5">
          {/* Online status indicator & live time from photo */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-700 font-bold">Online</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-600">{currentTime}</span>
          </div>

          {manifestMeta && manifestMeta.rawFilename && (
            <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700">
              <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span className="font-mono text-slate-800 max-w-[130px] truncate" title={manifestMeta.rawFilename}>
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
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700">
              <Package className="h-3.5 w-3.5 text-slate-400" />
              <span>{totalCount} pkgs</span>
              {activeMode === 'slicer' && (
                <>
                  <span className="text-slate-300">/</span>
                  <span className="text-blue-600 font-bold">{filteredCount} sel</span>
                </>
              )}
            </div>
          )}

          {totalCount > 0 && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-all shadow-xs cursor-pointer"
              title="Clear current stops and start over"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              <span>Reset</span>
            </button>
          )}

          {/* User profile / Logout with avatar icon from photo */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 grid place-items-center text-slate-600">
              <User className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs text-slate-700 font-medium hidden lg:inline">
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
export default Header;
