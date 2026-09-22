import React, { useRef } from 'react';
import {
  FilePlus,
  Search,
  Wand2,
  FileImage,
  FileText,
  Minimize2,
  GitMerge,
  ChevronRight,
  Shield,
  Layers,
  ArrowRight
} from 'lucide-react';
import { StoredDocument, DocumentCategory } from '../types';

interface HomeScreenProps {
  documents: StoredDocument[];
  onNavigate: (tab: 'documents' | 'prepare' | 'settings') => void;
  onImportFiles: (files: FileList | File[], category?: DocumentCategory) => Promise<void>;
  onSelectDocForPrepare: (doc: StoredDocument) => void;
  onOpenAndroidModal?: () => void;
}

export function HomeScreen({
  documents,
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

  const recentDocs = documents.slice(0, 4);

  return (
    <div className="space-y-6 pb-20 max-w-2xl mx-auto">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Minimal, Calm Header */}
      <div className="pt-2 px-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">DocHub</h1>
            <p className="text-slate-500 text-sm mt-0.5">Store once. Find fast.</p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>Encrypted Vault</span>
          </div>
        </div>

        {/* 3 Primary Action Buttons */}
        <div className="mt-5 space-y-2.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold py-3.5 px-5 rounded-2xl shadow-sm transition cursor-pointer"
          >
            <FilePlus className="w-5 h-5" />
            <span>+ Add Document</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => onNavigate('documents')}
              className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-800 font-medium py-3 px-4 rounded-2xl border border-slate-200 shadow-xs transition cursor-pointer"
            >
              <Search className="w-4 h-4 text-slate-500" />
              <span>Find Documents</span>
            </button>

            <button
              onClick={() => onNavigate('prepare')}
              className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200/80 active:scale-[0.99] text-slate-800 font-medium py-3 px-4 rounded-2xl transition cursor-pointer"
            >
              <Wand2 className="w-4 h-4 text-blue-600" />
              <span>Prepare Document</span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Documents */}
      <div className="px-1">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Recent Documents
          </h2>
          {documents.length > 0 && (
            <button
              onClick={() => onNavigate('documents')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
            >
              <span>See all ({documents.length})</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {recentDocs.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-7 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Layers className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">No documents stored yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Store your ID, passport, or certificates safely offline in encrypted local storage.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl transition"
            >
              <FilePlus className="w-4 h-4" /> Import Document
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onNavigate('documents')}
                className="flex items-center justify-between p-3 bg-white border border-slate-200/80 rounded-2xl hover:border-slate-300 transition shadow-xs cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      doc.extension === 'pdf' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                    }`}
                  >
                    {doc.extension === 'pdf' ? (
                      <FileText className="w-5 h-5" />
                    ) : (
                      <FileImage className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-900 truncate group-hover:text-blue-600 transition">
                      {doc.displayName}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="font-medium text-slate-600">{doc.category}</span>
                      <span>•</span>
                      <span>{(doc.sizeBytes / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span className="uppercase font-mono text-[11px]">.{doc.extension}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDocForPrepare(doc);
                      onNavigate('prepare');
                    }}
                    className="text-xs font-semibold text-slate-700 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition"
                  >
                    Prepare
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions (clean 4-card grid) */}
      <div className="px-1">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            {
              title: 'JPG → PNG',
              desc: 'Convert format',
              icon: FileImage,
              action: () => onNavigate('prepare'),
            },
            {
              title: 'Image → PDF',
              desc: 'Multi-page document',
              icon: FileText,
              action: () => onNavigate('prepare'),
            },
            {
              title: 'Compress',
              desc: 'Target file size',
              icon: Minimize2,
              action: () => onNavigate('prepare'),
            },
            {
              title: 'Merge PDF',
              desc: 'Combine documents',
              icon: GitMerge,
              action: () => onNavigate('prepare'),
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={item.action}
                className="flex items-center gap-3 p-3.5 bg-white border border-slate-200/80 rounded-2xl hover:border-blue-400 hover:shadow-xs transition text-left cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-blue-50 group-hover:text-blue-600 text-slate-700 flex items-center justify-center shrink-0 transition">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-xs sm:text-sm text-slate-900">{item.title}</p>
                  <p className="text-[11px] text-slate-500">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Build Center Shortcut banner */}
      {onOpenAndroidModal && (
        <div className="px-1 pt-2">
          <div
            onClick={onOpenAndroidModal}
            className="flex items-center justify-between p-3.5 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition cursor-pointer shadow-xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">DocHub Native Android APK</p>
                <p className="text-[11px] text-slate-400 truncate">Hardware Keystore AES-256-GCM • 100% Offline</p>
              </div>
            </div>
            <span className="text-xs text-blue-400 font-medium shrink-0 flex items-center gap-1">
              View Guide <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
