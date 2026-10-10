import * as XLSX from 'xlsx';
import papa from 'papaparse';
import type { Stop } from '../types';

const US_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
]);

const STATE_NAMES: Record<string, string> = {
  'GEORGIA': 'GA', 'FLORIDA': 'FL', 'CALIFORNIA': 'CA', 'TEXAS': 'TX', 'NEW YORK': 'NY',
  'NORTH CAROLINA': 'NC', 'SOUTH CAROLINA': 'SC', 'TENNESSEE': 'TN', 'ALABAMA': 'AL'
};

function normalizeState(s: string): string {
  if (!s) return '';
  const clean = s.trim().toUpperCase().replace(/\.+$/, '');
  if (US_STATES.has(clean)) return clean;
  if (STATE_NAMES[clean]) return STATE_NAMES[clean];
  return clean;
}

export function parseFullAddress(addrStr: string) {
  if (!addrStr || typeof addrStr !== 'string') {
    return { street: '', unit: '', city: '', state: '', zip: '', country: 'US' };
  }

  let raw = addrStr.trim();
  let zip = '';
  let state = '';
  let country = 'US';

  // Match State and Zip at end
  const stateZipRegex = /(?:[\.,\s]+)\b([A-Za-z]{2})\b\.?\s*(\d{5}(?:-\d{4})?)\s*(?:[\.,\s]*(?:US|USA|United States))?\s*$/i;
  const match = raw.match(stateZipRegex);

  let remaining = raw;
  if (match) {
    const cand = match[1].toUpperCase();
    if (US_STATES.has(cand)) {
      state = cand;
      zip = match[2];
      remaining = raw.substring(0, match.index).trim();
    }
  }

  if (!state) {
    const stateOnlyRegex = /(?:[\.,\s]+)\b([A-Za-z]{2})\b\.?\s*(?:[\.,\s]*(?:US|USA|United States))?\s*$/i;
    const sMatch = remaining.match(stateOnlyRegex);
    if (sMatch && US_STATES.has(sMatch[1].toUpperCase())) {
      state = sMatch[1].toUpperCase();
      remaining = remaining.substring(0, sMatch.index).trim();
    }
  }

  if (!zip) {
    const zipMatch = raw.match(/\b(\d{5}(?:-\d{4})?)\b/);
    if (zipMatch) zip = zipMatch[1];
  }

  let tokens = remaining.split(/[\.,]+/).map(t => t.trim()).filter(Boolean);
  let city = '';
  let street = '';
  let unit = '';

  if (tokens.length >= 2) {
    city = tokens[tokens.length - 1];
    street = tokens[0];
    if (tokens.length > 2) {
      unit = tokens.slice(1, tokens.length - 1).join(', ');
    }
  } else if (tokens.length === 1) {
    street = tokens[0];
  }

  if (!unit && street) {
    const unitMatch = street.match(/(.+?)\s+((?:apt|ste|suite|unit|bldg|fl|floor|#|c\/o)\s+[^,]+)/i);
    if (unitMatch) {
      street = unitMatch[1].trim();
      unit = unitMatch[2].trim();
    }
  }

  return { street, unit, city, state: normalizeState(state), zip, country };
}

// Tracking number anchor regex
const TRACK_RE = /\b(SPX[A-Z0-9]{8,}|1LS[A-Z0-9]{10,}|TBA\d{9,}|1Z[A-Z0-9]{16}|\d{12,24})\b/g;
const NOISE_RE = /^(home|dashboard|menu|search|logout|status|driver|zip|actions?|page \d+|showing \d+.*|barcode|address)$/i;

export function parseClipboard(text: string): Stop[] {
  if (!text || !text.trim()) return [];

  const matches = [...text.matchAll(TRACK_RE)];
  if (!matches.length) return [];

  return matches.map((m, idx) => {
    const seg = text.slice(m.index! + m[0].length, matches[idx + 1]?.index ?? text.length);
    const lines = seg.split(/[\n\t\r]+/).map(l => l.trim()).filter(l => l && !NOISE_RE.test(l));

    // Look for address candidate (starts with digit street number or contains road suffix)
    const addrLine = lines.find(l => /^\d+\s+\S+/.test(l) || /\b(?:LN|DR|CT|WAY|CIR|RD|AVE|PKWY|BLVD|ST|STREET)\b/i.test(l)) || lines[0] || '';
    const parsedAddr = parseFullAddress(addrLine);

    // Look for explicit zip in segment
    const zipMatch = seg.match(/\b\d{5}(?:-\d{4})?\b/);
    const zip = zipMatch ? zipMatch[0] : parsedAddr.zip;

    // Look for recipient name candidate (letters only, not noise)
    const nameCandidate = lines.find(l => l !== addrLine && /^[A-Za-z\s'\.-]{3,35}$/.test(l) && !NOISE_RE.test(l)) || '';

    // Look for phone
    const phoneMatch = seg.match(/\+?1?[\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{4}/);
    const phone = phoneMatch ? phoneMatch[0] : '';

    return {
      id: `clip_${idx}_${Date.now()}`,
      seq: idx + 1,
      barcode: m[0],
      recipient: nameCandidate,
      street: parsedAddr.street || addrLine,
      unit: parsedAddr.unit,
      city: parsedAddr.city,
      state: parsedAddr.state,
      zip: zip ? (zip.match(/\d{5}/)?.[0] || zip) : '',
      country: 'US',
      phone,
      notes: m[0],
      status: 'Pending'
    };
  });
}

const HEADER_MAP: Record<string, keyof Stop | 'fullAddress'> = {
  barcode: 'barcode', tracking: 'barcode', trackingnumber: 'barcode', trackingno: 'barcode', packageid: 'barcode', awb: 'barcode',
  seq: 'seq', sequence: 'seq', sequenceno: 'seq', stop: 'seq', stopno: 'seq',
  address: 'fullAddress', address1: 'street', street: 'street', deliveryaddress: 'fullAddress',
  address2: 'unit', unit: 'unit', apt: 'unit', suite: 'unit', ste: 'unit',
  city: 'city', town: 'city',
  state: 'state', province: 'state',
  zip: 'zip', zipcode: 'zip', postal: 'zip', postalcode: 'zip',
  recipient: 'recipient', name: 'recipient', customer: 'recipient', customername: 'recipient',
  phone: 'phone', contact: 'phone', mobile: 'phone',
  notes: 'notes', note: 'notes', comments: 'notes', instructions: 'notes',
  status: 'status', lastevent: 'status'
};

export async function parseFile(file: File): Promise<Stop[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  let rawRows: any[][] = [];

  if (ext === 'xlsx' || ext === 'xls') {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  } else {
    // CSV
    const text = await file.text();
    const cleanText = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
    const res = papa.parse(cleanText, { skipEmptyLines: true });
    rawRows = res.data as any[][];
  }

  if (!rawRows || rawRows.length < 2) return [];

  // Detect header row (first 10 rows)
  let headerRowIdx = 0;
  for (let r = 0; r < Math.min(10, rawRows.length); r++) {
    const row = rawRows[r];
    if (row.some((cell: any) => /barcode|tracking|address|seq|city|zip/i.test(String(cell)))) {
      headerRowIdx = r;
      break;
    }
  }

  const headerRow = rawRows[headerRowIdx].map((c: any) => String(c).trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
  const colMap: Record<string, number> = {};

  headerRow.forEach((col, idx) => {
    for (const [pattern, field] of Object.entries(HEADER_MAP)) {
      if (col.includes(pattern) && colMap[field] === undefined) {
        colMap[field] = idx;
      }
    }
  });

  const dataRows = rawRows.slice(headerRowIdx + 1);
  const stops: Stop[] = [];

  dataRows.forEach((row, i) => {
    if (!row || row.length === 0 || row.every((c: any) => !c)) return;

    const barcode = colMap.barcode !== undefined ? String(row[colMap.barcode] || '').trim() : '';
    const rawSeq = colMap.seq !== undefined ? String(row[colMap.seq] || '').trim() : '';
    const seq = parseFloat(rawSeq) || (i + 1);
    const recipient = colMap.recipient !== undefined ? String(row[colMap.recipient] || '').trim() : '';
    const phone = colMap.phone !== undefined ? String(row[colMap.phone] || '').trim() : '';
    const notes = colMap.notes !== undefined ? String(row[colMap.notes] || '').trim() : '';
    const status = colMap.status !== undefined ? String(row[colMap.status] || '').trim() : 'Pending';

    let street = '';
    let unit = colMap.unit !== undefined ? String(row[colMap.unit] || '').trim() : '';
    let city = colMap.city !== undefined ? String(row[colMap.city] || '').trim() : '';
    let state = colMap.state !== undefined ? normalizeState(String(row[colMap.state] || '')) : '';
    let zip = colMap.zip !== undefined ? String(row[colMap.zip] || '').trim() : '';

    if (colMap.street !== undefined && colMap.city !== undefined) {
      street = String(row[colMap.street] || '').trim();
    } else {
      const fullAddrRaw = colMap.fullAddress !== undefined
        ? String(row[colMap.fullAddress] || '').trim()
        : colMap.street !== undefined
          ? String(row[colMap.street] || '').trim()
          : '';

      const parsed = parseFullAddress(fullAddrRaw);
      street = parsed.street;
      if (!unit) unit = parsed.unit;
      if (!city) city = parsed.city;
      if (!state) state = parsed.state;
      if (!zip) zip = parsed.zip;
    }

    // Clean zip to 5-digit
    const zip5 = (zip.match(/\b\d{5}\b/) || [zip])[0];

    if (street || barcode) {
      stops.push({
        id: `stop_${i}_${Date.now()}`,
        seq,
        barcode: barcode || `STOP-${seq}`,
        recipient: recipient || (barcode ? `Stop ${seq} - ${barcode}` : `Stop ${seq}`),
        street: street || 'Unknown Street',
        unit,
        city,
        state,
        zip: zip5,
        country: 'US',
        phone,
        notes: notes || barcode,
        status
      });
    }
  });

  return stops;
}
