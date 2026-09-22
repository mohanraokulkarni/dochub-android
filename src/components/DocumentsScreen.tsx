import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  FilePlus,
  Star,
  Trash2,
  Share2,
  Wand2,
  Download,
  FileText,
  FileImage,
  Eye,
  Edit2,
  LayoutGrid,
  List as ListIcon,
  ArrowUpDown,
  X,
  Shield,
  Layers
} from 'lucide-react';
import { StoredDocument, DocumentCategory } from '../types';
import { getDefaultViewMode, setDefaultViewMode } from '../utils/storage';

interface DocumentsScreenProps {
  documents: StoredDocument[];
  onImportFiles: (files: FileList | File[], category?: DocumentCategory) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
  onToggleFavorite: (id: string) => Promise<void>;
  onUpdateDocument: (doc: StoredDocument) => Promise<void>;
  onPrepareDocument: (doc: StoredDocument) => void;
}

const CATEGORIES: ('All' | DocumentCategory)[] = [
  'All',
  'Identity',
  'Education',
  'Employment',
  'Finance',
  'Government',
  'Travel',
  'Insurance',
  'Personal',
  'Photos',
  'Certificates',
  'Uncategorized',
  'Other',
];

type SortOption = 'newest' | 'oldest' | 'name' | 'largest' | 'smallest';

