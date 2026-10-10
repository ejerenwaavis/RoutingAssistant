# RoutingAssistant & OpsBridge Project Context

## Overview
This document tracks project state, requirements, environment configurations, and pending milestones to ensure no steps or constraints are missed.

## Current State
- **Branch**: `feature/dynamic-oauth` (deployed live to Namecheap).
- **Live Deployment**: `https://ra.aceddivision.com` on Namecheap CloudLinux/cPanel.
- **Node Version**: Node.js 20.20.2 via CloudLinux Selector.
- **Original App**: Pristine Bootstrap/EJS RouteAssistant interface currently running live.

## Environment Variables Configured in cPanel ("Setup Node.js App")
- `CLIENTID`: Configured (Google OAuth Client ID)
- `CLIENTSECRETE`: Configured
- `FACEBOOK_APP_ID`: Configured
- `FACEBOOK_APP_SECRET`: Configured
- `HEREAPI`: Configured
- `MONGOPASSWORD`: Configured
- `MONGOURI2`: `@acedroutedb.9cwtmjn.mongodb.net/test?retryWrites=true&w=majority&appName=acedRouteDB`
- `MONGOUSER`: `ra_acedRouteDB_acees`
- `SECRETE`: Configured
- `STRIPEAPI`: Configured
- `TEMP_FILEPATH`: `../public_html/routingassistant/`
- `APP_DIRECTORY`: `""`
- `BASE_URL`: `https://ra.aceddivision.com`

## Database Status
- Connected to MongoDB Atlas cluster: `acedroutedb.9cwtmjn.mongodb.net` (database `test`).
- Collections: `[ 'routeedges', 'addresses', 'brands', 'users', 'manifests' ]`.
- Successfully executing brand caching (`Brands written to file`) and user auth on startup.

## OAuth Configuration
- Google OAuth: Dynamic callback URL `https://ra.aceddivision.com/googleLoggedin` with `BASE_URL` fallback.
- Facebook OAuth: Dynamic callback URL `https://ra.aceddivision.com/facebookLoggedin` with `BASE_URL` fallback.

## Manifest Ingestion & Export Engine
- **Universal Smart Parser**: Added `src/services/smartParser.js` supporting `.csv`, `.xlsx`, and `.xls` across SpeedX, OnTrac, GoFor Express, Eli, Circuit, RoadWarrior, and generic carrier manifests.
- **Auto-Schema Detection**: Scans first 10 rows matching headers across 12 semantic fields with fallback content pattern recognition.
- **Address Deconstruction**: Multi-pattern regex for US addresses, stripping unit/apartment/c-o notes into separate fields, normalizing State, ZIP, and country (`US`).
- **Export Formats**: Added `src/services/exportService.js` supporting RoadWarrior CSV, Route4Me CSV, Circuit CSV, and legacy Excel (.xlsx).
- **Web UI & REST APIs**: Web form uploads directly output CSV for download. Added `POST /api/manifest/parse` and `POST /api/manifest/export` for seamless React integration.
- **Bug Fix**: Fixed EJS render TypeError (`Cannot read properties of null (reading 'length')`) on `excellDownload.ejs` by making `errors` check defensive and passing `[]` instead of `null`. Hardened address regex and added state map dictionary in `smartParser.js`. Safe path resolution added to `deleteFile`.
- **Frontend Status**: Zero visual/styling changes made to existing EJS templates.

## Next Phase
- Step-by-step UI transition to React and frontend integration with `/api/manifest/parse` and `/api/manifest/export`.

