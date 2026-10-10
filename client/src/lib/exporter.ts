import type { Stop, ExportPreset } from '../types';

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCircuitCsv(stops: Stop[]): string {
  const headers = [
    'Stop Number',
    'Address',
    'Address Line 2',
    'Postal Code',
    'Country',
    'Recipient Name',
    'Recipient Phone',
    'Package ID',
    'Notes'
  ];

  const rows = stops.map((s, idx) => [
    idx + 1,
    [s.street, s.city, s.state].filter(Boolean).join(', '),
    s.unit || '',
    s.zip || '',
    s.country || 'US',
    s.recipient || '',
    s.phone || '',
    s.barcode || '',
    s.notes || ''
  ]);

  return [headers.join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\r\n');
}

export function generateRoadWarriorCsv(stops: Stop[]): string {
  const headers = [
    'Name',
    'Street',
    'City',
    'State/Region',
    'Postal',
    'Country',
    'Color (0-1)',
    'Phone',
    'Note',
    'Latitude',
    'Longitude',
    'Service Time'
  ];

  const rows = stops.map(s => [
    s.recipient || s.barcode || `Stop ${s.seq}`,
    [s.street, s.unit].filter(Boolean).join(', '),
    s.city || '',
    s.state || '',
    s.zip || '',
    s.country || 'US',
    '',
    s.phone || '',
    s.barcode ? (s.notes && s.notes !== s.barcode ? `${s.barcode} | ${s.notes}` : s.barcode) : (s.notes || ''),
    '',
    '',
    ''
  ]);

  return [headers.join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\r\n');
}

export function generateRoute4MeCsv(stops: Stop[]): string {
  const headers = ['address', 'Alias'];
  const rows = stops.map(s => {
    const full = [
      [s.street, s.unit].filter(Boolean).join(', '),
      s.city,
      `${s.state} ${s.zip}`.trim(),
      s.country || 'US'
    ].filter(Boolean).join(', ');
    const alias = s.barcode || s.recipient || `Stop ${s.seq}`;
    return [full, alias];
  });

  return [headers.join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\r\n');
}

export function generateGroundCloudCsv(stops: Stop[]): string {
  const headers = [
    'Sequence',
    'Tracking Number',
    'Address 1',
    'Address 2',
    'City',
    'State',
    'Zip',
    'Consignee',
    'Phone',
    'Comments'
  ];

  const rows = stops.map((s, idx) => [
    idx + 1,
    s.barcode || '',
    s.street || '',
    s.unit || '',
    s.city || '',
    s.state || '',
    s.zip || '',
    s.recipient || '',
    s.phone || '',
    s.notes || ''
  ]);

  return [headers.join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\r\n');
}

import { buildExportFilename } from './filenameHelper';

export function exportManifest(
  preset: ExportPreset,
  stops: Stop[],
  selectedZips?: string[],
  totalZipsCount?: number
): string {
  let content = '';

  switch (preset) {
    case 'circuit':
      content = generateCircuitCsv(stops);
      break;
    case 'roadwarrior':
      content = generateRoadWarriorCsv(stops);
      break;
    case 'route4me':
      content = generateRoute4MeCsv(stops);
      break;
    case 'groundcloud':
      content = generateGroundCloudCsv(stops);
      break;
  }

  // Determine ZIP codes from passed selectedZips or from filtered stops
  const zipsToUse = selectedZips && selectedZips.length > 0
    ? selectedZips
    : Array.from(new Set(stops.map(s => s.zip).filter(Boolean)));

  // Always use the current date and time when the export button is clicked
  const filename = buildExportFilename(zipsToUse, totalZipsCount, new Date());

  downloadCsv(filename, content);
  return filename;
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