export function DocumentsScreen({
  documents,
  onImportFiles,
  onDeleteDocument,
  onToggleFavorite,
  onUpdateDocument,
  onPrepareDocument,
}: DocumentsScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | DocumentCategory>('All');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(getDefaultViewMode());
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Modals
  const [detailDoc, setDetailDoc] = useState<StoredDocument | null>(null);
  const [renameDoc, setRenameDoc] = useState<StoredDocument | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<StoredDocument | null>(null);
  const [fullscreenPreviewUrl, setFullscreenPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    setDefaultViewMode(mode);
  };

  const filteredAndSortedDocs = useMemo(() => {
    let list = [...documents];
    if (favoritesOnly) {
      list = list.filter((d) => d.favorite);
    }
    if (selectedCategory !== 'All') {
      list = list.filter((d) => d.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (d) =>
          d.displayName.toLowerCase().includes(q) ||
          d.originalName.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q) ||
          d.extension.toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    switch (sortBy) {
      case 'newest':
        return list.sort((a, b) => b.createdAt - a.createdAt);
      case 'oldest':
        return list.sort((a, b) => a.createdAt - b.createdAt);
      case 'name':
        return list.sort((a, b) => a.displayName.localeCompare(b.displayName));
      case 'largest':
        return list.sort((a, b) => b.sizeBytes - a.sizeBytes);
      case 'smallest':
        return list.sort((a, b) => a.sizeBytes - b.sizeBytes);
      default:
        return list;
    }
  }, [documents, searchQuery, selectedCategory, favoritesOnly, sortBy]);

  const handleDownload = (doc: StoredDocument) => {
    const a = document.createElement('a');
    a.href = doc.dataUrl;
    a.download = `${doc.displayName}.${doc.extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async (doc: StoredDocument) => {
    try {
      const blob = await fetch(doc.dataUrl).then((r) => r.blob());
      const file = new File([blob], `${doc.displayName}.${doc.extension}`, { type: doc.mimeType });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: doc.displayName,
          text: `Document: ${doc.displayName}`,
        });
      } else {
        handleDownload(doc);
      }
    } catch {
      handleDownload(doc);
    }
  };

  return (
    <div className="space-y-4 pb-20 max-w-4xl mx-auto">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onImportFiles(e.target.files, selectedCategory === 'All' ? undefined : selectedCategory);
          }
        }}
      />

      {/* Top Bar / Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, category, or tag..."
            className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => toggleViewMode('grid')}
            title="Grid View"
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              viewMode === 'grid' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => toggleViewMode('list')}
            title="List View"
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              viewMode === 'list' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ListIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Sort Menu */}
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            title="Sort"
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>

          {showSortMenu && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 text-xs">
              {[
                { label: 'Newest first', val: 'newest' },
                { label: 'Oldest first', val: 'oldest' },
                { label: 'Name (A-Z)', val: 'name' },
                { label: 'Largest size', val: 'largest' },
                { label: 'Smallest size', val: 'smallest' },
              ].map((s) => (
                <button
                  key={s.val}
                  onClick={() => {
                    setSortBy(s.val as SortOption);
                    setShowSortMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-slate-50 transition ${
                    sortBy === s.val ? 'font-bold text-blue-600 bg-blue-50/50' : 'text-slate-700'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Add Document button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium px-3.5 py-2.5 rounded-xl text-sm transition cursor-pointer shadow-xs"
        >
          <FilePlus className="w-4 h-4" />
          <span className="hidden sm:inline">Add</span>
        </button>
      </div>

      {/* Category Filter Chips & Favorites */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setFavoritesOnly(!favoritesOnly)}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer border ${
            favoritesOnly
              ? 'bg-amber-50 text-amber-900 border-amber-300'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${favoritesOnly ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
          <span>Favorites</span>
        </button>

        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer border ${
              selectedCategory === cat
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Count & stats */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>{filteredAndSortedDocs.length} stored documents</span>
        <span className="flex items-center gap-1 text-slate-400">
          <Shield className="w-3.5 h-3.5 text-emerald-500" /> AES-256-GCM Encrypted
        </span>
      </div>

      {/* Document Items List / Grid */}
      {filteredAndSortedDocs.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No documents yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Add your important documents and keep them organized in one place.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-4 py-2 rounded-xl transition cursor-pointer"
          >
            <FilePlus className="w-4 h-4" /> + Add Document
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredAndSortedDocs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => setDetailDoc(doc)}
              className="bg-white border border-slate-200/80 rounded-2xl p-3 hover:border-slate-300 hover:shadow-xs transition cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      doc.extension === 'pdf' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                    }`}
                  >
                    {doc.extension === 'pdf' ? <FileText className="w-5 h-5" /> : <FileImage className="w-5 h-5" />}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(doc.id);
                    }}
                    className="p-1 text-slate-300 hover:text-amber-500 transition"
                  >
                    <Star className={`w-4 h-4 ${doc.favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>
                </div>

                <h4 className="font-semibold text-xs sm:text-sm text-slate-900 mt-2.5 truncate group-hover:text-blue-600 transition">
                  {doc.displayName}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  .{doc.extension.toUpperCase()} • {(doc.sizeBytes / 1024).toFixed(1)} KB
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="font-medium text-slate-500">{doc.category}</span>
                <span className="text-blue-600 font-semibold group-hover:underline">View</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAndSortedDocs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => setDetailDoc(doc)}
              className="bg-white border border-slate-200/80 rounded-2xl p-3 flex items-center justify-between hover:border-slate-300 hover:shadow-xs transition cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    doc.extension === 'pdf' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  {doc.extension === 'pdf' ? <FileText className="w-5 h-5" /> : <FileImage className="w-5 h-5" />}
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

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(doc.id);
                  }}
                  className="p-1.5 text-slate-300 hover:text-amber-500 transition"
                >
                  <Star className={`w-4 h-4 ${doc.favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Detail Modal */}
      {detailDoc && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-snug">{detailDoc.displayName}</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">{detailDoc.originalName}</p>
              </div>
              <button
                onClick={() => setDetailDoc(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* In-app Preview */}
            <div className="w-full h-48 bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-200 relative group">
              {detailDoc.dataUrl && detailDoc.mimeType.startsWith('image/') ? (
                <img
                  src={detailDoc.dataUrl}
                  alt={detailDoc.displayName}
                  className="w-full h-full object-contain cursor-pointer"
                  onClick={() => setFullscreenPreviewUrl(detailDoc.dataUrl)}
                />
              ) : (
                <div className="text-center p-4">
                  <FileText className="w-10 h-10 text-red-500 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">Protected Document</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Stored inside encrypted private vault</p>
                </div>
              )}
            </div>

            {/* Metadata Table */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <div>
                <span className="text-slate-400 block">Category</span>
                <span className="font-semibold text-slate-800">{detailDoc.category}</span>
              </div>
              <div>
                <span className="text-slate-400 block">File Size</span>
                <span className="font-semibold text-slate-800">{(detailDoc.sizeBytes / 1024).toFixed(1)} KB</span>
              </div>
              <div>
                <span className="text-slate-400 block">Format</span>
                <span className="font-semibold text-slate-800 uppercase font-mono">.{detailDoc.extension}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Modified</span>
                <span className="font-semibold text-slate-800">
                  {new Date(detailDoc.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Actions: VIEW, RENAME, PREPARE, SHARE, EXPORT, DELETE */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                onClick={() => {
                  setFullscreenPreviewUrl(detailDoc.dataUrl);
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-xl text-xs transition cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" /> View
              </button>

              <button
                onClick={() => {
                  setRenameInput(detailDoc.displayName);
                  setRenameDoc(detailDoc);
                  setDetailDoc(null);
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-xl text-xs transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" /> Rename
              </button>

              <button
                onClick={() => {
                  onPrepareDocument(detailDoc);
                  setDetailDoc(null);
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                <Wand2 className="w-3.5 h-3.5" /> Prepare
              </button>

              <button
                onClick={() => handleShare(detailDoc)}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-xl text-xs transition cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" /> Share
              </button>

              <button
                onClick={() => handleDownload(detailDoc)}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-xl text-xs transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Export
              </button>

              <button
                onClick={() => {
                  setDeleteConfirmDoc(detailDoc);
                  setDetailDoc(null);
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-xl text-xs transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Dialog */}
      {renameDoc && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Rename Document</h3>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Display Name</label>
              <input
                type="text"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">Extension: .{renameDoc.extension}</p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRenameDoc(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (renameInput.trim()) {
                    onUpdateDocument({
                      ...renameDoc,
                      displayName: renameInput.trim(),
                      updatedAt: Date.now(),
                    });
                  }
                  setRenameDoc(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmDoc && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Delete Document?</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to permanently delete "{deleteConfirmDoc.displayName}"? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmDoc(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteDocument(deleteConfirmDoc.id);
                  setDeleteConfirmDoc(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Preview Modal */}
      {fullscreenPreviewUrl && (
        <div
          onClick={() => setFullscreenPreviewUrl(null)}
          className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 cursor-pointer"
        >
          <button
            onClick={() => setFullscreenPreviewUrl(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={fullscreenPreviewUrl}
            alt="Preview"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
