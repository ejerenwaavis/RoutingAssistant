import React, { useState, useRef } from 'react';
import { UploadCloud, ClipboardPaste, FileSpreadsheet, Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { parseFile, parseClipboard } from '../lib/parser';
import type { Stop } from '../types';

interface Step1IngestProps {
  onStopsLoaded: (stops: Stop[], sourceName: string) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  hasData: boolean;
}

export const Step1Ingest: React.FC<Step1IngestProps> = ({
  onStopsLoaded,
  isLoading,
  setIsLoading,
  hasData
}) => {
  const [tab, setTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
          return;
        }
      }
    } catch {
      // Browser permissions fallback, user can still paste into textarea
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs border border-emerald-500/30">
              1
            </span>
            <h2 className="text-base font-semibold text-zinc-100 tracking-tight">Ingestion Zone</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Import manifests from SpeedX, OnTrac, GoFor Express, or raw spreadsheets.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="bg-zinc-950 p-1 rounded-xl border border-zinc-800 flex items-center gap-1 w-full sm:w-auto">
          <button
            onClick={() => setTab('upload')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tab === 'upload'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <UploadCloud className="h-3.5 w-3.5" />
            <span>Upload File</span>
          </button>
          <button
            onClick={() => setTab('paste')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tab === 'paste'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
            <span>Smart Paste</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

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
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-emerald-500 bg-emerald-500/5'
              : 'border-zinc-700/60 hover:border-zinc-500 bg-zinc-950/40 hover:bg-zinc-950/70'
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
          <div className="flex flex-col items-center justify-center gap-2">
            {isLoading ? (
              <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
            ) : (
              <div className="h-12 w-12 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-zinc-300">
                <FileSpreadsheet className="h-6 w-6 text-emerald-400" />
              </div>
            )}
            <div className="mt-1">
              <p className="text-sm font-medium text-zinc-200">
                Drop your manifest spreadsheet here, or <span className="text-emerald-400 underline decoration-emerald-500/40">browse</span>
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">Supports .xlsx, .xls, and .csv files</p>
            </div>
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
              className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl p-3.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 placeholder:text-zinc-600 resize-y"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleReadClipboard}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-950 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              <span>Paste from System Clipboard</span>
            </button>

            <button
              type="button"
              onClick={handlePasteSubmit}
              disabled={isLoading || !pastedText.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs rounded-xl shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
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
    </div>
  );
};
