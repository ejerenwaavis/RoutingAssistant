/**
 * Universal Smart Textarea Parser for SpeedX OpsBridge
 * Parses raw clipboard DOM tokens into normalized StandardStop records.
 */

const {
  TRACKING_REGEX,
  GLOBAL_TRACKING_REGEX,
  TIMESTAMP_REGEX,
  DEVIATION_REGEX,
  ZIP_ADDRESS_REGEX,
  SPEEDX_STATUSES,
  KNOWN_EXCEPTION_REASONS
} = require('../constants');

function cleanToken(token) {
  if (!token) return '';
  return token.trim();
}

function isHyphen(token) {
  const t = cleanToken(token);
  return t === '-' || t === '—' || t === '--' || t === 'N/A' || t === 'null';
}

function extractZip(address) {
  if (!address) return '';
  const match = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return match ? match[1] : '';
}

function extractState(address) {
  if (!address) return '';
  const match = address.match(/\b([A-Z]{2})\s+\d{5}\b/i);
  return match ? match[1].toUpperCase() : 'GA';
}

function extractCity(address) {
  if (!address) return '';
  // e.g. "******, ******, MARIETTA, GA 30060" -> "MARIETTA"
  // or "2817 powder springs rd, Apt 1239, Marietta, GA 30064" -> "Marietta"
  const match = address.match(/,\s*([^,]+),\s*[A-Z]{2}\s+\d{5}/i);
  if (match) {
    const city = match[1].replace(/[\*]+/g, '').trim();
    if (city.length > 1) return city;
  }
  return '';
}

/**
 * Parses raw text from SpeedX clipboard copy (both line-separated DOM tokens and tab-delimited TSV).
 * @param {string} rawText
 * @returns {Object} { stops: StandardStop[], stagingDrawer: Array, metrics: Object }
 */
function parseSpeedXText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      stops: [],
      stagingDrawer: [],
      metrics: { total: 0, completed: 0, failed: 0, needsAddressCorrection: 0, uniqueZipCodes: 0 }
    };
  }

  // 1. Check if the input is tab-separated (TSV) from table cell copy
  const rawLines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  
  // If lines contain tabs and multiple tracking numbers across lines
  const hasTabs = rawLines.some(l => l.includes('\t') && TRACKING_REGEX.test(l));
  if (hasTabs) {
    return parseTabSeparatedSpeedX(rawLines);
  }

  // 2. Tokenized DOM parsing (Newline-separated tokens)
  return parseDomTokens(rawLines);
}

/**
 * Parser for DOM token sequences (newline-delimited cells from browser Ctrl+A / Ctrl+C)
 */
