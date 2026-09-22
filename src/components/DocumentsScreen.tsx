import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  FilePlus,
  Star,
  Trash2,
  Share2,
  Wand2,
  Download,
  Filter,
  FileText,
  FileImage,
  Eye,
  Tag,
  Check,
  X
} from 'lucide-react';
import { StoredDocument, DocumentCategory } from '../types';

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
  'Personal',
  'Other',
];

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
  const [previewDoc, setPreviewDoc] = useState<StoredDocument | null>(null);
  const [editingDoc, setEditingDoc] = useState<StoredDocument | null>(null);
  const [newTagInput, setNewTagInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredDocs = useMemo(() => {
    let list = documents;
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
          d.mimeType.toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [documents, searchQuery, selectedCategory, favoritesOnly]);

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
        // Fallback to direct download
        handleDownload(doc);
      }
    } catch {
      handleDownload(doc);
    }
  };

  const handleDownload = (doc: StoredDocument) => {
    const a = document.createElement('a');
    a.href = doc.dataUrl;
    a.download = `${doc.displayName}.${doc.extension}`;
    a.click();
  };

  return (
    <div className="space-y-4 pb-20">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onImportFiles(e.target.files, selectedCategory === 'All' ? 'Personal' : selectedCategory);
        }}
      />

      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Documents Store</h1>
          <p className="text-xs text-slate-500">
            {filteredDocs.length} of {documents.length} documents
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow transition cursor-pointer"
        >
          <FilePlus className="w-4 h-4" /> Import Document
        </button>
      </div>

      {/* Search Input (The GETTER) */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, tag, category (e.g. passport, degree)..."
          className="w-full bg-white border border-slate-200/80 rounded-2xl pl-10 pr-10 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setFavoritesOnly(!favoritesOnly)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer ${
            favoritesOnly
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Star className={`w-3 h-3 ${favoritesOnly ? 'fill-white' : ''}`} /> Favorites
        </button>

        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer ${
              selectedCategory === cat && !favoritesOnly
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Documents List */}
      {filteredDocs.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center mt-6">
          <Filter className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No documents found</p>
          <p className="text-xs text-slate-500 mt-1">
            {searchQuery
              ? `No documents matching "${searchQuery}" in ${selectedCategory}`
              : 'Start by importing your documents locally.'}
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-3 text-xs font-semibold bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-500 transition"
          >
            + Import Document Now
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-3.5 hover:border-slate-300 hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    onClick={() => setPreviewDoc(doc)}
                    className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 cursor-pointer overflow-hidden relative group"
                  >
                    {doc.extension === 'pdf' ? (
                      <FileText className="w-6 h-6 text-red-500" />
                    ) : (
                      <img
                        src={doc.dataUrl}
                        alt={doc.displayName}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                      <Eye className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <h2
                      onClick={() => setEditingDoc(doc)}
                      className="font-bold text-sm text-slate-900 truncate cursor-pointer hover:text-blue-600"
                    >
                      {doc.displayName}
                    </h2>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded">
                        {doc.category}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {(doc.sizeBytes / 1024).toFixed(1)} KB • .{doc.extension.toUpperCase()}
                      </span>
                    </div>

                    {/* Tags */}
                    {doc.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {doc.tags.map((t, i) => (
                          <span
                            key={i}
                            className="bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0.5 rounded font-medium"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Favorite Action */}
                <button
                  onClick={() => onToggleFavorite(doc.id)}
                  className="p-1.5 text-slate-400 hover:text-amber-500 transition cursor-pointer"
                >
                  <Star
                    className={`w-4 h-4 ${
                      doc.favorite ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
                    }`}
                  />
                </button>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs">
                <button
                  onClick={() => onPrepareDocument(doc)}
                  className="flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700"
                >
                  <Wand2 className="w-3.5 h-3.5" /> Prepare / Convert
                </button>

                <div className="flex items-center gap-1 text-slate-500">
                  <button
                    onClick={() => handleShare(doc)}
                    title="Share Document"
                    className="p-1.5 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDownload(doc)}
                    title="Export File"
                    className="p-1.5 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteDocument(doc.id)}
                    title="Delete"
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 shadow-2xl relative max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{previewDoc.displayName}</h3>
                <p className="text-xs text-slate-500">
                  {previewDoc.category} • {(previewDoc.sizeBytes / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 overflow-y-auto flex items-center justify-center flex-1 bg-slate-50 rounded-2xl my-3">
              {previewDoc.extension === 'pdf' ? (
                <div className="text-center p-6">
                  <FileText className="w-16 h-16 text-red-500 mx-auto mb-3" />
                  <p className="font-semibold text-sm text-slate-800">PDF Document</p>
                  <p className="text-xs text-slate-500 mt-1">Ready for viewing or page operations</p>
                  <a
                    href={previewDoc.dataUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded-xl"
                  >
                    <Eye className="w-3.5 h-3.5" /> Open in New Tab
                  </a>
                </div>
              ) : (
                <img
                  src={previewDoc.dataUrl}
                  alt={previewDoc.displayName}
                  className="max-h-[60vh] max-w-full rounded-lg object-contain shadow"
                />
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => {
                  onPrepareDocument(previewDoc);
                  setPreviewDoc(null);
                }}
                className="flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-500 transition"
              >
                <Wand2 className="w-4 h-4" /> Prepare Format
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(previewDoc)}
                  className="flex items-center gap-1 text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs font-semibold px-3 py-2.5 rounded-xl transition"
                >
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Metadata Modal */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-base mb-3">Edit Document Details</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Display Name</label>
                <input
                  type="text"
                  value={editingDoc.displayName}
                  onChange={(e) => setEditingDoc({ ...editingDoc, displayName: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Category</label>
                <select
                  value={editingDoc.category}
                  onChange={(e) =>
                    setEditingDoc({ ...editingDoc, category: e.target.value as DocumentCategory })
                  }
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Tags</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    placeholder="Add tag (e.g. visa, 2026)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTagInput.trim()) {
                        e.preventDefault();
                        if (!editingDoc.tags.includes(newTagInput.trim())) {
                          setEditingDoc({
                            ...editingDoc,
                            tags: [...editingDoc.tags, newTagInput.trim()],
                          });
                        }
                        setNewTagInput('');
                      }
                    }}
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newTagInput.trim() && !editingDoc.tags.includes(newTagInput.trim())) {
                        setEditingDoc({
                          ...editingDoc,
                          tags: [...editingDoc.tags, newTagInput.trim()],
                        });
                        setNewTagInput('');
                      }
                    }}
                    className="px-3 bg-blue-600 text-white rounded-xl text-xs font-semibold"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {editingDoc.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-lg flex items-center gap-1 font-medium"
                    >
                      #{t}
                      <button
                        type="button"
                        onClick={() =>
                          setEditingDoc({
                            ...editingDoc,
                            tags: editingDoc.tags.filter((_, i) => i !== idx),
                          })
                        }
                        className="hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setEditingDoc(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await onUpdateDocument(editingDoc);
                  setEditingDoc(null);
                }}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-500"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
