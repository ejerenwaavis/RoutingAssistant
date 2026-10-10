export interface Stop {
  id: string;
  seq: number;
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
}
