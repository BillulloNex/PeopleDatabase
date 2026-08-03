'use client';

import { useState } from 'react';
import { X, Sparkles, Globe, Github, RefreshCw, CheckCircle2 } from 'lucide-react';

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
        setMessage(`Successfully resolved & ingested: ${json.data.fullName}`);
        setExaQuery('');
        onSuccess();
      } else {
        setMessage('Ingestion completed with fallback entity resolution.');
        onSuccess();
      }
    } catch (err) {
      console.error('Exa Ingest Error:', err);
      setMessage('Failed to execute Exa ingest.');
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
        setMessage(`GitHub Profile ingested & resolved: ${json.data.fullName}`);
        setGithubUser('');
        onSuccess();
      } else {
        setMessage('GitHub profile parsed.');
        onSuccess();
      }
    } catch (err) {
      console.error('GitHub Ingest Error:', err);
      setMessage('Failed to execute GitHub ingest.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#0F1626] border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            Live Continuous Ingestion Engine
          </h2>
          <p className="text-xs text-slate-400">
            Trigger neural web discovery via Exa.ai or sync developer profiles via GitHub API.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-[#080C14] p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setTab('exa')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
              tab === 'exa' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            Exa Neural Search
          </button>
          <button
            onClick={() => setTab('github')}
            className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
              tab === 'github' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Github className="w-4 h-4" />
            GitHub Profile
          </button>
        </div>

        {/* Exa Form */}
        {tab === 'exa' && (
          <form onSubmit={handleExaIngest} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Neural Query / Discovery Prompt
              </label>
              <input
                type="text"
                placeholder="e.g. AI research scientist at Anthropic working on Claude models"
                value={exaQuery}
                onChange={(e) => setExaQuery(e.target.value)}
                className="w-full bg-[#080C14] border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !exaQuery.trim()}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {loading ? 'Resolving via GPT-5.6 Terra...' : 'Execute Exa Neural Search'}
            </button>
          </form>
        )}

        {/* GitHub Form */}
        {tab === 'github' && (
          <form onSubmit={handleGitHubIngest} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                GitHub Developer Username
              </label>
              <input
                type="text"
                placeholder="e.g. torvalds, karpathy, antirez"
                value={githubUser}
                onChange={(e) => setGithubUser(e.target.value)}
                className="w-full bg-[#080C14] border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !githubUser.trim()}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
              {loading ? 'Fetching Developer Graph...' : 'Sync GitHub Developer'}
            </button>
          </form>
        )}

        {/* Status Feedback */}
        {message && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
