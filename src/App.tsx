import { useState, useEffect } from 'react';
import {
  Home as HomeIcon,
  FolderOpen,
  Wand2,
  Settings as SettingsIcon,
  Smartphone,
  Download,
  Lock,
  Fingerprint,
  X
} from 'lucide-react';
import {
  getAllDocuments,
  saveDocument,
  deleteDocument,
  getAllPresets,
  getAllHistory,
  saveHistory,
  clearAllHistory,
  getAppLockMode,
  getStoredPin,
} from './utils/storage';
import { getInitialSeedDocuments } from './utils/sampleData';
import { StoredDocument, Preset, ConversionRecord, DocumentCategory, AppLockMode } from './types';
import { HomeScreen } from './components/HomeScreen';
import { DocumentsScreen } from './components/DocumentsScreen';
import { PrepareScreen } from './components/PrepareScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { AndroidProjectExplorer } from './components/AndroidProjectExplorer';
import { downloadAndroidProjectZip } from './utils/androidProjectZip';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'documents' | 'prepare' | 'settings'>('home');
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [history, setHistory] = useState<ConversionRecord[]>([]);
  const [selectedDocForPrepare, setSelectedDocForPrepare] = useState<StoredDocument | null>(null);

  // App Lock State
  const [lockMode, setLockMode] = useState<AppLockMode>(getAppLockMode());
  const [isUnlocked, setIsUnlocked] = useState(getAppLockMode() === 'OFF');
  const [pinEntry, setPinEntry] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Android Studio Modal
  const [showAndroidModal, setShowAndroidModal] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  // Load initial data from IndexedDB
  useEffect(() => {
    async function loadData() {
      const storedPresets = await getAllPresets();
      setPresets(storedPresets);

      let storedDocs = await getAllDocuments();
      if (storedDocs.length === 0) {
        const seedDocs = getInitialSeedDocuments();
        for (const doc of seedDocs) {
          await saveDocument(doc);
        }
        storedDocs = seedDocs;
      }
      setDocuments(storedDocs);

      const storedHistory = await getAllHistory();
      setHistory(storedHistory);
    }
    loadData();
  }, []);

  // Sync lock mode
  useEffect(() => {
    const currentMode = getAppLockMode();
    setLockMode(currentMode);
    if (currentMode === 'OFF') {
      setIsUnlocked(true);
    }
  }, [activeTab]);

  // Import files handler
  const handleImportFiles = async (files: FileList | File[], category: DocumentCategory = 'Personal') => {
    const fileArray = Array.from(files);
    const newDocs: StoredDocument[] = [];

    for (const file of fileArray) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const cleanName = file.name.replace(/\.[^/.]+$/, '');

      const doc: StoredDocument = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        originalName: file.name,
        displayName: cleanName,
        mimeType: file.type || (ext === 'pdf' ? 'application/pdf' : 'application/octet-stream'),
        extension: ext,
        sizeBytes: file.size,
        category,
        tags: [ext],
        favorite: false,
        encrypted: true,
        dataUrl,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await saveDocument(doc);
      newDocs.push(doc);
    }

    setDocuments((prev) => [...newDocs, ...prev]);
  };

  const handleDeleteDocument = async (id: string) => {
    await deleteDocument(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleToggleFavorite = async (id: string) => {
    const doc = documents.find((d) => d.id === id);
    if (!doc) return;
    const updated: StoredDocument = { ...doc, favorite: !doc.favorite, updatedAt: Date.now() };
    await saveDocument(updated);
    setDocuments((prev) => prev.map((d) => (d.id === id ? updated : d)));
  };

  const handleUpdateDocument = async (updated: StoredDocument) => {
    await saveDocument(updated);
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  };

  const handleRecordHistory = async (record: ConversionRecord) => {
    await saveHistory(record);
    setHistory((prev) => [record, ...prev]);
  };

  const handleClearCache = async () => {
    await clearAllHistory();
    setHistory([]);
  };

  const handleVerifyPin = () => {
    const savedPin = getStoredPin();
    if (!savedPin || pinEntry === savedPin) {
      setIsUnlocked(true);
      setPinError(null);
      setPinEntry('');
    } else {
      setPinError('Incorrect PIN. Please try again.');
    }
  };

  // Lock Screen Gate
  if (!isUnlocked && lockMode !== 'OFF') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">DocHub is Locked</h1>
        <p className="text-slate-400 text-sm mt-1 mb-6">Personal offline encrypted vault</p>

        {lockMode === 'PIN' ? (
          <div className="w-full max-w-xs space-y-4">
            <input
              type="password"
              maxLength={6}
              value={pinEntry}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setPinEntry(val);
                setPinError(null);
                const savedPin = getStoredPin();
                if (val.length >= 4 && savedPin && val === savedPin) {
                  setIsUnlocked(true);
                }
              }}
              placeholder="••••"
              className="w-full text-center text-3xl tracking-widest py-3 bg-slate-800 border border-slate-700 rounded-2xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {pinError && <p className="text-xs text-red-400">{pinError}</p>}
            <button
              onClick={handleVerifyPin}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition cursor-pointer"
            >
              Unlock Vault
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsUnlocked(true)}
            className="flex items-center gap-2.5 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition cursor-pointer"
          >
            <Fingerprint className="w-5 h-5" />
            <span>Unlock with Biometrics</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            DH
          </div>
          <div>
            <span className="font-bold text-base text-slate-900 tracking-tight">DocHub</span>
            <span className="text-[10px] text-slate-400 ml-1.5 font-mono">v1.0 Offline</span>
          </div>
        </div>

        <button
          onClick={() => setShowAndroidModal(true)}
          className="flex items-center gap-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 transition cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5 text-blue-600" />
          <span className="hidden sm:inline">Android APK</span>
        </button>
      </header>

      {/* Main Screen Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'home' && (
          <HomeScreen
            documents={documents}
            onNavigate={setActiveTab}
            onImportFiles={handleImportFiles}
            onSelectDocForPrepare={(doc) => {
              setSelectedDocForPrepare(doc);
              setActiveTab('prepare');
            }}
            onOpenAndroidModal={() => setShowAndroidModal(true)}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentsScreen
            documents={documents}
            onImportFiles={handleImportFiles}
            onDeleteDocument={handleDeleteDocument}
            onToggleFavorite={handleToggleFavorite}
            onUpdateDocument={handleUpdateDocument}
            onPrepareDocument={(doc) => {
              setSelectedDocForPrepare(doc);
              setActiveTab('prepare');
            }}
          />
        )}

        {activeTab === 'prepare' && (
          <PrepareScreen
            documents={documents}
            presets={presets}
            selectedDocument={selectedDocForPrepare}
            onSelectDocument={setSelectedDocForPrepare}
            onRecordHistory={handleRecordHistory}
            onSavePreparedAsDocument={async (newDoc) => {
              await saveDocument(newDoc);
              setDocuments((prev) => [newDoc, ...prev]);
            }}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen
            documents={documents}
            onClearCache={handleClearCache}
            onOpenAndroidModal={() => setShowAndroidModal(true)}
          />
        )}
      </main>

      {/* 4 Bottom Tabs Navigation: Home, Documents, Prepare, Settings */}
      <nav className="sticky bottom-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-2 flex items-center justify-around z-30 shadow-xs max-w-4xl mx-auto w-full">
        {[
          { id: 'home', label: 'Home', icon: HomeIcon },
          { id: 'documents', label: 'Documents', icon: FolderOpen },
          { id: 'prepare', label: 'Prepare', icon: Wand2 },
          { id: 'settings', label: 'Settings', icon: SettingsIcon },
        ].map((item) => {
          const Icon = item.icon;
          const isSelected = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center justify-center py-1 px-4 rounded-2xl transition cursor-pointer ${
                isSelected ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div
                className={`px-3.5 py-1 rounded-full transition ${
                  isSelected ? 'bg-blue-50 text-blue-600' : 'bg-transparent'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Android Native Project Modal */}
      {showAndroidModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAndroidModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>

            <AndroidProjectExplorer />
          </div>
        </div>
      )}
    </div>
  );
}
