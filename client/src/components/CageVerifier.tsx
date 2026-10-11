import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Camera,
  Keyboard,
  CheckCircle,
  AlertOctagon,
  Volume2,
  VolumeX,
  ScanBarcode,
  RotateCcw,
  ShieldCheck,
  Package,
  Layers,
  ArrowRight,
  ExternalLink,
  Info
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { playAudioTone } from '../lib/audioFeedback';
import type { Stop, ManifestMetadata, UserProfile, CageScanResult } from '../types';

interface CageVerifierProps {
  stops: Stop[];
  manifestMeta: ManifestMetadata | null;
  user?: UserProfile;
  onSwitchToSlicer: () => void;
}

interface CagePackageInfo {
  barcode: string;
  route: string;
  driver: string;
  zip: string;
  recipient?: string;
  address?: string;
  seq?: number;
}

export const CageVerifier: React.FC<CageVerifierProps> = ({
  stops,
  manifestMeta,
  user,
  onSwitchToSlicer
}) => {
  // Input mode: camera scanner or manual text input
  const [entryMode, setEntryMode] = useState<'camera' | 'text'>('camera');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Manual text input
  const [manualCode, setManualCode] = useState('');
  const textInputRef = useRef<HTMLInputElement>(null);

  // Sound feedback toggle (default enabled)
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Verification state & history
  const [lastResult, setLastResult] = useState<CageScanResult | null>(null);
  const [history, setHistory] = useState<CageScanResult[]>([]);

  // Camera scanner instance ref & debounce ref
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScannedTimeRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  // 1. In-memory Map indexing all packages: TrackingNo -> { route, driver, zip, ... }
  const cageMap = useMemo(() => {
    const map = new Map<string, CagePackageInfo>();
    const defaultRoute = manifestMeta?.rawFilename
      ? manifestMeta.rawFilename.replace(/\.[^/.]+$/, '').slice(0, 24)
      : 'Today\'s Route';
    const defaultDriver = user?.firstName || user?.username || 'Assigned Driver';

    for (const s of stops) {
      if (s.barcode) {
        const cleanKey = s.barcode.trim().toUpperCase();
        map.set(cleanKey, {
          barcode: s.barcode,
          route: s.route || defaultRoute,
          driver: s.driver || defaultDriver,
          zip: s.zip || 'Unknown',
          recipient: s.recipient,
          address: [s.street, s.unit, s.city, s.state].filter(Boolean).join(', '),
          seq: s.seq
        });
      }
    }
    return map;
  }, [stops, manifestMeta, user]);

  // Unique route count and ZIP summary for current batch
  const manifestSummary = useMemo(() => {
    const zips = new Set(stops.map(s => s.zip || 'Unknown'));
    return {
      packageCount: stops.length,
      zipCount: zips.size,
      zips: Array.from(zips).slice(0, 3).join(', ') + (zips.size > 3 ? '...' : '')
    };
  }, [stops]);

  // Core verification function
  const verifyBarcode = (rawInput: string) => {
    const trimmed = rawInput.trim();
    if (!trimmed) return;

    const normalized = trimmed.toUpperCase();

    // Look up in in-memory Map (exact match or suffix/prefix match tolerance)
    let match = cageMap.get(normalized) || null;
    if (!match) {
      for (const [key, val] of cageMap.entries()) {
        if (key === normalized || normalized.endsWith(key) || key.endsWith(normalized)) {
          match = val;
          break;
        }
      }
    }

    const result: CageScanResult = {
      id: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      barcode: trimmed,
      timestamp: new Date(),
      isMatch: !!match,
      route: match?.route,
      driver: match?.driver,
      zip: match?.zip,
      address: match?.address,
      seq: match?.seq,
      recipient: match?.recipient
    };

    setLastResult(result);
    setHistory(prev => [result, ...prev.slice(0, 24)]);

    // Audible feedback tone
    if (soundEnabled) {
      playAudioTone(result.isMatch ? 'success' : 'error');
    }
  };

  // Start Camera Scanner
  const startCamera = async () => {
    setCameraError(null);
    try {
      const elementId = 'cage-camera-viewfinder';
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(elementId);
      }

      const qrCode = html5QrCodeRef.current;

      await qrCode.start(
        { facingMode: 'environment' }, // Back camera for packages
        {
          fps: 10,
          qrbox: { width: 280, height: 200 },
          aspectRatio: 1.3333
        },
        (decodedText) => {
          const now = Date.now();
          const clean = decodedText.trim().toUpperCase();
          // Debounce same barcode within 2.5 seconds to prevent spam
          if (lastScannedTimeRef.current.code === clean && now - lastScannedTimeRef.current.time < 2500) {
            return;
          }
          lastScannedTimeRef.current = { code: clean, time: now };
          verifyBarcode(decodedText);
        },
        () => {
          // Frame read callback (ignore non-barcode frames)
        }
      );

      setIsScanning(true);
    } catch (err: unknown) {
      console.error('Failed to start camera:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setCameraError(msg.includes('NotAllowedError') || msg.includes('Permission')
        ? 'Camera permission denied. Please enable camera access in your browser or switch to Manual Text mode.'
        : `Could not start camera (${msg}). Please try manual entry.`);
      setIsScanning(false);
    }
  };

  // Stop Camera Scanner
  const stopCamera = async () => {
    try {
      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      }
    } catch (err) {
      console.warn('Error stopping scanner:', err);
    } finally {
      setIsScanning(false);
    }
  };

  // Handle switching to text mode
  const handleToggleEntryMode = async () => {
    if (entryMode === 'camera') {
      await stopCamera();
      setEntryMode('text');
      setTimeout(() => textInputRef.current?.focus(), 100);
    } else {
      setEntryMode('camera');
    }
  };

  // Handle manual form submit / enter key
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    verifyBarcode(manualCode);
    setManualCode('');
    textInputRef.current?.focus();
  };

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Autofocus input in text mode
  useEffect(() => {
    if (entryMode === 'text') {
      textInputRef.current?.focus();
    }
  }, [entryMode]);

  // Statistics
  const stats = useMemo(() => {
    const total = history.length;
    const matches = history.filter(h => h.isMatch).length;
    const rejected = total - matches;
    return { total, matches, rejected };
  }, [history]);

  // Sample barcode for test demo
  const sampleMatchCode = stops[0]?.barcode;

  return (
    <div className="flex flex-col gap-5 max-w-3xl mx-auto w-full">
      {/* Station Control Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white grid place-items-center shadow-xs">
              <ScanBarcode className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                Cage & Container Fast-Verifier
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                  Live
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Scan 1 package from the top of any gaylord to verify assignment
              </p>
            </div>
          </div>

          {/* Sound & Mode Switchers */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                soundEnabled
                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
              }`}
              title={soundEnabled ? 'Mute tone feedback' : 'Unmute tone feedback'}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              <span className="hidden sm:inline">{soundEnabled ? 'Audio On' : 'Muted'}</span>
            </button>

            {/* Toggle Camera / Text Mode */}
            <button
              onClick={handleToggleEntryMode}
              className="p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer"
              title={entryMode === 'camera' ? 'Switch to Manual Text / Handheld Scanner' : 'Switch to Phone Camera'}
            >
              {entryMode === 'camera' ? (
                <>
                  <Keyboard className="h-4 w-4 text-slate-600" />
                  <span className="hidden sm:inline">Manual / USB</span>
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 text-blue-600" />
                  <span className="hidden sm:inline">Phone Camera</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Batch Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <Package className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            <span className="font-semibold text-slate-800">{manifestSummary.packageCount} packages</span>
            <span className="text-slate-300">·</span>
            <span>ZIPs: {manifestSummary.zips}</span>
          </div>

          <button
            onClick={onSwitchToSlicer}
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium hover:underline text-xs"
          >
            <span>View Slicer / Export</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* Scanner Body */}
        <div className="mt-5">
          {entryMode === 'camera' ? (
            /* CAMERA SCANNER MODE */
            <div className="flex flex-col items-center gap-3">
              {/* Camera Viewfinder Container */}
              <div
                className={`w-full max-w-sm rounded-2xl overflow-hidden border-2 bg-slate-950 relative transition-all ${
                  isScanning ? 'border-blue-500 shadow-md min-h-[260px]' : 'border-slate-200 bg-slate-900/90 py-8 text-center'
                }`}
              >
                <div id="cage-camera-viewfinder" className="w-full" />

                {!isScanning && (
                  <div className="flex flex-col items-center justify-center p-6 text-white text-center gap-3">
                    <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center text-blue-400">
                      <Camera className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Phone Camera Scanner</p>
                      <p className="text-xs text-slate-300 mt-1 max-w-[240px]">
                        Tap Start Scanner to point your camera at the package barcode or QR code.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="w-full max-w-sm bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-3 flex items-start gap-2">
                  <AlertOctagon className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                  <div>
                    <span className="font-semibold">Camera Notice: </span>
                    {cameraError}
                  </div>
                </div>
              )}

              {/* Start / Stop Scanner Trigger */}
              <div className="flex items-center gap-2 w-full max-w-sm mt-1">
                <button
                  onClick={isScanning ? stopCamera : startCamera}
                  className={`flex-1 py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                    isScanning
                      ? 'bg-rose-600 hover:bg-rose-700 text-white ring-4 ring-rose-500/20'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 ring-4 ring-blue-500/15'
                  }`}
                >
                  <Camera className="h-4 w-4" />
                  <span>{isScanning ? 'Stop Scanner' : 'Start Scanner'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* MANUAL TEXT / USB HARDWARE SCANNER MODE */
            <form onSubmit={handleManualSubmit} className="flex flex-col gap-2 max-w-md mx-auto">
              <label htmlFor="cageBarcode" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Barcode / Tracking Scanner Input
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <ScanBarcode className="h-5 w-5 text-blue-600" />
                </div>
                <input
                  id="cageBarcode"
                  ref={textInputRef}
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Scan or enter barcode & press Enter..."
                  className="w-full pl-11 pr-24 py-3.5 bg-slate-50 border-2 border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-500/15 rounded-xl font-mono text-base text-slate-900 transition-all outline-hidden"
                  autoComplete="off"
                  autoFocus
                />
                <button
                  type="submit"
                  className="absolute right-2 top-2 bottom-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Verify
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Compatible with handheld Bluetooth/USB barcode guns (transmits automatically on Enter key).
              </p>
            </form>
          )}

          {/* Quick Test Demo Helpers */}
          {sampleMatchCode && (
            <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-400 font-medium">Quick Test:</span>
              <button
                type="button"
                onClick={() => verifyBarcode(sampleMatchCode)}
                className="text-emerald-700 hover:text-emerald-900 font-semibold bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                Test Valid Code ({sampleMatchCode.slice(0, 10)}...)
              </button>
              <button
                type="button"
                onClick={() => verifyBarcode('UNKNOWN_TEST_CAGE_99999')}
                className="text-rose-700 hover:text-rose-900 font-semibold bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                Test Unknown Code
              </button>
            </div>
          )}
        </div>
      </div>

      {/* INSTANT VERIFICATION RESULT CARD */}
      {lastResult ? (
        lastResult.isMatch ? (
          /* HIGH-VISIBILITY GREEN SUCCESS CARD */
          <div className="bg-emerald-600 rounded-2xl text-white p-5 sm:p-6 shadow-lg shadow-emerald-600/20 ring-4 ring-emerald-400/40 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                  <CheckCircle className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight uppercase leading-tight">
                    MATCH CONFIRMED
                  </h3>
                  <p className="text-emerald-100 font-medium text-xs sm:text-sm mt-0.5">
                    This bulk container belongs to today&apos;s assigned route!
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-black/20 rounded-md">
                {lastResult.timestamp.toLocaleTimeString()}
              </span>
            </div>

            {/* Crucial Verification Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
              <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-xl p-3">
                <div className="text-[10px] uppercase font-bold text-emerald-200 tracking-wider">Route ID</div>
                <div className="text-lg sm:text-xl font-black tracking-tight mt-0.5 truncate" title={lastResult.route}>
                  {lastResult.route || 'Today\'s Route'}
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-xl p-3">
                <div className="text-[10px] uppercase font-bold text-emerald-200 tracking-wider">Assigned Driver</div>
                <div className="text-lg sm:text-xl font-black tracking-tight mt-0.5 truncate" title={lastResult.driver}>
                  {lastResult.driver || 'Driver'}
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-xl p-3">
                <div className="text-[10px] uppercase font-bold text-emerald-200 tracking-wider">ZIP Code</div>
                <div className="text-lg sm:text-xl font-black font-mono tracking-tight mt-0.5">
                  {lastResult.zip || 'Unknown'}
                </div>
              </div>
            </div>

            {/* Verified Package Details */}
            <div className="mt-4 pt-3 border-t border-white/20 text-xs text-emerald-100 flex flex-wrap items-center justify-between gap-2 font-mono">
              <div>
                <span className="opacity-75">Package: </span>
                <span className="font-bold text-white">{lastResult.barcode}</span>
                {lastResult.seq ? <span className="opacity-90"> · Stop #{lastResult.seq}</span> : null}
              </div>
              {lastResult.address && (
                <div className="truncate max-w-xs text-right opacity-90 font-sans">
                  {lastResult.address}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* HIGH-VISIBILITY RED NOT-ASSIGNED CARD */
          <div className="bg-rose-600 rounded-2xl text-white p-5 sm:p-6 shadow-lg shadow-rose-600/20 ring-4 ring-rose-400/40 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                  <AlertOctagon className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight uppercase leading-tight">
                    NOT ASSIGNED — DO NOT TOUCH THIS CAGE
                  </h3>
                  <p className="text-rose-100 font-medium text-xs sm:text-sm mt-0.5">
                    This container is NOT part of today&apos;s loaded manifest.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-black/20 rounded-md">
                {lastResult.timestamp.toLocaleTimeString()}
              </span>
            </div>

            <div className="mt-4 bg-white/10 backdrop-blur-xs border border-white/20 rounded-xl p-3.5 flex flex-col gap-1">
              <div className="text-[11px] uppercase font-bold text-rose-200">Scanned Barcode</div>
              <div className="font-mono text-base font-bold text-white break-all">
                {lastResult.barcode}
              </div>
              <div className="text-xs text-rose-100 mt-1">
                ⚠️ Leave this container in place. Confirm with the warehouse dispatcher or scan another gaylord.
              </div>
            </div>
          </div>
        )
      ) : (
        /* Standby state card */
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center flex flex-col items-center justify-center gap-2">
          <div className="h-12 w-12 rounded-full bg-slate-100 grid place-items-center text-slate-400">
            <ScanBarcode className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700">Awaiting Container Scan</p>
          <p className="text-xs text-slate-500 max-w-sm">
            Point camera or enter a package tracking barcode to instantly verify container ownership.
          </p>
        </div>
      )}

      {/* RECENT SCANS LOG & STATS */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <h4 className="font-bold text-sm text-slate-900">Recent Container Scans</h4>
            </div>

            {/* Quick counters */}
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                Total: {stats.total}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                Matches: {stats.matches}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                Rejected: {stats.rejected}
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
            {history.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                      item.isMatch ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="font-mono font-bold text-slate-800 truncate">{item.barcode}</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {item.isMatch
                        ? `Route: ${item.route} · ZIP: ${item.zip} · Driver: ${item.driver}`
                        : 'Not assigned to today\'s routes'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      item.isMatch
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {item.isMatch ? 'Confirmed' : 'Reject'}
                  </span>
                  <span className="font-mono text-slate-400 text-[11px]">
                    {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default CageVerifier;
