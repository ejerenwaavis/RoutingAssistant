import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { Step1Ingest } from './components/Step1Ingest';
import { Step2ZipSlicer } from './components/Step2ZipSlicer';
import { Step3Export } from './components/Step3Export';
import { StopsTable } from './components/StopsTable';
import { CageVerifier } from './components/CageVerifier';
import { extractTimestampFromFilename } from './lib/filenameHelper';
import { isDeliveredStatus, getDefaultSelectedStatuses } from './lib/parser';
import type { Stop, UserProfile, ManifestMetadata, AppMode } from './types';
import { ScanBarcode } from 'lucide-react';

export function App() {
  const [activeMode, setActiveMode] = useState<AppMode>('slicer');
  const [stops, setStops] = useState<Stop[]>([]);
  const [selectedZips, setSelectedZips] = useState<Set<string>>(new Set());
  const [hasStatusColumn, setHasStatusColumn] = useState<boolean>(false);
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set());
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

  const handleStopsLoaded = (loadedStops: Stop[], source: string, hasStatus?: boolean) => {
    setStops(loadedStops);
    setSourceName(source);

    const statusPresent = !!hasStatus || loadedStops.some(s => s.status && s.status !== 'NEW' && s.status !== 'Pending');
    setHasStatusColumn(statusPresent);

    // Extract SpeedX 13-digit timestamp if present in the filename
    const meta = extractTimestampFromFilename(source);
    setManifestMeta({
      ...meta,
      hasStatusColumn: statusPresent
    });

    // By default, select all detected zips
    const allZips = new Set(loadedStops.map(s => s.zip || 'Unknown'));
    setSelectedZips(allZips);

    // Default behavior for Status Slicer:
    // Auto-check pending/active stops (NEW, ATTEMPTED, FAILED, OUT_FOR_DELIVERY) and leave DELIVERED unchecked
    if (statusPresent) {
      const uniqueStatuses = Array.from(new Set(loadedStops.map(s => s.status || 'NEW')));
      setSelectedStatuses(getDefaultSelectedStatuses(uniqueStatuses));
    } else {
      setSelectedStatuses(new Set());
    }
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

  const handleSelectAllZips = () => {
    const all = new Set(stops.map(s => s.zip || 'Unknown'));
    setSelectedZips(all);
  };

  const handleDeselectAllZips = () => {
    setSelectedZips(new Set());
  };

  const handleToggleStatus = (status: string) => {
    setSelectedStatuses(prev => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  const handleSelectActiveStatuses = () => {
    const uniqueStatuses = Array.from(new Set(stops.map(s => s.status || 'NEW')));
    setSelectedStatuses(new Set(uniqueStatuses.filter(s => !isDeliveredStatus(s))));
  };

  const handleSelectAllStatuses = () => {
    const uniqueStatuses = Array.from(new Set(stops.map(s => s.status || 'NEW')));
    setSelectedStatuses(new Set(uniqueStatuses));
  };

  const handleDeselectAllStatuses = () => {
    setSelectedStatuses(new Set());
  };

  const handleReset = () => {
    setStops([]);
    setSelectedZips(new Set());
    setSelectedStatuses(new Set());
    setHasStatusColumn(false);
    setSourceName('');
    setManifestMeta(null);
  };

  // Total unique ZIP codes detected across all stops
  const allUniqueZipsCount = useMemo(() => {
    return new Set(stops.map(s => s.zip || 'Unknown')).size;
  }, [stops]);

  // Filter stops based on selected ZIPs AND selected Statuses
  const filteredStops = useMemo(() => {
    if (stops.length === 0) return [];
    return stops.filter(s => {
      const zipMatch = selectedZips.has(s.zip || 'Unknown');
      const statusMatch = !hasStatusColumn || selectedStatuses.has(s.status || 'NEW');
      return zipMatch && statusMatch;
    });
  }, [stops, selectedZips, selectedStatuses, hasStatusColumn]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      <Header
        totalCount={stops.length}
        filteredCount={filteredStops.length}
        onReset={handleReset}
        user={user}
        manifestMeta={manifestMeta}
        activeMode={activeMode}
        onModeChange={setActiveMode}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* MODE 1: ROUTE SLICER */}
        {activeMode === 'slicer' && (
          <>
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
                {/* Step 2: Zip Code & Status Slicer */}
                <Step2ZipSlicer
                  stops={stops}
                  selectedZips={selectedZips}
                  selectedStatuses={selectedStatuses}
                  hasStatusColumn={hasStatusColumn}
                  onToggleZip={handleToggleZip}
                  onSelectAllZips={handleSelectAllZips}
                  onDeselectAllZips={handleDeselectAllZips}
                  onToggleStatus={handleToggleStatus}
                  onSelectActiveStatuses={handleSelectActiveStatuses}
                  onSelectAllStatuses={handleSelectAllStatuses}
                  onDeselectAllStatuses={handleDeselectAllStatuses}
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
          </>
        )}

        {/* MODE 2: CAGE / GAYLORD VERIFIER */}
        {activeMode === 'cage_verifier' && (
          <>
            {stops.length === 0 ? (
              <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full">
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-center flex flex-col items-center gap-2">
                  <div className="h-10 w-10 rounded-xl bg-blue-600 text-white grid place-items-center shadow-xs">
                    <ScanBarcode className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">Manifest Required for Cage Verification</h3>
                  <p className="text-xs text-slate-600 max-w-md">
                    Please upload or smart-paste today&apos;s manifest file (.xlsx / .csv). All packages and tracking numbers will be automatically indexed for high-speed container scanning.
                  </p>
                </div>

                <Step1Ingest
                  onStopsLoaded={handleStopsLoaded}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                  hasData={false}
                  manifestMeta={null}
                />
              </div>
            ) : (
              <CageVerifier
                stops={stops}
                manifestMeta={manifestMeta}
                user={user}
                onSwitchToSlicer={() => setActiveMode('slicer')}
              />
            )}
          </>
        )}
      </main>

      <footer className="py-5 text-center text-xs text-slate-400 border-t border-slate-200 mt-auto bg-white">
        &copy; {new Date().getFullYear()} Routing Assistant · ACED DevOps
      </footer>
    </div>
  );
}
export default App;
