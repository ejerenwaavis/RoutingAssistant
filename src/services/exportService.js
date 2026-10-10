const fs = require('fs');
const path = require('path');
const Excel = require('exceljs');
const papa = require('papaparse');

/**
 * Escapes CSV field
 */
function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates RoadWarrior format CSV
 */
function generateRoadWarriorCsv(addresses) {
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

  const rows = addresses.map(addr => [
    addr.Name || addr.name || addr.seq || '',
    addr.Street || addr.street || '',
    addr.City || addr.city || '',
    addr.State || addr.state || '',
    addr.Postal || addr.zipCode || '',
    addr.Country || addr.country || 'US',
    '', // Color
    addr.Phone || addr.phone || '',
    addr.Note || addr.barcode || '',
    addr.Latitude || '',
    addr.Longitude || '',
    '' // Service Time
  ]);

  return [headers.join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\r\n');
}

/**
 * Generates Route4Me format CSV
 */
function generateRoute4MeCsv(addresses) {
  const headers = ['address', 'Alias'];
  const rows = addresses.map(addr => {
    const full = [addr.Street || addr.street, addr.City || addr.city, `${addr.State || addr.state} ${addr.Postal || addr.zipCode}`.trim(), addr.Country || 'US']
      .filter(Boolean)
      .join(', ');
    const alias = addr.Barcode || addr.barcode || addr.Name || addr.name || `Stop ${addr.seq}`;
    return [full, alias];
  });

  return [headers.join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\r\n');
}

/**
 * Generates Circuit / Universal format CSV
 */
function generateCircuitCsv(addresses) {
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

  const rows = addresses.map(addr => [
    addr.seq || '',
    addr.street1 || addr.Street || addr.street || '',
    addr.street2 || '',
    addr.Postal || addr.zipCode || '',
    addr.Country || addr.country || 'US',
    addr.Name || addr.name || '',
    addr.Phone || addr.phone || '',
    addr.Barcode || addr.barcode || '',
    addr.notes || addr.Note || ''
  ]);

  return [headers.join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\r\n');
}

/**
 * Populates legacy RoadWarrior Excel template
 */
async function generateRoadWarriorExcel(addresses, templatePath, outputPath) {
  const workbook = new Excel.Workbook();
  await workbook.xlsx.readFile(templatePath);
  const worksheet = workbook.getWorksheet(1);

  let rowIdx = 2;
  for (const addr of addresses) {
    const row = worksheet.getRow(rowIdx);
    row.getCell(1).value = addr.Name || addr.name || addr.seq;
    row.getCell(2).value = addr.Street || addr.street;
    row.getCell(3).value = addr.City || addr.city;
    row.getCell(4).value = addr.State || addr.state;
    row.getCell(5).value = addr.Postal || addr.zipCode;
    row.getCell(6).value = addr.Country || addr.country || 'US';
    row.getCell(8).value = addr.Phone || addr.phone || '';
    row.getCell(9).value = addr.Note || addr.barcode || '';
    row.commit();
    rowIdx++;
  }

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  await workbook.xlsx.writeFile(outputPath);
  return outputPath;
}

/**
 * Populates legacy Route4Me Excel template
 */
async function generateRoute4MeExcel(addresses, templatePath, outputPath) {
  const workbook = new Excel.Workbook();
  await workbook.xlsx.readFile(templatePath);
  const worksheet = workbook.getWorksheet(1);

  let rowIdx = 2;
  for (const addr of addresses) {
    const full = [addr.Street || addr.street, addr.City || addr.city, `${addr.State || addr.state} ${addr.Postal || addr.zipCode}`.trim(), addr.Country || 'US']
      .filter(Boolean)
      .join(', ');
    const row = worksheet.getRow(rowIdx);
    row.getCell(1).value = full;
    row.getCell(2).value = addr.Barcode || addr.barcode || addr.Brand || `Stop ${addr.seq}`;
    row.commit();
    rowIdx++;
  }

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  await workbook.xlsx.writeFile(outputPath);
  return outputPath;
}

module.exports = {
  generateRoadWarriorCsv,
  generateRoute4MeCsv,
  generateCircuitCsv,
  generateRoadWarriorExcel,
  generateRoute4MeExcel
};
