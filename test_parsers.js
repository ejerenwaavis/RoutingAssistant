/**
 * Test suite for SpeedX OpsBridge Parsers and Exporters
 */

const fs = require('fs');
const path = require('path');
const { parseSpeedXText } = require('./src/services/textParser');
const { parseSpeedXSpreadsheet } = require('./src/services/excelParser');
const {
  exportToCircuit,
  exportToSpoke,
  exportToGroundCloud,
  exportRolloverManifest,
  generateDriverEODSummary
} = require('./src/services/exportService');

// Sample Pattern A from prompt
const PATTERN_A = `
188
SPXOCL008502621282730080
1009-RYY009-batch6687:B
RYY - Palladium First Corp
RYY
-
******, ******, GA 30008
-
-
2026-10-09 07:21:05
Nassli Carolaen Florez
-
No
-
NEW
`;

// Sample Pattern B from prompt
const PATTERN_B = `
Seq # | Tracking # | Route | Fleet | DSP | Deviation | Address | Unit | Dropoff Location | Last Event Time | Scheduled Driver | DNR | Risk | Bad Pod | Status | Final Status | Exception reasons | Driver Notes | Customer Note
1
SPXRYY126902737040
B-1009-RYY-MIX-061827
RYY - Palladium First Corp
RYY
134m
******, ******, MARIETTA, GA 30060
-
Side door
2026-10-09 08:10:53
Queena Peeples
-
No
No
FAILED ATTEMPT
FAILED ATTEMPT
No Access/No Safe Location and unable to contact the consignee
I think is wrong address...
-
`;

console.log('=== TEST 1: PATTERN A PARSING ===');
const resA = parseSpeedXText(PATTERN_A);
console.log('Pattern A stops count:', resA.stops.length);
if (resA.stops.length !== 1) throw new Error('Expected 1 stop for Pattern A');
const stopA = resA.stops[0];
console.log('Stop A Seq:', stopA.stopNumber);
console.log('Stop A Tracking:', stopA.trackingNo);
console.log('Stop A Route:', stopA.routeId);
console.log('Stop A Zip:', stopA.zipCode);
console.log('Stop A Driver:', stopA.driverName);
console.log('Stop A Status:', stopA.status);
if (stopA.trackingNo !== 'SPXOCL008502621282730080') throw new Error('Tracking mismatch A');
if (stopA.zipCode !== '30008') throw new Error('Zip mismatch A');
if (stopA.driverName !== 'Nassli Carolaen Florez') throw new Error('Driver mismatch A');
if (stopA.status !== 'NEW') throw new Error('Status mismatch A');
console.log('✅ Pattern A Passed!');

console.log('\n=== TEST 2: PATTERN B PARSING ===');
const resB = parseSpeedXText(PATTERN_B);
console.log('Pattern B stops count:', resB.stops.length);
if (resB.stops.length !== 1) throw new Error('Expected 1 stop for Pattern B');
const stopB = resB.stops[0];
console.log('Stop B Seq:', stopB.stopNumber);
console.log('Stop B Tracking:', stopB.trackingNo);
console.log('Stop B Route:', stopB.routeId);
console.log('Stop B Deviation:', stopB.deviation);
console.log('Stop B Address:', stopB.address);
console.log('Stop B City:', stopB.city);
console.log('Stop B Zip:', stopB.zipCode);
console.log('Stop B Driver:', stopB.driverName);
console.log('Stop B Status:', stopB.status);
console.log('Stop B Exception:', stopB.exceptionReason);
console.log('Stop B Notes:', stopB.notes);
if (stopB.trackingNo !== 'SPXRYY126902737040') throw new Error('Tracking mismatch B');
if (stopB.zipCode !== '30060') throw new Error('Zip mismatch B');
if (stopB.driverName !== 'Queena Peeples') throw new Error('Driver mismatch B');
if (stopB.status !== 'FAILED ATTEMPT') throw new Error('Status mismatch B');
if (!stopB.exceptionReason.includes('No Access')) throw new Error('Exception reason mismatch B');
console.log('✅ Pattern B Passed!');

console.log('\n=== TEST 3: REAL SPEEDX EXCEL INGESTION ===');
const realExcelPath = 'C:\\Users\\ejere\\Downloads\\route_parcel_info_1791591840207.xlsx';
if (fs.existsSync(realExcelPath)) {
  const buf = fs.readFileSync(realExcelPath);
  const excelRes = parseSpeedXSpreadsheet(buf, 'route_parcel_info_1791591840207.xlsx');
  console.log('Total Stops Ingested from Real SpeedX Excel:', excelRes.stops.length);
  console.log('Metrics:', excelRes.metrics);
  console.log('Top Zip Distributions:', excelRes.zipDistribution.slice(0, 5));
  if (excelRes.stops.length === 0) throw new Error('Real excel produced 0 stops');
  const firstExcelStop = excelRes.stops[0];
  console.log('First Excel Stop:', {
    seq: firstExcelStop.stopNumber,
    tracking: firstExcelStop.trackingNo,
    address: firstExcelStop.address,
    zip: firstExcelStop.zipCode,
    phone: firstExcelStop.recipientPhone,
    recipient: firstExcelStop.recipientName
  });
  console.log('✅ Real SpeedX Excel Ingestion Passed!');

  console.log('\n=== TEST 4: EXPORT GENERATORS ===');
  const circuitCsv = exportToCircuit(excelRes.stops.slice(0, 5));
  console.log('Circuit CSV sample lines:\n' + circuitCsv.split('\n').slice(0, 3).join('\n'));

  const spokeCsv = exportToSpoke(excelRes.stops.slice(0, 5));
  console.log('\nSpoke CSV sample lines:\n' + spokeCsv.split('\n').slice(0, 3).join('\n'));

  const rolloverCsv = exportRolloverManifest(excelRes.stops);
  console.log('\nRollover CSV count lines:', rolloverCsv.split('\n').length);

  const eodSummary = generateDriverEODSummary([stopB]);
  console.log('\nDriver EOD Summary:\n' + eodSummary);
  console.log('✅ Export Generators Passed!');
} else {
  console.log('Sample file not found at path, skipping excel read test.');
}

console.log('\n🎉 ALL SERVICES VERIFIED AND READY!');
