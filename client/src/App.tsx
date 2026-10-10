import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { Step1Ingest } from './components/Step1Ingest';
import { Step2ZipSlicer } from './components/Step2ZipSlicer';
import { Step3Export } from './components/Step3Export';
import { StopsTable } from './components/StopsTable';
import { extractTimestampFromFilename } from './lib/filenameHelper';
import type { Stop, UserProfile, ManifestMetadata } from './types';

export function App() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [selectedZips, setSelectedZips] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [sourceName, setSourceName] = useState<string>('');
  const [manifestMeta, setManifestMeta] = useState<ManifestMetadata | null>(null);
  const [user, setUser] = useState<UserProfile | undefined>(undefined);

  // Fetch current user from server session on mount
  React.useEffect(() => {
    fetch('/api/user/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const handleStopsLoaded = (loadedStops: Stop[], source: string) => {
    setStops(loadedStops);
    setSourceName(source);

    // Extract SpeedX 13-digit timestamp if present in the filename
    const meta = extractTimestampFromFilename(source);
    setManifestMeta(meta);

    // By default, select all detected zips
    const allZips = new Set(loadedStops.map(s => s.zip || 'Unknown'));
    setSelectedZips(allZips);
  };

  const handleToggleZip = (zip: string) => {
    setSelectedZips(prev => {
      const next = new Set(prev);
      if (next.has(zip)) {
        next.delete(zip);
      } else {
        next.add(zip);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const all = new Set(stops.map(s => s.zip || 'Unknown'));
    setSelectedZips(all);
  };

  const handleDeselectAll = () => {
    setSelectedZips(new Set());
  };

  const handleReset = () => {
    setStops([]);
    setSelectedZips(new Set());
    setSourceName('');
    setManifestMeta(null);
  };

  // Total unique ZIP codes detected across all stops
  const allUniqueZipsCount = useMemo(() => {
    return new Set(stops.map(s => s.zip || 'Unknown')).size;
  }, [stops]);

  // Filter stops based on selected ZIPs
  const filteredStops = useMemo(() => {
    if (stops.length === 0) return [];
    return stops.filter(s => selectedZips.has(s.zip || 'Unknown'));
  }, [stops, selectedZips]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      <Header
        totalCount={stops.length}
        filteredCount={filteredStops.length}
        onReset={handleReset}
        user={user}
        manifestMeta={manifestMeta}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* Step 1: Ingestion Zone */}
        <Step1Ingest
          onStopsLoaded={handleStopsLoaded}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          hasData={stops.length > 0}
          manifestMeta={manifestMeta}
        />

        {/* Steps 2, 3 and Preview appear immediately after ingestion */}
        {stops.length > 0 && (
          <>
            {/* Step 2: Zip Code Slicer */}
            <Step2ZipSlicer
              stops={stops}
              selectedZips={selectedZips}
              onToggleZip={handleToggleZip}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              manifestMeta={manifestMeta}
            />

            {/* Step 3: One-Click Export */}
            <Step3Export
              filteredStops={filteredStops}
              selectedZips={Array.from(selectedZips)}
              totalZipsCount={allUniqueZipsCount}
            />

            {/* Compact Preview Table */}
            <StopsTable
              stops={filteredStops}
            />
          </>
        )}
      </main>

      <footer className="py-5 text-center text-xs text-slate-400 border-t border-slate-200 mt-auto bg-white">
        &copy; {new Date().getFullYear()} Routing Assistant · ACED DevOps & Logistics Tooling
      </footer>
    </div>
  );
}
export default App;
