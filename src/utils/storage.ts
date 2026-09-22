import { StoredDocument, Preset, ConversionRecord } from '../types';

const DB_NAME = 'DocHubOfflineDB';
const DB_VERSION = 1;

export const INITIAL_PRESETS: Preset[] = [
  {
    id: 'preset-passport',
    name: 'Passport Photo',
    documentType: 'Photo',
    outputFormat: 'JPG',
    width: 600,
    height: 800,
    widthUnit: 'px',
    heightUnit: 'px',
    dpi: 300,
    maxFileSizeBytes: 100 * 1024, // 100 KB
    quality: 85,
    notes: 'Standard passport specification: JPG, 600×800 pixels, ≤100 KB',
    isSystem: true,
  },
  {
    id: 'preset-signature',
    name: 'Digital Signature',
    documentType: 'Signature',
    outputFormat: 'JPG',
    width: 400,
    height: 200,
    widthUnit: 'px',
    heightUnit: 'px',
    dpi: 200,
    maxFileSizeBytes: 50 * 1024, // 50 KB
    quality: 90,
    notes: 'Official application upload specification: JPG, ≤50 KB',
    isSystem: true,
  },
  {
    id: 'preset-exam',
    name: 'Competitive Exam Photo ID',
    documentType: 'Photo',
    outputFormat: 'JPG',
    width: 450,
    height: 600,
    widthUnit: 'px',
    heightUnit: 'px',
    dpi: 200,
    maxFileSizeBytes: 200 * 1024, // 200 KB
    quality: 80,
    notes: 'Portal exam admission card format: JPG, ≤200 KB',
    isSystem: true,
  },
  {
    id: 'preset-resume',
    name: 'Resume / CV (Compact PDF)',
    documentType: 'Document',
    outputFormat: 'PDF',
    width: 595,
    height: 842,
    widthUnit: 'px',
    heightUnit: 'px',
    dpi: 150,
    maxFileSizeBytes: 500 * 1024, // 500 KB
    quality: 80,
    notes: 'Standard A4 PDF with high text clarity: ≤500 KB',
    isSystem: true,
  },
];

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('documents')) {
        db.createObjectStore('documents', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('presets')) {
        db.createObjectStore('presets', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('history')) {
        db.createObjectStore('history', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllDocuments(): Promise<StoredDocument[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readonly');
    const store = tx.objectStore('documents');
    const req = store.getAll();
    req.onsuccess = () => {
      const docs = (req.result as StoredDocument[]) || [];
      docs.sort((a, b) => b.createdAt - a.createdAt);
      resolve(docs);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveDocument(doc: StoredDocument): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readwrite');
    const store = tx.objectStore('documents');
    const req = store.put(doc);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readwrite');
    const store = tx.objectStore('documents');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getAllPresets(): Promise<Preset[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('presets', 'readwrite');
    const store = tx.objectStore('presets');
    const req = store.getAll();
    req.onsuccess = () => {
      let presets = (req.result as Preset[]) || [];
      if (presets.length === 0) {
        INITIAL_PRESETS.forEach(p => store.put(p));
        presets = [...INITIAL_PRESETS];
      }
      resolve(presets);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getAllHistory(): Promise<ConversionRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('history', 'readonly');
    const store = tx.objectStore('history');
    const req = store.getAll();
    req.onsuccess = () => {
      const history = (req.result as ConversionRecord[]) || [];
      history.sort((a, b) => b.createdAt - a.createdAt);
      resolve(history);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveHistory(record: ConversionRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('history', 'readwrite');
    const store = tx.objectStore('history');
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearAllHistory(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('history', 'readwrite');
    const store = tx.objectStore('history');
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
