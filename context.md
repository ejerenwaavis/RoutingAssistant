# Context & Task Tracking: RoutingAssistant -> SpeedX OpsBridge

## Project Overview
Modernize the existing `RoutingAssistant` application with the new SpeedX Ops Assistant ("OpsBridge") master specification. The application provides universal clipboard text parsing (SpeedX DOM copy), 30-column SpeedX spreadsheet ingestion (.xlsx/.csv), dynamic postal code aggregation, multi-platform navigation manifest exports (Circuit, Spoke, GroundCloud), rollover staging, and driver EOD accountability reporting.

- **Source Repository**: `https://github.com/ejerenwaavis/RoutingAssistant`
- **Active Branch**: `feature/opsbridge-upgrade`
- **Architecture**: Monolithic full-stack (Express backend + React Vite frontend in a single repository)
- **Build Output**: Top-level `public_html/` directory (serving production React client)
- **Deployment Target**: Namecheap CloudLinux/cPanel via SSH (`aceddivision`), Subdomain: `ra.aceddivision.com`

---

## Detailed Task Checklist

### Phase 1: Environment & Branch Setup
- [x] SSH connectivity to GitHub verified (using `~/.ssh/id_ed25519_winston_brain`)
- [x] SSH connectivity to Namecheap verified (`ssh aceddivision`)
- [x] Clone repo into `RoutingAssistant` and create directory junction with `SpeedX Assistant`
- [x] Create and checkout branch `feature/opsbridge-upgrade`
- [x] Create `context.md` tracking document

### Phase 2: Core Parsing & Normalization Services (Backend)
- [x] Universal Smart Paste Engine (`services/textParser.js`):
  - [x] Regex tracking anchor: `/\b(SPX[A-Z0-9]{12,25})\b/g`
  - [x] Sequence number extraction from Line -1 (`/^\d+$/`)
  - [x] Timestamp extraction: `/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/`
  - [x] Deviation extraction: `/(\d+(\.\d+)?\s*(m|km))/` or `-`
  - [x] Address extraction: state and 5-digit zip anchor `/[A-Z]{2}\s+\d{5}(?:-\d{4})?/i`
  - [x] Driver name extraction (immediately following timestamp)
  - [x] Status normalization (`FAILED ATTEMPT`, `OUT_FOR_DELIVERY`, `NEW`, `DELIVERED`, etc.)
  - [x] Exception reasons detection
  - [x] Multi-line driver & customer notes capture
  - [x] Staging drawer isolation for unrecognized lines
- [x] SpeedX Spreadsheet Ingestion (`services/excelParser.js`):
  - [x] Full 30-column SpeedX mapping (`POE`, `Route`, `Sequence`, `Address`, `Unit`, `ZipCode`, `TrackingNo`, `RecipientName`, `RecipientPhone`, `Status`, `FinalStatus`, `CompleteTime`, `Weight`, `FleeName`, `DriverName`, `ExceptionReason`, `BadPod`, etc.)
  - [x] Support both `inlineStr` and `sharedStrings` XLSX modes and CSV
  - [x] Zero-padded 5-digit zip code preservation (`zip.padStart(5, '0')`)
  - [x] Phone number cleaning (preserving `+1` and extension tags)
- [x] Dynamic Postal Aggregator:
  - [x] Group counts and route IDs by zip code
- [x] Navigation App Exporters (`services/exportService.js`):
  - [x] Circuit / Spoke / GroundCloud schema: `Stop Number`, `Address`, `Address Line 2`, `Postal Code`, `Country`, `Recipient Name`, `Recipient Phone`, `Package ID`, `Notes`
  - [x] Rollover Manifest schema (pre-filtered to FAILED ATTEMPT / NEW with prior notes)
  - [x] Driver EOD Accountability clipboard summary generator

### Phase 3: Express API Integration
- [x] Add REST endpoints in `server.js` or dedicated route files:
  - [x] `POST /api/parse/text`: Parse clipboard raw text
  - [x] `POST /api/parse/file`: Parse uploaded `.xlsx`/`.csv`
  - [x] `POST /api/export/navigation`: Generate Circuit/Spoke CSV
  - [x] `POST /api/export/rollover`: Generate Rollover CSV
  - [x] `POST /api/export/driver-summary`: Generate EOD clipboard text
- [x] Configure static file serving from `public_html/` with SPA fallback to `public_html/index.html`
- [x] Retain existing backward-compatible routes while mounting new `/api/*` routes

### Phase 4: Frontend Development (Modern React + Vite + Tailwind CSS)
- [x] Scaffold `client/` React application:
  - [x] Configure `vite.config.js` to output build to `../public_html`
  - [x] Configure Tailwind CSS, PostCSS, and dark/light slate/zinc theme
  - [x] Setup Lucide icons, SheetJS (`xlsx`), and `papaparse`
- [x] UI Components:
  - [x] `MetricHeader`: Live counters (Total Scanned, Completed, Failed, Needs Address Correction, Active Zip Codes)
  - [x] `SmartPasteArea`: Keyboard-driven textarea (Ctrl+V) with instant parse, test presets for Pattern A and Pattern B
  - [x] `ExcelUploader`: Drag & drop file zone with instant format detection
  - [x] `ZipCodeFilter`: Interactive pill badges with multi-select toggles
  - [x] `ManifestDataTable`: Responsive data grid, status badges, search filter, and Staging Drawer for unparsed rows
  - [x] `ExportToolbar`: One-click Circuit CSV, Spoke CSV, Rollover CSV, and Copy EOD Summary buttons
- [x] Test client build pipeline: `npm run build` outputs directly into `public_html/`

### Phase 5: Verification & Automated Testing
- [x] Run test suite against:
  - [x] Clipboard Pattern A (Manifest / Batch View)
  - [x] Clipboard Pattern B (Active Dashboard / Failed Attempts View)
  - [x] Real SpeedX Excel file (`route_parcel_info_1791591840207.xlsx`)
  - [x] API endpoints `/api/*`
  - [x] Full build output verification in `public_html/`

### Phase 6: GitHub Push
- [ ] Commit all changes to `feature/opsbridge-upgrade`
- [ ] Push branch to remote: `git push -u origin feature/opsbridge-upgrade`

### Phase 7: Namecheap Deployment (`ra.aceddivision.com`)
- [ ] SSH to `aceddivision`
- [ ] Create subdomain `ra.aceddivision.com` via `uapi SubDomain`
- [ ] Clone / pull branch `feature/opsbridge-upgrade` into `/home/acedzagz/ra.aceddivision.com`
- [ ] Register Node.js app using `cloudlinux-selector` (Node 20 or 22, root `ra.aceddivision.com`, startup `server.js`)
- [ ] Install production dependencies on server
- [ ] Build client on server or deploy pre-built `public_html/`
- [ ] Restart app and verify live HTTPS access at `https://ra.aceddivision.com`
