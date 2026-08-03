'use client';

import { useState, useEffect } from 'react';
import { X, Globe, Github, RefreshCw, CheckCircle2, Search, Plus } from 'lucide-react';

interface IngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function IngestModal({ isOpen, onClose, onSuccess }: IngestModalProps) {
  const [tab, setTab] = useState<'exa' | 'github'>('exa');
  const [exaQuery, setExaQuery] = useState('');
  const [githubUser, setGithubUser] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleExaIngest(e: React.FormEvent) {
    e.preventDefault();
    if (!exaQuery.trim()) return;
    setLoading(true);
    setMessage('');

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
        setMessage(`Added: ${json.data.fullName}`);
        setExaQuery('');
        onSuccess();
      } else {
        setMessage('Ingestion finished — see logs for details.');
        onSuccess();
      }
    } catch (err) {
      console.error('Exa ingest error:', err);
      setMessage('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGitHubIngest(e: React.FormEvent) {
    e.preventDefault();
    if (!githubUser.trim()) return;
    setLoading(true);
    setMessage('');

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
        setMessage(`Added: ${json.data.fullName}`);
        setGithubUser('');
        onSuccess();
      } else {
        setMessage('Profile imported — see logs for details.');
        onSuccess();
      }
    } catch (err) {
      console.error('GitHub ingest error:', err);
      setMessage('Import failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add people"
    >
      <div
        className="card max-w-lg w-full p-6 space-y-5 shadow-2xl relative"
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
            <Plus className="w-5 h-5 text-indigo-400" />
            Add people
          </h2>
          <p className="text-sm text-slate-400">
            Search the web with Exa, or import a profile from GitHub.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex inset p-1 rounded-md text-sm font-medium">
          <button
            onClick={() => setTab('exa')}
            className={`flex-1 py-1.5 rounded transition-colors inline-flex items-center justify-center gap-2 ${
              tab === 'exa' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            Web search
          </button>
          <button
            onClick={() => setTab('github')}
            className={`flex-1 py-1.5 rounded transition-colors inline-flex items-center justify-center gap-2 ${
              tab === 'github' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Github className="w-4 h-4" />
            GitHub
          </button>
        </div>

        {tab === 'exa' && (
          <form onSubmit={handleExaIngest} className="space-y-4">
            <div>
              <label htmlFor="exa-query" className="block text-sm font-medium text-slate-300 mb-1.5">
                Search query
              </label>
              <input
                id="exa-query"
                type="text"
                placeholder="e.g. AI research scientist working on language models"
                value={exaQuery}
                onChange={(e) => setExaQuery(e.target.value)}
                className="w-full inset rounded-md px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !exaQuery.trim()}
              className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm rounded-md transition-colors inline-flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? 'Searching…' : 'Search & add'}
            </button>
          </form>
        )}

        {tab === 'github' && (
          <form onSubmit={handleGitHubIngest} className="space-y-4">
            <div>
              <label htmlFor="github-user" className="block text-sm font-medium text-slate-300 mb-1.5">
                GitHub username
              </label>
              <input
                id="github-user"
                type="text"
                placeholder="e.g. torvalds"
                value={githubUser}
                onChange={(e) => setGithubUser(e.target.value)}
                className="w-full inset rounded-md px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !githubUser.trim()}
              className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm rounded-md transition-colors inline-flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
              {loading ? 'Importing…' : 'Import profile'}
            </button>
          </form>
        )}

        {message && (
          <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
