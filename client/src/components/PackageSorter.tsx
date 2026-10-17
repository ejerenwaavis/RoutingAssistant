import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Camera,
  Keyboard,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  ScanBarcode,
  RotateCcw,
  CheckCircle2,
  AlertOctagon,
  XCircle,
  ArrowRight,
  Package,
  Boxes,
  User,
  MapPin,
  Clock,
  CircleDot,
  Circle,
  Truck,
  ArrowUpDown,
  Search,
  Compass,
  Check,
  ChevronRight,
  Scan
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
  status?: string;
}

type SorterSubTab = 'scan' | 'routes' | 'packages';

export const PackageSorter: React.FC<PackageSorterProps> = ({
  stops,
  manifestMeta,
  user,
  onSwitchToSlicer
}) => {
  // Sub-navigation view matching the photo: Scan | Routes | Packages
  const [activeTab, setActiveTab] = useState<SorterSubTab>('scan');

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

  // Package search filter for the 'packages' tab
  const [searchQuery, setSearchQuery] = useState('');

  // Selected route for the 'routes' assignment tab
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>('');

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
          seq: s.seq,
          status: s.status || 'Standard'
        });
      }
    }
    return map;
  }, [stops, manifestMeta, user]);

  // Unique routes summary
  const routeDistribution = useMemo(() => {
    const map = new Map<string, { total: number; driver: string; stops: Stop[] }>();
    for (const s of stops) {
      const r = s.route || 'Route 1';
      const existing = map.get(r);
      if (existing) {
        existing.total += 1;
        existing.stops.push(s);
      } else {
        map.set(r, {
          total: 1,
          driver: s.driver || user?.firstName || 'Assigned Driver',
          stops: [s]
        });
      }
    }
    return Array.from(map.entries()).map(([routeName, data]) => ({
      route: routeName,
      driver: data.driver,
      total: data.total,
      stops: data.stops
    }));
  }, [stops, user]);

  // Initialize selected route filter if not set
  useEffect(() => {
    if (routeDistribution.length > 0 && !selectedRouteFilter) {
      setSelectedRouteFilter(routeDistribution[0].route);
    }
  }, [routeDistribution, selectedRouteFilter]);

  // Active route data for the Route Assignment tab
  const activeRouteData = useMemo(() => {
    if (!selectedRouteFilter) return routeDistribution[0] || null;
    return routeDistribution.find(r => r.route === selectedRouteFilter) || routeDistribution[0] || null;
  }, [routeDistribution, selectedRouteFilter]);

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
    setHistory(prev => [result, ...prev.slice(0, 49)]);

    if (match) {
      setSortedBarcodeSet(prev => new Set(prev).add(match!.barcode.toUpperCase()));
      if (match.route && match.route !== selectedRouteFilter) {
        setSelectedRouteFilter(match.route);
      }
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
          qrbox: { width: 220, height: 160 },
          aspectRatio: 1.3333
        },
        (decodedText) => {
          const now = Date.now();
          const clean = decodedText.trim().toUpperCase();
          if (lastScannedTimeRef.current.code === clean && now - lastScannedTimeRef.current.time < 2200) {
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

  // Sorting progress stats for active route
  const activeRouteStops = activeRouteData?.stops || [];
  const activeRouteSortedCount = activeRouteStops.filter(s =>
    s.barcode && sortedBarcodeSet.has(s.barcode.toUpperCase())
  ).length;
  const activeRouteTotal = activeRouteStops.length || 1;
  const activeRouteProgressPercent = Math.round((activeRouteSortedCount / activeRouteTotal) * 100);

  // Group active route stops by sequence for the "Next Stops" list
  const activeRouteStopGroups = useMemo(() => {
    const map = new Map<number, { seq: number; pkgs: Stop[]; sortedCount: number }>();
    for (const s of activeRouteStops) {
      const seqNum = s.seq || 0;
      const existing = map.get(seqNum);
      const isSorted = s.barcode ? sortedBarcodeSet.has(s.barcode.toUpperCase()) : false;
      if (existing) {
        existing.pkgs.push(s);
        if (isSorted) existing.sortedCount += 1;
      } else {
        map.set(seqNum, {
          seq: seqNum,
          pkgs: [s],
          sortedCount: isSorted ? 1 : 0
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.seq - b.seq);
  }, [activeRouteStops, sortedBarcodeSet]);

  return (
    <div className="flex flex-col gap-5 max-w-4xl mx-auto w-full pb-20 sm:pb-8">
      {/* Station Sub-Navigation Bar matching photo */}
      <div className="flex items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl p-2 shadow-2xs">
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 w-full sm:w-auto shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('scan')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'scan'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scan className="h-4 w-4" />
            <span>Scan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('routes')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'routes'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="h-4 w-4" />
            <span>Routes</span>
            {routeDistribution.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'routes' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {routeDistribution.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('packages')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'packages'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Boxes className="h-4 w-4" />
            <span>Packages</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'packages' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {sortedBarcodeSet.size}
            </span>
          </button>
        </div>

        {/* Global Controls & Audio/Voice Shortcuts */}
        <div className="hidden sm:flex items-center gap-2">
          {/* Voice Announcement Toggle */}
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              voiceEnabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
            }`}
            title={voiceEnabled ? 'Mute voice announcement' : 'Enable voice announcement'}
          >
            {voiceEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            <span className="hidden md:inline">{voiceEnabled ? 'Voice On' : 'Voice Off'}</span>
          </button>

          {/* Sound Tone Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              soundEnabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
            }`}
            title={soundEnabled ? 'Mute audio tone' : 'Unmute audio tone'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* Toggle Camera / Text Mode */}
          <button
            onClick={handleToggleEntryMode}
            className="p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer"
            title={entryMode === 'camera' ? 'Switch to Manual Text / USB Gun' : 'Switch to Phone Camera'}
          >
            {entryMode === 'camera' ? (
              <>
                <Keyboard className="h-4 w-4 text-slate-600" />
                <span className="hidden lg:inline">Manual / USB</span>
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 text-emerald-600" />
                <span className="hidden lg:inline">Camera</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: SCAN PACKAGE (Matches Top-Left & Top-Right of Photo)
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'scan' && (
        <div className="flex flex-col gap-4">
          {/* Header Title Section from Photo */}
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Scan Package
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Scan the barcode to instantly get route, driver and sorting details.
            </p>
          </div>

          {/* Top Scan Dock: Viewfinder + Instruction Card */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
            {/* Left Column: Camera Viewfinder with Green Reticle Corners */}
            <div className="md:col-span-7 flex flex-col">
              <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-sm aspect-[16/10] sm:aspect-[16/9] max-h-[220px] sm:max-h-[260px] flex items-center justify-center">
                {/* HTML5 QR Code Container */}
                <div id="sorter-camera-viewfinder" className="w-full h-full" />

                {/* Camera Idle Surface */}
                {!isScanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center bg-slate-950/90 z-5">
                    <div className="h-10 w-10 rounded-xl bg-slate-800 text-slate-400 grid place-items-center">
                      <Camera className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-300">
                      Camera Idle · Tap Start to scan barcodes
                    </span>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="mt-1 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                    >
                      Start Camera
                    </button>
                  </div>
                )}

                {/* Glowing Green Reticle Corners [  ] matching Photo */}
                <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl-md pointer-events-none z-10" />
                <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr-md pointer-events-none z-10" />
                <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl-md pointer-events-none z-10" />
                <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br-md pointer-events-none z-10" />

                {/* Bottom Right Camera Switch / Action Button from Photo */}
                <button
                  type="button"
                  onClick={isScanning ? stopCamera : startCamera}
                  className="absolute bottom-3 right-3 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-xs border border-white/10 transition-all cursor-pointer z-20 shadow-md"
                  title={isScanning ? 'Stop Camera' : 'Start Camera'}
                >
                  <Camera className="h-4 w-4 text-emerald-400" />
                </button>

                {/* Active scan status indicator */}
                {isScanning && (
                  <div className="absolute top-3 left-10 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-xs text-[10px] font-bold text-emerald-400 z-10">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live Scanner</span>
                  </div>
                )}
              </div>

              {cameraError && (
                <div className="mt-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-2.5 flex items-start gap-2">
                  <AlertOctagon className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{cameraError}</span>
                </div>
              )}
            </div>

            {/* Right Column: Instruction Card matching Photo */}
            <div className="md:col-span-5 bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col justify-between gap-3 shadow-2xs">
              <div className="flex flex-col items-center text-center gap-2 pt-2">
                <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 grid place-items-center border border-emerald-100 shadow-2xs">
                  <ScanBarcode className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Keep package in frame
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                  The system will auto-detect the barcode and load the route, driver, and stop sequence in real time.
                </p>
              </div>

              {/* Quick Barcode Form (for Manual / USB scanner) */}
              <div className="border-t border-slate-100 pt-3">
                <form onSubmit={handleManualSubmit} className="flex items-center gap-2 w-full">
                  <div className="relative flex-1">
                    <ScanBarcode className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      ref={textInputRef}
                      type="text"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="Type or scan barcode..."
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white rounded-xl font-mono text-xs text-slate-900 outline-hidden"
                      autoComplete="off"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
                  >
                    Sort
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Quick Demo Helper Chip (if no barcode entered yet) */}
          {sampleMatchCode && !lastResult && (
            <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">Quick Demo:</span>
                <span className="font-mono text-emerald-800 font-semibold">{sampleMatchCode}</span>
              </div>
              <button
                type="button"
                onClick={() => sortPackage(sampleMatchCode)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
              >
                Test Scan →
              </button>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              HERO RESULT CARD: EXACT LAYOUT FROM THE USER'S PHOTO
              ───────────────────────────────────────────────────────────── */}
          {lastResult?.isFound ? (
            <div className="rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm border border-slate-200/90 transition-all">
              {/* Header Dark Green Banner matching Photo */}
              <div className="bg-[#064e3b] px-4 sm:px-6 py-3.5 sm:py-4 flex flex-col gap-1.5 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-emerald-500/20 border border-emerald-400/30 grid place-items-center text-emerald-300">
                      <Boxes className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-200">
                      PACKAGE SCANNED
                    </span>
                  </div>
                  <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 grid place-items-center">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                </div>

                <div className="font-mono text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">
                  {lastResult.barcode}
                </div>
              </div>

              {/* Card Body matching Photo */}
              <div className="bg-white p-4 sm:p-6 flex flex-col gap-4">
                {/* 3 Metric Columns Row */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 pb-4 border-b border-slate-100 text-center sm:text-left">
                  {/* Column 1: Route */}
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                      Route
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                      #{lastResult.route}
                    </div>
                    <div className="mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                        ON ROUTE
                      </span>
                    </div>
                  </div>

                  {/* Column 2: Next Stop / Sort to */}
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                      Next Stop
                    </span>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center justify-center sm:justify-start gap-1 leading-tight">
                      <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 shrink-0" />
                      <span>Stop {lastResult.seq ?? '—'}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1">
                      {lastResult.seq ? 'Next stop' : 'Unsequenced'}
                    </span>
                  </div>

                  {/* Column 3: Sort Zone */}
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                      Sort Zone
                    </span>
                    <div className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center justify-center sm:justify-start gap-1 leading-tight">
                      <ArrowUpDown className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 shrink-0" />
                      <span>{lastResult.zip || 'Zone A'}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1">
                      Destination
                    </span>
                  </div>
                </div>

                {/* Details List with Icons matching Photo */}
                <div className="flex flex-col gap-2.5 text-xs sm:text-sm">
                  <div className="flex items-center gap-3 text-slate-700">
                    <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-600 grid place-items-center shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                      <span className="text-slate-400 font-medium">Driver:</span>
                      <span className="font-bold text-slate-900">{lastResult.driver}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-slate-700">
                    <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-600 grid place-items-center shrink-0">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 min-w-0">
                      <span className="text-slate-400 font-medium">Destination ZIP:</span>
                      <span className="font-bold text-slate-900 truncate">
                        {lastResult.zip} {lastResult.address ? `· ${lastResult.address}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-slate-700">
                    <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-600 grid place-items-center shrink-0">
                      <Truck className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                      <span className="text-slate-400 font-medium">Package Type:</span>
                      <span className="font-bold text-slate-900">Standard</span>
                    </div>
                  </div>
                </div>

                {/* Full-Width Action Button matching Photo */}
                <button
                  type="button"
                  onClick={() => {
                    if (!isScanning) startCamera();
                    textInputRef.current?.focus();
                  }}
                  className="w-full py-3.5 px-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer mt-1"
                >
                  <Check className="h-5 w-5" />
                  <span>Continue Scanning</span>
                </button>
              </div>
            </div>
          ) : lastResult && !lastResult.isFound ? (
            /* Unassigned / Unknown Barcode Card */
            <div className="rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm border border-rose-200">
              <div className="bg-rose-900 px-4 sm:px-6 py-4 flex flex-col gap-1 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertOctagon className="h-5 w-5 text-rose-300" />
                    <span className="text-xs font-black uppercase tracking-wider text-rose-200">
                      NOT IN TODAY&apos;S MANIFEST
                    </span>
                  </div>
                  <XCircle className="h-5 w-5 text-rose-300" />
                </div>
                <div className="font-mono text-xl font-black text-white mt-1">
                  {lastResult.barcode}
                </div>
              </div>

              <div className="bg-white p-5 flex flex-col gap-4">
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  This parcel tracking number was not found in today&apos;s manifest batch. Please hold this package aside and notify dispatch before sorting into any route.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    if (!isScanning) startCamera();
                    textInputRef.current?.focus();
                  }}
                  className="w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white transition-all cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                  <span>Scan Next Package</span>
                </button>
              </div>
            </div>
          ) : (
            /* Ready to Scan Initial Placeholder matching Card Frame */
            <div className="rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xs border border-slate-200/80 bg-white p-6 text-center flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 grid place-items-center">
                <ScanBarcode className="h-6 w-6 text-slate-500" />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-bold text-slate-900 text-base">Ready to Sort Packages</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Point the camera at any package barcode or use a USB handheld scanner. The route number, driver, and stop will display instantly.
                </p>
              </div>
            </div>
          )}

          {/* Desktop Recent Scans Row from Photo */}
          <div className="flex items-center justify-between gap-3 pt-2 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-800">Recent Scans:</span>
              {history.length === 0 ? (
                <span className="text-slate-400">No packages scanned yet</span>
              ) : (
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {history.slice(0, 3).map((item) => (
                    <span
                      key={item.id}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold"
                    >
                      {item.barcode}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('packages')}
                className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer text-xs"
              >
                <span>View all ({history.length})</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: ROUTE ASSIGNMENT & PROGRESS (Matches Bottom-Middle Photo)
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'routes' && activeRouteData && (
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Route Assignment
              </h2>
              <p className="text-xs text-slate-500">
                Track sorting throughput and monitor stop progression
              </p>
            </div>

            {/* Route Selector Dropdown / Pills if multiple routes exist */}
            {routeDistribution.length > 1 && (
              <select
                value={selectedRouteFilter}
                onChange={(e) => setSelectedRouteFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 shadow-2xs outline-hidden"
              >
                {routeDistribution.map(r => (
                  <option key={r.route} value={r.route}>
                    Route #{r.route} ({r.total} pkgs)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Route Overview Card matching Photo */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-emerald-600 text-white grid place-items-center shadow-xs">
                  <Boxes className="h-6 w-6" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-black text-slate-900">
                      Route #{activeRouteData.route}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                      ON ROUTE
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    Assigned to: <strong className="text-slate-800">{activeRouteData.driver}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Two Stat Boxes matching Photo */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-700 grid place-items-center shrink-0">
                  <MapPin className="h-4.5 w-4.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-500 font-medium">Target Stops</span>
                  <span className="text-base sm:text-lg font-black text-slate-900">
                    {activeRouteStopGroups.length}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center shrink-0">
                  <Package className="h-4.5 w-4.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] text-slate-500 font-medium">Packages</span>
                  <span className="text-base sm:text-lg font-black text-slate-900">
                    {activeRouteData.total}
                  </span>
                </div>
              </div>
            </div>

            {/* View Route in Slicer Button */}
            <button
              type="button"
              onClick={onSwitchToSlicer}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
            >
              <Compass className="h-4 w-4" />
              <span>View Route in Slicer</span>
            </button>
          </div>

          {/* Sorting Progress Card matching Photo */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm sm:text-base">
                Sorting Progress
              </span>
              <span className="font-black text-emerald-700 text-sm sm:text-base">
                {activeRouteProgressPercent}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/60">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${activeRouteProgressPercent}%` }}
              />
            </div>

            <span className="text-xs text-slate-500 font-medium">
              {activeRouteSortedCount} of {activeRouteData.total} packages sorted
            </span>
          </div>

          {/* Next Stops List matching Photo */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm sm:text-base">
                Next Stops
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {activeRouteStopGroups.filter(g => g.sortedCount < g.pkgs.length).length} remaining
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {activeRouteStopGroups.slice(0, 15).map((group) => {
                const isComplete = group.sortedCount === group.pkgs.length;
                const isCurrent = !isComplete && group.sortedCount > 0;

                return (
                  <div
                    key={group.seq}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs ${
                      isComplete
                        ? 'bg-slate-50 border-slate-200 text-slate-500'
                        : isCurrent
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {isComplete ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : isCurrent ? (
                        <CircleDot className="h-4 w-4 text-emerald-600 shrink-0 animate-pulse" />
                      ) : (
                        <Circle className="h-4 w-4 text-slate-300 shrink-0" />
                      )}
                      <span>Stop {group.seq || '—'}</span>
                    </div>

                    <span className="font-semibold text-slate-500">
                      {group.pkgs.length} pkgs
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: RECENT SORTED PARCELS (Matches Bottom-Right Photo)
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'packages' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-emerald-600 text-white grid place-items-center">
                <Boxes className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Recent Sorted Parcels
                </h3>
                <span className="text-xs text-slate-500">
                  {sortedBarcodeSet.size} total verified packages
                </span>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
              {sortedBarcodeSet.size} sorted
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by barcode or route..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-hidden focus:bg-white focus:border-emerald-500"
            />
          </div>

          {/* List of Sorted Items matching Photo */}
          {history.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No packages have been sorted in this session yet.
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-1">
              {history
                .filter(item =>
                  !searchQuery ||
                  item.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.route.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-all text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center shrink-0">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-mono font-bold text-slate-900 truncate">
                          {item.barcode}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Route {item.route} {item.seq ? `• Stop ${item.seq}` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {item.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                        SORTED
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MOBILE BOTTOM NAVIGATION DOCK MATCHING THE PHOTO
          ───────────────────────────────────────────────────────────── */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2 flex items-center justify-around shadow-lg">
        <button
          type="button"
          onClick={() => setActiveTab('scan')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold py-1 px-3 rounded-xl cursor-pointer ${
            activeTab === 'scan' ? 'text-emerald-700' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className={`p-1 rounded-lg ${activeTab === 'scan' ? 'bg-emerald-100 text-emerald-800' : ''}`}>
            <Scan className="h-4 w-4" />
          </div>
          <span>Scan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('routes')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold py-1 px-3 rounded-xl cursor-pointer ${
            activeTab === 'routes' ? 'text-emerald-700' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className={`p-1 rounded-lg ${activeTab === 'routes' ? 'bg-emerald-100 text-emerald-800' : ''}`}>
            <Compass className="h-4 w-4" />
          </div>
          <span>Routes</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('packages')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold py-1 px-3 rounded-xl cursor-pointer ${
            activeTab === 'packages' ? 'text-emerald-700' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className={`p-1 rounded-lg ${activeTab === 'packages' ? 'bg-emerald-100 text-emerald-800' : ''}`}>
            <Boxes className="h-4 w-4" />
          </div>
          <span>Packages</span>
        </button>

        <button
          type="button"
          onClick={onSwitchToSlicer}
          className="flex flex-col items-center gap-1 text-[10px] font-bold py-1 px-3 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          <div className="p-1 rounded-lg">
            <MapPin className="h-4 w-4" />
          </div>
          <span>Slicer</span>
        </button>
      </div>
    </div>
  );
};
export default PackageSorter;
