import React, { useState, useRef } from 'react';
import { UploadCloud, ClipboardPaste, FileSpreadsheet, Loader2, Sparkles, CheckCircle2, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { parseFile, parseClipboard } from '../lib/parser';
import type { Stop, ManifestMetadata } from '../types';

interface Step1IngestProps {
  onStopsLoaded: (stops: Stop[], sourceName: string) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  hasData: boolean;
  manifestMeta?: ManifestMetadata | null;
}

export const Step1Ingest: React.FC<Step1IngestProps> = ({
  onStopsLoaded,
  isLoading,
  setIsLoading,
  hasData,
  manifestMeta
}) => {
  const [tab, setTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const stops = await parseFile(file);
      if (stops.length === 0) {
        throw new Error('No valid delivery stops or tracking numbers could be found in this file.');
      }
      onStopsLoaded(stops, file.name);
      setShowUploader(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to read file. Please ensure it is a valid .xlsx or .csv manifest.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasteSubmit = () => {
    setErrorMsg(null);
    if (!pastedText.trim()) {
      setErrorMsg('Please paste manifest text into the box first.');
      return;
    }
    setIsLoading(true);
    try {
      const stops = parseClipboard(pastedText);
      if (stops.length === 0) {
        throw new Error('No tracking numbers found. Make sure the copied text includes barcodes like SPX..., 1LS..., etc.');
      }
      onStopsLoaded(stops, 'Clipboard Paste');
      setPastedText('');
      setShowUploader(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse clipboard text.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReadClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setPastedText(text);
        const stops = parseClipboard(text);
        if (stops.length > 0) {
          onStopsLoaded(stops, 'Direct Clipboard');
          setPastedText('');
          setShowUploader(false);
          return;
        }
      }
    } catch {
      // Browser permissions fallback, user can still paste into textarea
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-600 font-bold text-xs border border-blue-200">
              1
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Ingestion Zone</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Import manifests from SpeedX, OnTrac, GoFor Express, or raw spreadsheets.
          </p>
        </div>

        {/* Tab Toggle (Only visible if uploader is open or no data loaded) */}
        {(!hasData || showUploader) && (
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1 w-full sm:w-auto">
            <button
              onClick={() => setTab('upload')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                tab === 'upload'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UploadCloud className="h-3.5 w-3.5" />
              <span>Upload File</span>
            </button>
            <button
              onClick={() => setTab('paste')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                tab === 'paste'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              <span>Smart Paste</span>
            </button>
          </div>
        )}
      </div>

      {/* Active Loaded Manifest Display (Clean, High Visibility) */}
      {hasData && manifestMeta && manifestMeta.rawFilename && (
        <div className="mb-3 p-4 sm:p-5 rounded-2xl bg-blue-50/70 border border-blue-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0 shadow-sm shadow-blue-500/30">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-sm sm:text-base font-bold text-slate-900 font-mono break-all" title={manifestMeta.rawFilename}>
                  {manifestMeta.rawFilename}
                </span>
                {manifestMeta.formattedDate ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300 text-xs font-bold shrink-0 shadow-xs">
                    <Clock className="h-3.5 w-3.5 text-blue-700" />
                    <span>Exported: {manifestMeta.formattedDate}</span>
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-600">
                {manifestMeta.formattedDate
                  ? 'SpeedX batch export timestamp detected and converted to local time.'
                  : 'Active manifest loaded and ready for partitioning.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowUploader(prev => !prev)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300 rounded-xl text-xs font-semibold transition-all shadow-xs shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>{showUploader ? 'Hide Uploader' : 'Replace File'}</span>
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Upload Zone (Only visible when no data loaded OR user explicitly clicks Replace File) */}
      {(!hasData || showUploader) && (
        <>
          {/* Tab 1: Upload File */}
          {tab === 'upload' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-blue-500 bg-blue-50/60'
                  : 'border-slate-300 hover:border-blue-500 bg-slate-50/60 hover:bg-blue-50/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFile(e.target.files[0]);
                  e.target.value = '';
                }}
              />
              <div className="flex flex-col items-center justify-center gap-2.5">
                {isLoading ? (
                  <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs border border-blue-100">
                    <UploadCloud className="h-7 w-7" />
                  </div>
                )}
                <div>
                  <p className="text-base font-bold text-slate-900">
                    Drop a carrier manifest here
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    XLSX, XLS, CSV supported — no cleanup needed
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm shadow-blue-500/20 cursor-pointer pointer-events-none"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>Choose file</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Smart Paste */}
          {tab === 'paste' && (
            <div className="flex flex-col gap-3">
              <div className="relative">
                <textarea
                  rows={4}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste rows directly copied from SpeedX web tables, dispatch portals, or emails..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400 resize-y"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleReadClipboard}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <ClipboardPaste className="h-3.5 w-3.5 text-slate-500" />
                  <span>Paste from System Clipboard</span>
                </button>

                <button
                  type="button"
                  onClick={handlePasteSubmit}
                  disabled={isLoading || !pastedText.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-sm shadow-blue-500/25 transition-all cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Parsing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Parse Manifest</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
