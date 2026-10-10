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
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Manifest Preview ({filtered.length} of {stops.length} stops)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time preview of partitioned stops ready for export.
          </p>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search address, tracking, zip, recipient..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* Table Container with Controlled Height */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-[380px] overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-50 text-slate-700 sticky top-0 z-10 border-b border-slate-200 font-semibold">
            <tr>
              <th className="py-2.5 px-3.5 w-16 text-slate-900">Stop #</th>
              <th className="py-2.5 px-3.5">Tracking ID</th>
              <th className="py-2.5 px-3.5">Address</th>
              <th className="py-2.5 px-3.5 w-24">Zip</th>
              <th className="py-2.5 px-3.5">Recipient</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-400 font-medium">
                  No matching stops found for "{searchTerm}".
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3.5 font-bold font-mono text-blue-600">
                    {s.seq}
                  </td>
                  <td className="py-2.5 px-3.5">
                    <div className="flex items-center gap-1.5 group">
                      <span className="font-mono text-slate-800 font-semibold truncate max-w-[150px]">{s.barcode}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyBarcode(s.barcode)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 transition-opacity p-0.5 cursor-pointer"
                        title="Copy Tracking ID"
                      >
                        {copiedId === s.barcode ? (
                          <Check className="h-3.5 w-3.5 text-blue-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-2.5 px-3.5 text-slate-900">
                    <div className="leading-tight">
                      <div className="font-medium">
                        {s.street} {s.unit && <span className="text-blue-700 font-bold">({s.unit})</span>}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {s.city}{s.city && s.state ? ', ' : ''}{s.state}
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3.5 font-mono font-bold text-slate-800">
                    {s.zip}
                  </td>
                  <td className="py-2.5 px-3.5 text-slate-600 truncate max-w-[150px]">
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
