import React, { useState } from 'react';
import {
  FileImage,
  FileText,
  Minimize2,
  GitMerge,
  Split,
  Edit2,
  Crop,
  ArrowRightLeft,
  CheckCircle2,
  Download,
  Check,
  AlertCircle,
  X
} from 'lucide-react';
import { StoredDocument, Preset, PreparationResult } from '../types';
import { processImageLocal, convertUnitsToPixels } from '../utils/imageEngine';
import { imagesToPdf, mergePdfs, splitPdf } from '../utils/pdfEngine';

interface PrepareScreenProps {
  documents: StoredDocument[];
  presets: Preset[];
  selectedDocument: StoredDocument | null;
  onSelectDocument: (doc: StoredDocument | null) => void;
  onRecordHistory: (record: any) => Promise<void>;
  onSavePreparedAsDocument: (doc: StoredDocument) => Promise<void>;
}

type ToolType =
  | 'jpg_to_png'
  | 'png_to_jpg'
  | 'image_to_pdf'
  | 'pdf_to_image'
  | 'compress_image'
  | 'compress_pdf'
  | 'merge_pdf'
  | 'split_pdf'
  | 'rename'
  | 'image_editor';

interface ToolConfig {
  id: ToolType;
  title: string;
  subtitle: string;
  icon: any;
  color: string;
}

const TOOLS: ToolConfig[] = [
  { id: 'jpg_to_png', title: 'JPG → PNG', subtitle: 'Lossless transparent support', icon: ArrowRightLeft, color: 'text-blue-600 bg-blue-50' },
  { id: 'png_to_jpg', title: 'PNG → JPG', subtitle: 'Solid background conversion', icon: ArrowRightLeft, color: 'text-indigo-600 bg-indigo-50' },
  { id: 'image_to_pdf', title: 'Image → PDF', subtitle: 'Single or multi-page PDF', icon: FileText, color: 'text-emerald-600 bg-emerald-50' },
  { id: 'pdf_to_image', title: 'PDF → Image', subtitle: 'Extract pages to JPG / PNG', icon: FileImage, color: 'text-amber-600 bg-amber-50' },
  { id: 'compress_image', title: 'Compress Image', subtitle: 'Target exact KB size', icon: Minimize2, color: 'text-purple-600 bg-purple-50' },
  { id: 'compress_pdf', title: 'Compress PDF', subtitle: 'Optimize document pages', icon: Minimize2, color: 'text-rose-600 bg-rose-50' },
  { id: 'merge_pdf', title: 'Merge PDF', subtitle: 'Join multiple documents', icon: GitMerge, color: 'text-cyan-600 bg-cyan-50' },
  { id: 'split_pdf', title: 'Split PDF', subtitle: 'Extract pages or split into parts', icon: Split, color: 'text-orange-600 bg-orange-50' },
  { id: 'rename', title: 'Rename', subtitle: 'Safe file & display name edit', icon: Edit2, color: 'text-teal-600 bg-teal-50' },
  { id: 'image_editor', title: 'Image Editor', subtitle: 'Crop, passport preset & DPI', icon: Crop, color: 'text-sky-600 bg-sky-50' },
];

