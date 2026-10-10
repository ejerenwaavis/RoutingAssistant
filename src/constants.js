/**
 * SpeedX Ops Assistant ("OpsBridge") Constants & Regex Anchors
 */

const TRACKING_REGEX = /\b(SPX[A-Z0-9]{12,25})\b/i;
const GLOBAL_TRACKING_REGEX = /\b(SPX[A-Z0-9]{12,25})\b/g;
const TIMESTAMP_REGEX = /\b(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\b/;
const DEVIATION_REGEX = /^(\d+(?:\.\d+)?\s*(?:m|km)|-)$/i;
const ZIP_ADDRESS_REGEX = /([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/i;

const SPEEDX_STATUSES = [
  'FAILED ATTEMPT',
  'OUT_FOR_DELIVERY',
  'NEW',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
  'EXCEPTION',
  'COMPLETED'
];

const KNOWN_EXCEPTION_REASONS = [
  'No Access/No Safe Location and unable to contact the consignee',
  'Invalid Address',
  'Business Closed',
  'Transport vehicle breakdown',
  'Customer Not Available',
  'Rejected by recipient',
  'Missort',
  'Weather delay'
];

const EXPORT_HEADERS = {
  circuit: [
    'Stop Number',
    'Address',
    'Address Line 2',
    'Postal Code',
    'Country',
    'Recipient Name',
    'Recipient Phone',
    'Package ID',
    'Notes'
  ],
  spoke: [
    'Stop',
    'Address',
    'City',
    'State',
    'Zip',
    'Tracking',
    'Customer Name',
    'Phone',
    'Notes'
  ],
  groundCloud: [
    'Stop Number',
    'Address',
    'Unit',
    'Postal Code',
    'Recipient Name',
    'Phone',
    'Tracking',
    'Notes'
  ],
  rollover: [
    'Sequence',
    'TrackingNo',
    'Route',
    'Address',
    'Unit',
    'ZipCode',
    'PreviousDriver',
    'LastStatus',
    'ExceptionReason',
    'DriverNotes',
    'CustomerNotes'
  ]
};

module.exports = {
  TRACKING_REGEX,
  GLOBAL_TRACKING_REGEX,
  TIMESTAMP_REGEX,
  DEVIATION_REGEX,
  ZIP_ADDRESS_REGEX,
  SPEEDX_STATUSES,
  KNOWN_EXCEPTION_REASONS,
  EXPORT_HEADERS
};
