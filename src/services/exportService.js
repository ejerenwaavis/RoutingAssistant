/**
 * Navigation & Manifest Export Service
 * Generates Circuit, Spoke, GroundCloud CSVs, Rollover Manifests, and Driver EOD summaries.
 */

const papa = require('papaparse');
const { EXPORT_HEADERS } = require('../constants');

/**
 * Generates Circuit-compatible CSV
 */
function exportToCircuit(stops) {
  const data = stops.map((s, idx) => ({
    'Stop Number': s.stopNumber || idx + 1,
    'Address': s.address || '',
    'Address Line 2': s.unit || '',
    'Postal Code': s.zipCode || '',
    'Country': s.country || 'US',
    'Recipient Name': s.recipientName || '',
    'Recipient Phone': s.recipientPhone || '',
    'Package ID': s.trackingNo || '',
    'Notes': s.notes || s.exceptionReason || ''
  }));

  return papa.unparse({
    fields: EXPORT_HEADERS.circuit,
    data
  });
}

/**
 * Generates Spoke-compatible CSV
 */
function exportToSpoke(stops) {
  const data = stops.map((s, idx) => ({
    'Stop': s.stopNumber || idx + 1,
    'Address': s.address || '',
    'City': s.city || 'MARIETTA',
    'State': s.state || 'GA',
    'Zip': s.zipCode || '',
    'Tracking': s.trackingNo || '',
    'Customer Name': s.recipientName || '',
    'Phone': s.recipientPhone || '',
    'Notes': [s.unit ? `Unit: ${s.unit}` : '', s.notes].filter(Boolean).join(' | ')
  }));

  return papa.unparse({
    fields: EXPORT_HEADERS.spoke,
    data
  });
}

/**
 * Generates GroundCloud-compatible CSV
 */
function exportToGroundCloud(stops) {
  const data = stops.map((s, idx) => ({
    'Stop Number': s.stopNumber || idx + 1,
    'Address': s.address || '',
    'Unit': s.unit || '',
    'Postal Code': s.zipCode || '',
    'Recipient Name': s.recipientName || '',
    'Phone': s.recipientPhone || '',
    'Tracking': s.trackingNo || '',
    'Notes': s.notes || ''
  }));

  return papa.unparse({
    fields: EXPORT_HEADERS.groundCloud,
    data
  });
}

/**
 * Generates Rollover Manifest CSV for next-day re-attempts
 */
function exportRolloverManifest(stops) {
  // Pre-filter only failed attempts, new, or exception parcels
  const rolloverStops = stops.filter(s => {
    const st = (s.status || '').toUpperCase();
    return st === 'FAILED ATTEMPT' || st === 'NEW' || st === 'EXCEPTION' || st === 'RETURNED' || Boolean(s.exceptionReason);
  });

  const data = rolloverStops.map((s, idx) => ({
    'Sequence': idx + 1,
    'TrackingNo': s.trackingNo || '',
    'Route': s.routeId || '',
    'Address': s.address || '',
    'Unit': s.unit || '',
    'ZipCode': s.zipCode || '',
    'PreviousDriver': s.driverName || 'Unassigned',
    'LastStatus': s.status || 'FAILED ATTEMPT',
    'ExceptionReason': s.exceptionReason || 'Needs Re-attempt',
    'DriverNotes': s.notes || '',
    'CustomerNotes': s.dropoffLocation ? `Dropoff: ${s.dropoffLocation}` : ''
  }));

  return papa.unparse({
    fields: EXPORT_HEADERS.rollover,
    data
  });
}

/**
 * Generates Plaintext Driver EOD Accountability Report for WhatsApp / Slack / SMS
 */
function generateDriverEODSummary(stops) {
  const failedStops = stops.filter(s => {
    const st = (s.status || '').toUpperCase();
    return st === 'FAILED ATTEMPT' || st === 'RETURNED' || st === 'EXCEPTION' || Boolean(s.exceptionReason);
  });

  if (failedStops.length === 0) {
    return `✅ SPEEDX EOD DISPATCH SUMMARY\nDate: ${new Date().toLocaleDateString()}\nAll packages cleared! 0 failed delivery attempts recorded.`;
  }

  // Group by driver
  const driverMap = {};
  failedStops.forEach(s => {
    const driver = s.driverName || 'Unassigned Driver';
    if (!driverMap[driver]) {
      driverMap[driver] = [];
    }
    driverMap[driver].push(s);
  });

  const lines = [];
  lines.push(`📊 SPEEDX EOD DRIVER ACCOUNTABILITY REPORT`);
  lines.push(`Date: ${new Date().toISOString().split('T')[0]}`);
  lines.push(`Total Failed/Returned Packages: ${failedStops.length}`);
  lines.push(`Total Drivers Impacted: ${Object.keys(driverMap).length}`);
  lines.push('────────────────────────────────────────');

  for (const [driver, items] of Object.entries(driverMap)) {
    lines.push(`\n👤 ${driver} (${items.length} ${items.length === 1 ? 'package' : 'packages'}):`);
    items.forEach(item => {
      const reason = item.exceptionReason || item.status || 'Failed Attempt';
      const noteStr = item.notes ? ` (Note: ${item.notes})` : '';
      lines.push(`  • ${item.trackingNo} - ${reason}${noteStr}`);
    });
  }

  lines.push('\n────────────────────────────────────────');
  lines.push('Generated via SpeedX OpsBridge');

  return lines.join('\n');
}

module.exports = {
  exportToCircuit,
  exportToSpoke,
  exportToGroundCloud,
  exportRolloverManifest,
  generateDriverEODSummary
};
