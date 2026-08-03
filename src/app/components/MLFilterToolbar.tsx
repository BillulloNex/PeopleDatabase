'use client';

import { Search, RefreshCw, X } from 'lucide-react';

interface MLFilterToolbarProps {
  query: string;
  setQuery: (q: string) => void;
  skillFilter: string;
  setSkillFilter: (s: string) => void;
  locationFilter: string;
  setLocationFilter: (l: string) => void;
  minConfidence: number;
  setMinConfidence: (c: number) => void;
  sourceFilter: string;
  setSourceFilter: (s: string) => void;
  roleFilter: string;
  setRoleFilter: (r: string) => void;
  statusFilter: string;
  setStatusFilter: (st: string) => void;
  loading: boolean;
  onRefresh: () => void;
  selectedCount: number;
  onClearSelection: () => void;
}

const selectClass =
  'h-8 inset rounded-md px-2 text-xs text-slate-200 focus:border-indigo-500 cursor-pointer';

const inputClass =
  'h-8 inset rounded-md px-3 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500';

export default function MLFilterToolbar({
  query,
  setQuery,
  skillFilter,
  setSkillFilter,
  locationFilter,
  setLocationFilter,
  minConfidence,
  setMinConfidence,
  sourceFilter,
  setSourceFilter,
  roleFilter,
  setRoleFilter,
  statusFilter,
  setStatusFilter,
  loading,
  onRefresh,
  selectedCount,
  onClearSelection
}: MLFilterToolbarProps) {
  const hasActiveFilters =
    query ||
    skillFilter ||
    locationFilter ||
    minConfidence > 0 ||
    sourceFilter ||
    roleFilter ||
    statusFilter;

  function clearAllFilters() {
    setQuery('');
    setSkillFilter('');
    setLocationFilter('');
    setMinConfidence(0);
    setSourceFilter('');
    setRoleFilter('');
    setStatusFilter('');
  }

  return (
    <div className="card p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search name, title, company, or bio…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-8 inset rounded-md pl-9 pr-8 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 rounded"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Text filters */}
        <input
          type="text"
          placeholder="Skill (e.g. PyTorch)"
          value={skillFilter}
          onChange={(e) => setSkillFilter(e.target.value)}
          className={`w-36 ${inputClass}`}
        />
        <input
          type="text"
          placeholder="Location (e.g. SF)"
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className={`w-32 ${inputClass}`}
        />

        {/* Dropdown filters */}
        <select
          value={minConfidence}
          onChange={(e) => setMinConfidence(Number(e.target.value))}
          className={selectClass}
          aria-label="Minimum match confidence"
        >
          <option value={0}>Confidence: all</option>
          <option value={0.7}>Confidence ≥ 70%</option>
          <option value={0.8}>Confidence ≥ 80%</option>
          <option value={0.9}>Confidence ≥ 90%</option>
        </select>

        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className={selectClass}
          aria-label="Filter by source"
        >
          <option value="">Source: all</option>
          <option value="exa">Exa</option>
          <option value="github">GitHub</option>
          <option value="orcid">ORCID</option>
          <option value="arxiv">arXiv</option>
          <option value="wikidata">Wikidata</option>
        </select>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className={selectClass}
          aria-label="Filter by role"
        >
          <option value="">Role: all</option>
          <option value="ai">AI / ML</option>
          <option value="engineer">Engineer</option>
          <option value="founder">Founder / Exec</option>
          <option value="research">Researcher</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={selectClass}
          aria-label="Filter by outreach status"
        >
          <option value="">Outreach: all</option>
          <option value="uncontacted">Uncontacted</option>
          <option value="in_sequence">In sequence</option>
          <option value="replied">Replied</option>
          <option value="do_not_contact">Do not contact</option>
        </select>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          className="h-8 w-8 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors inline-flex items-center justify-center"
          title="Refresh results"
          aria-label="Refresh results"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
        </button>

        {/* Reset */}
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="h-8 px-2.5 rounded-md text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors inline-flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
      </div>

      {/* Selection banner */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between px-3 py-2 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs animate-fadeIn">
          <span>{selectedCount} selected</span>
          <button
            onClick={onClearSelection}
            className="font-medium text-indigo-300 hover:text-white rounded"
          >
            Clear selection
          </button>
        </div>
      )}
    </div>
  );
}
