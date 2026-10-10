import React, { useMemo } from 'react';
import { Filter, CheckSquare, Square, Layers, Check } from 'lucide-react';
import type { Stop } from '../types';

interface Step2ZipSlicerProps {
  stops: Stop[];
  selectedZips: Set<string>;
  onToggleZip: (zip: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export const Step2ZipSlicer: React.FC<Step2ZipSlicerProps> = ({
  stops,
  selectedZips,
  onToggleZip,
  onSelectAll,
  onDeselectAll
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
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl transition-all">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs border border-emerald-500/30">
              2
            </span>
            <h2 className="text-base font-semibold text-zinc-100 tracking-tight">Zip Code Slicer</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Select or isolate specific delivery clusters to partition manifests.
          </p>
        </div>

        {/* Quick Batch Select Toggles */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onSelectAll}
            disabled={allSelected}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs font-medium text-zinc-300 hover:text-white border border-zinc-700 rounded-lg transition-colors cursor-pointer"
          >
            <CheckSquare className="h-3.5 w-3.5 text-emerald-400" />
            <span>Select All</span>
          </button>
          <button
            type="button"
            onClick={onDeselectAll}
            disabled={noneSelected}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs font-medium text-zinc-300 hover:text-white border border-zinc-700 rounded-lg transition-colors cursor-pointer"
          >
            <Square className="h-3.5 w-3.5 text-zinc-400" />
            <span>Deselect All</span>
          </button>
        </div>
      </div>

      {/* Pill Tags Grid */}
      <div className="flex flex-wrap gap-2 pt-1">
        {zipStats.map(([zip, count]) => {
          const isSelected = selectedZips.has(zip);
          return (
            <button
              key={zip}
              type="button"
              onClick={() => onToggleZip(zip)}
              className={`group flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200 shadow-sm shadow-emerald-950/30 ring-1 ring-emerald-500/30'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors ${
                  isSelected
                    ? 'bg-emerald-500 border-emerald-400 text-zinc-950'
                    : 'border-zinc-700 group-hover:border-zinc-500'
                }`}
              >
                {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
              </div>
              <span className="font-mono tracking-tight font-semibold text-zinc-200">
                {zip}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  isSelected
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-300'
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
