const fs = require('fs');
const path = require('path');
const papa = require('papaparse');
const XLSX = require('xlsx');

// State abbreviation list for validation
const US_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
]);

// Header matching regex definitions
const HEADER_PATTERNS = {
  barcode: [/barcode/i, /^tracking/i, /tracking.*no/i, /tracking.*number/i, /package.*id/i, /piece.*id/i, /waybill/i, /awb/i, /label/i, /carton/i],
  sequence: [/^seq/i, /seq.*no/i, /sequence/i, /stop.*no/i, /stop.*num/i, /^stop$/i, /order/i, /index/i, /drop/i],
  fullAddress: [/full.*addr/i, /^address$/i, /delivery.*addr/i, /destination.*addr/i, /ship.*to.*addr/i, /street.*addr/i, /^location$/i],
  street: [/street/i, /address.*1/i, /addr.*1/i, /line.*1/i, /^address$/i],
  street2: [/address.*2/i, /addr.*2/i, /line.*2/i, /unit/i, /apt/i, /suite/i, /ste/i, /bldg/i, /floor/i],
  city: [/city/i, /town/i, /municipality/i],
  state: [/state/i, /province/i, /^st$/i, /region/i],
  zipCode: [/zip/i, /postal/i, /postcode/i, /zipcode/i],
  country: [/country/i, /nation/i],
  name: [/recipient/i, /customer.*name/i, /customer/i, /consignee/i, /addressee/i, /^name$/i],
  phone: [/phone/i, /tel/i, /mobile/i, /contact/i],
  status: [/status/i, /^last.*event$/i, /event/i, /state/i, /delivery.*status/i],
  notes: [/note/i, /notes/i, /instruction/i, /remark/i, /comment/i, /gate.*code/i]
};

/**
 * Parses full address text into components: street, street2, city, state, zipCode, country
 */
