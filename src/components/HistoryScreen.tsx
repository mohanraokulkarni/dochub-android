import React from 'react';
import { Clock, CheckCircle2, XCircle, Share2, Trash2, ArrowRight } from 'lucide-react';
import { ConversionRecord } from '../types';

interface HistoryScreenProps {
  history: ConversionRecord[];
  onClearHistory: () => Promise<void>;
}

export function HistoryScreen({ history, onClearHistory }: HistoryScreenProps) {
  const [clearing, setClearing] = React.useState(false);

  const handleClear = async () => {
    if (window.confirm('Clear all conversion records? Stored documents will remain safe.')) {
      setClearing(true);
      await onClearHistory();
      setClearing(false);
    }
  };

  const handleShare = async (item: ConversionRecord) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `DocHub: ${item.operation}`,
          text: `Processed with DocHub: ${item.operation} (${item.parameters})`
        });
      } catch {
        // User cancelled or unsupported
      }
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Conversion History</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Log of all operations executed offline on your device
          </p>
        </div>
        {history.length > 0 && (
          <button
            onClick={handleClear}
            disabled={clearing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* History List */}
      {history.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400 mb-3">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">No conversions recorded yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Tools run in the Prepare section will log their verified operations and file details here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => {
            const isSuccess = item.status === 'SUCCESS';
            const dateStr = new Date(item.createdAt).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isSuccess ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    {isSuccess ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{item.operation}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isSuccess
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-0.5 font-medium">{item.parameters}</p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1.5">
                      <span>{dateStr}</span>
                      <span>•</span>
                      <span>Output: {Math.round(item.outputSizeBytes / 1024)} KB</span>
                    </div>
                  </div>
                </div>

                {isSuccess && (
                  <button
                    onClick={() => handleShare(item)}
                    className="self-end sm:self-center flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Share</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
