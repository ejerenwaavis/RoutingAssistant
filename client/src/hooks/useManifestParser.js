import { useState, useMemo, useCallback } from 'react';
import * as xlsx from 'xlsx';
import papa from 'papaparse';

export function useManifestParser() {
  const [stops, setStops] = useState([]);
  const [stagingDrawer, setStagingDrawer] = useState([]);
  const [zipDistribution, setZipDistribution] = useState([]);
  const [selectedZipCodes, setSelectedZipCodes] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [routeFilter, setRouteFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Compute Zip Distribution dynamically from current stops
  const computedZipDistribution = useMemo(() => {
    if (zipDistribution.length > 0) return zipDistribution;
    const map = {};
    stops.forEach(s => {
      const zip = s.zipCode || 'UNKNOWN';
      if (!map[zip]) {
        map[zip] = { zipCode: zip, count: 0, routes: new Set() };
      }
      map[zip].count++;
      if (s.routeId) map[zip].routes.add(s.routeId);
    });
    return Object.values(map)
      .map(e => ({ zipCode: e.zipCode, count: e.count, routeIds: Array.from(e.routes) }))
      .sort((a, b) => b.count - a.count);
  }, [stops, zipDistribution]);

  // Compute live metrics
  const metrics = useMemo(() => {
    const total = stops.length;
    let completed = 0;
    let failed = 0;
    let needsAddressCorrection = 0;
    const zipSet = new Set();

    stops.forEach(s => {
      const st = (s.status || '').toUpperCase();
      if (st === 'DELIVERED' || st === 'OUT_FOR_DELIVERY') {
        completed++;
      } else if (st === 'FAILED ATTEMPT' || st === 'RETURNED' || st === 'EXCEPTION' || s.exceptionReason) {
        failed++;
      }

      if (/Invalid Address/i.test(s.exceptionReason) || !s.zipCode || s.zipCode.length < 5) {
        needsAddressCorrection++;
      }

      if (s.zipCode) zipSet.add(s.zipCode);
    });

    return {
      total,
      completed,
      failed,
      needsAddressCorrection,
      uniqueZipCodes: zipSet.size
    };
  }, [stops]);

  // Unique route list for filtering
  const availableRoutes = useMemo(() => {
    const set = new Set();
    stops.forEach(s => {
      if (s.routeId) set.add(s.routeId);
    });
    return Array.from(set).sort();
  }, [stops]);

  // Filtered stops
  const filteredStops = useMemo(() => {
    return stops.filter(s => {
      // Zip Code Filter
      if (selectedZipCodes.length > 0 && !selectedZipCodes.includes(s.zipCode)) {
        return false;
      }

      // Status Filter
      if (statusFilter !== 'ALL') {
        const st = (s.status || '').toUpperCase();
        if (statusFilter === 'FAILED' && !(st === 'FAILED ATTEMPT' || st === 'RETURNED' || st === 'EXCEPTION' || s.exceptionReason)) {
          return false;
        }
        if (statusFilter === 'COMPLETED' && !(st === 'DELIVERED' || st === 'OUT_FOR_DELIVERY')) {
          return false;
        }
        if (statusFilter === 'NEW' && st !== 'NEW') {
          return false;
        }
      }

      // Route Filter
      if (routeFilter !== 'ALL' && s.routeId !== routeFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          (s.trackingNo && s.trackingNo.toLowerCase().includes(q)) ||
          (s.address && s.address.toLowerCase().includes(q)) ||
          (s.driverName && s.driverName.toLowerCase().includes(q)) ||
          (s.recipientName && s.recipientName.toLowerCase().includes(q)) ||
          (s.notes && s.notes.toLowerCase().includes(q)) ||
          (s.zipCode && s.zipCode.includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [stops, selectedZipCodes, statusFilter, routeFilter, searchQuery]);

  // Parse clipboard text
  const loadFromText = useCallback(async (text) => {
    if (!text || !text.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/parse/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to parse clipboard text.');
      }
      setStops(data.stops || []);
      setStagingDrawer(data.stagingDrawer || []);
      setZipDistribution([]);
      setSelectedZipCodes([]);
      showToast(`Successfully parsed ${data.stops.length} records!`);
    } catch (err) {
      console.error('Error loading text:', err);
      setError(err.message);
      showToast(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Ingest Excel/CSV file
  const loadFromFile = useCallback(async (file) => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/parse/file', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to parse spreadsheet file.');
      }
      setStops(data.stops || []);
      setZipDistribution(data.zipDistribution || []);
      setStagingDrawer([]);
      setSelectedZipCodes([]);
      showToast(`Ingested ${data.stops.length} stops across ${data.zipDistribution.length} zip codes!`);
    } catch (err) {
      console.error('Error loading file:', err);
      setError(err.message);
      showToast(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Zip Code Selection
  const toggleZipCode = useCallback((zip) => {
    setSelectedZipCodes(prev =>
      prev.includes(zip) ? prev.filter(z => z !== zip) : [...prev, zip]
    );
  }, []);

  const selectAllZipCodes = useCallback(() => {
    setSelectedZipCodes(computedZipDistribution.map(z => z.zipCode));
  }, [computedZipDistribution]);

  const clearZipCodes = useCallback(() => {
    setSelectedZipCodes([]);
  }, []);

  // Update a single stop
  const updateStop = useCallback((index, field, value) => {
    setStops(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }, []);

  // Clear all data
  const clearData = useCallback(() => {
    setStops([]);
    setStagingDrawer([]);
    setZipDistribution([]);
    setSelectedZipCodes([]);
    setStatusFilter('ALL');
    setRouteFilter('ALL');
    setSearchQuery('');
  }, []);

  // Export CSV triggers
  const exportManifest = useCallback(async (format) => {
    const dataset = filteredStops;
    if (dataset.length === 0) {
      showToast('No records available to export.');
      return;
    }

    try {
      const endpoint = format === 'rollover' ? '/api/export/rollover' : '/api/export/navigation';
      const body = format === 'rollover' ? { stops: dataset } : { format, stops: dataset };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Export failed');

      // Trigger browser download
      const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', data.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`Downloaded ${data.filename}!`);
    } catch (err) {
      console.error('Export error:', err);
      showToast(`Export error: ${err.message}`);
    }
  }, [filteredStops, showToast]);

  // Copy EOD driver summary to clipboard
  const copyDriverSummary = useCallback(async () => {
    if (stops.length === 0) {
      showToast('No manifest data available.');
      return;
    }
    try {
      const res = await fetch('/api/export/driver-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stops })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to generate summary');

      await navigator.clipboard.writeText(data.summary);
      showToast('Copied Driver EOD Summary to clipboard!');
    } catch (err) {
      console.error('Clipboard copy error:', err);
      showToast(`Failed to copy: ${err.message}`);
    }
  }, [stops, showToast]);

  return {
    stops,
    filteredStops,
    stagingDrawer,
    zipDistribution: computedZipDistribution,
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
    updateStop,
    clearData,
    exportManifest,
    copyDriverSummary
  };
}
