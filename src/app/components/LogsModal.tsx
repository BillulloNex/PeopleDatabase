'use client';

import { IngestionRunLog } from '@/db/client';
import { X, Layers, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  runs: IngestionRunLog[];
}

export default function LogsModal({ isOpen, onClose, runs }: LogsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#0F1626] border border-slate-700/80 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col p-6 space-y-4 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            Continuous Ingestion Pipeline Logs ({runs.length})
          </h2>
          <p className="text-xs text-slate-400">
            Real-time audit trajectory of background GitHub workers, Exa discovery runs, and webhooks.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {runs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs italic">
              No background pipeline runs recorded yet.
            </div>
          ) : (
            runs.map((run) => (
              <div
                key={run.id}
                className="p-4 rounded-xl bg-[#080C14] border border-slate-800 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      run.status === 'success'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {run.status}
                    </span>
                    <span className="font-mono font-bold text-indigo-300">{run.runType}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{run.durationMs}ms</span>
                    <span>•</span>
                    <span>{new Date(run.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>

                <p className="text-slate-300 font-mono text-[11px] bg-[#0D1321] p-2 rounded border border-slate-800/60 truncate">
                  {run.queryOrSource}
                </p>

                <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
                  <span>Processed: <strong className="text-white">{run.processedCount}</strong></span>
                  <span>Created: <strong className="text-emerald-400">{run.createdCount}</strong></span>
                  <span>Merged: <strong className="text-purple-400">{run.mergedCount}</strong></span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