function parseDomTokens(lines) {
  const stops = [];
  const stagingDrawer = [];

  // Find all anchor tracking lines
  const anchorIndices = [];
  lines.forEach((line, index) => {
    const match = line.match(TRACKING_REGEX);
    if (match) {
      anchorIndices.push({
        index,
        trackingNo: match[1]
      });
    }
  });

  if (anchorIndices.length === 0) {
    // No tracking anchors found; isolate all lines to staging drawer
    lines.forEach((line, idx) => {
      stagingDrawer.push({ lineIndex: idx + 1, content: line, reason: 'No tracking barcode anchor found' });
    });
    return {
      stops: [],
      stagingDrawer,
      metrics: { total: 0, completed: 0, failed: 0, needsAddressCorrection: 0, uniqueZipCodes: 0 }
    };
  }

  // Anything before the first tracking record's sequence number is header noise/staging
  const firstSeqIndex = (anchorIndices[0].index > 0 && /^\d+$/.test(lines[anchorIndices[0].index - 1]))
    ? anchorIndices[0].index - 1
    : anchorIndices[0].index;

  for (let i = 0; i < firstSeqIndex; i++) {
    stagingDrawer.push({ lineIndex: i + 1, content: lines[i], reason: 'Header/Noise before first record' });
  }

  // Process each package record bounded by the tracking anchors
  for (let a = 0; a < anchorIndices.length; a++) {
    const currentAnchor = anchorIndices[a];
    const trackingNo = currentAnchor.trackingNo;
    const trackingIdx = currentAnchor.index;

    // Sequence number: Check line directly preceding tracking ID
    let sequenceNumber = a + 1;
    if (trackingIdx > 0 && /^\d+$/.test(lines[trackingIdx - 1])) {
      sequenceNumber = parseInt(lines[trackingIdx - 1], 10);
    }

    // Determine end boundary for current record
    let recordEndIdx;
    if (a < anchorIndices.length - 1) {
      const nextAnchorIdx = anchorIndices[a + 1].index;
      // If the line before next anchor is a sequence integer, boundary is before that line
      if (nextAnchorIdx > 0 && /^\d+$/.test(lines[nextAnchorIdx - 1])) {
        recordEndIdx = nextAnchorIdx - 1;
      } else {
        recordEndIdx = nextAnchorIdx;
      }
    } else {
      recordEndIdx = lines.length;
    }

    // Extract all tokens belonging to this record
    const recordTokens = lines.slice(trackingIdx + 1, recordEndIdx);

    // Heuristic extraction
    let routeId = '';
    let fleet = '';
    let dsp = '';
    let deviation = '';
    let address = '';
    let unit = '';
    let dropoffLocation = '';
    let completeTime = '';
    let driverName = '';
    let status = 'NEW';
    let exceptionReason = '';
    let driverNotes = '';
    let customerNotes = '';

    let timestampIndex = -1;
    let addressIndex = -1;

    // Scan for timestamp (strong anchor inside the record)
    recordTokens.forEach((token, idx) => {
      if (TIMESTAMP_REGEX.test(token) && timestampIndex === -1) {
        timestampIndex = idx;
        const m = token.match(TIMESTAMP_REGEX);
        completeTime = m ? m[1] : token;
      }
    });

    // Scan for address (contains State & 5-digit zip, or masked address ending with state/zip)
    recordTokens.forEach((token, idx) => {
      if (ZIP_ADDRESS_REGEX.test(token) && addressIndex === -1) {
        addressIndex = idx;
        address = token;
      }
    });

    // Tokens before the address: Route, Fleet, DSP, Deviation
    const preAddressTokens = addressIndex > -1 ? recordTokens.slice(0, addressIndex) : [];
    preAddressTokens.forEach(token => {
      if (/-batch/i.test(token) || /^[A-Z0-9]+-[A-Z0-9]+-(?:batch|MIX|pkg)[A-Z0-9:-]*/i.test(token) || /^[A-Z]-\d{4}-[A-Z]{3}-/i.test(token)) {
        routeId = token;
      } else if (DEVIATION_REGEX.test(token)) {
        deviation = isHyphen(token) ? '' : token;
      } else if (token.includes(' - ') || /Fleet|Corp|LLC/i.test(token)) {
        fleet = token;
      } else if (/^[A-Z]{3,4}$/.test(token) && !dsp) {
        dsp = token;
      }
    });

    // Tokens between address and timestamp: Unit, Dropoff Location
    if (addressIndex > -1 && timestampIndex > addressIndex) {
      const intermediate = recordTokens.slice(addressIndex + 1, timestampIndex);
      if (intermediate.length >= 1) {
        unit = isHyphen(intermediate[0]) ? '' : intermediate[0];
      }
      if (intermediate.length >= 2) {
        dropoffLocation = isHyphen(intermediate[1]) ? '' : intermediate[1];
      }
    }

    // Driver name: immediately follows timestamp
    if (timestampIndex > -1 && timestampIndex + 1 < recordTokens.length) {
      const candidateDriver = recordTokens[timestampIndex + 1];
      if (!isHyphen(candidateDriver) && !SPEEDX_STATUSES.includes(candidateDriver.toUpperCase())) {
        driverName = candidateDriver;
      }
    }

    // Tokens after driver: DNR, Risk, Bad POD, Status, Exception, Notes
    const postDriverStart = timestampIndex > -1 ? timestampIndex + 2 : 0;
    const postDriverTokens = recordTokens.slice(postDriverStart);

    const remainingNotes = [];
    postDriverTokens.forEach(token => {
      const upper = token.toUpperCase();
      if (SPEEDX_STATUSES.includes(upper)) {
        status = upper;
      } else if (KNOWN_EXCEPTION_REASONS.some(k => token.toLowerCase().includes(k.toLowerCase())) ||
                 /No Access|Invalid Address|Business Closed|breakdown|Customer Not Available/i.test(token)) {
        exceptionReason = token;
        status = 'FAILED ATTEMPT';
      } else if (!isHyphen(token) && token !== 'No' && token !== 'Yes') {
        remainingNotes.push(token);
      }
    });

    if (remainingNotes.length === 1) {
      driverNotes = remainingNotes[0];
    } else if (remainingNotes.length >= 2) {
      driverNotes = remainingNotes[0];
      customerNotes = remainingNotes.slice(1).join(' | ');
    }

    const zipCode = extractZip(address);
    const state = extractState(address);
    const city = extractCity(address);

    const stop = {
      stopNumber: sequenceNumber,
      trackingNo,
      routeId: routeId || 'SPEEDX-ROUTE',
      fleet: fleet || '',
      dsp: dsp || '',
      deviation: deviation || '',
      address: address || '',
      unit: unit || '',
      dropoffLocation: dropoffLocation || '',
      city: city || 'MARIETTA',
      state: state || 'GA',
      zipCode: zipCode ? zipCode.padStart(5, '0') : '',
      country: 'US',
      recipientName: '',
      recipientPhone: '',
      driverName: driverName || '',
      status: status || 'NEW',
      exceptionReason: exceptionReason || '',
      notes: [dropoffLocation ? `Dropoff: ${dropoffLocation}` : '', driverNotes, customerNotes].filter(Boolean).join(' | '),
      completeTime: completeTime || ''
    };

    stops.push(stop);
  }

  // Calculate live metrics
  const metrics = calculateMetrics(stops);

  return {
    stops,
    stagingDrawer,
    metrics
  };
}

