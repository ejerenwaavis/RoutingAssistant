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
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs border border-emerald-500/30">
            3
          </span>
          <h2 className="text-base font-semibold text-zinc-100 tracking-tight">One-Click Export</h2>
        </div>
        <p className="text-xs text-zinc-400 mt-0.5">
          Select your target navigation app and download the filtered manifest.
        </p>
      </div>

      {/* Format Selection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-5">
        {FORMAT_OPTIONS.map((opt) => {
          const isSelected = selectedFormat === opt.id;
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelectedFormat(opt.id)}
              className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                isSelected
                  ? 'bg-zinc-800/90 border-emerald-500/70 text-zinc-100 shadow-md ring-1 ring-emerald-500/30'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  isSelected ? 'border-emerald-500 bg-emerald-500 text-zinc-950' : 'border-zinc-700'
                }`}>
                  {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-zinc-200">{opt.title}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-medium">
                  {opt.badge}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                {opt.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Export Filename Preview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 px-1 text-xs text-zinc-400">
        <div className="flex flex-wrap items-center gap-1.5 font-mono">
          <span className="text-zinc-500 font-sans">Export Filename:</span>
          <span className="text-emerald-400 bg-zinc-950 px-2.5 py-0.5 rounded-lg border border-zinc-800 break-all">
            {livePreviewFilename}
          </span>
        </div>
        <span className="text-[11px] text-zinc-500">
          Selected ZIP(s) + export click timestamp
        </span>
      </div>

      {/* One Large Export Button */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={handleExport}
          disabled={count === 0 || isExporting}
          className="w-full sm:flex-1 py-3 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Download className="h-4 w-4" />
          <span>
            Download {activeFormatInfo?.title} CSV ({count} {count === 1 ? 'Stop' : 'Stops'})
          </span>
        </button>

        {downloadSuccess && (
          <div className="text-xs font-medium text-emerald-400 flex items-center gap-1.5 animate-fade-in bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
            <Check className="h-4 w-4 shrink-0" />
            <span>
              Saved: <strong className="font-mono text-zinc-200">{lastExportedFilename}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
