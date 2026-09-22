import { useState } from 'react';
import { HardDrive, ShieldCheck, Sliders, Smartphone, Trash2, CheckCircle2 } from 'lucide-react';
import { Preset, StoredDocument } from '../types';

interface SettingsScreenProps {
  documents: StoredDocument[];
  presets: Preset[];
  onClearCache: () => Promise<void>;
}

export function SettingsScreen({ documents, presets, onClearCache }: SettingsScreenProps) {
  const [clearing, setClearing] = useState(false);
  const [clearedNotice, setClearedNotice] = useState(false);

  const totalBytes = documents.reduce((sum, d) => sum + d.sizeBytes, 0);
  const kb = totalBytes / 1024;
  const mb = kb / 1024;

  const handleClear = async () => {
    setClearing(true);
    await onClearCache();
    setClearing(false);
    setClearedNotice(true);
    setTimeout(() => setClearedNotice(false), 3000);
  };

  return (
    <div className="space-y-4 pb-20">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Settings & Storage</h1>
        <p className="text-xs text-slate-500">Device storage, offline rules, and system presets</p>
      </div>

      {/* Storage Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900">Device Local Storage</h2>
            <p className="text-xs text-slate-500">Private sandbox storage</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600">DocHub Storage Used:</span>
            <span className="font-bold text-slate-900">
              {mb >= 1 ? `${mb.toFixed(2)} MB` : `${kb.toFixed(1)} KB`}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-600">Documents Stored:</span>
            <span className="font-bold text-slate-900">{documents.length} files</span>
          </div>
        </div>

        <button
          onClick={handleClear}
          disabled={clearing}
          className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5 text-slate-500" />
          {clearing ? 'Clearing...' : 'Clear Temporary Cache'}
        </button>

        {clearedNotice && (
          <p className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> Cache cleared successfully.
          </p>
        )}
      </div>

      {/* Offline & Privacy Guarantee Card */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-5 shadow-sm space-y-2">
        <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
          <ShieldCheck className="w-5 h-5 text-emerald-600" /> 100% Offline & Privacy Guarantee
        </div>
        <p className="text-xs text-emerald-950/80 leading-relaxed">
          "Your documents stay on this device."
          <br /><br />
          DocHub requires <strong>ZERO internet access</strong>. All image processing, PDF generation, compression, and SQLite database storage happen entirely inside your local device's isolated application sandbox.
        </p>
      </div>

      {/* Built-in Presets */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-600" />
          <h2 className="font-bold text-sm text-slate-900">Configured Presets ({presets.length})</h2>
        </div>

        <div className="space-y-2">
          {presets.map((p) => (
            <div key={p.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <div className="flex justify-between font-semibold text-slate-800">
                <span>{p.name}</span>
                <span className="text-blue-600 uppercase">{p.outputFormat}</span>
              </div>
              <p className="text-slate-500 text-[11px] mt-0.5">
                {p.width}×{p.height} {p.widthUnit} • Max: {(p.maxFileSizeBytes / 1024).toFixed(0)} KB
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Architecture Specs */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-2">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
          <Smartphone className="w-4 h-4 text-slate-600" /> Native Android Specifications
        </div>
        <div className="text-xs text-slate-600 space-y-1">
          <p>• Language: Kotlin 2.0</p>
          <p>• UI Toolkit: Jetpack Compose + Material 3</p>
          <p>• Database: Room / SQLite</p>
          <p>• File Storage: Android Storage Access Framework (SAF)</p>
          <p>• Target SDK: 35 (Android 15+ compatible)</p>
        </div>
      </div>
    </div>
  );
}
