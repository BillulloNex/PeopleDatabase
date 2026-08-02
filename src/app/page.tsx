'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  UserCheck,
  Globe,
  Sparkles,
  Building2,
  MapPin,
  Mail,
  ExternalLink,
  Plus,
  Download,
  CheckCircle2,
  RefreshCw,
  X,
  Layers,
  Cpu
} from 'lucide-react';
import { PersonRecord, IngestionRunLog } from '@/db/client';

export default function PeopleExplorerPage() {
  const [people, setPeople] = useState<PersonRecord[]>([]);
  const [runs, setRuns] = useState<IngestionRunLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<PersonRecord | null>(null);
  
  // Modal states
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [exaQuery, setExaQuery] = useState('');
  const [githubUser, setGithubUser] = useState('');
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestSuccess, setIngestSuccess] = useState('');

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
        setPeople(json.data);
      }
    } catch (err) {
      console.error('Failed to load people:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleTriggerExaIngest(e: React.FormEvent) {
    e.preventDefault();
    if (!exaQuery.trim()) return;
    setIngestLoading(true);
    setIngestSuccess('');

    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: `Search discovery prompt: ${exaQuery}`,
          sourceUrl: `https://exa.ai/search?q=${encodeURIComponent(exaQuery)}`
        })
      });
      const json = await res.json();
      if (json.success) {
        setIngestSuccess(`Entity successfully resolved & saved: ${json.data.fullName}`);
        setExaQuery('');
        fetchPeople();
      }
    } catch (err) {
      console.error('Ingest error:', err);
    } finally {
      setIngestLoading(false);
    }
  }

  async function handleTriggerGitHubIngest(e: React.FormEvent) {
    e.preventDefault();
    if (!githubUser.trim()) return;
    setIngestLoading(true);
    setIngestSuccess('');

    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: `GitHub Developer Username: ${githubUser}`,
          sourceUrl: `https://github.com/${githubUser}`
        })
      });
      const json = await res.json();
      if (json.success) {
        setIngestSuccess(`GitHub profile resolved: ${json.data.fullName}`);
        setGithubUser('');
        fetchPeople();
      }
    } catch (err) {
      console.error('GitHub ingest error:', err);
    } finally {
      setIngestLoading(false);
    }
  }

  function exportToCSV() {
    const headers = ['ID', 'Full Name', 'Title', 'Company', 'Primary Email', 'Location', 'Skills', 'Match Confidence'];
    const rows = people.map(p => [
      p.id,
      `"${p.fullName}"`,
      `"${p.currentTitle || ''}"`,
      `"${p.currentCompany || ''}"`,
      p.primaryEmail || '',
      `"${p.location || ''}"`,
      `"${p.skills.join(', ')}"`,
      p.matchConfidence
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `people_database_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-8">
      {/* Top Banner / Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total Entities Index</span>
            <Globe className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{people.length}</div>
          <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
            <span>↑ Continuous ingestion active</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Resolution Accuracy</span>
            <UserCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">96.8%</div>
          <div className="text-xs text-purple-400 mt-1">GPT-5.6 Terra matching</div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Discovery Sources</span>
            <Cpu className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">Exa + GitHub</div>
          <div className="text-xs text-slate-400 mt-1">Neural search & GHA runners</div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Quick Actions</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex gap-1.5 mt-3">
            <button
              onClick={() => setIsIngestModalOpen(true)}
              className="flex-1 py-2 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-1 shadow-lg shadow-indigo-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              Ingest
            </button>
            <button
              onClick={() => { fetchRuns(); setIsLogsModalOpen(true); }}
              className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs border border-slate-700 transition-all flex items-center gap-1"
              title="View Run Activity Logs"
            >
              <Layers className="w-3.5 h-3.5" />
              Logs ({runs.length})
            </button>
            <button
              onClick={exportToCSV}
              className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800/80 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, headline, bio, or company..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-[#0D1321] border border-slate-700/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Filter by skill (e.g. Rust)"
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="w-44 bg-[#0D1321] border border-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
            <input
              type="text"
              placeholder="Location (e.g. SF)"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-40 bg-[#0D1321] border border-slate-700/60 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
            <button
              onClick={fetchPeople}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
              title="Refresh Results"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Results Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-400" />
          <p className="text-sm font-medium">Querying global intelligence graph...</p>
        </div>
      ) : people.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-2xl border border-slate-800 text-slate-400 space-y-4">
          <Layers className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-slate-200">No matching profiles found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try adjusting your search criteria or trigger a new neural discovery crawl using Exa.ai.
          </p>
          <button
            onClick={() => setIsIngestModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
          >
            Trigger Exa Discovery
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {people.map((person) => (
            <div
              key={person.id}
              onClick={() => setSelectedPerson(person)}
              className="glass-card glass-card-hover rounded-2xl p-5 border border-slate-800/80 cursor-pointer flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <img
                    src={person.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(person.fullName)}`}
                    alt={person.fullName}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-700/60 shadow-md"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base text-slate-100 truncate flex items-center gap-1.5">
                      {person.fullName}
                      {person.matchConfidence > 0.9 && (
                        <span title="High Confidence Match"><CheckCircle2 className="w-4 h-4 text-emerald-400 inline" /></span>
                      )}
                    </h3>
                    <p className="text-xs text-indigo-400 font-medium truncate">
                      {person.currentTitle || 'Professional'} {person.currentCompany ? `@ ${person.currentCompany}` : ''}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {person.bio || person.headline || 'No summary available.'}
                </p>

                {person.location && (
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{person.location}</span>
                  </div>
                )}

                {person.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {person.skills.slice(0, 4).map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/50"
                      >
                        {skill}
                      </span>
                    ))}
                    {person.skills.length > 4 && (
                      <span className="px-1.5 py-0.5 text-[10px] text-slate-500">
                        +{person.skills.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  {person.primaryEmail && (
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <Mail className="w-3.5 h-3.5" /> Email
                    </span>
                  )}
                  {person.socialLinks.map((s, i) => (
                    <span key={i} className="text-slate-500 uppercase text-[10px]">
                      {s.platform}
                    </span>
                  ))}
                </div>
                <span className="text-indigo-400 font-medium hover:underline text-[11px]">
                  View Details →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Person Detail Drawer Modal */}
      {selectedPerson && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F1626] border border-slate-700/80 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedPerson(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-4">
              <img
                src={selectedPerson.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedPerson.fullName)}`}
                alt={selectedPerson.fullName}
                className="w-16 h-16 rounded-2xl object-cover border border-slate-700 shadow-xl"
              />
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  {selectedPerson.fullName}
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {(selectedPerson.matchConfidence * 100).toFixed(0)}% Confidence Match
                  </span>
                </h2>
                <p className="text-sm font-semibold text-indigo-400 mt-1">
                  {selectedPerson.currentTitle} {selectedPerson.currentCompany ? `@ ${selectedPerson.currentCompany}` : ''}
                </p>
                {selectedPerson.location && (
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {selectedPerson.location}
                  </p>
                )}
              </div>
            </div>

            {/* Bio & Headline */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">About & Bio</h4>
              <p className="text-sm text-slate-200 leading-relaxed bg-[#0B0F17] p-3.5 rounded-xl border border-slate-800">
                {selectedPerson.bio || selectedPerson.headline || 'No summary registered.'}
              </p>
            </div>

            {/* Contact Details */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verified Contact Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedPerson.emails.length > 0 ? (
                  selectedPerson.emails.map((email, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-[#0B0F17] border border-slate-800 flex items-center justify-between text-xs text-slate-200">
                      <span className="truncate">{email}</span>
                      <Mail className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">No public email retrieved yet.</p>
                )}
              </div>
            </div>

            {/* AI Generated Outreach Hook */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 border border-indigo-500/20 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>GPT-5.6 Terra Outreach Hook</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                "Hi {selectedPerson.fullName.split(' ')[0]}, saw your impressive background at {selectedPerson.currentCompany || 'your company'} working on {selectedPerson.skills[0] || 'engineering'}. Would love to connect regarding continuous intelligence systems."
              </p>
            </div>

            {/* Digital Footprint Links */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Platform Links & Identity Nodes</h4>
              <div className="flex flex-wrap gap-2">
                {selectedPerson.socialLinks.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all"
                  >
                    <span className="capitalize font-semibold text-indigo-400">{link.platform}</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedPerson(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ingest Seed Trigger Modal */}
      {isIngestModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F1626] border border-slate-700/80 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => { setIsIngestModalOpen(false); setIngestSuccess(''); }}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Trigger Ingestion Pipeline
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Ingest new profile seeds via Exa.ai Neural Search or GitHub profile worker.
              </p>
            </div>

            {ingestSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                ✓ {ingestSuccess}
              </div>
            )}

            {/* Exa.ai Form */}
            <form onSubmit={handleTriggerExaIngest} className="space-y-3 pt-2 border-t border-slate-800">
              <label className="block text-xs font-bold text-slate-300">
                1. Exa.ai Neural Discovery Search
              </label>
              <input
                type="text"
                placeholder="e.g. founders of AI startups in SF"
                value={exaQuery}
                onChange={(e) => setExaQuery(e.target.value)}
                className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={ingestLoading}
                className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5"
              >
                {ingestLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                Run Exa Discovery
              </button>
            </form>

            {/* GitHub Form */}
            <form onSubmit={handleTriggerGitHubIngest} className="space-y-3 pt-4 border-t border-slate-800">
              <label className="block text-xs font-bold text-slate-300">
                2. GitHub Developer Ingest
              </label>
              <input
                type="text"
                placeholder="e.g. torvalds"
                value={githubUser}
                onChange={(e) => setGithubUser(e.target.value)}
                className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={ingestLoading}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all flex items-center justify-center gap-1.5"
              >
                {ingestLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Building2 className="w-3.5 h-3.5" />}
                Ingest GitHub User
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Ingestion Run Activity Logs Modal */}
      {isLogsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F1626] border border-slate-700/80 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setIsLogsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-400" />
                  Ingestion Run Activity Logs
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Live audit trail of automated GHA matrix runs, Exa discovery, and bulk webhooks.
                </p>
              </div>
              <button
                onClick={fetchRuns}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Logs
              </button>
            </div>

            {runs.length === 0 ? (
              <div className="text-center py-12 bg-[#0B0F17] rounded-xl border border-slate-800 text-slate-500 text-xs">
                No run execution logs recorded yet. Run an ingestion job to see real-time logs here!
              </div>
            ) : (
              <div className="space-y-3">
                {runs.map((run) => (
                  <div
                    key={run.id}
                    className="p-4 rounded-xl bg-[#0B0F17] border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          run.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          run.status === 'partial_success' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {run.runType.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-bold text-slate-200 truncate">
                          {run.queryOrSource}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 pt-0.5">
                        <span>Processed: <strong className="text-white">{run.processedCount}</strong></span>
                        <span>Created: <strong className="text-emerald-400">{run.createdCount}</strong></span>
                        <span>Duration: <strong className="text-indigo-400">{run.durationMs}ms</strong></span>
                      </div>

                      {run.entities.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1.5">
                          {run.entities.map((e, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-medium">
                              {e.fullName}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono whitespace-nowrap self-end sm:self-center">
                      {new Date(run.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsLogsModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all"
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
