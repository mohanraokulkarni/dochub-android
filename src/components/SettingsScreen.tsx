import React, { useState } from 'react';
import {
  HardDrive,
  ShieldCheck,
  Trash2,
  CheckCircle2,
  Lock,
  Layers,
  Smartphone,
  Eye,
  Info
} from 'lucide-react';
import { StoredDocument, AppLockMode, DocumentCategory } from '../types';
import {
  getDefaultViewMode,
  setDefaultViewMode,
  getAppLockMode,
  setAppLockMode,
  setStoredPin,
  getStoredPin
} from '../utils/storage';

interface SettingsScreenProps {
  documents: StoredDocument[];
  onClearCache: () => Promise<void>;
  onOpenAndroidModal?: () => void;
}

export function SettingsScreen({
  documents,
  onClearCache,
  onOpenAndroidModal,
}: SettingsScreenProps) {
  const [clearing, setClearing] = useState(false);
  const [clearedNotice, setClearedNotice] = useState(false);

  const [viewMode, setViewModeState] = useState<'grid' | 'list'>(getDefaultViewMode());
  const [defaultCategory, setDefaultCategory] = useState<DocumentCategory>('Personal');

  const [lockMode, setLockModeState] = useState<AppLockMode>(getAppLockMode());
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');

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

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewModeState(mode);
    setDefaultViewMode(mode);
  };

  const handleLockModeSelect = (mode: AppLockMode) => {
    if (mode === 'PIN') {
      setShowPinModal(true);
    } else {
      setLockModeState(mode);
      setAppLockMode(mode);
    }
  };

  const handleSavePin = () => {
    if (pinInput.length >= 4) {
      setStoredPin(pinInput);
      setLockModeState('PIN');
      setAppLockMode('PIN');
      setShowPinModal(false);
      setPinInput('');
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-2xl mx-auto">
      <div className="px-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">Preferences, security and storage management</p>
      </div>

      {/* 1. Documents Preferences */}
      <div className="space-y-2 px-1">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Documents</h2>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Default View</p>
              <p className="text-xs text-slate-500">Preferred layout for documents library</p>
            </div>
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => handleViewModeChange('grid')}
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-600'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => handleViewModeChange('list')}
                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                  viewMode === 'list' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-600'
                }`}
              >
                List
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Default Category</p>
              <p className="text-xs text-slate-500">Auto-assigned when importing files</p>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
              {defaultCategory}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Privacy & Security */}
      <div className="space-y-2 px-1">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Privacy & Security</h2>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Encryption at Rest</p>
              <p className="text-xs text-slate-500">Hardware Keystore AES-256-GCM</p>
            </div>
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Active
            </span>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">App Lock</p>
                <p className="text-xs text-slate-500">Protect access upon opening</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['OFF', 'PIN', 'BIOMETRIC'] as AppLockMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleLockModeSelect(mode)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    lockMode === mode
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {mode === 'OFF' ? 'Off' : mode === 'PIN' ? 'PIN Lock' : 'Biometric'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Storage Information */}
      <div className="space-y-2 px-1">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Storage</h2>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div>
              <span className="text-slate-500 block">Documents Stored</span>
              <span className="text-sm font-bold text-slate-900">{documents.length} files</span>
            </div>
            <div>
              <span className="text-slate-500 block">Storage Used</span>
              <span className="text-sm font-bold text-slate-900">
                {mb >= 1 ? `${mb.toFixed(2)} MB` : `${kb.toFixed(1)} KB`}
              </span>
            </div>
          </div>

          <button
            onClick={handleClear}
            disabled={clearing}
            className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 py-2.5 rounded-xl transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-500" />
            {clearing ? 'Clearing temporary files...' : 'Clear Temporary Files'}
          </button>

          {clearedNotice && (
            <p className="text-xs text-emerald-600 flex items-center justify-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Temporary cache cleared successfully.
            </p>
          )}
        </div>
      </div>

      {/* 4. About & Privacy Statement */}
      <div className="space-y-2 px-1">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">About</h2>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900">DocHub</h3>
            <p className="text-xs text-slate-500">Version 1.0.0 (Offline Edition)</p>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            DocHub is a 100% offline personal document manager. Documents remain exclusively on your device, protected by authenticated encryption. Zero network traffic, zero analytics, zero external cloud storage.
          </p>
          {onOpenAndroidModal && (
            <button
              onClick={onOpenAndroidModal}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 pt-1"
            >
              <Smartphone className="w-3.5 h-3.5" /> Android APK Build Documentation
            </button>
          )}
        </div>
      </div>

      {/* PIN Setup Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-xs w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Set 4-Digit PIN</h3>
            <div>
              <input
                type="password"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full text-center text-2xl tracking-widest py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1 text-center">4 to 6 digits required</p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPinModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePin}
                disabled={pinInput.length < 4}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
              >
                Save PIN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
