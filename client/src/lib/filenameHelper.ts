import type { ManifestMetadata } from '../types';

/**
 * Extracts a 13-digit millisecond timestamp from an uploaded filename
 * and formats it as a readable date/time (e.g., Oct 9, 2026, 10:23 PM).
 * If no 13-digit timestamp is present, returns null for timestamp and formattedDate.
 */
export function extractTimestampFromFilename(filename: string): ManifestMetadata {
  if (!filename) {
    return {
      rawFilename: '',
      timestamp: null,
      formattedDate: null,
      sourceType: 'file'
    };
  }

  const isClipboard = filename.toLowerCase().includes('clipboard');

  // Look for 13 consecutive digits bounded by non-digits or string boundaries
  const match = filename.match(/(?:^|\D)(\d{13})(?:\D|$)/);
  if (match) {
    const ms = parseInt(match[1], 10);
    // Sanity check: valid timestamp between years 2000 and 2100
    if (!isNaN(ms) && ms >= 946684800000 && ms <= 4102444800000) {
      const date = new Date(ms);
      if (!isNaN(date.getTime())) {
        const formattedDate = date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });

        return {
          rawFilename: filename,
          timestamp: ms,
          formattedDate,
          sourceType: 'file'
        };
      }
    }
  }

  return {
    rawFilename: filename,
    timestamp: null,
    formattedDate: null,
    sourceType: isClipboard ? 'clipboard' : 'file'
  };
}

/**
 * Builds the export CSV filename using the selected zip code(s)
 * plus the current date and time when the export button was clicked.
 * Format: manifest_<zip(s)>_<YYYY-MM-DD_HH-mm>.csv
 * (e.g., manifest_30060_2026-10-10_18-40.csv)
 */
export function buildExportFilename(
  selectedZips: string[],
  totalZipsCount?: number,
  exportDate: Date = new Date()
): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = exportDate.getFullYear();
  const m = pad(exportDate.getMonth() + 1);
  const d = pad(exportDate.getDate());
  const h = pad(exportDate.getHours());
  const min = pad(exportDate.getMinutes());
  const timeStr = `${y}-${m}-${d}_${h}-${min}`;

  const cleanZips = Array.from(new Set(selectedZips))
    .map(z => String(z).trim().replace(/[^a-zA-Z0-9]/g, ''))
    .filter(z => z && z.toLowerCase() !== 'unknown')
    .sort();

  let zipPart = 'all';
  if (cleanZips.length === 1) {
    zipPart = cleanZips[0];
  } else if (cleanZips.length > 1 && cleanZips.length <= 3) {
    zipPart = cleanZips.join('_');
  } else if (cleanZips.length > 3) {
    if (totalZipsCount && cleanZips.length === totalZipsCount) {
      zipPart = 'all';
    } else {
      zipPart = `${cleanZips.slice(0, 3).join('_')}_etc`;
    }
  }

  return `manifest_${zipPart}_${timeStr}.csv`;
}
