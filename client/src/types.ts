export interface Stop {
  id: string;
  seq: number | null;
  barcode: string;
  recipient: string;
  street: string;
  unit: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  notes: string;
  status: string;
  driver?: string;
  route?: string;
}

export type AppMode = 'slicer' | 'sorter' | 'cage_verifier';

export interface CageScanResult {
  id: string;
  barcode: string;
  timestamp: Date;
  isMatch: boolean;
  route?: string;
  driver?: string;
  zip?: string;
  address?: string;
  seq?: number | null;
  recipient?: string;
}

export interface PackageSortResult {
  id: string;
  barcode: string;
  timestamp: Date;
  isFound: boolean;
  route: string;
  driver: string;
  seq: number | null;
  zip: string;
  address: string;
  recipient: string;
}


export type ExportPreset = 'circuit' | 'roadwarrior' | 'route4me' | 'groundcloud';

export interface UserProfile {
  username?: string;
  firstName?: string;
  lastName?: string;
  isProUser?: boolean;
}

export interface ManifestMetadata {
  rawFilename: string;
  timestamp: number | null;
  formattedDate: string | null;
  sourceType: 'file' | 'clipboard';
  hasStatusColumn?: boolean;
}

export interface ParseResult {
  stops: Stop[];
  hasStatusColumn: boolean;
}


