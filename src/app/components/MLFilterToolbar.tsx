'use client';

import { Search, Filter, RefreshCw, X, SlidersHorizontal, CheckSquare, Globe, Briefcase, UserCheck } from 'lucide-react';

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

  const sources = [
    { label: 'All Sources', value: '' },
    { label: 'Exa', value: 'exa' },
    { label: 'GitHub', value: 'github' },
    { label: 'ORCID', value: 'orcid' },
    { label: 'ArXiv', value: 'arxiv' },
    { label: 'Wikidata', value: 'wikidata' },
  ];

  const roles = [
    { label: 'All Roles', value: '' },
    { label: 'AI / ML', value: 'ai' },
    { label: 'Engineer', value: 'engineer' },
    { label: 'Founder / Exec', value: 'founder' },
    { label: 'Researcher', value: 'research' },
  ];

  const statuses = [
    { label: 'All Statuses', value: '' },
    { label: 'Uncontacted', value: 'uncontacted' },
    { label: 'In Sequence', value: 'in_sequence' },
    { label: 'Replied', value: 'replied' },
    { label: 'Do Not Contact', value: 'do_not_contact' },
  ];

  return (
    <div className="relative z-10 glass-card rounded-2xl p-4 border border-slate-800/80 space-y-3.5 shadow-xl">
      {/* Search Bar & Primary Inputs */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, title, headline, company, or bio..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#0D1321] border border-slate-700/60 rounded-xl pl-10 pr-9 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Text Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Skill Filter */}
          <input
            type="text"
            placeholder="Skill (e.g. PyTorch)"
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="w-36 sm:w-44 bg-[#0D1321] border border-slate-700/60 rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
          />

          {/* Location Filter */}
          <input
            type="text"
            placeholder="Location (e.g. SF)"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="w-32 sm:w-36 bg-[#0D1321] border border-slate-700/60 rounded-xl px-3 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
          />

          {/* Confidence Threshold */}
          <div className="flex items-center gap-1 bg-[#0D1321] border border-slate-700/60 p-1 rounded-xl">
            <span className="text-[10px] text-slate-400 font-semibold uppercase px-1.5 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3 text-indigo-400" />
              Conf:
            </span>
            {[
              { label: 'All', value: 0 },
              { label: '≥70%', value: 0.7 },
              { label: '≥80%', value: 0.8 },
              { label: '≥90%', value: 0.9 },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setMinConfidence(opt.value)}
                className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                  minConfidence === opt.value
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Refresh Trigger */}
          <button
            onClick={onRefresh}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all flex items-center justify-center"
            title="Refresh Dataset Results"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 transition-all text-xs font-semibold flex items-center gap-1"
              title="Clear all active filters"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Field Filter Pill Toggles */}
      <div className="pt-2 border-t border-slate-800/80 space-y-2">
        {/* Source Toggles */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0 w-20">
            <Globe className="w-3 h-3 text-indigo-400" />
            Source:
          </span>
          <div className="flex gap-1.5 shrink-0">
            {sources.map((s) => (
              <button
                key={s.value}
                onClick={() => setSourceFilter(s.value)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                  sourceFilter === s.value
                    ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-sm'
                    : 'bg-[#0D1321] text-slate-400 border-slate-700/60 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Role / Position Category Toggles */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0 w-20">
            <Briefcase className="w-3 h-3 text-purple-400" />
            Role:
          </span>
          <div className="flex gap-1.5 shrink-0">
            {roles.map((r) => (
              <button
                key={r.value}
                onClick={() => setRoleFilter(r.value)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                  roleFilter === r.value
                    ? 'bg-purple-600/20 text-purple-300 border-purple-500/50 shadow-sm'
                    : 'bg-[#0D1321] text-slate-400 border-slate-700/60 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Outreach Status Toggles */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0 w-20">
            <UserCheck className="w-3 h-3 text-emerald-400" />
            Outreach:
          </span>
          <div className="flex gap-1.5 shrink-0">
            {statuses.map((st) => (
              <button
                key={st.value}
                onClick={() => setStatusFilter(st.value)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                  statusFilter === st.value
                    ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                    : 'bg-[#0D1321] text-slate-400 border-slate-700/60 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Items Banner */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-indigo-400" />
            <span>{selectedCount} entity record{selectedCount > 1 ? 's' : ''} selected in evaluation grid</span>
          </div>
          <button
            onClick={onClearSelection}
            className="text-xs text-indigo-400 hover:text-white underline font-semibold"
          >
            Clear Selection
          </button>
        </div>
      )}
    </div>
  );
}
