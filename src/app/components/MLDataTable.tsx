'use client';

import { useState } from 'react';
import {
  PersonRecord
} from '@/db/client';
import {
  CheckCircle2,
  AlertTriangle,
  Mail,
  MapPin,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Layers,
  Sparkles,
  ArrowUpDown,
  FileCode,
  ShieldCheck,
  Globe
} from 'lucide-react';

export type SortField = 'fullName' | 'matchConfidence' | 'currentCompany' | 'location' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

interface MLDataTableProps {
  people: PersonRecord[];
  loading: boolean;
  selectedPersonId: string | null;
  onSelectPerson: (person: PersonRecord) => void;
  selectedIds: string[];
  onToggleSelectId: (id: string) => void;
  onToggleSelectAll: () => void;
  onOpenIngestModal: () => void;
}

export default function MLDataTable({
  people,
  loading,
  selectedPersonId,
  onSelectPerson,
  selectedIds,
  onToggleSelectId,
  onToggleSelectAll,
  onOpenIngestModal
}: MLDataTableProps) {
  const [sortField, setSortField] = useState<SortField>('matchConfidence');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sorting logic
  const sortedPeople = [...people].sort((a, b) => {
    let valA = a[sortField] ?? '';
    let valB = b[sortField] ?? '';

    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  }

  function handleCopyId(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  const allSelected = people.length > 0 && selectedIds.length === people.length;

  if (loading) {
    return (
      <div className="relative z-10 glass-card rounded-2xl border border-slate-800 p-16 text-center space-y-4 shadow-2xl">
        <div className="relative w-12 h-12 mx-auto">
          <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          <div className="absolute inset-2 rounded-full border-2 border-purple-500/20 border-b-purple-500 animate-spin" style={{ animationDirection: 'reverse' }} />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-200">Evaluating Neural Intelligence Graph</h3>
          <p className="text-xs text-slate-400 font-mono">Running GPT-5.6 Terra resolution algorithms...</p>
        </div>
      </div>
    );
  }

  if (people.length === 0) {
    return (
      <div className="relative z-10 glass-card rounded-2xl border border-slate-800 p-16 text-center space-y-4 shadow-2xl">
        <Layers className="w-12 h-12 text-slate-600 mx-auto animate-bounce" />
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-200">No ML Entity Records Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            No matching entities found in the vector feature space. Adjust your filters or trigger a live Exa / GitHub crawl.
          </p>
        </div>
        <button
          onClick={onOpenIngestModal}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95 inline-flex items-center gap-1.5"
        >
          <Sparkles className="w-4 h-4" />
          Trigger Live Ingestion
        </button>
      </div>
    );
  }

  return (
    <div className="relative z-10 glass-card rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl">
      <div className="overflow-x-auto max-h-[70vh]">
        <table className="w-full text-left border-collapse">
          {/* Table Header */}
          <thead className="bg-[#0B0F17]/90 backdrop-blur-md sticky top-0 z-20 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
            <tr>
              <th className="py-3 px-3.5 w-10 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
                />
              </th>
              <th className="py-3 px-3">Entity Key</th>
              <th
                onClick={() => handleSort('fullName')}
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Entity Name & Title</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th
                onClick={() => handleSort('matchConfidence')}
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors text-right"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Match Confidence</span>
                  <ArrowUpDown className="w-3 h-3 text-indigo-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('currentCompany')}
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Company / Org</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th
                onClick={() => handleSort('location')}
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors hidden md:table-cell"
              >
                <div className="flex items-center gap-1.5">
                  <span>Location</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th className="py-3 px-4 hidden lg:table-cell">Skill Features</th>
              <th className="py-3 px-4 hidden xl:table-cell">Data Sources</th>
              <th className="py-3 px-4 text-center">Outreach</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {sortedPeople.map((person) => {
              const isSelectedRow = selectedPersonId === person.id;
              const isChecked = selectedIds.includes(person.id);
              const confidencePct = Math.round(person.matchConfidence * 100);

              // Confidence color logic
              let confBadgeBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
              let confBarBg = 'bg-emerald-400';
              if (confidencePct < 70) {
                confBadgeBg = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
                confBarBg = 'bg-rose-400';
              } else if (confidencePct < 90) {
                confBadgeBg = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                confBarBg = 'bg-amber-400';
              }

              return (
                <tr
                  key={person.id}
                  onClick={() => onSelectPerson(person)}
                  className={`group cursor-pointer transition-all duration-150 ${
                    isSelectedRow
                      ? 'bg-indigo-950/40 border-l-4 border-l-indigo-500'
                      : isChecked
                      ? 'bg-indigo-950/20'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  {/* Selection Checkbox */}
                  <td
                    className="py-3.5 px-3.5 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleSelectId(person.id)}
                      className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
                    />
                  </td>

                  {/* Entity Key / ID */}
                  <td className="py-3.5 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate max-w-[80px]" title={person.id}>
                        {person.id.slice(0, 8)}...
                      </span>
                      <button
                        onClick={(e) => handleCopyId(e, person.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-indigo-400 p-0.5"
                        title="Copy full UUID"
                      >
                        {copiedId === person.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Entity Name & Avatar */}
                  <td className="py-3.5 px-4 font-medium">
                    <div className="flex items-center gap-3">
                      <img
                        src={person.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(person.fullName)}`}
                        alt={person.fullName}
                        className="w-9 h-9 rounded-xl object-cover border border-slate-700/60 shadow-sm shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-100 truncate flex items-center gap-1.5 text-sm">
                          <span>{person.fullName}</span>
                          {person.matchConfidence > 0.9 && (
                            <span title="High Confidence Entity">
                              <ShieldCheck className="w-4 h-4 text-emerald-400 inline shrink-0" />
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-indigo-400 font-medium truncate">
                          {person.currentTitle || 'Professional'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Match Confidence Score */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex flex-col items-end">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${confBadgeBg} font-mono shadow-sm`}>
                        {confidencePct}%
                      </span>
                      {/* Mini confidence progress bar */}
                      <div className="w-16 h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full ${confBarBg} rounded-full`}
                          style={{ width: `${confidencePct}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Company / Org */}
                  <td className="py-3.5 px-4 text-slate-300 truncate max-w-[140px]">
                    {person.currentCompany ? (
                      <span className="font-medium text-slate-200">{person.currentCompany}</span>
                    ) : (
                      <span className="text-slate-500 italic">Independent</span>
                    )}
                  </td>

                  {/* Location */}
                  <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap hidden md:table-cell">
                    {person.location ? (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate max-w-[120px]">{person.location}</span>
                      </div>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  {/* Top Skill Features */}
                  <td className="py-3.5 px-4 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {person.skills.slice(0, 3).map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 text-[10px] font-semibold rounded-md bg-slate-800/90 text-slate-300 border border-slate-700/60 truncate max-w-[90px]"
                        >
                          {skill}
                        </span>
                      ))}
                      {person.skills.length > 3 && (
                        <span className="px-1 py-0.5 text-[10px] text-slate-500 font-mono">
                          +{person.skills.length - 3}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Data Sources Badges */}
                  <td className="py-3.5 px-4 hidden xl:table-cell whitespace-nowrap">
                    <div className="flex items-center -space-x-1.5">
                      {(person.sources && person.sources.length > 0) ? (
                        person.sources.slice(0, 4).map((source, idx) => {
                          const domain = source.domain.replace('www.', '');
                          return (
                            <span
                              key={idx}
                              className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-slate-800 text-indigo-300 border border-slate-700 shadow-sm"
                              title={source.url}
                            >
                              {domain}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-slate-600 text-[11px]">Exa Discovery</span>
                      )}
                    </div>
                  </td>

                  {/* Outreach Status */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      person.outreachStatus === 'replied'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : person.outreachStatus === 'in_sequence'
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        : person.outreachStatus === 'do_not_contact'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {person.outreachStatus || 'uncontacted'}
                    </span>
                  </td>

                  {/* Actions Column */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPerson(person);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 transition-all text-[11px] font-semibold inline-flex items-center gap-1"
                    >
                      <FileCode className="w-3 h-3" />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer Stats Bar */}
      <div className="bg-[#0B0F17]/90 border-t border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-400">
        <div>
          Showing <span className="font-bold text-slate-200">{people.length}</span> ML records in vector evaluation grid
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> ≥90% Conf
          </span>
          <span className="flex items-center gap-1 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span> 70-89% Conf
          </span>
          <span className="flex items-center gap-1 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span> &lt;70% Conf
          </span>
        </div>
      </div>
    </div>
  );
}
