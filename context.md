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

## Next Phase
- Awaiting user's UI designs and step-by-step feature implementation specifications.
