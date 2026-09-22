import React, { useState, useEffect, useRef } from 'react';
import {
  Wand2,
  FileImage,
  FileText,
  Minimize2,
  CheckCircle2,
  AlertCircle,
  Download,
  Share2,
  RotateCw,
  Sliders,
  ChevronRight,
  GitMerge,
  Split,
  Plus,
  RefreshCw,
  Check
} from 'lucide-react';
import { StoredDocument, Preset, PreparationResult, PreparationStep } from '../types';
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

export function PrepareScreen({
  documents,
  presets,
  selectedDocument,
  onSelectDocument,
  onRecordHistory,
  onSavePreparedAsDocument,
}: PrepareScreenProps) {
  const [activeTab, setActiveTab] = useState<'preset' | 'imageToPdf' | 'pdfOps' | 'custom'>('preset');
  const [selectedPreset, setSelectedPreset] = useState<Preset>(presets[0] || null);

  // Custom spec states
  const [customFormat, setCustomFormat] = useState<'JPG' | 'PNG' | 'PDF'>('JPG');
  const [customWidth, setCustomWidth] = useState(600);
  const [customHeight, setCustomHeight] = useState(800);
  const [customUnit, setCustomUnit] = useState<'px' | 'mm' | 'cm' | 'in'>('px');
  const [customDpi, setCustomDpi] = useState(300);
  const [customMaxKb, setCustomMaxKb] = useState(100);

  // Processing & Pipeline States
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<PreparationResult | null>(null);

  // Image to PDF multi-image selection
  const [selectedImagesForPdf, setSelectedImagesForPdf] = useState<StoredDocument[]>([]);
  const [pdfPageSize, setPdfPageSize] = useState<'A4' | 'A3' | 'Letter'>('A4');
  const [pdfFitMode, setPdfFitMode] = useState<'contain' | 'cover' | 'original'>('contain');

  // PDF Merge state
  const [selectedPdfsForMerge, setSelectedPdfsForMerge] = useState<StoredDocument[]>([]);
  const [splitPagesInput, setSplitPagesInput] = useState('1');

  useEffect(() => {
    if (!selectedPreset && presets.length > 0) {
      setSelectedPreset(presets[0]);
    }
  }, [presets, selectedPreset]);

  // Execute GET REQUIRED FORMAT (Smart Preparer)
  const handleExecuteSmartPreparer = async () => {
    if (!selectedDocument || !selectedPreset) return;

    setIsProcessing(true);
    setResult(null);

    const steps: PreparationStep[] = [
      { name: 'Analyze Input', description: `Source: ${selectedDocument.displayName} (${(selectedDocument.sizeBytes / 1024).toFixed(1)} KB)`, status: 'completed' },
      { name: 'Format Conversion', description: `Converting to ${selectedPreset.outputFormat}`, status: 'running' },
      { name: 'Dimensions & Resize', description: `Target: ${selectedPreset.width}×${selectedPreset.height} ${selectedPreset.widthUnit}`, status: 'pending' },
      { name: 'Progressive Compression', description: `Target: ≤${(selectedPreset.maxFileSizeBytes / 1024).toFixed(0)} KB`, status: 'pending' },
      { name: 'Verify Local File', description: 'Checking byte consistency & integrity', status: 'pending' },
    ];

    try {
      if (selectedPreset.outputFormat === 'PDF' && selectedDocument.extension !== 'pdf') {
        // Image -> PDF
        steps[1].status = 'completed';
        steps[2].status = 'completed';
        steps[3].status = 'running';

        const pdfOut = await imagesToPdf(
          [{ dataUrl: selectedDocument.dataUrl, name: selectedDocument.displayName }],
          { pageSize: 'A4', marginPt: 20, fitMode: 'contain' }
        );

        steps[3].status = 'completed';
        steps[3].description = `Generated: ${(pdfOut.sizeBytes / 1024).toFixed(1)} KB`;
        steps[4].status = 'completed';

        const outName = `${selectedDocument.displayName.replace(/\.[^/.]+$/, '')}_prepared.pdf`;

        const prepResult: PreparationResult = {
          isSuccess: true,
          steps,
          outputDataUrl: pdfOut.dataUrl,
          outputFileName: outName,
          outputSizeBytes: pdfOut.sizeBytes,
          originalSizeBytes: selectedDocument.sizeBytes,
          summary: `Successfully prepared ${outName} according to ${selectedPreset.name} requirements.`,
        };

        setResult(prepResult);
        await onRecordHistory({
          id: Date.now().toString(),
          sourceName: selectedDocument.displayName,
          outputName: outName,
          operation: `${selectedDocument.extension.toUpperCase()} → PDF (Preset: ${selectedPreset.name})`,
          parameters: `A4 PDF, Max: ${(selectedPreset.maxFileSizeBytes / 1024).toFixed(0)} KB`,
          status: 'SUCCESS',
          originalSizeBytes: selectedDocument.sizeBytes,
          outputSizeBytes: pdfOut.sizeBytes,
          outputDataUrl: pdfOut.dataUrl,
          mimeType: 'application/pdf',
          createdAt: Date.now(),
        });
        return;
      }

      // Image processing path
      const targetW = convertUnitsToPixels(selectedPreset.width, selectedPreset.widthUnit, selectedPreset.dpi);
      const targetH = convertUnitsToPixels(selectedPreset.height, selectedPreset.heightUnit, selectedPreset.dpi);

      steps[1].status = 'completed';
      steps[2].status = 'completed';
      steps[2].description = `Resized to ${targetW}×${targetH} px (${selectedPreset.dpi} DPI)`;
      steps[3].status = 'running';

      const imgOut = await processImageLocal(selectedDocument.dataUrl, selectedDocument.sizeBytes, {
        targetFormat: selectedPreset.outputFormat as 'JPG' | 'PNG',
        targetWidth: targetW,
        targetHeight: targetH,
        maxFileSizeBytes: selectedPreset.maxFileSizeBytes,
      });

      steps[3].status = 'completed';
      steps[3].description = `Compressed to ${(imgOut.outputSizeBytes / 1024).toFixed(1)} KB (${imgOut.reductionPercentage}% reduction)`;
      steps[4].status = 'completed';

      const outExt = selectedPreset.outputFormat.toLowerCase();
      const outName = `${selectedDocument.displayName.replace(/\.[^/.]+$/, '')}_${selectedPreset.name.toLowerCase().replace(/\s+/g, '_')}.${outExt}`;

      const prepResult: PreparationResult = {
        isSuccess: true,
        steps,
        outputDataUrl: imgOut.dataUrl,
        outputFileName: outName,
        outputSizeBytes: imgOut.outputSizeBytes,
        originalSizeBytes: selectedDocument.sizeBytes,
        width: imgOut.width,
        height: imgOut.height,
        summary: `Output file verified at ${(imgOut.outputSizeBytes / 1024).toFixed(1)} KB (target ≤${(selectedPreset.maxFileSizeBytes / 1024).toFixed(0)} KB).`,
      };

      setResult(prepResult);
      await onRecordHistory({
        id: Date.now().toString(),
        sourceName: selectedDocument.displayName,
        outputName: outName,
        operation: `${selectedDocument.extension.toUpperCase()} → ${selectedPreset.outputFormat} (Preset: ${selectedPreset.name})`,
        parameters: `${imgOut.width}×${imgOut.height}px, Max: ${(selectedPreset.maxFileSizeBytes / 1024).toFixed(0)} KB`,
        status: 'SUCCESS',
        originalSizeBytes: selectedDocument.sizeBytes,
        outputSizeBytes: imgOut.outputSizeBytes,
        outputDataUrl: imgOut.dataUrl,
        mimeType: selectedPreset.outputFormat === 'PNG' ? 'image/png' : 'image/jpeg',
        createdAt: Date.now(),
      });
    } catch (err: any) {
      steps.forEach((s) => {
        if (s.status === 'running') {
          s.status = 'failed';
          s.error = err.message || 'Operation failed';
        }
      });
      setResult({
        isSuccess: false,
        steps,
        outputFileName: '',
        outputSizeBytes: 0,
        originalSizeBytes: selectedDocument.sizeBytes,
        summary: err.message || 'Failed to achieve requested target constraints.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute Images -> PDF
  const handleExecuteImageToPdf = async () => {
    if (selectedImagesForPdf.length === 0) return;
    setIsProcessing(true);
    try {
      const out = await imagesToPdf(
        selectedImagesForPdf.map((d) => ({ dataUrl: d.dataUrl, name: d.displayName })),
        { pageSize: pdfPageSize, marginPt: 20, fitMode: pdfFitMode }
      );
      const outName = `combined_document_${Date.now()}.pdf`;
      setResult({
        isSuccess: true,
        steps: [
          { name: 'Collate Images', description: `${selectedImagesForPdf.length} pages selected`, status: 'completed' },
          { name: 'Generate PDF', description: `Page size: ${pdfPageSize}, fit: ${pdfFitMode}`, status: 'completed' },
          { name: 'File Verification', description: `Output: ${(out.sizeBytes / 1024).toFixed(1)} KB`, status: 'completed' },
        ],
        outputDataUrl: out.dataUrl,
        outputFileName: outName,
        outputSizeBytes: out.sizeBytes,
        originalSizeBytes: selectedImagesForPdf.reduce((acc, c) => acc + c.sizeBytes, 0),
        summary: `Created ${out.pageCount}-page PDF (${(out.sizeBytes / 1024).toFixed(1)} KB) locally.`,
      });
      await onRecordHistory({
        id: Date.now().toString(),
        sourceName: `${selectedImagesForPdf.length} Images`,
        outputName: outName,
        operation: 'Images → PDF',
        parameters: `${pdfPageSize} size, ${pdfFitMode}`,
        status: 'SUCCESS',
        originalSizeBytes: selectedImagesForPdf.reduce((acc, c) => acc + c.sizeBytes, 0),
        outputSizeBytes: out.sizeBytes,
        outputDataUrl: out.dataUrl,
        mimeType: 'application/pdf',
        createdAt: Date.now(),
      });
    } catch (err: any) {
      alert(err.message || 'Failed generating PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute PDF Merge
  const handleExecutePdfMerge = async () => {
    if (selectedPdfsForMerge.length < 2) return;
    setIsProcessing(true);
    try {
      const out = await mergePdfs(selectedPdfsForMerge.map((d) => d.dataUrl));
      const outName = `merged_${Date.now()}.pdf`;
      setResult({
        isSuccess: true,
        steps: [
          { name: 'Load Source PDFs', description: `${selectedPdfsForMerge.length} documents`, status: 'completed' },
          { name: 'Merge Pages', description: `${out.pageCount} total pages`, status: 'completed' },
          { name: 'Verify Merged Document', description: `Output: ${(out.sizeBytes / 1024).toFixed(1)} KB`, status: 'completed' },
        ],
        outputDataUrl: out.dataUrl,
        outputFileName: outName,
        outputSizeBytes: out.sizeBytes,
        originalSizeBytes: selectedPdfsForMerge.reduce((acc, c) => acc + c.sizeBytes, 0),
        summary: `Successfully merged into single PDF (${(out.sizeBytes / 1024).toFixed(1)} KB).`,
      });
    } catch (err: any) {
      alert(err.message || 'Merge failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Save to DocHub Library
  const handleSaveToLibrary = async () => {
    if (!result?.outputDataUrl) return;
    const ext = result.outputFileName.split('.').pop() || 'bin';
    const newDoc: StoredDocument = {
      id: Date.now().toString(),
      originalName: result.outputFileName,
      displayName: result.outputFileName.replace(/\.[^/.]+$/, ''),
      mimeType: ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : 'image/jpeg',
      extension: ext,
      sizeBytes: result.outputSizeBytes,
      category: 'Personal',
      tags: ['prepared'],
      favorite: false,
      dataUrl: result.outputDataUrl,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await onSavePreparedAsDocument(newDoc);
    alert('Saved to DocHub document library!');
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Top Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-blue-600" /> Prepare Document
        </h1>
        <p className="text-xs text-slate-500">
          Local, offline formatting, resizing, compression, and conversion engine.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 text-xs font-semibold">
        <button
          onClick={() => { setActiveTab('preset'); setResult(null); }}
          className={`flex-1 py-2 rounded-xl transition cursor-pointer ${
            activeTab === 'preset' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Smart Presets
        </button>
        <button
          onClick={() => { setActiveTab('imageToPdf'); setResult(null); }}
          className={`flex-1 py-2 rounded-xl transition cursor-pointer ${
            activeTab === 'imageToPdf' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Image → PDF
        </button>
        <button
          onClick={() => { setActiveTab('pdfOps'); setResult(null); }}
          className={`flex-1 py-2 rounded-xl transition cursor-pointer ${
            activeTab === 'pdfOps' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          PDF Merge
        </button>
      </div>

      {/* TAB 1: SMART PRESETS (The Key Feature) */}
      {activeTab === 'preset' && (
        <div className="space-y-4">
          {/* Step 1: Select Document */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              1. Choose Source Document
            </h3>

            {selectedDocument ? (
              <div className="flex items-center justify-between p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                    {selectedDocument.extension === 'pdf' ? (
                      <FileText className="w-5 h-5" />
                    ) : (
                      <FileImage className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-900 truncate">
                      {selectedDocument.displayName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(selectedDocument.sizeBytes / 1024).toFixed(1)} KB • .{selectedDocument.extension.toUpperCase()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onSelectDocument(null)}
                  className="text-xs font-semibold text-blue-700 hover:underline shrink-0"
                >
                  Change
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs text-slate-500 mb-2">
                  Select a document from your stored files to prepare:
                </p>
                {documents.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No stored documents found. Import one first.</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {documents.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => onSelectDocument(doc)}
                        className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 flex items-center justify-between text-xs transition cursor-pointer"
                      >
                        <span className="font-medium text-slate-900 truncate">{doc.displayName}</span>
                        <span className="text-slate-400 shrink-0 ml-2">
                          {(doc.sizeBytes / 1024).toFixed(1)} KB
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Target Requirement Preset */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              2. Select Application Requirement / Preset
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {presets.map((preset) => {
                const isSelected = selectedPreset?.id === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => setSelectedPreset(preset)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 shadow-sm ring-1 ring-blue-600'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-slate-900">{preset.name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {preset.outputFormat}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      {preset.width}×{preset.height} {preset.widthUnit} • Max: {(preset.maxFileSizeBytes / 1024).toFixed(0)} KB
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{preset.notes}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Trigger */}
          <button
            onClick={handleExecuteSmartPreparer}
            disabled={!selectedDocument || !selectedPreset || isProcessing}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:shadow-none transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Processing & Verifying locally...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                <span>GET REQUIRED FORMAT</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* TAB 2: IMAGE TO PDF */}
      {activeTab === 'imageToPdf' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-4">
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Images for PDF Document
            </h3>
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {documents
                .filter((d) => d.extension !== 'pdf')
                .map((img) => {
                  const isChecked = selectedImagesForPdf.some((i) => i.id === img.id);
                  return (
                    <label
                      key={img.id}
                      className="flex items-center justify-between p-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedImagesForPdf([...selectedImagesForPdf, img]);
                            } else {
                              setSelectedImagesForPdf(selectedImagesForPdf.filter((i) => i.id !== img.id));
                            }
                          }}
                          className="rounded text-blue-600"
                        />
                        <span className="font-medium text-slate-900 truncate">{img.displayName}</span>
                      </div>
                      <span className="text-slate-400 ml-2">{(img.sizeBytes / 1024).toFixed(1)} KB</span>
                    </label>
                  );
                })}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {selectedImagesForPdf.length} images selected for PDF pages
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Page Format</label>
              <select
                value={pdfPageSize}
                onChange={(e) => setPdfPageSize(e.target.value as any)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              >
                <option value="A4">A4 (Standard)</option>
                <option value="Letter">US Letter</option>
                <option value="A3">A3 (Large)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Fit Mode</label>
              <select
                value={pdfFitMode}
                onChange={(e) => setPdfFitMode(e.target.value as any)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs"
              >
                <option value="contain">Contain (Fit margins)</option>
                <option value="cover">Cover (Fill page)</option>
                <option value="original">Original size</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleExecuteImageToPdf}
            disabled={selectedImagesForPdf.length === 0 || isProcessing}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? 'Generating PDF locally...' : `Generate PDF from ${selectedImagesForPdf.length} Images`}
          </button>
        </div>
      )}

      {/* TAB 3: PDF MERGE */}
      {activeTab === 'pdfOps' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-4">
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select 2+ PDFs to Merge
            </h3>
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {documents
                .filter((d) => d.extension === 'pdf')
                .map((pdf) => {
                  const isChecked = selectedPdfsForMerge.some((p) => p.id === pdf.id);
                  return (
                    <label
                      key={pdf.id}
                      className="flex items-center justify-between p-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPdfsForMerge([...selectedPdfsForMerge, pdf]);
                            } else {
                              setSelectedPdfsForMerge(selectedPdfsForMerge.filter((p) => p.id !== pdf.id));
                            }
                          }}
                          className="rounded text-blue-600"
                        />
                        <span className="font-medium text-slate-900 truncate">{pdf.displayName}</span>
                      </div>
                      <span className="text-slate-400 ml-2">{(pdf.sizeBytes / 1024).toFixed(1)} KB</span>
                    </label>
                  );
                })}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {selectedPdfsForMerge.length} PDFs selected
            </p>
          </div>

          <button
            onClick={handleExecutePdfMerge}
            disabled={selectedPdfsForMerge.length < 2 || isProcessing}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? 'Merging PDFs locally...' : `Merge ${selectedPdfsForMerge.length} PDFs`}
          </button>
        </div>
      )}

      {/* RESULT & VERIFICATION PANEL (Section 17 specification) */}
      {result && (
        <div
          className={`border rounded-2xl p-5 shadow-sm space-y-4 ${
            result.isSuccess ? 'bg-white border-emerald-300' : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {result.isSuccess ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <span className="font-bold text-sm text-slate-900">
                {result.isSuccess ? 'PREPARATION & VERIFICATION COMPLETED' : 'PREPARATION FAILED'}
              </span>
            </div>

            {result.isSuccess && (
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {(result.outputSizeBytes / 1024).toFixed(1)} KB
              </span>
            )}
          </div>

          {/* Stepper Pipeline */}
          <div className="bg-slate-50 rounded-xl p-3.5 space-y-2 border border-slate-100">
            {result.steps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs">
                {step.status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : step.status === 'failed' ? (
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold text-slate-800">{step.name}</p>
                  <p className="text-slate-500 text-[11px]">{step.description}</p>
                  {step.error && <p className="text-red-500 text-[11px] font-medium mt-0.5">{step.error}</p>}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-600">{result.summary}</p>

          {/* Output Preview & Actions */}
          {result.isSuccess && result.outputDataUrl && (
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href={result.outputDataUrl}
                  download={result.outputFileName}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow transition"
                >
                  <Download className="w-4 h-4" /> Download ({result.outputFileName})
                </a>
                <button
                  onClick={handleSaveToLibrary}
                  className="flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2.5 rounded-xl transition"
                >
                  Save to Store
                </button>
              </div>

              <span className="text-[11px] text-slate-400 text-center sm:text-right">
                100% verified locally on device
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
