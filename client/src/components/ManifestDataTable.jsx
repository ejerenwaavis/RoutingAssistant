import React, { useState } from 'react';
import { Search, Filter, AlertCircle, ChevronDown, ChevronUp, Layers, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

export function ManifestDataTable({
  stops,
  totalRawStops,
  stagingDrawer,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  routeFilter,
  onRouteFilterChange,
  availableRoutes,
  onClearData
}) {
  const [showDrawer, setShowDrawer] = useState(false);

  const getStatusBadge = (status, exception) => {
    const st = (status || '').toUpperCase();
    if (st === 'FAILED ATTEMPT' || st === 'RETURNED' || st === 'EXCEPTION' || exception) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <AlertCircle className="w-3 h-3" />
          {status || 'FAILED'}
        </span>
      );
    }
    if (st === 'OUT_FOR_DELIVERY' || st === 'DELIVERED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" />
          {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
        <Clock className="w-3 h-3" />
        {status || 'NEW'}
      </span>
    );
  };

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search tracking, address, driver, zip..."
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 transition"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:border-sky-500 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="FAILED">Failed / Exceptions</option>
            <option value="COMPLETED">Delivered / In Transit</option>
            <option value="NEW">New / Unprocessed</option>
          </select>

          {/* Route Filter */}
          {availableRoutes.length > 0 && (
            <select
              value={routeFilter}
              onChange={(e) => onRouteFilterChange(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300 focus:border-sky-500 focus:outline-none max-w-[200px]"
            >
              <option value="ALL">All Routes ({availableRoutes.length})</option>
              {availableRoutes.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Staging Drawer Toggle */}
          {stagingDrawer && stagingDrawer.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDrawer(!showDrawer)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Staging Drawer ({stagingDrawer.length})</span>
              {showDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}

          {totalRawStops > 0 && (
            <button
              type="button"
              onClick={onClearData}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Staging Drawer for Unrecognized Tokens */}
      {showDrawer && stagingDrawer && stagingDrawer.length > 0 && (
        <div className="bg-amber-950/20 border-b border-amber-500/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Isolated Raw Lines (Unmatched in Stream)
            </h5>
            <span className="text-[11px] text-zinc-400">
              Valid rows were not broken. These lines were excluded from manifests.
            </span>
          </div>
          <div className="max-h-36 overflow-y-auto space-y-1 font-mono text-[11px]">
            {stagingDrawer.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 text-zinc-400 bg-zinc-950/60 p-1.5 rounded border border-zinc-800">
                <span className="text-zinc-600">L#{item.lineIndex || idx + 1}:</span>
                <span className="flex-1 truncate">{item.content}</span>
                <span className="text-amber-400 text-[10px]">{item.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table Data Grid */}
      <div className="overflow-x-auto max-h-[520px]">
        {stops.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <Layers className="w-10 h-10 mx-auto mb-2 text-zinc-700" />
            <p className="text-sm font-medium">No records matching active filters.</p>
            <p className="text-xs text-zinc-600 mt-1">Paste SpeedX POS text above or upload an Excel manifest to begin.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-zinc-950/80 sticky top-0 z-10 border-b border-zinc-800 text-zinc-400 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">#</th>
                <th className="py-2.5 px-3">Tracking Barcode</th>
                <th className="py-2.5 px-3">Route ID</th>
                <th className="py-2.5 px-3">Driver</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 min-w-[200px]">Address</th>
                <th className="py-2.5 px-3">Zip</th>
                <th className="py-2.5 px-3 min-w-[180px]">Exception / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {stops.map((stop, idx) => (
                <tr
                  key={stop.trackingNo || idx}
                  className="hover:bg-zinc-800/40 transition group"
                >
                  <td className="py-2.5 px-3 text-center font-mono text-zinc-500 text-[11px]">
                    {stop.stopNumber || idx + 1}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-medium text-sky-400 select-all">
                    {stop.trackingNo}
                  </td>
                  <td className="py-2.5 px-3 text-zinc-300 font-mono text-[11px] truncate max-w-[160px]" title={stop.routeId}>
                    {stop.routeId}
                  </td>
                  <td className="py-2.5 px-3 text-zinc-200 font-medium truncate max-w-[140px]" title={stop.driverName}>
                    {stop.driverName || <span className="text-zinc-600 italic">Unassigned</span>}
                  </td>
                  <td className="py-2.5 px-3">
                    {getStatusBadge(stop.status, stop.exceptionReason)}
                  </td>
                  <td className="py-2.5 px-3 text-zinc-300 text-[11px] max-w-[240px] truncate" title={stop.address}>
                    {stop.address || <span className="text-zinc-600 italic">No Address</span>}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-purple-300">
                    {stop.zipCode || '—'}
                  </td>
                  <td className="py-2.5 px-3 text-zinc-400 text-[11px] max-w-[220px]">
                    {stop.exceptionReason && (
                      <span className="text-rose-400 font-medium block truncate" title={stop.exceptionReason}>
                        {stop.exceptionReason}
                      </span>
                    )}
                    {stop.notes && (
                      <span className="text-zinc-400 block truncate" title={stop.notes}>
                        {stop.notes}
                      </span>
                    )}
                    {!stop.exceptionReason && !stop.notes && <span className="text-zinc-600">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Table Footer */}
      <div className="p-3 bg-zinc-950/60 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
        <span>Showing {stops.length} of {totalRawStops} records</span>
        <span className="font-mono text-[11px]">SpeedX OpsBridge Engine</span>
      </div>
    </div>
  );
}