/**
 * Parser for tab-separated (TSV) clipboard copies
 */
function parseTabSeparatedSpeedX(lines) {
  const stops = [];
  const stagingDrawer = [];

  lines.forEach((line, lineIndex) => {
    const cells = line.split('\t').map(c => c.trim());
    const trackingCellIdx = cells.findIndex(c => TRACKING_REGEX.test(c));

    if (trackingCellIdx === -1) {
      stagingDrawer.push({ lineIndex: lineIndex + 1, content: line, reason: 'No tracking number in TSV row' });
      return;
    }

    const trackingNo = cells[trackingCellIdx].match(TRACKING_REGEX)[1];
    const seq = trackingCellIdx > 0 && /^\d+$/.test(cells[0]) ? parseInt(cells[0], 10) : stops.length + 1;
    
    // Look through cells
    let address = '';
    let routeId = '';
    let driverName = '';
    let status = 'NEW';
    let exceptionReason = '';
    let notes = '';
    let completeTime = '';

    cells.forEach(cell => {
      if (ZIP_ADDRESS_REGEX.test(cell) && !address) {
        address = cell;
      } else if (TIMESTAMP_REGEX.test(cell) && !completeTime) {
        completeTime = cell;
      } else if (SPEEDX_STATUSES.includes(cell.toUpperCase())) {
        status = cell.toUpperCase();
      } else if (/No Access|Invalid Address|Business Closed|breakdown|Customer Not Available/i.test(cell)) {
        exceptionReason = cell;
      } else if (/-batch/i.test(cell) || /^[A-Z0-9]+-[A-Z0-9]+-/i.test(cell)) {
        routeId = cell;
      }
    });

    const zipCode = extractZip(address);

    stops.push({
      stopNumber: seq,
      trackingNo,
      routeId: routeId || 'SPEEDX-ROUTE',
      address,
      unit: '',
      city: extractCity(address) || 'MARIETTA',
      state: extractState(address) || 'GA',
      zipCode: zipCode ? zipCode.padStart(5, '0') : '',
      country: 'US',
      recipientName: '',
      recipientPhone: '',
      driverName,
      status,
      exceptionReason,
      notes,
      completeTime
    });
  });

  return {
    stops,
    stagingDrawer,
    metrics: calculateMetrics(stops)
  };
}

function calculateMetrics(stops) {
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

    if (s.zipCode) {
      zipSet.add(s.zipCode);
    }
  });

  return {
    total,
    completed,
    failed,
    needsAddressCorrection,
    uniqueZipCodes: zipSet.size
  };
}

module.exports = {
  parseSpeedXText,
  calculateMetrics
};
