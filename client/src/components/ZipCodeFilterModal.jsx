import React from 'react';
import { MapPin, Check, Filter, X } from 'lucide-react';

export function ZipCodeFilterModal({
  zipDistribution,
  selectedZipCodes,
  onToggleZip,
  onSelectAll,
  onClearAll
}) {
  if (!zipDistribution || zipDistribution.length === 0) {
    return null;
  }

  const allSelected = selectedZipCodes.length === zipDistribution.length;
  const anySelected = selectedZipCodes.length > 0;

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-purple-400" />
          <h4 className="text-sm font-semibold text-white">Dynamic Postal Aggregator</h4>
          <span className="text-xs text-zinc-400">
            ({zipDistribution.length} zones found)
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {anySelected && (
            <span className="text-purple-400 font-medium">
              {selectedZipCodes.length} active
            </span>
          )}
          <button
            type="button"
            onClick={allSelected ? onClearAll : onSelectAll}
            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition"
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
          {anySelected && (
            <button
              type="button"
              onClick={onClearAll}
              className="p-1 rounded-lg bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition"
              title="Clear zip filter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Zip code pill list */}
      <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
        {zipDistribution.map((item) => {
          const isSelected = selectedZipCodes.includes(item.zipCode);
          return (
            <button
              key={item.zipCode}
              type="button"
              onClick={() => onToggleZip(item.zipCode)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                isSelected
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/30'
                  : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
              }`}
            >
              <span className="font-mono font-semibold">{item.zipCode}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                isSelected ? 'bg-purple-700 text-purple-100' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {item.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
