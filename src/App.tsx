import { useState, useEffect } from 'react';
import {
  Home as HomeIcon,
  FolderOpen,
  Wand2,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Smartphone,
  Download,
  Terminal,
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
} from './utils/storage';
import { getInitialSeedDocuments } from './utils/sampleData';
import { StoredDocument, Preset, ConversionRecord, DocumentCategory } from './types';
import { HomeScreen } from './components/HomeScreen';
import { DocumentsScreen } from './components/DocumentsScreen';
import { PrepareScreen } from './components/PrepareScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { AndroidProjectExplorer } from './components/AndroidProjectExplorer';
import { downloadAndroidProjectZip } from './utils/androidProjectZip';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'documents' | 'prepare' | 'history' | 'settings'>('home');
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [history, setHistory] = useState<ConversionRecord[]>([]);
  const [selectedDocForPrepare, setSelectedDocForPrepare] = useState<StoredDocument | null>(null);

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
    if (selectedDocForPrepare?.id === id) {
      setSelectedDocForPrepare(null);
    }
  };

  const handleToggleFavorite = async (id: string) => {
    const doc = documents.find((d) => d.id === id);
    if (!doc) return;
    const updated = { ...doc, favorite: !doc.favorite, updatedAt: Date.now() };
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

  const handleClearHistory = async () => {
    await clearAllHistory();
    setHistory([]);
  };

  const handleClearCache = async () => {
    const historyList = await getAllHistory();
    for (const h of historyList) {
      if (h.outputDataUrl) {
        h.outputDataUrl = undefined;
        await saveHistory(h);
      }
    }
  };

  const handleDirectDownloadZip = async () => {
    try {
      setIsDownloadingZip(true);
      await downloadAndroidProjectZip();
    } finally {
      setIsDownloadingZip(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-start antialiased text-slate-800">
      {/* Top Android Project Bar */}
      <header className="w-full bg-slate-900 border-b border-slate-800 text-white px-4 py-3 sticky top-0 z-40 shadow-md">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm">
              DH
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-slate-100 flex items-center gap-1.5">
                DocHub <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-mono px-1.5 py-0.5 rounded border border-emerald-500/30">Native Android</span>
              </span>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Kotlin • Jetpack Compose • Room • SAF • 100% Offline
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAndroidModal(true)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 transition cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-400" />
              <span>Android Code & APK</span>
            </button>
            <button
              onClick={handleDirectDownloadZip}
              disabled={isDownloadingZip}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isDownloadingZip ? 'Packing...' : 'Download ZIP'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Screen Container - Styled with Phone Proportion Comfort on Desktop */}
      <main className="w-full max-w-xl mx-auto flex-1 bg-white shadow-lg sm:my-3 sm:rounded-3xl border border-slate-200/60 overflow-hidden relative flex flex-col">
        {/* Screen Content View */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
          {activeTab === 'home' && (
            <HomeScreen
              documents={documents}
              history={history}
              onNavigate={(tab) => setActiveTab(tab)}
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

          {activeTab === 'history' && (
            <HistoryScreen history={history} onClearHistory={handleClearHistory} />
          )}

          {activeTab === 'settings' && (
            <SettingsScreen
              documents={documents}
              presets={presets}
              onClearCache={handleClearCache}
            />
          )}
        </div>

        {/* Android Material 3 Bottom Navigation Bar */}
        <nav className="sticky bottom-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-2 flex items-center justify-around z-30 shadow-sm">
          {[
            { id: 'home', label: 'Home', icon: HomeIcon },
            { id: 'documents', label: 'Documents', icon: FolderOpen },
            { id: 'prepare', label: 'Prepare', icon: Wand2 },
            { id: 'history', label: 'History', icon: HistoryIcon },
            { id: 'settings', label: 'Settings', icon: SettingsIcon },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition cursor-pointer ${
                  isSelected ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <div
                  className={`px-4 py-1 rounded-full transition ${
                    isSelected ? 'bg-blue-100 text-blue-700' : 'bg-transparent'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-medium mt-0.5">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </main>

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
