import React, { useMemo } from 'react';
import { CheckSquare, Square, Check, Clock, Filter, Activity, Sparkles } from 'lucide-react';
import { isDeliveredStatus } from '../lib/parser';
import type { Stop, ManifestMetadata } from '../types';

interface Step2ZipSlicerProps {
  stops: Stop[];
  selectedZips: Set<string>;
  selectedStatuses: Set<string>;
  hasStatusColumn: boolean;
  onToggleZip: (zip: string) => void;
  onSelectAllZips: () => void;
  onDeselectAllZips: () => void;
  onToggleStatus: (status: string) => void;
  onSelectActiveStatuses: () => void;
  onSelectAllStatuses: () => void;
  onDeselectAllStatuses: () => void;
  manifestMeta?: ManifestMetadata | null;
}

export const Step2ZipSlicer: React.FC<Step2ZipSlicerProps> = ({
  stops,
  selectedZips,
  selectedStatuses,
  hasStatusColumn,
  onToggleZip,
  onSelectAllZips,
  onDeselectAllZips,
  onToggleStatus,
  onSelectActiveStatuses,
  onSelectAllStatuses,
  onDeselectAllStatuses,
  manifestMeta
}) => {
  // Aggregate stops by zip code
  const zipStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const stop of stops) {
      const z = stop.zip || 'Unknown';
      counts[z] = (counts[z] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [stops]);

  // Aggregate stops by delivery status
  const statusStats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const stop of stops) {
      const st = stop.status || 'NEW';
      counts[st] = (counts[st] || 0) + 1;
    }
    // Put active/pending statuses first, DELIVERED/completed last
    return Object.entries(counts).sort((a, b) => {
      const aDeliv = isDeliveredStatus(a[0]);
      const bDeliv = isDeliveredStatus(b[0]);
      if (aDeliv && !bDeliv) return 1;
      if (!aDeliv && bDeliv) return -1;
      return b[1] - a[1];
    });
  }, [stops]);

  const allZipsSelected = zipStats.length > 0 && zipStats.every(([zip]) => selectedZips.has(zip));
  const noZipsSelected = selectedZips.size === 0;

  const allStatusesSelected = statusStats.length > 0 && statusStats.every(([st]) => selectedStatuses.has(st));
  const noStatusesSelected = selectedStatuses.size === 0;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col gap-6">
      {/* SECTION 1: ZIP CODE SLICER */}
      <div>
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

          {/* Quick ZIP Toggles */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onSelectAllZips}
              disabled={allZipsSelected}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 text-xs font-semibold text-slate-700 border border-slate-300 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <CheckSquare className="h-3.5 w-3.5 text-blue-600" />
              <span>Select All</span>
            </button>
            <button
              type="button"
              onClick={onDeselectAllZips}
              disabled={noZipsSelected}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 text-xs font-semibold text-slate-700 border border-slate-300 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Square className="h-3.5 w-3.5 text-slate-400" />
              <span>Deselect All</span>
            </button>
          </div>
        </div>

        {/* Balanced 2-Column Mobile Grid for ZIP Codes */}
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
                  <span
                    className={`font-mono text-sm sm:text-base font-bold tracking-tight ${
                      isSelected ? 'text-blue-950 font-extrabold' : 'text-slate-800'
                    }`}
                  >
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

      {/* SECTION 2: MID-ROUTE STATUS SLICER */}
      {hasStatusColumn && statusStats.length > 0 && (
        <div className="pt-5 border-t border-slate-200/80">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3.5">
            <div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  Mid-Route Status Filter
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                  Detected
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Exclude completed deliveries or isolate attempts. Active stops are auto-checked; delivered stops are left unchecked.
              </p>
            </div>

            {/* Quick Status Toggles */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onSelectActiveStatuses}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-xs font-bold text-blue-700 border border-blue-200 rounded-xl transition-all shadow-xs cursor-pointer"
                title="Select only pending/active stops (NEW, ATTEMPTED, FAILED) and uncheck DELIVERED"
              >
                <Activity className="h-3.5 w-3.5 text-blue-600" />
                <span>Active Only</span>
              </button>
              <button
                type="button"
                onClick={onSelectAllStatuses}
                disabled={allStatusesSelected}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 text-xs font-semibold text-slate-700 border border-slate-300 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <CheckSquare className="h-3.5 w-3.5 text-slate-500" />
                <span>All</span>
              </button>
              <button
                type="button"
                onClick={onDeselectAllStatuses}
                disabled={noStatusesSelected}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 text-xs font-semibold text-slate-700 border border-slate-300 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Square className="h-3.5 w-3.5 text-slate-400" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Status Pills */}
          <div className="flex flex-wrap gap-2.5 pt-1">
            {statusStats.map(([status, count]) => {
              const isSelected = selectedStatuses.has(status);
              const isDeliv = isDeliveredStatus(status);

              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => onToggleStatus(status)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 transition-all cursor-pointer font-sans text-xs ${
                    isSelected
                      ? isDeliv
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-1 ring-emerald-400/20'
                        : 'bg-blue-50/80 border-blue-600 text-blue-950 ring-1 ring-blue-500/20'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border-2 shrink-0 ${
                      isSelected
                        ? isDeliv
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-blue-600 border-blue-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>

                  <span className="font-bold tracking-tight uppercase">
                    {status}
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                      isSelected
                        ? isDeliv
                          ? 'bg-emerald-600 text-white'
                          : 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
export default Step2ZipSlicer;
