/**
 * SpeedX Spreadsheet Ingestion & Normalizer (XLSX / CSV)
 * Reads 30-column SpeedX manifests, normalizes into StandardStop[],
 * and compiles dynamic postal code aggregations.
 */

const xlsx = require('xlsx');
const papa = require('papaparse');
const { calculateMetrics } = require('./textParser');

function cleanString(val) {
  if (val === null || val === undefined) return '';
  const s = String(val).trim();
  if (s === 'NaN' || s === 'null' || s === 'undefined' || s === '-' || s === '—') return '';
  return s;
}

function cleanZip(val) {
  if (!val) return '';
  let str = String(val).trim();
  // Strip decimals if parsed as float (e.g., 30064.0)
  if (str.includes('.')) {
    str = str.split('.')[0];
  }
  // Extract 5 digits
  const match = str.match(/\b\d{5}\b/);
  if (match) return match[0];
  return str.padStart(5, '0');
}

function cleanPhone(val) {
  if (!val) return '';
  let str = String(val).trim();
  if (str === '-' || str === 'NaN') return '';
  // Remove trailing .0 from float parsing
  if (str.endsWith('.0')) {
    str = str.slice(0, -2);
  }
  return str;
}

/**
 * Normalizes a raw row object from SpeedX spreadsheet into StandardStop
 */
function normalizeSpeedXRow(row, index) {
  const trackingNo = cleanString(row.TrackingNo || row['Tracking No'] || row.trackingNo || row.TrackingNumber);
  const route = cleanString(row.Route || row.route || row.RouteId);
  const seq = parseInt(cleanString(row.Sequence || row.sequence || row.Seq), 10) || (index + 1);
  const address = cleanString(row.Address || row.address);
  const unit = cleanString(row.Unit || row.unit || row.Apt);
  const zipCode = cleanZip(row.ZipCode || row.zipCode || row.Zip || row.PostalCode);
  const recipientName = cleanString(row.RecipientName || row.recipientName || row.CustomerName);
  const recipientPhone = cleanPhone(row.RecipientPhone || row.recipientPhone || row.Phone);
  const status = cleanString(row.FinalStatus || row.Status || row.status || 'NEW');
  const completeTime = cleanString(row.CompleteTime || row.completeTime || row['sync time']);
  const driverName = cleanString(row.DriverName || row.driverName || row.ScheduledDriver);
  const exceptionReason = cleanString(row.ExceptionReason || row.exceptionReason || row['mis-sort route']);
  const driverNotes = cleanString(row.DriverNotes || row.driverNotes || row.CustomerNote);

  // Parse state & city from address
  let city = 'MARIETTA';
  let state = 'GA';
  if (address) {
    const cityMatch = address.match(/,\s*([^,]+),\s*[A-Z]{2}\s+\d{5}/i);
    if (cityMatch && cityMatch[1].trim().length > 1) {
      city = cityMatch[1].trim();
    }
    const stateMatch = address.match(/\b([A-Z]{2})\s+\d{5}\b/i);
    if (stateMatch) {
      state = stateMatch[1].toUpperCase();
    }
  }

  return {
    stopNumber: seq,
    trackingNo,
    routeId: route || 'SPEEDX-ROUTE',
    address,
    unit,
    city,
    state,
    zipCode,
    country: 'US',
    recipientName,
    recipientPhone,
    driverName,
    status: status || 'NEW',
    exceptionReason,
    notes: driverNotes || '',
    completeTime
  };
}

/**
 * Ingests a Buffer or file path representing an Excel (.xlsx/.xls) or CSV workbook
 * @param {Buffer|string} input Buffer or filepath
 * @param {string} filename original filename for format sniffing
 */
function parseSpeedXSpreadsheet(input, filename = '') {
  let rawRows = [];

  const isCsv = filename.toLowerCase().endsWith('.csv');

  if (isCsv) {
    const textContent = Buffer.isBuffer(input) ? input.toString('utf-8') : input;
    const parsed = papa.parse(textContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false
    });
    rawRows = parsed.data;
  } else {
    // Read XLSX with sheetjs
    const workbook = xlsx.read(input, {
      type: Buffer.isBuffer(input) ? 'buffer' : 'file',
      cellDates: true,
      raw: false // formatted strings preserve leading zeros & date strings
    });

    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    rawRows = xlsx.utils.sheet_to_json(worksheet, {
      defval: '',
      raw: false
    });
  }

  const stops = [];
  rawRows.forEach((row, idx) => {
    // Skip empty or non-tracking rows
    const tracking = row.TrackingNo || row['Tracking No'] || row.trackingNo || row.TrackingNumber;
    if (tracking && String(tracking).trim().length > 5) {
      stops.push(normalizeSpeedXRow(row, idx));
    }
  });

  // Compile Dynamic Postal Aggregator
  const zipDistribution = aggregateZipCodes(stops);

  return {
    stops,
    zipDistribution,
    metrics: calculateMetrics(stops)
  };
}

/**
 * Groups stops by Zip Code and calculates distribution
 * @param {Array} stops
 * @returns {Array} Array of { zipCode, count, routeIds } sorted by count descending
 */
function aggregateZipCodes(stops) {
  const zipMap = {};

  stops.forEach(stop => {
    const zip = stop.zipCode || 'UNKNOWN';
    if (!zipMap[zip]) {
      zipMap[zip] = {
        zipCode: zip,
        count: 0,
        routes: new Set()
      };
    }
    zipMap[zip].count++;
    if (stop.routeId) {
      zipMap[zip].routes.add(stop.routeId);
    }
  });

  return Object.values(zipMap)
    .map(entry => ({
      zipCode: entry.zipCode,
      count: entry.count,
      routeIds: Array.from(entry.routes)
    }))
    .sort((a, b) => b.count - a.count);
}

module.exports = {
  parseSpeedXSpreadsheet,
  normalizeSpeedXRow,
  aggregateZipCodes
};
