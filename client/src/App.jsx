import React, { useState } from 'react';
import { useManifestParser } from './hooks/useManifestParser';
import { MetricHeader } from './components/MetricHeader';
import { SmartPasteArea } from './components/SmartPasteArea';
import { ExcelUploader } from './components/ExcelUploader';
import { ZipCodeFilterModal } from './components/ZipCodeFilterModal';
import { ManifestDataTable } from './components/ManifestDataTable';
import { ExportToolbar } from './components/ExportToolbar';
import { ClipboardPaste, FileSpreadsheet, Activity, Check, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('paste'); // 'paste' | 'excel'

  const {
    stops,
    filteredStops,
    stagingDrawer,
    zipDistribution,
    selectedZipCodes,
    statusFilter,
    routeFilter,
    searchQuery,
    availableRoutes,
    metrics,
    isLoading,
    error,
    toastMessage,
    loadFromText,
    loadFromFile,
    toggleZipCode,
    selectAllZipCodes,
    clearZipCodes,
    setStatusFilter,
    setRouteFilter,
    setSearchQuery,
    clearData,
    exportManifest,
    copyDriverSummary
  } = useManifestParser();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base tracking-tight">OpsBridge</span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  SpeedX Assistant v2.0
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">Universal Manifest Parser & Rollover Staging</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Input Mode Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                  activeTab === 'paste'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>Smart Paste</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('excel')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                  activeTab === 'excel'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel Ingestion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white shadow-2xl text-xs font-medium animate-in fade-in slide-in-from-bottom-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Live Metrics Header */}
        <MetricHeader metrics={metrics} />

        {/* Ingestion Panel based on Tab */}
        {activeTab === 'paste' ? (
          <SmartPasteArea onParseText={loadFromText} isLoading={isLoading} />
        ) : (
          <ExcelUploader onFileUpload={loadFromFile} isLoading={isLoading} />
        )}

        {/* Postal Distribution Selector */}
        {zipDistribution.length > 0 && (
          <ZipCodeFilterModal
            zipDistribution={zipDistribution}
            selectedZipCodes={selectedZipCodes}
            onToggleZip={toggleZipCode}
            onSelectAll={selectAllZipCodes}
            onClearAll={clearZipCodes}
          />
        )}

        {/* Export Toolbar */}
        <ExportToolbar
          onExport={exportManifest}
          onCopyDriverSummary={copyDriverSummary}
          totalRecords={stops.length}
          filteredCount={filteredStops.length}
        />

        {/* Data Table */}
        <ManifestDataTable
          stops={filteredStops}
          totalRawStops={stops.length}
          stagingDrawer={stagingDrawer}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          routeFilter={routeFilter}
          onRouteFilterChange={setRouteFilter}
          availableRoutes={availableRoutes}
          onClearData={clearData}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-4 text-center text-xs text-zinc-500 bg-zinc-950">
        SpeedX OpsBridge &bull; Monolithic MVC &bull; Designed for Dispatchers & Route Managers
      </footer>
    </div>
  );
}
