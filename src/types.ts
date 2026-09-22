export type DocumentCategory =
  | 'Identity'
  | 'Education'
  | 'Employment'
  | 'Finance'
  | 'Government'
  | 'Travel'
  | 'Personal'
  | 'Other';

export interface StoredDocument {
  id: string;
  originalName: string;
  displayName: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  category: DocumentCategory;
  tags: string[];
  favorite: boolean;
  dataUrl: string; // Stored locally in IndexedDB / local memory
  createdAt: number;
  updatedAt: number;
}

export interface Preset {
  id: string;
  name: string;
  documentType: string;
  outputFormat: 'JPG' | 'PNG' | 'PDF';
  width: number;
  height: number;
  widthUnit: 'px' | 'mm' | 'cm' | 'in';
  heightUnit: 'px' | 'mm' | 'cm' | 'in';
  dpi: number;
  maxFileSizeBytes: number;
  quality: number;
  notes: string;
  isSystem: boolean;
}

export interface ConversionRecord {
  id: string;
  sourceName: string;
  outputName: string;
  operation: string;
  parameters: string;
  status: 'SUCCESS' | 'FAILED';
  originalSizeBytes: number;
  outputSizeBytes: number;
  outputDataUrl?: string;
  mimeType?: string;
  createdAt: number;
}

export interface PreparationStep {
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
}

export interface PreparationResult {
  isSuccess: boolean;
  steps: PreparationStep[];
  outputDataUrl?: string;
  outputFileName: string;
  outputSizeBytes: number;
  originalSizeBytes: number;
  width?: number;
  height?: number;
  summary: string;
}
