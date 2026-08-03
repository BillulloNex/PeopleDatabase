'use client';

import { useState, useEffect } from 'react';
import { PersonRecord } from '@/db/client';
import {
  X,
  User,
  Mail,
  ExternalLink,
  Code,
  Globe,
  Copy,
  Check,
  Info,
  Phone
} from 'lucide-react';

interface EntityInspectorDrawerProps {
  person: PersonRecord | null;
  onClose: () => void;
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'details', label: 'Details', icon: Info },
  { id: 'json', label: 'JSON', icon: Code },
  { id: 'sources', label: 'Sources', icon: Globe },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function EntityInspectorDrawer({ person, onClose }: EntityInspectorDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (!person) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [person, onClose]);

  if (!person) return null;

  const confidencePct = Math.round(person.matchConfidence * 100);

  function handleCopyJson() {
    navigator.clipboard.writeText(JSON.stringify(person, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  }

  function handleCopyId() {
    if (!person) return;
    navigator.clipboard.writeText(person.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/60 flex justify-end animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Details for ${person.fullName}`}
    >
      <div
        className="bg-[#0B0F17] border-l border-slate-800 w-full max-w-2xl h-full flex flex-col shadow-2xl relative overflow-hidden animate-slideLeft"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-[#101724] flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <img
              src={person.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(person.fullName)}`}
              alt=""
              className="w-12 h-12 rounded-full object-cover border border-slate-700 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold text-slate-100 tracking-tight">{person.fullName}</h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    confidencePct >= 90
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : confidencePct >= 70
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'bg-rose-500/10 text-rose-400'
                  }`}
                >
                  {confidencePct}% match
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5 truncate">
                {person.currentTitle || '—'}
                {person.currentCompany ? ` · ${person.currentCompany}` : ''}
              </p>
              <button
                onClick={handleCopyId}
                className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 font-mono rounded transition-colors"
                title="Copy ID"
              >
                <span className="truncate max-w-[280px]">{person.id}</span>
                {copiedId ? (
                  <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                ) : (
                  <Copy className="w-3 h-3 shrink-0" />
                )}
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-[#0B0F17] px-6 text-sm font-medium">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = tab.id === 'sources' ? ` (${person.sources?.length || 0})` : '';
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2.5 px-3.5 border-b-2 -mb-px transition-colors inline-flex items-center gap-1.5 ${
                  isActive
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}{count}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide">Bio</h4>
                <p className="text-sm text-slate-200 leading-relaxed inset p-4 rounded-md">
                  {person.bio || person.headline || 'No bio available.'}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide">Contact</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {person.emails.length > 0 ? (
                    person.emails.map((email, idx) => (
                      <div key={idx} className="p-3 rounded-md inset flex items-center justify-between text-sm text-slate-200">
                        <span className="truncate">{email}</span>
                        <Mail className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No email on record.</p>
                  )}
                  {person.phones.map((phone, idx) => (
                    <div key={idx} className="p-3 rounded-md inset flex items-center justify-between text-sm text-slate-200">
                      <span>{phone}</span>
                      <Phone className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Skills ({person.skills.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {person.skills.length > 0 ? (
                    person.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs rounded-md bg-slate-800 text-slate-300"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No skills on record.</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide">Links</h4>
                <div className="flex flex-wrap gap-2">
                  {person.socialLinks.length > 0 ? (
                    person.socialLinks.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-md inset hover:bg-slate-800 text-sm text-slate-200 inline-flex items-center gap-2 transition-colors"
                      >
                        <span className="capitalize">{link.platform}</span>
                        <ExternalLink className="w-3 h-3 text-slate-500" />
                      </a>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No links on record.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="p-4 rounded-md inset space-y-3">
                <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide">Record details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-slate-500">Extraction method</span>
                    <p className="text-slate-200 font-mono text-xs mt-0.5">{person.extractionMethod || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Deduplication</span>
                    <p className="text-slate-200 font-mono text-xs mt-0.5">{person.dedupMethod || '—'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Match confidence</span>
                    <p className="text-slate-200 mt-0.5">{(person.matchConfidence * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Outreach status</span>
                    <p className="text-slate-200 capitalize mt-0.5">{(person.outreachStatus || 'uncontacted').replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Created</span>
                    <p className="text-slate-200 mt-0.5">{new Date(person.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Updated</span>
                    <p className="text-slate-200 mt-0.5">{new Date(person.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-md inset space-y-2">
                <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide">Tags</h4>
                <div className="flex flex-wrap gap-1.5">
                  {person.tags.length > 0 ? (
                    person.tags.map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No tags.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'json' && (
            <div className="space-y-3">
              <div className="flex items-center justify-end">
                <button
                  onClick={handleCopyJson}
                  className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition-colors inline-flex items-center gap-1.5"
                >
                  {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedJson ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-md inset text-xs font-mono text-slate-300 overflow-x-auto max-h-[60vh] leading-relaxed">
                {JSON.stringify(person, null, 2)}
              </pre>
            </div>
          )}

          {activeTab === 'sources' && (
            <div className="space-y-2">
              {person.sources && person.sources.length > 0 ? (
                person.sources.map((src, idx) => (
                  <a
                    key={idx}
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3.5 rounded-md inset hover:bg-slate-800 flex items-center justify-between gap-3 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200">{src.domain.replace('www.', '')}</p>
                      <p className="text-xs text-slate-500 font-mono truncate mt-0.5">{src.url}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-slate-300 shrink-0" />
                  </a>
                ))
              ) : (
                <p className="text-sm text-slate-500">No sources on record.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
