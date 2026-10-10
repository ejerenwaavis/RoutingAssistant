import React, { useMemo } from 'react';
import { Filter, CheckSquare, Square, Layers, Check, Clock } from 'lucide-react';
import type { Stop, ManifestMetadata } from '../types';

interface Step2ZipSlicerProps {
  stops: Stop[];
  selectedZips: Set<string>;
  onToggleZip: (zip: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  manifestMeta?: ManifestMetadata | null;
}

export const Step2ZipSlicer: React.FC<Step2ZipSlicerProps> = ({
  stops,
  selectedZips,
  onToggleZip,
  onSelectAll,
  onDeselectAll,
  manifestMeta
}) => {
  // Aggregate stops by zip code
  const zipStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const stop of stops) {
      const z = stop.zip || 'Unknown';
      counts[z] = (counts[z] || 0) + 1;
    }
    // Sort descending by count
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [stops]);

  const allSelected = zipStats.length > 0 && zipStats.every(([zip]) => selectedZips.has(zip));
  const noneSelected = selectedZips.size === 0;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs transition-all">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-600 font-bold text-xs border border-blue-200">
              2
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Zip Code Slicer</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Select or isolate delivery clusters to partition your manifest into targeted runs.
            {manifestMeta?.formattedDate && (
              <span className="ml-2 text-blue-700 font-semibold inline-flex items-center gap-1 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                <Clock className="h-3 w-3 inline text-blue-600" />
                SpeedX Batch: {manifestMeta.formattedDate}
              </span>
            )}
          </p>
        </div>

        {/* Quick Batch Select Toggles */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onSelectAll}
            disabled={allSelected}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 disabled:opacity-40 text-xs font-semibold text-slate-700 border border-slate-300 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <CheckSquare className="h-4 w-4 text-blue-600" />
            <span>Select All</span>
          </button>
          <button
            type="button"
            onClick={onDeselectAll}
            disabled={noneSelected}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 disabled:opacity-40 text-xs font-semibold text-slate-700 border border-slate-300 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Square className="h-4 w-4 text-slate-400" />
            <span>Deselect All</span>
          </button>
        </div>
      </div>

      {/* Balanced, Spacious, High-Contrast Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-1">
        {zipStats.map(([zip, count]) => {
          const isSelected = selectedZips.has(zip);
          return (
            <button
              key={zip}
              type="button"
              onClick={() => onToggleZip(zip)}
              className={`group flex items-center justify-between p-3 sm:p-3.5 rounded-xl border-2 transition-all cursor-pointer min-h-[54px] w-full ${
                isSelected
                  ? 'bg-blue-50/70 border-blue-600 text-blue-900 shadow-sm ring-1 ring-blue-500/20'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center border-2 shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                      : 'border-slate-300 bg-white group-hover:border-slate-400'
                  }`}
                >
                  {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                </div>
                <span className={`font-mono text-sm sm:text-base font-bold tracking-tight ${
                  isSelected ? 'text-blue-950 font-extrabold' : 'text-slate-800'
                }`}>
                  {zip}
                </span>
              </div>

              <span
                className={`text-xs px-2.5 py-1 rounded-full font-bold shrink-0 ml-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 border border-slate-200 group-hover:bg-slate-200'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
