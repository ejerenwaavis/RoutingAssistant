import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Camera,
  Keyboard,
  ArrowDownUp,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  ScanBarcode,
  RotateCcw,
  CheckCircle,
  AlertOctagon,
  Layers,
  ArrowRight,
  Package,
  Boxes,
  User,
  MapPin,
  Sparkles
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { playAudioTone } from '../lib/audioFeedback';
import type { Stop, ManifestMetadata, UserProfile, PackageSortResult } from '../types';

interface PackageSorterProps {
  stops: Stop[];
  manifestMeta: ManifestMetadata | null;
  user?: UserProfile;
  onSwitchToSlicer: () => void;
}

interface SorterPackageInfo {
  barcode: string;
  route: string;
  driver: string;
  zip: string;
  recipient?: string;
  address?: string;
  seq?: number | null;
}

// Distinct vibrant theme colors for different routes
const ROUTE_COLOR_PALETTES = [
  { bg: 'bg-blue-600', ring: 'ring-blue-400/40', badge: 'bg-blue-100 text-blue-800', light: 'bg-blue-50 border-blue-200' },
  { bg: 'bg-emerald-600', ring: 'ring-emerald-400/40', badge: 'bg-emerald-100 text-emerald-800', light: 'bg-emerald-50 border-emerald-200' },
  { bg: 'bg-purple-600', ring: 'ring-purple-400/40', badge: 'bg-purple-100 text-purple-800', light: 'bg-purple-50 border-purple-200' },
  { bg: 'bg-amber-500', ring: 'ring-amber-400/40', badge: 'bg-amber-100 text-amber-800', light: 'bg-amber-50 border-amber-200' },
  { bg: 'bg-indigo-600', ring: 'ring-indigo-400/40', badge: 'bg-indigo-100 text-indigo-800', light: 'bg-indigo-50 border-indigo-200' },
  { bg: 'bg-teal-600', ring: 'ring-teal-400/40', badge: 'bg-teal-100 text-teal-800', light: 'bg-teal-50 border-teal-200' },
  { bg: 'bg-rose-600', ring: 'ring-rose-400/40', badge: 'bg-rose-100 text-rose-800', light: 'bg-rose-50 border-rose-200' },
  { bg: 'bg-cyan-600', ring: 'ring-cyan-400/40', badge: 'bg-cyan-100 text-cyan-800', light: 'bg-cyan-50 border-cyan-200' },
];