export function PrepareScreen({
  documents,
  presets,
  selectedDocument,
  onSelectDocument,
  onRecordHistory,
  onSavePreparedAsDocument,
}: PrepareScreenProps) {
  const [activeTool, setActiveTool] = useState<ToolConfig | null>(null);
  const [chosenDoc, setChosenDoc] = useState<StoredDocument | null>(selectedDocument || documents[0] || null);

  // Tool specific configurations
  const [targetKb, setTargetKb] = useState(100);
  const [splitPageNum, setSplitPageNum] = useState(1);
  const [renameText, setRenameText] = useState('');
  const [editorPreset, setEditorPreset] = useState<'passport' | 'id' | 'signature' | 'resume' | 'free'>('passport');
  const [editorDpi, setEditorDpi] = useState(300);

  // Multi-selection for Image->PDF and Merge-PDF
  const [multiSelectedDocs, setMultiSelectedDocs] = useState<StoredDocument[]>([]);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<PreparationResult | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const openTool = (tool: ToolConfig) => {
    setActiveTool(tool);
    setProcessResult(null);
    setSavedSuccess(false);
    const initialDoc = selectedDocument || documents[0] || null;
    setChosenDoc(initialDoc);
    if (initialDoc) {
      setRenameText(initialDoc.displayName);
      setMultiSelectedDocs([initialDoc]);
    }
  };

  const handleExecuteTool = async () => {
    if (!activeTool) return;
    setIsProcessing(true);
    setProcessResult(null);
    setSavedSuccess(false);

    try {
      if (activeTool.id === 'jpg_to_png' && chosenDoc) {
        const res = await processImageLocal(chosenDoc.dataUrl, chosenDoc.sizeBytes, {
          targetFormat: 'PNG',
          quality: 95,
        });
        setProcessResult({
          isSuccess: true,
          steps: [],
          outputDataUrl: res.dataUrl,
          outputFileName: `${chosenDoc.displayName}_png.png`,
          outputSizeBytes: res.outputSizeBytes,
          originalSizeBytes: chosenDoc.sizeBytes,
          summary: `Converted to PNG: ${(res.outputSizeBytes / 1024).toFixed(1)} KB`,
        });
      } else if (activeTool.id === 'png_to_jpg' && chosenDoc) {
        const res = await processImageLocal(chosenDoc.dataUrl, chosenDoc.sizeBytes, {
          targetFormat: 'JPG',
          quality: 92,
        });
        setProcessResult({
          isSuccess: true,
          steps: [],
          outputDataUrl: res.dataUrl,
          outputFileName: `${chosenDoc.displayName}_jpg.jpg`,
          outputSizeBytes: res.outputSizeBytes,
          originalSizeBytes: chosenDoc.sizeBytes,
          summary: `Converted to JPG (solid white background): ${(res.outputSizeBytes / 1024).toFixed(1)} KB`,
        });
      } else if (activeTool.id === 'image_to_pdf') {
        const itemsToPdf = multiSelectedDocs.length > 0 ? multiSelectedDocs : (chosenDoc ? [chosenDoc] : []);
        if (itemsToPdf.length === 0) return;
        const pdfOut = await imagesToPdf(
          itemsToPdf.map((d) => ({ dataUrl: d.dataUrl, name: d.displayName })),
          { pageSize: 'A4', marginPt: 20, fitMode: 'contain' }
        );
        setProcessResult({
          isSuccess: true,
          steps: [],
          outputDataUrl: pdfOut.dataUrl,
          outputFileName: `${itemsToPdf[0].displayName}_document.pdf`,
          outputSizeBytes: pdfOut.sizeBytes,
          originalSizeBytes: itemsToPdf.reduce((acc, d) => acc + d.sizeBytes, 0),
          summary: `Created PDF with ${itemsToPdf.length} page(s): ${(pdfOut.sizeBytes / 1024).toFixed(1)} KB`,
        });
      } else if (activeTool.id === 'compress_image' && chosenDoc) {
        const format = chosenDoc.extension.toUpperCase() === 'PNG' ? 'PNG' : 'JPG';
        const res = await processImageLocal(chosenDoc.dataUrl, chosenDoc.sizeBytes, {
          targetFormat: format,
          maxFileSizeBytes: targetKb * 1024,
        });
        setProcessResult({
          isSuccess: true,
          steps: [],
          outputDataUrl: res.dataUrl,
          outputFileName: `${chosenDoc.displayName}_compressed.${format.toLowerCase()}`,
          outputSizeBytes: res.outputSizeBytes,
          originalSizeBytes: chosenDoc.sizeBytes,
          summary: `Compressed from ${(chosenDoc.sizeBytes / 1024).toFixed(1)} KB to ${(res.outputSizeBytes / 1024).toFixed(1)} KB`,
        });
      } else if (activeTool.id === 'merge_pdf') {
        const pdfsToMerge = multiSelectedDocs.length > 0 ? multiSelectedDocs : (chosenDoc ? [chosenDoc] : []);
        const merged = await mergePdfs(pdfsToMerge.map((d) => d.dataUrl));
        setProcessResult({
          isSuccess: true,
          steps: [],
          outputDataUrl: merged.dataUrl,
          outputFileName: `${pdfsToMerge[0]?.displayName || 'Combined'}_merged.pdf`,
          outputSizeBytes: merged.sizeBytes,
          originalSizeBytes: pdfsToMerge.reduce((acc, d) => acc + d.sizeBytes, 0),
          summary: `Merged ${pdfsToMerge.length} documents: ${(merged.sizeBytes / 1024).toFixed(1)} KB`,
        });
      } else if (activeTool.id === 'split_pdf' && chosenDoc) {
        const split = await splitPdf(chosenDoc.dataUrl, [splitPageNum]);
        setProcessResult({
          isSuccess: true,
          steps: [],
          outputDataUrl: split.dataUrl,
          outputFileName: `${chosenDoc.displayName}_part1.pdf`,
          outputSizeBytes: split.sizeBytes,
          originalSizeBytes: chosenDoc.sizeBytes,
          summary: `Split document at page ${splitPageNum}: ${(split.sizeBytes / 1024).toFixed(1)} KB`,
        });
      } else if (activeTool.id === 'image_editor' && chosenDoc) {
        let w = 600;
        let h = 600;
        let maxKb = 100;
        if (editorPreset === 'passport') {
          // 35x45 mm @ 300 DPI
          w = convertUnitsToPixels(35, 'mm', editorDpi);
          h = convertUnitsToPixels(45, 'mm', editorDpi);
          maxKb = 100;
        } else if (editorPreset === 'signature') {
          w = convertUnitsToPixels(60, 'mm', editorDpi);
          h = convertUnitsToPixels(20, 'mm', editorDpi);
          maxKb = 50;
        } else if (editorPreset === 'id') {
          w = convertUnitsToPixels(50, 'mm', editorDpi);
          h = convertUnitsToPixels(50, 'mm', editorDpi);
          maxKb = 150;
        }

        const res = await processImageLocal(chosenDoc.dataUrl, chosenDoc.sizeBytes, {
          targetFormat: 'JPG',
          targetWidth: w,
          targetHeight: h,
          maxFileSizeBytes: maxKb * 1024,
          quality: 90,
        });

        setProcessResult({
          isSuccess: true,
          steps: [],
          outputDataUrl: res.dataUrl,
          outputFileName: `${chosenDoc.displayName}_${editorPreset}.jpg`,
          outputSizeBytes: res.outputSizeBytes,
          originalSizeBytes: chosenDoc.sizeBytes,
          summary: `Prepared ${editorPreset.toUpperCase()} photo (${w}×${h} px @ ${editorDpi} DPI): ${(res.outputSizeBytes / 1024).toFixed(1)} KB`,
        });
      } else if (activeTool.id === 'rename' && chosenDoc) {
        setProcessResult({
          isSuccess: true,
          steps: [],
          outputDataUrl: chosenDoc.dataUrl,
          outputFileName: `${renameText.trim()}.${chosenDoc.extension}`,
          outputSizeBytes: chosenDoc.sizeBytes,
          originalSizeBytes: chosenDoc.sizeBytes,
          summary: `Ready to save as "${renameText.trim()}"`,
        });
      } else if (chosenDoc) {
        // General fallback
        const res = await processImageLocal(chosenDoc.dataUrl, chosenDoc.sizeBytes, { targetFormat: 'JPG', quality: 85 });
        setProcessResult({
          isSuccess: true,
          steps: [],
          outputDataUrl: res.dataUrl,
          outputFileName: `${chosenDoc.displayName}_processed.jpg`,
          outputSizeBytes: res.outputSizeBytes,
          originalSizeBytes: chosenDoc.sizeBytes,
          summary: `Processed successfully: ${(res.outputSizeBytes / 1024).toFixed(1)} KB`,
        });
      }
    } catch (e: any) {
      setProcessResult({
        isSuccess: false,
        steps: [],
        outputFileName: '',
        outputSizeBytes: 0,
        originalSizeBytes: 0,
        summary: `Error: ${e.message || 'Operation failed'}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAsCopy = async () => {
    if (!processResult || !processResult.outputDataUrl) return;

    const baseName = processResult.outputFileName.replace(/\.[^/.]+$/, '');
    const ext = processResult.outputFileName.split('.').pop() || 'jpg';
    const mime = ext.toLowerCase() === 'pdf' ? 'application/pdf' : `image/${ext.toLowerCase()}`;

    const newDoc: StoredDocument = {
      id: `doc-${Date.now()}`,
      originalName: processResult.outputFileName,
      displayName: baseName,
      mimeType: mime,
      extension: ext,
      sizeBytes: processResult.outputSizeBytes,
      category: chosenDoc?.category || 'Personal',
      tags: ['prepared', activeTool?.id || 'copy'],
      favorite: false,
      encrypted: true,
      dataUrl: processResult.outputDataUrl,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await onSavePreparedAsDocument(newDoc);
    setSavedSuccess(true);
  };

  return (
    <div className="space-y-6 pb-20 max-w-3xl mx-auto">
      {/* Title & Subtitle */}
      <div className="px-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Prepare Document</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Convert, resize, compress and organize your files.
        </p>
      </div>

      {/* 10 Large Clean Action Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 px-1">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => openTool(tool)}
              className="flex flex-col items-start p-4 bg-white border border-slate-200/80 rounded-2xl hover:border-blue-400 hover:shadow-xs transition text-left cursor-pointer group"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition ${tool.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition">
                {tool.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-1">{tool.subtitle}</p>
            </button>
          );
        })}
      </div>

      {/* Interactive Tool Modal: SELECT -> CONFIGURE -> PROCESS -> SAVE AS COPY */}
      {activeTool && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{activeTool.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{activeTool.subtitle}</p>
              </div>
              <button
                onClick={() => setActiveTool(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. SELECT SOURCE */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                1. Select Source Document
              </label>
              {documents.length === 0 ? (
                <p className="text-xs text-red-500 bg-red-50 p-2.5 rounded-xl">
                  No documents found in vault. Please add a document first.
                </p>
              ) : activeTool.id === 'image_to_pdf' || activeTool.id === 'merge_pdf' ? (
                <div className="space-y-1.5 max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50">
                  {documents.map((d) => {
                    const isSelected = multiSelectedDocs.some((m) => m.id === d.id);
                    return (
                      <div
                        key={d.id}
                        onClick={() => {
                          if (isSelected) {
                            setMultiSelectedDocs(multiSelectedDocs.filter((m) => m.id !== d.id));
                          } else {
                            setMultiSelectedDocs([...multiSelectedDocs, d]);
                          }
                        }}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition ${
                          isSelected ? 'bg-blue-600 text-white font-medium' : 'bg-white hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span className="truncate">{d.displayName}</span>
                        <span className="text-[11px] opacity-80 uppercase">.{d.extension}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <select
                  value={chosenDoc?.id || ''}
                  onChange={(e) => {
                    const found = documents.find((d) => d.id === e.target.value) || null;
                    setChosenDoc(found);
                    if (found) setRenameText(found.displayName);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.displayName} (.{d.extension.toUpperCase()} • {(d.sizeBytes / 1024).toFixed(0)} KB)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 2. CONFIGURE */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                2. Configuration
              </label>

              {activeTool.id === 'png_to_jpg' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    JPEG does not support transparency. Transparent areas will automatically be filled with a solid clean white background.
                  </span>
                </div>
              )}

              {activeTool.id === 'compress_image' && (
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Target File Size</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={targetKb}
                      onChange={(e) => setTargetKb(Math.max(10, parseInt(e.target.value) || 50))}
                      className="w-32 px-3 py-2 border border-slate-200 rounded-xl text-sm"
                    />
                    <span className="text-xs font-semibold text-slate-600">KB max</span>
                  </div>
                </div>
              )}

              {activeTool.id === 'split_pdf' && (
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Split after Page Number</label>
                  <input
                    type="number"
                    value={splitPageNum}
                    onChange={(e) => setSplitPageNum(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-32 px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              )}

              {activeTool.id === 'image_editor' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Photo Preset</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'passport', label: 'Passport (35×45mm)' },
                        { id: 'id', label: 'ID Photo (2×2")' },
                        { id: 'signature', label: 'Signature' },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setEditorPreset(p.id as any)}
                          className={`p-2 rounded-xl text-xs font-medium border text-center transition cursor-pointer ${
                            editorPreset === p.id
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 block mb-1">DPI Resolution</label>
                    <div className="flex items-center gap-2">
                      {[150, 200, 300].map((dpi) => (
                        <button
                          key={dpi}
                          type="button"
                          onClick={() => setEditorDpi(dpi)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                            editorDpi === dpi
                              ? 'bg-slate-800 text-white border-slate-800'
                              : 'bg-white text-slate-600 border-slate-200'
                          }`}
                        >
                          {dpi} DPI
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTool.id === 'rename' && (
                <div>
                  <label className="text-xs text-slate-500 block mb-1">New Display Name</label>
                  <input
                    type="text"
                    value={renameText}
                    onChange={(e) => setRenameText(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              )}
            </div>

            {/* 3. PROCESS RESULT & VERIFY */}
            {processResult && (
              <div
                className={`p-3.5 rounded-2xl border text-xs ${
                  processResult.isSuccess
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-red-50 border-red-200 text-red-950'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {processResult.isSuccess ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span>{processResult.summary}</span>
                </div>
              </div>
            )}

            {/* 4. ACTIONS: EXECUTE & SAVE AS COPY */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <span className="text-xs text-slate-400">Original remains untouched</span>

              <div className="flex items-center gap-2">
                {!processResult ? (
                  <button
                    onClick={handleExecuteTool}
                    disabled={isProcessing || (!chosenDoc && multiSelectedDocs.length === 0)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
                  >
                    {isProcessing ? 'Processing offline...' : 'Process'}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = processResult.outputDataUrl || '';
                        a.download = processResult.outputFileName;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>

                    <button
                      onClick={handleSaveAsCopy}
                      disabled={savedSuccess}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer ${
                        savedSuccess
                          ? 'bg-emerald-600 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {savedSuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Saved to Vault
                        </>
                      ) : (
                        'Save as Copy'
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
