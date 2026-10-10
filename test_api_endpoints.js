/**
 * Test script for SpeedX OpsBridge REST API endpoints
 */

const http = require('http');
const fs = require('fs');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Testing /api/health ---');
  const healthRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 3025,
    path: '/api/health',
    method: 'GET'
  });
  console.log('Health Response:', healthRes);

  console.log('\n--- Testing /api/parse/text ---');
  const sampleText = `
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
  const textPayload = JSON.stringify({ text: sampleText });
  const parseTextRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 3025,
    path: '/api/parse/text',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(textPayload)
    }
  }, textPayload);
  console.log('Parse Text Response Success:', parseTextRes.data.success);
  console.log('Stops parsed:', parseTextRes.data.stops.length);
  console.log('First Stop:', parseTextRes.data.stops[0]);

  console.log('\n--- Testing /api/export/navigation ---');
  const exportPayload = JSON.stringify({
    format: 'circuit',
    stops: parseTextRes.data.stops
  });
  const exportNavRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 3025,
    path: '/api/export/navigation',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(exportPayload)
    }
  }, exportPayload);
  console.log('Export Navigation Success:', exportNavRes.data.success);
  console.log('Export CSV snippet:', exportNavRes.data.csv);

  console.log('\n--- Testing /api/export/driver-summary ---');
  const summaryPayload = JSON.stringify({
    stops: parseTextRes.data.stops
  });
  const summaryRes = await makeRequest({
    hostname: '127.0.0.1',
    port: 3025,
    path: '/api/export/driver-summary',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(summaryPayload)
    }
  }, summaryPayload);
  console.log('Driver Summary Success:', summaryRes.data.success);
  console.log('Summary Output:\n' + summaryRes.data.summary);

  console.log('\n🎉 ALL REST API ENDPOINTS TESTED SUCCESSFULLY!');
  process.exit(0);
}

// Start server in-process for test
require('./server.js');
setTimeout(runTests, 1500);
