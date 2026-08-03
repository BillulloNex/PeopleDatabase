'use client';

import { Database, UserCheck, Globe } from 'lucide-react';
import { PersonRecord } from '@/db/client';

interface MLMetricsHeaderProps {
  totalCount: number;
  people: PersonRecord[];
}

export default function MLMetricsHeader({ totalCount, people }: MLMetricsHeaderProps) {
  const meanConfidence =
    people.length > 0
      ? (
          (people.reduce((acc, p) => acc + p.matchConfidence, 0) / people.length) *
          100
        ).toFixed(1) + '%'
      : '—';

  const sourceDomains = Array.from(
    new Set(
      people.flatMap((p) => (p.sources || []).map((s) => s.domain.replace('www.', '')))
    )
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="card p-4">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
          <span>People in database</span>
          <Database className="w-4 h-4 text-slate-500" />
        </div>
        <div className="text-2xl font-semibold text-slate-100 tracking-tight">
          {totalCount.toLocaleString()}
        </div>
        <div className="text-xs text-slate-500 mt-1">
          {people.length.toLocaleString()} loaded in current view
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
          <span>Avg. match confidence</span>
          <UserCheck className="w-4 h-4 text-slate-500" />
        </div>
        <div className="text-2xl font-semibold text-slate-100 tracking-tight">
          {meanConfidence}
        </div>
        <div className="text-xs text-slate-500 mt-1">
          Across loaded records
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
          <span>Data sources</span>
          <Globe className="w-4 h-4 text-slate-500" />
        </div>
        <div className="text-2xl font-semibold text-slate-100 tracking-tight">
          {sourceDomains.length}
        </div>
        <div className="text-xs text-slate-500 mt-1 truncate">
          {sourceDomains.length > 0
            ? sourceDomains.slice(0, 4).join(', ')
            : 'No sources in current view'}
        </div>
      </div>
    </div>
  );
}
