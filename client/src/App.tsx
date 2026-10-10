import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { Step1Ingest } from './components/Step1Ingest';
import { Step2ZipSlicer } from './components/Step2ZipSlicer';
import { Step3Export } from './components/Step3Export';
import { StopsTable } from './components/StopsTable';
import type { Stop, UserProfile } from './types';

export function App() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [selectedZips, setSelectedZips] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [sourceName, setSourceName] = useState<string>('');
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
  };

  // Filter stops based on selected ZIPs
  const filteredStops = useMemo(() => {
    if (stops.length === 0) return [];
    return stops.filter(s => selectedZips.has(s.zip || 'Unknown'));
  }, [stops, selectedZips]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col text-zinc-100">
      <Header
        totalCount={stops.length}
        filteredCount={filteredStops.length}
        onReset={handleReset}
        user={user}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 flex flex-col gap-5">
        {/* Step 1: Ingestion Zone */}
        <Step1Ingest
          onStopsLoaded={handleStopsLoaded}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          hasData={stops.length > 0}
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
            />

            {/* Step 3: One-Click Export */}
            <Step3Export
              filteredStops={filteredStops}
            />

            {/* Compact Preview Table */}
            <StopsTable
              stops={filteredStops}
            />
          </>
        )}
      </main>

      <footer className="py-4 text-center text-xs text-zinc-600 border-t border-zinc-900 mt-auto">
        &copy; {new Date().getFullYear()} Routing Assistant · ACED DevOps & Logistics Tooling
      </footer>
    </div>
  );
}
export default App;
