import React, { useRef } from 'react';
import {
  FilePlus,
  Search,
  Wand2,
  FileImage,
  FileText,
  Minimize2,
  GitMerge,
  Split,
  Sliders,
  ChevronRight,
  ShieldCheck,
  HardDrive
} from 'lucide-react';
import { StoredDocument, ConversionRecord, DocumentCategory } from '../types';

interface HomeScreenProps {
  documents: StoredDocument[];
  history: ConversionRecord[];
  onNavigate: (tab: 'documents' | 'prepare' | 'history' | 'settings') => void;
  onImportFiles: (files: FileList | File[], category?: DocumentCategory) => Promise<void>;
  onSelectDocForPrepare: (doc: StoredDocument) => void;
  onOpenAndroidModal?: () => void;
}

export function HomeScreen({
  documents,
  history,
  onNavigate,
  onImportFiles,
  onSelectDocForPrepare,
  onOpenAndroidModal,
}: HomeScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportFiles(e.target.files);
    }
  };

  const recentDocs = documents.slice(0, 5);
  const recentHistory = history.slice(0, 4);

  return (
    <div className="space-y-6 pb-20">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-medium text-blue-100 mb-3 border border-white/10">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 100% Offline • Airplane Mode Ready
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">DocHub</h1>
          <p className="text-blue-100 text-sm mt-1 max-w-lg leading-relaxed">
            "Store once. Find fast. Get the format you need."
          </p>

          {/* Primary Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2.5 bg-white text-blue-900 font-semibold px-5 py-3 rounded-2xl shadow-md hover:bg-blue-50 transition active:scale-[0.98] cursor-pointer"
            >
              <FilePlus className="w-5 h-5 text-blue-700" />
              <span>+ Add Document</span>
            </button>
            <button
              onClick={() => onNavigate('documents')}
              className="flex items-center justify-center gap-2.5 bg-blue-600/40 hover:bg-blue-600/60 text-white font-semibold px-5 py-3 rounded-2xl border border-white/20 transition active:scale-[0.98] cursor-pointer"
            >
              <Search className="w-5 h-5" />
              <span>Find Document</span>
            </button>
          </div>
        </div>
      </div>

      {/* Prepare Document Banner */}
      <div
        onClick={() => onNavigate('prepare')}
        className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-5 hover:border-amber-400 transition cursor-pointer shadow-sm group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-700 group-hover:scale-105 transition">
              <Wand2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                Prepare Document
                <span className="text-[11px] font-semibold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                  Key Feature
                </span>
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Auto-convert, resize & compress to exact portal specifications (Passport, Exam, Signature, Resume)
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition" />
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { title: 'Image → PDF', icon: FileText, desc: 'Multiple images to A4/Letter', action: () => onNavigate('prepare') },
            { title: 'PDF → Image', icon: FileImage, desc: 'Extract pages to JPG/PNG', action: () => onNavigate('prepare') },
            { title: 'Compress Image', icon: Minimize2, desc: 'Smart target-size compression', action: () => onNavigate('prepare') },
            { title: 'Merge PDF', icon: GitMerge, desc: 'Combine multiple PDFs', action: () => onNavigate('prepare') },
            { title: 'Split PDF', icon: Split, desc: 'Extract specific pages', action: () => onNavigate('prepare') },
            { title: 'Presets', icon: Sliders, desc: 'Custom application requirements', action: () => onNavigate('prepare') },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={item.action}
                className="flex flex-col items-start p-4 bg-white border border-slate-200/80 rounded-2xl hover:border-blue-400 hover:shadow-md transition text-left group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-2.5 group-hover:bg-blue-600 group-hover:text-white transition">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="font-semibold text-xs sm:text-sm text-slate-900">{item.title}</span>
                <span className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{item.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* APK Build Center Banner */}
      {onOpenAndroidModal && (
        <div
          onClick={onOpenAndroidModal}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white hover:border-blue-500 transition cursor-pointer shadow-md group relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-100">
                    DocHub Android APK Build Center
                  </span>
                  <span className="text-[10px] font-mono bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded border border-blue-400/30">
                    gradlew.bat assembleDebug
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Get your debug APK for Windows, Android Studio, or Cloud CI/CD
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition" />
          </div>
        </div>
      )}

      {/* Recent Documents */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            Recent Documents
            <span className="text-xs font-normal text-slate-500">({documents.length} stored)</span>
          </h2>
          <button
            onClick={() => onNavigate('documents')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            View all
          </button>
        </div>

        {recentDocs.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-8 text-center">
            <HardDrive className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">No documents stored locally yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Tap "Add Document" to safely import files into your private local vault.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-500 transition"
            >
              <FilePlus className="w-4 h-4" /> Import Document
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3.5 bg-white border border-slate-200/80 rounded-2xl hover:border-slate-300 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-700">
                    {doc.extension === 'pdf' ? (
                      <FileText className="w-5 h-5 text-red-500" />
                    ) : (
                      <FileImage className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-900 truncate">{doc.displayName}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700">
                        {doc.category}
                      </span>
                      <span>{(doc.sizeBytes / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span className="uppercase font-mono">{doc.extension}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onSelectDocForPrepare(doc);
                    onNavigate('prepare');
                  }}
                  className="shrink-0 text-xs font-semibold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition"
                >
                  Prepare
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Conversions */}
      {recentHistory.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-900">Recent Conversions</h2>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              History
            </button>
          </div>

          <div className="space-y-2">
            {recentHistory.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-900">{item.operation}</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                      {item.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{item.parameters}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-800">
                    {(item.outputSizeBytes / 1024).toFixed(1)} KB
                  </span>
                  <p className="text-[10px] text-slate-400">
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