function getRouteTheme(routeStr: string) {
  let hash = 0;
  for (let i = 0; i < routeStr.length; i++) {
    hash = (hash << 5) - hash + routeStr.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % ROUTE_COLOR_PALETTES.length;
  return ROUTE_COLOR_PALETTES[index];
}

export const PackageSorter: React.FC<PackageSorterProps> = ({
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

  // Sound feedback & Voice announcement toggles (default enabled)
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Scanning state & history
  const [lastResult, setLastResult] = useState<PackageSortResult | null>(null);
  const [history, setHistory] = useState<PackageSortResult[]>([]);
  const [sortedBarcodeSet, setSortedBarcodeSet] = useState<Set<string>>(new Set());

  // Camera scanner instance ref & debounce ref
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScannedTimeRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  // 1. In-memory Map indexing all packages: TrackingNo -> { route, driver, seq, zip, ... }
  const stopsMap = useMemo(() => {
    const map = new Map<string, SorterPackageInfo>();
    const defaultRoute = manifestMeta?.rawFilename
      ? manifestMeta.rawFilename.replace(/\.[^/.]+$/, '').slice(0, 24)
      : 'Route 1';
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

  // Unique routes summary
  const routeDistribution = useMemo(() => {
    const map = new Map<string, { total: number; driver: string }>();
    for (const s of stops) {
      const r = s.route || 'Route 1';
      const existing = map.get(r);
      if (existing) {
        existing.total += 1;
      } else {
        map.set(r, {
          total: 1,
          driver: s.driver || user?.firstName || 'Assigned Driver'
        });
      }
    }
    return Array.from(map.entries()).map(([routeName, data]) => ({
      route: routeName,
      driver: data.driver,
      total: data.total
    }));
  }, [stops, user]);

  // Voice speech announcement helper
  const speakSortInfo = (route: string, seq: number | null) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const text = `${route}${seq ? `, stop ${seq}` : ''}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.15; // slightly faster for ops cadence
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Voice synthesis error:', e);
    }
  };

  // Core sorting lookup
  const sortPackage = (rawInput: string) => {
    const trimmed = rawInput.trim();
    if (!trimmed) return;

    const normalized = trimmed.toUpperCase();

    // Look up in in-memory Map (exact match or suffix/prefix match tolerance)
    let match = stopsMap.get(normalized) || null;
    if (!match) {
      for (const [key, val] of stopsMap.entries()) {
        if (key === normalized || normalized.endsWith(key) || key.endsWith(normalized)) {
          match = val;
          break;
        }
      }
    }

    const result: PackageSortResult = {
      id: `sort_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      barcode: trimmed,
      timestamp: new Date(),
      isFound: !!match,
      route: match?.route || 'Unknown Route',
      driver: match?.driver || 'Unassigned',
      seq: match?.seq ?? null,
      zip: match?.zip || '',
      address: match?.address || '',
      recipient: match?.recipient || ''
    };

    setLastResult(result);
    setHistory(prev => [result, ...prev.slice(0, 24)]);

    if (match) {
      setSortedBarcodeSet(prev => new Set(prev).add(match!.barcode.toUpperCase()));
    }

    // Audible tone
    if (soundEnabled) {
      playAudioTone(result.isFound ? 'success' : 'error');
    }

    // Voice announcement
    if (result.isFound) {
      speakSortInfo(result.route, result.seq);
    }
  };

  // Start Camera Scanner
  const startCamera = async () => {
    setCameraError(null);
    try {
      const elementId = 'sorter-camera-viewfinder';
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
          if (lastScannedTimeRef.current.code === clean && now - lastScannedTimeRef.current.time < 2500) {
            return;
          }
          lastScannedTimeRef.current = { code: clean, time: now };
          sortPackage(decodedText);
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
      console.warn('Error stopping sorter scanner:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleToggleEntryMode = async () => {
    if (entryMode === 'camera') {
      await stopCamera();
      setEntryMode('text');
      setTimeout(() => textInputRef.current?.focus(), 100);
    } else {
      setEntryMode('camera');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    sortPackage(manualCode);
    setManualCode('');
    textInputRef.current?.focus();
  };

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Autofocus input in text mode
  useEffect(() => {
    if (entryMode === 'text') {
      textInputRef.current?.focus();
    }
  }, [entryMode]);

  // Sample barcode for test demo
  const sampleMatchCode = stops[0]?.barcode;
  const currentRouteTheme = lastResult?.isFound ? getRouteTheme(lastResult.route) : null;

  return (
    <div className="flex flex-col gap-4 max-w-3xl mx-auto w-full">
      {/* Station Control & Compact Viewfinder Dock */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white grid place-items-center shadow-xs">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                Package & Route Sorter
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                  Live
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Scan parcels to instantly reveal their assigned sub-route, driver, and stop sequence
              </p>
            </div>
          </div>

          {/* Sound, Voice & Mode Switchers */}
          <div className="flex items-center gap-2">
            {/* Voice Announcement Toggle */}
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                voiceEnabled
                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
              }`}
              title={voiceEnabled ? 'Mute voice announcement' : 'Enable voice announcement'}
            >
              {voiceEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              <span className="hidden sm:inline">{voiceEnabled ? 'Voice On' : 'Voice Off'}</span>
            </button>

            {/* Audio Tone Toggle */}
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
            <span className="font-semibold text-slate-800">{stops.length} total packages</span>
            <span className="text-slate-300">·</span>
            <span>{routeDistribution.length} detected routes</span>
            <span className="text-slate-300">·</span>
            <span className="text-blue-700 font-bold">{sortedBarcodeSet.size} sorted</span>
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
                  <span>{isScanning ? 'Camera active · point at parcel barcode' : 'Camera idle · tap Start'}</span>
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
                    placeholder="Scan or type package barcode & hit Enter..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white rounded-xl font-mono text-xs text-slate-900 outline-hidden"
                    autoComplete="off"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Sort
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
                  onClick={() => sortPackage(sampleMatchCode)}
                  className="text-emerald-700 hover:bg-emerald-100 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold text-[11px] cursor-pointer"
                >
                  Test Sample Package
                </button>
                <button
                  type="button"
                  onClick={() => sortPackage('UNKNOWN_PKG_99999')}
                  className="text-rose-700 hover:bg-rose-100 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md font-semibold text-[11px] cursor-pointer"
                >
                  Test Unknown Package
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
                <div id="sorter-camera-viewfinder" className="w-full h-full" />

                {!isScanning && (
                  <div className="flex flex-col items-center justify-center p-2 text-white text-center gap-1">
                    <Camera className="h-6 w-6 text-slate-400" />
                    <span className="text-[10px] text-slate-300 font-medium">Viewfinder</span>
                  </div>
                )}

                {isScanning && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-20 h-14 border border-white/60 rounded-md" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* HERO SORT RESULT CARD (ZERO SCROLL) */}
      {lastResult ? (
        lastResult.isFound ? (
          /* VIBRANT ROUTE SORT CARD */
          <div className={`${currentRouteTheme?.bg || 'bg-blue-600'} rounded-2xl text-white p-5 sm:p-6 shadow-xl ring-4 ${currentRouteTheme?.ring || 'ring-blue-400/40'} animate-in fade-in zoom-in-95 duration-200 transition-all`}>
            {/* Top Tag & Time */}
            <div className="flex items-center justify-between gap-3 text-xs border-b border-white/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                <span className="font-bold uppercase tracking-wider">Route Assignment Found</span>
              </div>
              <span className="font-mono text-[11px] px-2 py-0.5 bg-black/20 rounded-md">
                {lastResult.timestamp.toLocaleTimeString()}
              </span>
            </div>

            {/* Giant Route Header Callout */}
            <div className="mt-4 text-center sm:text-left flex flex-col sm:flex-row items-center sm:items-baseline justify-between gap-2">
              <div>
                <div className="text-[11px] uppercase font-black text-white/80 tracking-widest">
                  Target Route
                </div>
                <div className="text-4xl sm:text-6xl font-black tracking-tight uppercase leading-none mt-1">
                  {lastResult.route}
                </div>
              </div>

              {lastResult.seq !== null && lastResult.seq !== undefined ? (
                <div className="bg-white/20 backdrop-blur-xs border border-white/30 px-3.5 py-1.5 rounded-xl font-mono text-xl sm:text-2xl font-black">
                  Stop #{lastResult.seq}
                </div>
              ) : (
                <div className="bg-white/10 px-3 py-1 rounded-lg text-xs font-semibold text-white/90">
                  Unsequenced
                </div>
              )}
            </div>

            {/* Driver & Location Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
              <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-xl p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-white/80">Assigned Driver</div>
                  <div className="text-base sm:text-lg font-black truncate">{lastResult.driver}</div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-xl p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-white/80">Destination ZIP</div>
                  <div className="text-base sm:text-lg font-black font-mono">{lastResult.zip || 'Unknown ZIP'}</div>
                </div>
              </div>
            </div>

            {/* Package & Destination Address */}
            <div className="mt-4 pt-3 border-t border-white/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
              <div className="font-mono">
                <span className="opacity-75">Parcel ID: </span>
                <span className="font-bold text-white">{lastResult.barcode}</span>
              </div>
              {lastResult.address && (
                <div className="truncate max-w-sm opacity-90 font-medium">
                  {lastResult.address}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* UNKNOWN / NOT FOUND IN MANIFEST */
          <div className="bg-rose-600 rounded-2xl text-white p-5 sm:p-6 shadow-xl ring-4 ring-rose-400/40 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <AlertOctagon className="h-7 w-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
                  UNKNOWN PACKAGE
                </h3>
                <p className="text-xs sm:text-sm text-rose-100 mt-0.5 font-medium">
                  Barcode is not listed in today&apos;s loaded manifest routes.
                </p>
              </div>
            </div>

            <div className="mt-4 bg-white/10 border border-white/20 rounded-xl p-3">
              <div className="text-[11px] uppercase font-bold text-rose-200">Scanned Barcode</div>
              <div className="font-mono text-base font-bold text-white break-all mt-0.5">
                {lastResult.barcode}
              </div>
              <div className="text-xs text-rose-100 mt-1">
                ⚠️ Set this parcel aside for supervisor review. Do not load onto any driver rack.
              </div>
            </div>
          </div>
        )
      ) : (
        /* Standby state card */
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-6 text-center flex flex-col items-center justify-center gap-2">
          <div className="h-10 w-10 rounded-full bg-slate-100 grid place-items-center text-slate-400">
            <ArrowDownUp className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-slate-700">Awaiting Package Scan</p>
          <p className="text-xs text-slate-500 max-w-sm">
            Point camera or enter a tracking barcode to instantly display its route and assigned driver.
          </p>
        </div>
      )}

      {/* ROUTE DISTRIBUTION BINS & TALLY */}
      {routeDistribution.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Boxes className="h-4 w-4 text-blue-600" />
              <h4 className="font-bold text-sm text-slate-900">Route Bins & Sorting Progress</h4>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {sortedBarcodeSet.size} of {stops.length} sorted
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {routeDistribution.map((item) => {
              const theme = getRouteTheme(item.route);
              const isCurrentRoute = lastResult?.isFound && lastResult.route === item.route;

              return (
                <div
                  key={item.route}
                  className={`p-3 rounded-xl border transition-all ${
                    isCurrentRoute
                      ? 'border-blue-600 bg-blue-50/60 shadow-xs ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-900 truncate">
                      {item.route}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${theme.badge}`}>
                      {item.total} pkgs
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 truncate">
                    Driver: <span className="font-semibold text-slate-700">{item.driver}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RECENT SCANS LOG */}
      {history.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5">
          <h4 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2.5 mb-2.5 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span>Recent Sorted Parcels</span>
          </h4>

          <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
            {history.map((item) => (
              <div key={item.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                      item.isFound ? 'bg-blue-600' : 'bg-rose-500'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="font-mono font-bold text-slate-800 truncate">{item.barcode}</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {item.isFound
                        ? `${item.route} · ${item.driver} ${item.seq ? `· Stop #${item.seq}` : ''}`
                        : 'Unknown package'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      item.isFound
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {item.isFound ? item.route : 'Unknown'}
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
export default PackageSorter;
