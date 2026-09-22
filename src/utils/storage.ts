import { StoredDocument, Preset, ConversionRecord, AppLockMode } from '../types';

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
    notes: 'Standard A4 compressed PDF for portal upload',
    isSystem: true,
  },
];

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('documents')) {
        const docStore = db.createObjectStore('documents', { keyPath: 'id' });
        docStore.createIndex('category', 'category', { unique: false });
        docStore.createIndex('displayName', 'displayName', { unique: false });
        docStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('presets')) {
        db.createObjectStore('presets', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('history')) {
        const histStore = db.createObjectStore('history', { keyPath: 'id' });
        histStore.createIndex('createdAt', 'createdAt', { unique: false });
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

export async function renameStoredDocument(id: string, newDisplayName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readwrite');
    const store = tx.objectStore('documents');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const doc = getReq.result as StoredDocument | undefined;
      if (doc) {
        doc.displayName = newDisplayName.trim();
        doc.updatedAt = Date.now();
        store.put(doc);
      }
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
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

// User View Preferences
export function getDefaultViewMode(): 'grid' | 'list' {
  return (localStorage.getItem('dochub_view_mode') as 'grid' | 'list') || 'grid';
}

export function setDefaultViewMode(mode: 'grid' | 'list'): void {
  localStorage.setItem('dochub_view_mode', mode);
}

// App Lock Preferences
export function getAppLockMode(): AppLockMode {
  return (localStorage.getItem('dochub_app_lock_mode') as AppLockMode) || 'OFF';
}

export function setAppLockMode(mode: AppLockMode): void {
  localStorage.setItem('dochub_app_lock_mode', mode);
}

export function getStoredPin(): string | null {
  return localStorage.getItem('dochub_app_lock_pin');
}

export function setStoredPin(pin: string): void {
  localStorage.setItem('dochub_app_lock_pin', pin);
}
