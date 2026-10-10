import React from 'react';
import { Package, CheckCircle2, AlertOctagon, MapPin, AlertTriangle } from 'lucide-react';

export function MetricHeader({ metrics }) {
  const cards = [
    {
      label: 'Total Scanned',
      value: metrics.total,
      icon: Package,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10',
      borderColor: 'border-sky-500/20'
    },
    {
      label: 'Delivered / In Transit',
      value: metrics.completed,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20'
    },
    {
      label: 'Failed / Return Stops',
      value: metrics.failed,
      icon: AlertOctagon,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20'
    },
    {
      label: 'Address Corrections',
      value: metrics.needsAddressCorrection,
      icon: AlertTriangle,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20'
    },
    {
      label: 'Postal Zones',
      value: metrics.uniqueZipCodes,
      icon: MapPin,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div
            key={i}
            className={`flex items-center gap-3 p-3.5 rounded-xl border ${card.bgColor} ${card.borderColor} bg-zinc-900/60 backdrop-blur-sm transition-all hover:bg-zinc-800/80`}
          >
            <div className={`p-2.5 rounded-lg ${card.bgColor} ${card.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight text-white">{card.value}</div>
              <div className="text-xs font-medium text-zinc-400">{card.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
