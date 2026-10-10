import React, { useRef, useState } from 'react';
import { FileSpreadsheet, UploadCloud, CheckCircle, FileText } from 'lucide-react';

export function ExcelUploader({ onFileUpload, isLoading }) {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setFileName(file.name);
      onFileUpload(file);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFileName(file.name);
      onFileUpload(file);
    }
  };

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
          <FileSpreadsheet className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-white text-base">Excel / CSV Manifest Ingestion</h3>
          <p className="text-xs text-zinc-400">
            Ingest raw SpeedX 30-column spreadsheets (.xlsx / .csv) downloaded from Driver Route Management.
          </p>
        </div>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
          dragOver
            ? 'border-emerald-500 bg-emerald-500/10'
            : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-2">
          <div className="p-3 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800">
            <UploadCloud className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="text-sm font-medium text-zinc-200">
            {fileName ? (
              <span className="text-emerald-400 font-semibold">{fileName}</span>
            ) : (
              <>Drag and drop SpeedX manifest here, or <span className="text-emerald-400 underline">browse</span></>
            )}
          </div>
          <p className="text-xs text-zinc-500">
            Supports .xlsx, .xls, and .csv (including 30-column SpeedX raw schemas)
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-zinc-500">
        <span>Auto-extracts Zip Code distribution & preserves 5-digit zero-padding</span>
        {isLoading && <span className="text-emerald-400 animate-pulse">Processing workbook...</span>}
      </div>
    </div>
  );
}
