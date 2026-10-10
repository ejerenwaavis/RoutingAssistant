import React, { useState } from 'react';
import { Search, Copy, Check, Hash, MapPin, Barcode, User } from 'lucide-react';
import type { Stop } from '../types';

interface StopsTableProps {
  stops: Stop[];
}

export const StopsTable: React.FC<StopsTableProps> = ({ stops }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = stops.filter(s => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      s.barcode.toLowerCase().includes(q) ||
      s.street.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      s.zip.toLowerCase().includes(q) ||
      s.recipient.toLowerCase().includes(q) ||
      String(s.seq).includes(q)
    );
  });

  const handleCopyBarcode = (barcode: string) => {
    navigator.clipboard.writeText(barcode);
    setCopiedId(barcode);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
            Filtered Stops Preview ({filtered.length} of {stops.length})
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Review stops before generating manifests for drivers.
          </p>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-64">
          <Search className="h-3.5 w-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search address, tracking, zip..."
            className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>

      {/* Table Container with Controlled Height */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/60 max-h-[360px] overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-zinc-900/90 text-zinc-400 sticky top-0 z-10 border-b border-zinc-800 font-medium">
            <tr>
              <th className="py-2.5 px-3 w-16">Stop #</th>
              <th className="py-2.5 px-3">Tracking ID</th>
              <th className="py-2.5 px-3">Address</th>
              <th className="py-2.5 px-3 w-24">Zip</th>
              <th className="py-2.5 px-3">Recipient</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-300">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-zinc-500 font-sans">
                  No matching stops found.
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-900/60 transition-colors">
                  <td className="py-2 px-3 font-semibold text-emerald-400">
                    {s.seq}
                  </td>
                  <td className="py-2 px-3 text-zinc-200">
                    <div className="flex items-center gap-1.5 group">
                      <span className="truncate max-w-[140px]">{s.barcode}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyBarcode(s.barcode)}
                        className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-200 transition-opacity p-0.5"
                        title="Copy Tracking ID"
                      >
                        {copiedId === s.barcode ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-2 px-3 font-sans text-zinc-200">
                    <div className="leading-tight">
                      <div>
                        {s.street} {s.unit && <span className="text-emerald-400/90 font-medium">({s.unit})</span>}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {s.city}{s.city && s.state ? ', ' : ''}{s.state}
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-3 font-semibold text-zinc-300">
                    {s.zip}
                  </td>
                  <td className="py-2 px-3 font-sans text-zinc-400 truncate max-w-[150px]">
                    {s.recipient || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
