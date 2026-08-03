'use client';

import { Globe, UserCheck, Cpu, Sparkles, Plus, Layers, Download, Database } from 'lucide-react';
import { PersonRecord } from '@/db/client';

interface MLMetricsHeaderProps {
  totalCount: number;
  people: PersonRecord[];
  runsCount: number;
  onOpenIngest: () => void;
  onOpenLogs: () => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
}

export default function MLMetricsHeader({
  totalCount,
  people,
  runsCount,
  onOpenIngest,
  onOpenLogs,
  onExportCSV,
  onExportJSON
}: MLMetricsHeaderProps) {
  // Calculate average confidence score dynamically
  const meanConfidence = people.length > 0
    ? (people.reduce((acc, p) => acc + p.matchConfidence, 0) / people.length * 100).toFixed(1)
    : '96.8';

  // Extract unique data sources across current results
  const sourceDomains = Array.from(
    new Set(people.flatMap(p => (p.sources || []).map(s => s.domain.replace('www.', ''))))
  );

  return (
    <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Total Entities Stat Card */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-indigo-500/30 transition-all">
        <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
          <span>Total Entities Index</span>
          <Database className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-2">
          {totalCount.toLocaleString()}
          <span className="text-xs text-slate-400 font-normal">nodes</span>
        </div>
        <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Continuous pipeline active</span>
        </div>
      </div>

      {/* Resolution Accuracy Stat Card */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-purple-500/30 transition-all">
        <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
          <span>Mean Confidence Score</span>
          <UserCheck className="w-4 h-4 text-purple-400" />
        </div>
        <div className="text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-2">
          {meanConfidence}%
          <span className="text-xs text-purple-400 font-mono font-medium">μ-match</span>
        </div>
        <div className="text-[11px] text-purple-300/80 mt-1 truncate">
          GPT-5.6 Terra Resolution Model
        </div>
      </div>

      {/* Discovery Sources Stat Card */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800/80 shadow-lg relative overflow-hidden group hover:border-pink-500/30 transition-all">
        <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
          <span>Data Sources Coverage</span>
          <Cpu className="w-4 h-4 text-pink-400" />
        </div>
        <div className="text-2xl font-extrabold text-white tracking-tight truncate">
          {sourceDomains.length > 0 ? sourceDomains.slice(0, 3).join(' • ') : 'Exa • GitHub • Web'}
        </div>
        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
          <Globe className="w-3 h-3 text-indigo-400" />
          <span>Multi-engine provenance graph</span>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800/80 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
          <span>ML Actions</span>
          <Sparkles className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            onClick={onOpenIngest}
            className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            Ingest
          </button>
          <button
            onClick={onOpenLogs}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs border border-slate-700/80 transition-all flex items-center gap-1.5 active:scale-95"
            title="View Pipeline Run Activity Logs"
          >
            <Layers className="w-3.5 h-3.5" />
            Logs ({runsCount})
          </button>
          <div className="flex gap-1">
            <button
              onClick={onExportCSV}
              className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700/80 transition-all flex items-center gap-1"
              title="Export Dataset as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
            <button
              onClick={onExportJSON}
              className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 font-semibold text-xs border border-slate-700/80 transition-all flex items-center gap-1"
              title="Export Dataset as JSON"
            >
              JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
