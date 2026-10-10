/**
 * SpeedX OpsBridge REST API Routes
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parseSpeedXText } = require('../services/textParser');
const { parseSpeedXSpreadsheet } = require('../services/excelParser');
const {
  exportToCircuit,
  exportToSpoke,
  exportToGroundCloud,
  exportRolloverManifest,
  generateDriverEODSummary
} = require('../services/exportService');

// Multer in-memory storage for uploaded spreadsheets
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

/**
 * Health check
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SpeedX OpsBridge API',
    timestamp: new Date().toISOString()
  });
});

/**
 * Parse clipboard text
 */
router.post('/parse/text', (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ success: false, error: 'Request body must contain "text" string.' });
    }

    const result = parseSpeedXText(text);
    return res.json({
      success: true,
      stops: result.stops,
      stagingDrawer: result.stagingDrawer,
      metrics: result.metrics
    });
  } catch (err) {
    console.error('Error parsing text:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Ingest SpeedX Excel / CSV file upload
 */
router.post('/parse/file', upload.single('file'), (req, res) => {
  try {
    let fileBuffer;
    let fileName = 'manifest.xlsx';

    if (req.file) {
      fileBuffer = req.file.buffer;
      fileName = req.file.originalname;
    } else if (req.body.base64) {
      fileBuffer = Buffer.from(req.body.base64, 'base64');
      fileName = req.body.filename || 'manifest.xlsx';
    } else {
      return res.status(400).json({ success: false, error: 'No file uploaded or base64 payload provided.' });
    }

    const result = parseSpeedXSpreadsheet(fileBuffer, fileName);
    return res.json({
      success: true,
      stops: result.stops,
      zipDistribution: result.zipDistribution,
      metrics: result.metrics
    });
  } catch (err) {
    console.error('Error parsing spreadsheet:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Export Navigation App CSV
 */
router.post('/export/navigation', (req, res) => {
  try {
    const { format = 'circuit', stops = [] } = req.body;
    if (!Array.isArray(stops)) {
      return res.status(400).json({ success: false, error: 'Stops must be an array.' });
    }

    let csvContent = '';
    let filename = `manifest_${format}_${Date.now()}.csv`;

    switch (format.toLowerCase()) {
      case 'circuit':
        csvContent = exportToCircuit(stops);
        break;
      case 'spoke':
        csvContent = exportToSpoke(stops);
        break;
      case 'groundcloud':
        csvContent = exportToGroundCloud(stops);
        break;
      default:
        csvContent = exportToCircuit(stops);
    }

    if (req.query.download === 'true') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csvContent);
    }

    return res.json({
      success: true,
      format,
      filename,
      csv: csvContent
    });
  } catch (err) {
    console.error('Error exporting navigation CSV:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Export Rollover Manifest CSV
 */
router.post('/export/rollover', (req, res) => {
  try {
    const { stops = [] } = req.body;
    if (!Array.isArray(stops)) {
      return res.status(400).json({ success: false, error: 'Stops must be an array.' });
    }

    const csvContent = exportRolloverManifest(stops);
    const filename = `rollover_manifest_${Date.now()}.csv`;

    if (req.query.download === 'true') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csvContent);
    }

    return res.json({
      success: true,
      filename,
      csv: csvContent
    });
  } catch (err) {
    console.error('Error exporting rollover CSV:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Generate Plaintext Driver EOD Accountability Summary
 */
router.post('/export/driver-summary', (req, res) => {
  try {
    const { stops = [] } = req.body;
    if (!Array.isArray(stops)) {
      return res.status(400).json({ success: false, error: 'Stops must be an array.' });
    }

    const summary = generateDriverEODSummary(stops);
    return res.json({
      success: true,
      summary
    });
  } catch (err) {
    console.error('Error generating driver summary:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
