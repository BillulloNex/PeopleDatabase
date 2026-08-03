'use client';

import { useEffect } from 'react';
import { IngestionRunLog } from '@/db/client';
import { X, Layers, Clock } from 'lucide-react';

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  runs: IngestionRunLog[];
}

export default function LogsModal({ isOpen, onClose, runs }: LogsModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Ingestion logs"
    >
      <div
        className="card max-w-2xl w-full max-h-[85vh] flex flex-col p-6 space-y-4 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            Ingestion logs ({runs.length})
          </h2>
          <p className="text-sm text-slate-400">
            Recent ingestion runs from workers and webhooks.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {runs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No runs recorded yet.
            </div>
          ) : (
            runs.map((run) => (
              <div
                key={run.id}
                className="p-3.5 rounded-md inset space-y-2 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                        run.status === 'success'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : run.status === 'failed'
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {run.status.replace(/_/g, ' ')}
                    </span>
                    <span className="font-mono text-xs text-slate-300 truncate">{run.runType}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                    <Clock className="w-3 h-3" />
                    <span>{run.durationMs}ms</span>
                    <span>·</span>
                    <span>{new Date(run.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>

                <p className="text-slate-400 font-mono text-xs bg-[#0B0F17] p-2 rounded border border-slate-800/60 truncate">
                  {run.queryOrSource}
                </p>

                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span>Processed <span className="font-medium text-slate-200">{run.processedCount}</span></span>
                  <span>Created <span className="font-medium text-slate-200">{run.createdCount}</span></span>
                  <span>Merged <span className="font-medium text-slate-200">{run.mergedCount}</span></span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
