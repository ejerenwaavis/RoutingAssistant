import React from 'react';
import { Download, Navigation, MessageSquare, RefreshCw, Layers } from 'lucide-react';

export function ExportToolbar({
  onExport,
  onCopyDriverSummary,
  totalRecords,
  filteredCount
}) {
  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
          <Navigation className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white">Preset Exporters</h4>
          <p className="text-xs text-zinc-400">
            Exporting <span className="font-semibold text-sky-400">{filteredCount}</span> of {totalRecords} records
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Navigation App Exports */}
        <button
          type="button"
          onClick={() => onExport('circuit')}
          disabled={filteredCount === 0}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition disabled:opacity-40 disabled:pointer-events-none"
        >
          <Download className="w-3.5 h-3.5 text-sky-400" />
          <span>Circuit CSV</span>
        </button>

        <button
          type="button"
          onClick={() => onExport('spoke')}
          disabled={filteredCount === 0}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition disabled:opacity-40 disabled:pointer-events-none"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Spoke CSV</span>
        </button>

        <button
          type="button"
          onClick={() => onExport('groundcloud')}
          disabled={filteredCount === 0}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition disabled:opacity-40 disabled:pointer-events-none"
        >
          <Download className="w-3.5 h-3.5 text-amber-400" />
          <span>GroundCloud</span>
        </button>

        {/* Rollover Manifest */}
        <button
          type="button"
          onClick={() => onExport('rollover')}
          disabled={totalRecords === 0}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-950/60 hover:bg-rose-900/60 text-rose-200 border border-rose-800/60 transition disabled:opacity-40 disabled:pointer-events-none"
        >
          <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
          <span>Rollover Manifest</span>
        </button>

        {/* Driver EOD Clipboard */}
        <button
          type="button"
          onClick={onCopyDriverSummary}
          disabled={totalRecords === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/20 transition disabled:opacity-40 disabled:pointer-events-none"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Copy Driver EOD Summary</span>
        </button>
      </div>
    </div>
  );
}