function parseFullAddress(addrStr) {
  if (!addrStr || typeof addrStr !== 'string') {
    return { street: '', street2: '', city: '', state: '', zipCode: '', country: 'US' };
  }

  let raw = addrStr.trim();
  let zipCode = '';
  let state = '';
  let country = 'US';

  // 1. Match State and 5-digit / ZIP+4 at the end
  // Handles: "GA. 30024", "GA 30024-1596", "GA, 30024", "GA. 30024-1622", "GA 30024"
  const stateZipRegex = /(?:[\.,\s]+)\b([A-Za-z]{2})\b\.?\s*(\d{5}(?:-\d{4})?)\s*(?:[\.,\s]*(?:US|USA|United States))?\s*$/i;
  const match = raw.match(stateZipRegex);

  let remaining = raw;
  if (match) {
    const candidateState = match[1].toUpperCase();
    if (US_STATES.has(candidateState)) {
      state = candidateState;
      zipCode = match[2];
      remaining = raw.substring(0, match.index).trim();
    }
  }

  // Fallback: If zip wasn't captured, try finding 5-digit zip anywhere near the end
  if (!zipCode) {
    const zipOnlyRegex = /\b(\d{5}(?:-\d{4})?)\b/g;
    let m;
    let lastZip = null;
    while ((m = zipOnlyRegex.exec(raw)) !== null) {
      lastZip = m;
    }
    if (lastZip) {
      zipCode = lastZip[1];
    }
  }

  // 2. Tokenize remaining address by dot or comma
  let tokens = remaining
    .split(/[\.,]+/)
    .map(t => t.trim())
    .filter(Boolean);

  let city = '';
  let street = '';
  let street2 = '';

  if (tokens.length >= 2) {
    // Last token before state is typically city
    city = tokens[tokens.length - 1];

    const streetTokens = tokens.slice(0, tokens.length - 1);
    street = streetTokens[0] || '';

    if (streetTokens.length > 1) {
      street2 = streetTokens.slice(1).join(', ');
    }
  } else if (tokens.length === 1) {
    // Single unseparated string: attempt comma or whitespace split
    const commaParts = tokens[0].split(',').map(p => p.trim()).filter(Boolean);
    if (commaParts.length >= 2) {
      street = commaParts[0];
      city = commaParts[commaParts.length - 1];
      if (commaParts.length > 2) {
        street2 = commaParts.slice(1, commaParts.length - 1).join(', ');
      }
    } else {
      street = tokens[0];
    }
  }

  // 3. Clean up unit/apt embedded inside street if street2 is empty
  if (!street2) {
    const unitMatch = street.match(/(.+?)\s+((?:apt|ste|suite|unit|bldg|fl|floor|#|c\/o)\s+[^,]+)/i);
    if (unitMatch) {
      street = unitMatch[1].trim();
      street2 = unitMatch[2].trim();
    }
  }

  return {
    street: street || 'Unknown Street',
    street2: street2 || '',
    city: city || '',
    state: state || '',
    zipCode: zipCode || '',
    country: country
  };
}

/**
 * Reads a spreadsheet (.xlsx, .xls) or CSV into a 2D array of rows
 */
function readRowsFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.xlsx' || ext === '.xls') {
    const workbook = XLSX.readFile(filePath, { cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  }

  // Default: Read as CSV via PapaParse
  const content = fs.readFileSync(filePath, 'utf8');
  // Strip BOM if present
  const cleanContent = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;
  const parsed = papa.parse(cleanContent, {
    skipEmptyLines: true,
    dynamicTyping: false
  });
  return parsed.data || [];
}

/**
 * Analyzes rows to determine header row and column mappings
 */
function detectSchema(rows) {
  if (!rows || rows.length === 0) {
    throw new Error('File contains no rows');
  }

  let headerRowIndex = 0;
  let maxScore = -1;

  // Scan first 10 rows to detect which row looks most like a header
  const scanLimit = Math.min(10, rows.length);
  for (let r = 0; r < scanLimit; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;

    let score = 0;
    for (const cell of row) {
      const val = String(cell || '').trim();
      for (const key of Object.keys(HEADER_PATTERNS)) {
        if (HEADER_PATTERNS[key].some(rx => rx.test(val))) {
          score++;
          break;
        }
      }
    }

    if (score > maxScore) {
      maxScore = score;
      headerRowIndex = r;
    }
  }

  const headerRow = rows[headerRowIndex].map(c => String(c || '').trim());
  const mapping = {};

  // Map columns based on header names
  headerRow.forEach((colName, idx) => {
    for (const [key, patterns] of Object.entries(HEADER_PATTERNS)) {
      if (mapping[key] === undefined && patterns.some(rx => rx.test(colName))) {
        mapping[key] = idx;
      }
    }
  });

  // Value-based heuristics for unmapped critical columns
  const dataRows = rows.slice(headerRowIndex + 1, headerRowIndex + 11);

  if (mapping.barcode === undefined) {
    // Look for column containing barcode/tracking numbers
    for (let col = 0; col < headerRow.length; col++) {
      const matchCount = dataRows.filter(r => /^(?:1LS|SPX|C1|D1|TBA|[A-Z0-9]{10,35})$/i.test(String(r[col] || '').trim())).length;
      if (matchCount >= 2) {
        mapping.barcode = col;
        break;
      }
    }
  }

  if (mapping.sequence === undefined) {
    // Look for numeric/sequence column
    for (let col = 0; col < headerRow.length; col++) {
      if (col === mapping.barcode) continue;
      const matchCount = dataRows.filter(r => /^\d+(?:\.\d+)?$/.test(String(r[col] || '').trim())).length;
      if (matchCount >= 3) {
        mapping.sequence = col;
        break;
      }
    }
  }

  if (mapping.fullAddress === undefined && mapping.street === undefined) {
    // Look for address column
    for (let col = 0; col < headerRow.length; col++) {
      if (col === mapping.barcode || col === mapping.sequence) continue;
      const matchCount = dataRows.filter(r => {
        const val = String(r[col] || '');
        return /\b(?:LN|DR|CT|WAY|CIR|RD|AVE|TRCE|PKWY|BLVD|ST|STREET|ROAD)\b/i.test(val) ||
               /\b[A-Z]{2}\b\.?\s*\d{5}/i.test(val);
      }).length;
      if (matchCount >= 2) {
        mapping.fullAddress = col;
        break;
      }
    }
  }

  return { headerRowIndex, headerRow, mapping };
}

/**
 * Universal manifest parser: processes any logistics manifest into normalized stop objects
 */
async function parseManifest(filePath, options = {}, allBrands = []) {
  const rows = readRowsFromFile(filePath);
  if (!rows || rows.length < 2) {
    throw new Error('Insufficient rows in manifest (file is empty or has only header)');
  }

  const { headerRowIndex, mapping } = detectSchema(rows);
  const dataRows = rows.slice(headerRowIndex + 1);

  // Check if status column has populated values
  let statusHasValues = false;
  if (mapping.status !== undefined) {
    statusHasValues = dataRows.some(r => String(r[mapping.status] || '').trim().length > 0);
  }

  const addresses = [];
  const errors = [];
  let totalRecords = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row || row.length === 0 || row.every(cell => !cell)) {
      continue;
    }
    totalRecords++;

    const barcode = mapping.barcode !== undefined ? String(row[mapping.barcode] || '').trim() : '';
    const seq = mapping.sequence !== undefined ? String(row[mapping.sequence] || '').trim() : String(i + 1);
    const rawStatus = mapping.status !== undefined ? String(row[mapping.status] || '').trim() : '';
    const rawName = mapping.name !== undefined ? String(row[mapping.name] || '').trim() : '';
    const phone = mapping.phone !== undefined ? String(row[mapping.phone] || '').trim() : '';
    const notes = mapping.notes !== undefined ? String(row[mapping.notes] || '').trim() : '';

    // Status filtering logic
    if (statusHasValues && (options.loaded || options.attempted || options.delivered)) {
      const normStatus = rawStatus.toUpperCase();
      let matchFilter = false;

      if (options.loaded && (normStatus.includes('LOAD') || normStatus.includes('SCAN') || normStatus.includes('NEW') || normStatus.includes('OUT_FOR_DELIVERY') || normStatus.includes('IN_TRANSIT') || normStatus === '')) {
        matchFilter = true;
      }
      if (options.attempted && (normStatus.includes('ATTEMPT') || normStatus.includes('FAIL') || normStatus.includes('UNDELIVER') || normStatus.includes('EXCEPTION'))) {
        matchFilter = true;
      }
      if (options.delivered && (normStatus.includes('DELIVER') || normStatus.includes('COMPLETE') || normStatus.includes('POD'))) {
        matchFilter = true;
      }

      if (!matchFilter) {
        continue; // Skip stop based on user-selected status filter
      }
    }

    // Address extraction
    let street = '';
    let street2 = '';
    let city = '';
    let state = '';
    let zipCode = '';
    let country = 'US';

    if (mapping.street !== undefined && mapping.city !== undefined) {
      // Manifest has discrete address columns
      street = String(row[mapping.street] || '').trim();
      street2 = mapping.street2 !== undefined ? String(row[mapping.street2] || '').trim() : '';
      city = String(row[mapping.city] || '').trim();
      state = mapping.state !== undefined ? String(row[mapping.state] || '').trim().toUpperCase() : '';
      zipCode = mapping.zipCode !== undefined ? String(row[mapping.zipCode] || '').trim() : '';
      country = mapping.country !== undefined ? String(row[mapping.country] || '').trim().toUpperCase() || 'US' : 'US';
    } else {
      // Manifest has combined address column
      const fullAddrRaw = mapping.fullAddress !== undefined
        ? String(row[mapping.fullAddress] || '').trim()
        : mapping.street !== undefined
          ? String(row[mapping.street] || '').trim()
          : '';

      const parsedAddr = parseFullAddress(fullAddrRaw);
      street = parsedAddr.street;
      street2 = mapping.street2 !== undefined ? String(row[mapping.street2] || '').trim() : parsedAddr.street2;
      city = mapping.city !== undefined ? String(row[mapping.city] || '').trim() : parsedAddr.city;
      state = mapping.state !== undefined ? String(row[mapping.state] || '').trim().toUpperCase() : parsedAddr.state;
      zipCode = mapping.zipCode !== undefined ? String(row[mapping.zipCode] || '').trim() : parsedAddr.zipCode;
      country = parsedAddr.country;
    }

    if (!street || street === 'Unknown Street') {
      errors.push({
        name: rawName || barcode || `Stop ${seq}`,
        line: i + headerRowIndex + 2,
        fullAddress: 'Missing or unparseable address'
      });
      continue;
    }

    // Brand matching via barcode prefix
    let brandName = '## Unregistered Brand ##';
    if (barcode && Array.isArray(allBrands) && allBrands.length > 0) {
      const prefix = barcode.substring(0, 7);
      const foundBrand = allBrands.find(b => Array.isArray(b.trackingPrefixes) && b.trackingPrefixes.includes(prefix));
      if (foundBrand) {
        brandName = foundBrand._id;
      }
    }

    const fullStreet = street2 ? `${street}, ${street2}` : street;
    const name = rawName || `Stop ${seq} - ${barcode || 'Pkg'}`;

    // Structure stop object with full compatibility for both legacy views and React
    const stopObj = {
      seq: seq,
      barcode: barcode,
      Barcode: barcode,
      name: name,
      Name: name,
      street: fullStreet,
      Street: fullStreet,
      street1: street,
      street2: street2,
      city: city,
      City: city,
      state: state,
      State: state,
      zipCode: zipCode,
      Postal: zipCode,
      country: country,
      Country: country,
      phone: phone,
      Phone: phone,
      notes: notes,
      Note: barcode ? (notes ? `${barcode} | ${notes}` : barcode) : notes,
      status: rawStatus,
      brand: brandName,
      Brand: brandName,
      'Color (0-1)': '',
      Latitude: '',
      Longitude: '',
      'Service Time': ''
    };

    addresses.push(stopObj);
  }

  if (addresses.length === 0) {
    throw new Error('No valid delivery stops could be extracted from this manifest.');
  }

  return {
    addresses,
    errors,
    totalRecords,
    summary: {
      totalRead: totalRecords,
      validStops: addresses.length,
      skippedErrors: errors.length
    }
  };
}

module.exports = {
  parseManifest,
  detectSchema,
  parseFullAddress
};
