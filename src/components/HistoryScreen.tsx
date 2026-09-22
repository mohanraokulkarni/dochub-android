import { useState } from 'react';
import { History, Download, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { ConversionRecord } from '../types';

interface HistoryScreenProps {
  history: ConversionRecord[];
  onClearHistory: () => Promise<void>;
}

export function HistoryScreen({ history, onClearHistory }: HistoryScreenProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Conversion History</h1>
          <p className="text-xs text-slate-500">
            {history.length} operations logged locally
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition cursor-pointer font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear Logs
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-10 text-center mt-6">
          <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No conversions recorded</p>
          <p className="text-xs text-slate-500 mt-1">
            When you convert, resize, compress, or prepare documents, audit logs appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {history.map((record) => (
            <div
              key={record.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    {record.status === 'SUCCESS' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    <h2 className="font-bold text-sm text-slate-900">{record.operation}</h2>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{record.parameters}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Source: {record.sourceName} • {new Date(record.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-slate-900 block">
                    {(record.outputSizeBytes / 1024).toFixed(1)} KB
                  </span>
                  {record.originalSizeBytes > 0 && (
                    <span className="text-[10px] text-slate-400">
                      from {(record.originalSizeBytes / 1024).toFixed(1)} KB
                    </span>
                  )}
                </div>
              </div>

              {record.outputDataUrl && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
                  <a
                    href={record.outputDataUrl}
                    download={record.outputName}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Output
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-base mb-2">Clear Conversion History?</h3>
            <p className="text-xs text-slate-600 mb-4">
              This will erase all conversion logs. Your saved documents will remain safe in storage.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await onClearHistory();
                  setShowClearConfirm(false);
                }}
                className="px-3.5 py-2 text-xs font-semibold bg-red-600 text-white rounded-xl hover:bg-red-500"
              >
                Clear All Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
