import React, { useState, useMemo } from 'react';
import { Download, FileDown, Check, Sparkles, Navigation, Map, Route, FileCheck } from 'lucide-react';
import { exportManifest } from '../lib/exporter';
import { buildExportFilename } from '../lib/filenameHelper';
import type { Stop, ExportPreset } from '../types';

interface Step3ExportProps {
  filteredStops: Stop[];
  selectedZips: string[];
  totalZipsCount?: number;
}

interface FormatOption {
  id: ExportPreset;
  title: string;
  badge: string;
  description: string;
  icon: React.ElementType;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    id: 'circuit',
    title: 'Circuit / Spoke',
    badge: 'Popular',
    description: 'Universal 9-column format with packages & recipient notes.',
    icon: Navigation
  },
  {
    id: 'roadwarrior',
    title: 'RoadWarrior',
    badge: 'Standard',
    description: 'Formatted for RoadWarrior multi-stop optimization tool.',
    icon: Route
  },
  {
    id: 'route4me',
    title: 'Route4Me',
    badge: 'Direct',
    description: 'Clean address and alias format for instant upload.',
    icon: Map
  },
  {
    id: 'groundcloud',
    title: 'GroundCloud',
    badge: 'FedEx / Dispatch',
    description: 'Sequence-aligned dispatch format with consignee notes.',
    icon: FileDown
  }
];

export const Step3Export: React.FC<Step3ExportProps> = ({
  filteredStops,
  selectedZips,
  totalZipsCount
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportPreset>('circuit');
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [lastExportedFilename, setLastExportedFilename] = useState<string | null>(null);

  // Live estimated filename preview based on selected ZIPs and current clock
  const livePreviewFilename = useMemo(() => {
    return buildExportFilename(selectedZips, totalZipsCount, new Date());
  }, [selectedZips, totalZipsCount]);

  const handleExport = () => {
    if (filteredStops.length === 0) return;
    setIsExporting(true);
    setDownloadSuccess(false);

    try {
      // Name the exported file using selected zip code(s) plus current date & time
      const exportedFilename = exportManifest(
        selectedFormat,
        filteredStops,
        selectedZips,
        totalZipsCount
      );
      setLastExportedFilename(exportedFilename);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const count = filteredStops.length;
  const activeFormatInfo = FORMAT_OPTIONS.find(f => f.id === selectedFormat);

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
      <div className="mb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-600 font-bold text-xs border border-blue-200">
            3
          </span>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">One-Click Export</h2>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Select your target navigation app and download the filtered manifest.
        </p>
      </div>

      {/* Format Selection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {FORMAT_OPTIONS.map((opt) => {
          const isSelected = selectedFormat === opt.id;
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelectedFormat(opt.id)}
              className={`text-left p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                isSelected
                  ? 'bg-blue-50/70 border-blue-600 text-blue-900 shadow-sm ring-1 ring-blue-500/20'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-50 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'
                }`}>
                  {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className={`font-bold text-sm ${isSelected ? 'text-blue-950 font-extrabold' : 'text-slate-900'}`}>
                  {opt.title}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isSelected ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {opt.badge}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                {opt.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Export Filename Preview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-500 font-medium">Export Filename:</span>
          <span className="text-blue-700 font-bold font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-300 break-all shadow-xs">
            {livePreviewFilename}
          </span>
        </div>
        <span className="text-[11px] text-slate-500 font-medium">
          ZIP code(s) + export click timestamp
        </span>
      </div>

      {/* One Large Export Button */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={handleExport}
          disabled={count === 0 || isExporting}
          className="w-full sm:flex-1 py-3.5 px-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-sm sm:text-base rounded-xl shadow-md shadow-blue-500/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
        >
          <Download className="h-5 w-5" />
          <span>
            Download {activeFormatInfo?.title} CSV ({count} {count === 1 ? 'Stop' : 'Stops'})
          </span>
        </button>

        {downloadSuccess && (
          <div className="text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-fade-in bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-xl shadow-xs">
            <Check className="h-4.5 w-4.5 shrink-0 text-emerald-600" />
            <span>
              Saved: <strong className="font-mono text-emerald-950 font-bold">{lastExportedFilename}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
