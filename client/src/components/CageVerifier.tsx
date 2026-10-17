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
  ArrowRight
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
  seq?: number | null;
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
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: { width: 140, height: 100 },
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
        () => {}
      );

      setIsScanning(true);
    } catch (err: unknown) {
      console.error('Failed to start camera:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setCameraError(msg.includes('NotAllowedError') || msg.includes('Permission')
        ? 'Camera permission denied. Please allow camera access in browser settings.'
        : `Could not start camera (${msg}).`);
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
    <div className="flex flex-col gap-4 max-w-3xl mx-auto w-full">
      {/* Station Control & Compact Viewfinder Dock */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
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
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs mt-3">
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

        {/* Scanner Control & Top-Right Compact Viewfinder Dock */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-3 pt-3 border-t border-slate-100">
          {/* Controls column */}
          <div className="flex-1 w-full flex flex-col gap-2.5">
            {entryMode === 'camera' ? (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <button
                  type="button"
                  onClick={isScanning ? stopCamera : startCamera}
                  className={`py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer ${
                    isScanning
                      ? 'bg-rose-600 hover:bg-rose-700 text-white ring-4 ring-rose-500/20'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 ring-4 ring-blue-500/15'
                  }`}
                >
                  <Camera className="h-4 w-4" />
                  <span>{isScanning ? 'Stop Scanner' : 'Start Scanner'}</span>
                </button>

                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${isScanning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                  <span>{isScanning ? 'Camera active · point at barcode' : 'Camera idle · tap Start'}</span>
                </div>
              </div>
            ) : (
              /* Manual Barcode Text Form */
              <form onSubmit={handleManualSubmit} className="flex items-center gap-2 w-full">
                <div className="relative flex-1">
                  <ScanBarcode className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={textInputRef}
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Scan or type barcode & hit Enter..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl font-mono text-xs text-slate-900 outline-hidden"
                    autoComplete="off"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Verify
                </button>
              </form>
            )}

            {cameraError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-2.5 flex items-start gap-2">
                <AlertOctagon className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Quick Demo Helper Chips */}
            {sampleMatchCode && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1">
                <span className="text-slate-400 font-medium">Demo:</span>
                <button
                  type="button"
                  onClick={() => verifyBarcode(sampleMatchCode)}
                  className="text-emerald-700 hover:bg-emerald-100 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold text-[11px] cursor-pointer"
                >
                  Valid Code
                </button>
                <button
                  type="button"
                  onClick={() => verifyBarcode('UNKNOWN_TEST_CAGE_99999')}
                  className="text-rose-700 hover:bg-rose-100 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md font-semibold text-[11px] cursor-pointer"
                >
                  Unknown Code
                </button>
              </div>
            )}
          </div>

          {/* Compact Viewfinder (Top-Right Dock) */}
          {entryMode === 'camera' && (
            <div className="shrink-0 flex flex-col items-center">
              <div
                className={`w-36 h-28 sm:w-44 sm:h-32 rounded-xl overflow-hidden border-2 relative transition-all bg-slate-950 flex items-center justify-center shadow-xs ${
                  isScanning ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-300 bg-slate-900'
                }`}
              >
                <div id="cage-camera-viewfinder" className="w-full h-full" />

                {!isScanning && (
                  <div className="flex flex-col items-center justify-center p-2 text-white text-center gap-1">
                    <Camera className="h-6 w-6 text-slate-400" />
                    <span className="text-[10px] text-slate-300 font-medium">Viewfinder</span>
                  </div>
                )}

                {isScanning && (
                  <>
                    <div className="absolute top-1.5 left-1.5 w-3.5 h-3.5 border-t-2 border-l-2 border-emerald-400 rounded-tl-xs pointer-events-none z-10" />
                    <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 border-t-2 border-r-2 border-emerald-400 rounded-tr-xs pointer-events-none z-10" />
                    <div className="absolute bottom-1.5 left-1.5 w-3.5 h-3.5 border-b-2 border-l-2 border-emerald-400 rounded-bl-xs pointer-events-none z-10" />
                    <div className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 border-b-2 border-r-2 border-emerald-400 rounded-br-xs pointer-events-none z-10" />
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* HERO INSTANT VERIFICATION RESULT CARD (ZERO SCROLL) */}
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
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
            <div className="mt-3.5 pt-3 border-t border-white/20 text-xs text-emerald-100 flex flex-wrap items-center justify-between gap-2 font-mono">
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

            <div className="mt-3.5 bg-white/10 backdrop-blur-xs border border-white/20 rounded-xl p-3 flex flex-col gap-1">
              <div className="text-[11px] uppercase font-bold text-rose-200">Scanned Barcode</div>
              <div className="font-mono text-base font-bold text-white break-all">
                {lastResult.barcode}
              </div>
              <div className="text-xs text-rose-100 mt-0.5">
                ⚠️ Leave this container in place. Confirm with the warehouse dispatcher or scan another gaylord.
              </div>
            </div>
          </div>
        )
      ) : (
        /* Standby state card */
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-6 text-center flex flex-col items-center justify-center gap-2">
          <div className="h-10 w-10 rounded-full bg-slate-100 grid place-items-center text-slate-400">
            <ScanBarcode className="h-5 w-5" />
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

          <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
            {history.map((item) => (
              <div key={item.id} className="py-2 flex items-center justify-between gap-3 text-xs">
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
