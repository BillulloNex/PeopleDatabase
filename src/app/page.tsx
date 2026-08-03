'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Layers, Download, ExternalLink } from 'lucide-react';
import { PersonRecord, IngestionRunLog } from '@/db/client';
import MLMetricsHeader from './components/MLMetricsHeader';
import MLFilterToolbar from './components/MLFilterToolbar';
import MLDataTable from './components/MLDataTable';
import EntityInspectorDrawer from './components/EntityInspectorDrawer';
import IngestModal from './components/IngestModal';
import LogsModal from './components/LogsModal';

const PAGE_SIZE = 50;

export default function PeopleExplorerPage() {
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [matchingCount, setMatchingCount] = useState(0);
  const [page, setPage] = useState(1);
  const [runs, setRuns] = useState<IngestionRunLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [query, setQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [minConfidence, setMinConfidence] = useState<number>(0);
  const [sourceFilter, setSourceFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selection & Drawer states
  const [selectedPerson, setSelectedPerson] = useState<PersonRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal states
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);

  const isFirstFetch = useRef(true);

  // Server-side filters reset pagination back to page 1
  function updateQuery(q: string) {
    setQuery(q);
    setPage(1);
  }
  function updateSkillFilter(s: string) {
    setSkillFilter(s);
    setPage(1);
  }
  function updateLocationFilter(l: string) {
    setLocationFilter(l);
    setPage(1);
  }

  // Fetch immediately on mount, debounce while the user is typing
  useEffect(() => {
    if (isFirstFetch.current) {
      isFirstFetch.current = false;
      fetchPeople();
      fetchRuns();
      return;
    }
    const timer = setTimeout(fetchPeople, 300);
    return () => clearTimeout(timer);
  }, [query, skillFilter, locationFilter, page]);

  async function fetchRuns() {
    try {
      const res = await fetch('/api/runs');
      const json = await res.json();
      if (json.success) {
        setRuns(json.data);
      }
    } catch (err) {
      console.error('Failed to load run logs:', err);
    }
  }

  async function fetchPeople() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (skillFilter) params.set('skill', skillFilter);
      if (locationFilter) params.set('location', locationFilter);
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));

      const res = await fetch(`/api/search?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setPeople(json.data);
        setTotalCount(json.total || json.data.length);
        setMatchingCount(json.matching ?? json.data.length);
      }
    } catch (err) {
      console.error('Failed to load people:', err);
    } finally {
      setLoading(false);
    }
  }

  // Client-side filters applied on top of the fetched results
  const filteredPeople = people.filter((p) => {
    if (minConfidence > 0 && p.matchConfidence < minConfidence) return false;

    if (sourceFilter) {
      const hasMatchingSource = (p.sources || []).some((s) =>
        s.domain.toLowerCase().includes(sourceFilter.toLowerCase()) ||
        s.url.toLowerCase().includes(sourceFilter.toLowerCase())
      );
      if (!hasMatchingSource && sourceFilter !== 'exa') return false;
    }

    if (roleFilter) {
      const titleStr = (p.currentTitle || '').toLowerCase();
      const headlineStr = (p.headline || '').toLowerCase();
      const bioStr = (p.bio || '').toLowerCase();

      if (roleFilter === 'ai') {
        const isAi = ['ai', 'ml', 'machine learning', 'deep learning', 'nlp', 'researcher'].some(kw =>
          titleStr.includes(kw) || headlineStr.includes(kw) || bioStr.includes(kw)
        );
        if (!isAi) return false;
      } else if (roleFilter === 'engineer') {
        const isEng = ['engineer', 'developer', 'architect', 'software', 'backend', 'fullstack'].some(kw =>
          titleStr.includes(kw) || headlineStr.includes(kw)
        );
        if (!isEng) return false;
      } else if (roleFilter === 'founder') {
        const isFounder = ['founder', 'ceo', 'cto', 'co-founder', 'executive', 'vp', 'director'].some(kw =>
          titleStr.includes(kw) || headlineStr.includes(kw)
        );
        if (!isFounder) return false;
      } else if (roleFilter === 'research') {
        const isResearch = ['research', 'scientist', 'phd', 'postdoc', 'fellow'].some(kw =>
          titleStr.includes(kw) || headlineStr.includes(kw) || bioStr.includes(kw)
        );
        if (!isResearch) return false;
      }
    }

    if (statusFilter) {
      if ((p.outreachStatus || 'uncontacted') !== statusFilter) return false;
    }

    return true;
  });

  // Selection may contain ids that are no longer visible after filtering,
  // so "all selected" means every *visible* row is selected.
  const allVisibleSelected =
    filteredPeople.length > 0 &&
    filteredPeople.every((p) => selectedIds.includes(p.id));

  function toggleSelectId(id: string) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  }

  function toggleSelectAll() {
    const visibleIds = filteredPeople.map((p) => p.id);
    if (allVisibleSelected) {
      setSelectedIds(selectedIds.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds(Array.from(new Set([...selectedIds, ...visibleIds])));
    }
  }

  function exportToCSV() {
    const recordsToExport =
      selectedIds.length > 0
        ? filteredPeople.filter((p) => selectedIds.includes(p.id))
        : filteredPeople;

    const headers = [
      'ID',
      'Full Name',
      'Title',
      'Company',
      'Primary Email',
      'Location',
      'Skills',
      'Match Confidence',
      'Outreach Status',
      'Extraction Method',
    ];
    const rows = recordsToExport.map((p) => [
      p.id,
      `"${p.fullName}"`,
      `"${p.currentTitle || ''}"`,
      `"${p.currentCompany || ''}"`,
      p.primaryEmail || '',
      `"${p.location || ''}"`,
      `"${p.skills.join(', ')}"`,
      p.matchConfidence,
      p.outreachStatus || 'uncontacted',
      p.extractionMethod || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join(
      '\n'
    );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `people_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function exportToJSON() {
    const recordsToExport =
      selectedIds.length > 0
        ? filteredPeople.filter((p) => selectedIds.includes(p.id))
        : filteredPeople;

    const jsonString = JSON.stringify(recordsToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `people_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <>
      {/* App bar: brand + global actions in one sticky row */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#0B0F17]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded-md bg-indigo-600 flex items-center justify-center font-semibold text-white text-sm shrink-0">
              P
            </div>
            <span className="font-semibold text-sm text-slate-100 tracking-tight truncate">
              PeopleDatabase
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsIngestModalOpen(true)}
              className="h-8 px-3 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add people</span>
              <span className="sm:hidden">Add</span>
            </button>
            <button
              onClick={() => {
                fetchRuns();
                setIsLogsModalOpen(true);
              }}
              className="h-8 px-3 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm border border-slate-700 transition-colors inline-flex items-center gap-1.5"
            >
              <Layers className="w-4 h-4" />
              <span className="hidden sm:inline">Logs</span>
            </button>
            <button
              onClick={exportToCSV}
              className="h-8 px-3 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm border border-slate-700 transition-colors hidden sm:inline-flex items-center gap-1.5"
              title="Export as CSV (selected rows, or all filtered rows)"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
              onClick={exportToJSON}
              className="h-8 px-3 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm border border-slate-700 transition-colors hidden sm:inline-flex items-center"
              title="Export as JSON (selected rows, or all filtered rows)"
            >
              JSON
            </button>

            <div className="w-px h-5 bg-slate-800 mx-1 hidden sm:block" />

            <a
              href="https://people.beenex.org"
              target="_blank"
              rel="noreferrer"
              className="h-8 w-8 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors hidden sm:inline-flex items-center justify-center"
              title="Open people.beenex.org"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4 pb-12">
        {/* Stats */}
        <MLMetricsHeader totalCount={totalCount} people={filteredPeople} />

        {/* Search & filters */}
        <MLFilterToolbar
          query={query}
          setQuery={updateQuery}
          skillFilter={skillFilter}
          setSkillFilter={updateSkillFilter}
          locationFilter={locationFilter}
          setLocationFilter={updateLocationFilter}
          minConfidence={minConfidence}
          setMinConfidence={setMinConfidence}
          sourceFilter={sourceFilter}
          setSourceFilter={setSourceFilter}
          roleFilter={roleFilter}
          setRoleFilter={setRoleFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          loading={loading}
          onRefresh={fetchPeople}
          selectedCount={selectedIds.length}
          onClearSelection={() => setSelectedIds([])}
        />

        {/* Data table */}
        <MLDataTable
          people={filteredPeople}
          loadedCount={people.length}
          matchingCount={matchingCount}
          totalCount={totalCount}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          loading={loading}
          selectedPersonId={selectedPerson?.id || null}
          onSelectPerson={(person) => setSelectedPerson(person)}
          selectedIds={selectedIds}
          allVisibleSelected={allVisibleSelected}
          onToggleSelectId={toggleSelectId}
          onToggleSelectAll={toggleSelectAll}
          onOpenIngestModal={() => setIsIngestModalOpen(true)}
        />
      </main>

      {/* Person detail drawer */}
      <EntityInspectorDrawer
        person={selectedPerson}
        onClose={() => setSelectedPerson(null)}
      />

      {/* Ingestion modal */}
      <IngestModal
        isOpen={isIngestModalOpen}
        onClose={() => setIsIngestModalOpen(false)}
        onSuccess={() => {
          fetchPeople();
          fetchRuns();
        }}
      />

      {/* Run logs modal */}
      <LogsModal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        runs={runs}
      />
    </>
  );
}
