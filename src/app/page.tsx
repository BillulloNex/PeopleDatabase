'use client';

import { useState, useEffect } from 'react';
import { PersonRecord, IngestionRunLog } from '@/db/client';
import DottedBackground from './components/DottedBackground';
import MLMetricsHeader from './components/MLMetricsHeader';
import MLFilterToolbar from './components/MLFilterToolbar';
import MLDataTable from './components/MLDataTable';
import EntityInspectorDrawer from './components/EntityInspectorDrawer';
import IngestModal from './components/IngestModal';
import LogsModal from './components/LogsModal';

export default function PeopleExplorerPage() {
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [runs, setRuns] = useState<IngestionRunLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [query, setQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [minConfidence, setMinConfidence] = useState<number>(0);

  // Selection & Drawer states
  const [selectedPerson, setSelectedPerson] = useState<PersonRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal states
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);

  useEffect(() => {
    fetchPeople();
    fetchRuns();
  }, [query, skillFilter, locationFilter]);

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

      const res = await fetch(`/api/search?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        let records: PersonRecord[] = json.data;
        // Filter by min confidence if specified
        if (minConfidence > 0) {
          records = records.filter(p => p.matchConfidence >= minConfidence);
        }
        setPeople(records);
        setTotalCount(json.total || json.data.length);
      }
    } catch (err) {
      console.error('Failed to load people dataset:', err);
    } finally {
      setLoading(false);
    }
  }

  // Filter local records by confidence if changed without refetching
  const filteredPeople = minConfidence > 0
    ? people.filter(p => p.matchConfidence >= minConfidence)
    : people;

  function toggleSelectId(id: string) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  }

  function toggleSelectAll() {
    if (selectedIds.length === filteredPeople.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPeople.map(p => p.id));
    }
  }

  function exportToCSV() {
    const recordsToExport = selectedIds.length > 0
      ? filteredPeople.filter(p => selectedIds.includes(p.id))
      : filteredPeople;

    const headers = ['ID', 'Full Name', 'Title', 'Company', 'Primary Email', 'Location', 'Skills', 'Match Confidence', 'Outreach Status', 'Extraction Engine'];
    const rows = recordsToExport.map(p => [
      p.id,
      `"${p.fullName}"`,
      `"${p.currentTitle || ''}"`,
      `"${p.currentCompany || ''}"`,
      p.primaryEmail || '',
      `"${p.location || ''}"`,
      `"${p.skills.join(', ')}"`,
      p.matchConfidence,
      p.outreachStatus || 'uncontacted',
      p.extractionMethod || 'ai-terra'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `peopledatabase_mlexport_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function exportToJSON() {
    const recordsToExport = selectedIds.length > 0
      ? filteredPeople.filter(p => selectedIds.includes(p.id))
      : filteredPeople;

    const jsonString = JSON.stringify(recordsToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `peopledatabase_featurematrix_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="relative space-y-6 pb-12">
      {/* 21st.dev Background canvas */}
      <DottedBackground />

      {/* Dataset Metrics Header */}
      <MLMetricsHeader
        totalCount={totalCount}
        people={filteredPeople}
        runsCount={runs.length}
        onOpenIngest={() => setIsIngestModalOpen(true)}
        onOpenLogs={() => { fetchRuns(); setIsLogsModalOpen(true); }}
        onExportCSV={exportToCSV}
        onExportJSON={exportToJSON}
      />

      {/* Feature & Search Filter Toolbar */}
      <MLFilterToolbar
        query={query}
        setQuery={setQuery}
        skillFilter={skillFilter}
        setSkillFilter={setSkillFilter}
        locationFilter={locationFilter}
        setLocationFilter={setLocationFilter}
        minConfidence={minConfidence}
        setMinConfidence={setMinConfidence}
        loading={loading}
        onRefresh={fetchPeople}
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
      />

      {/* Main ML Scientist Data Table */}
      <MLDataTable
        people={filteredPeople}
        loading={loading}
        selectedPersonId={selectedPerson?.id || null}
        onSelectPerson={(person) => setSelectedPerson(person)}
        selectedIds={selectedIds}
        onToggleSelectId={toggleSelectId}
        onToggleSelectAll={toggleSelectAll}
        onOpenIngestModal={() => setIsIngestModalOpen(true)}
      />

      {/* Slide-out ML Entity Inspector Drawer */}
      <EntityInspectorDrawer
        person={selectedPerson}
        onClose={() => setSelectedPerson(null)}
      />

      {/* Continuous Ingestion Modal */}
      <IngestModal
        isOpen={isIngestModalOpen}
        onClose={() => setIsIngestModalOpen(false)}
        onSuccess={() => {
          fetchPeople();
          fetchRuns();
        }}
      />

      {/* Ingestion Run Logs Modal */}
      <LogsModal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        runs={runs}
      />
    </div>
  );
}
