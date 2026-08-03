'use client';

import { useState } from 'react';
import { PersonRecord } from '@/db/client';
import {
  X,
  User,
  ShieldCheck,
  Mail,
  MapPin,
  ExternalLink,
  Code,
  Globe,
  Copy,
  Check,
  Cpu,
  Layers,
  Sparkles,
  Phone,
  Tag
} from 'lucide-react';

interface EntityInspectorDrawerProps {
  person: PersonRecord | null;
  onClose: () => void;
}

export default function EntityInspectorDrawer({ person, onClose }: EntityInspectorDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'model' | 'json' | 'sources'>('overview');
  const [copiedJson, setCopiedJson] = useState(false);

  if (!person) return null;

  const confidencePct = Math.round(person.matchConfidence * 100);

  function handleCopyJson() {
    navigator.clipboard.writeText(JSON.stringify(person, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-fadeIn">
      {/* Side Drawer Container */}
      <div className="bg-[#0B0F17] border-l border-slate-800 w-full max-w-2xl h-full flex flex-col shadow-2xl relative overflow-hidden animate-slideLeft">
        
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-800/80 bg-[#0D1321]/90 flex items-start justify-between">
          <div className="flex items-start gap-4">
            <img
              src={person.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(person.fullName)}`}
              alt={person.fullName}
              className="w-14 h-14 rounded-2xl object-cover border border-slate-700 shadow-xl"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white tracking-tight">{person.fullName}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${
                  confidencePct >= 90
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}>
                  {confidencePct}% Match Confidence
                </span>
              </div>
              <p className="text-xs font-semibold text-indigo-400 mt-0.5">
                {person.currentTitle || 'Professional'} {person.currentCompany ? `@ ${person.currentCompany}` : ''}
              </p>
              <p className="text-[11px] text-slate-400 font-mono mt-1">
                UUID: {person.id}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-[#080C14] px-6 text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Overview
          </button>

          <button
            onClick={() => setActiveTab('model')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'model'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            ML Resolution
          </button>

          <button
            onClick={() => setActiveTab('json')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'json'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Raw Feature Matrix (JSON)
          </button>

          <button
            onClick={() => setActiveTab('sources')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'sources'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Sources ({person.sources?.length || 0})
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Bio & Summary */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bio & Headline Summary</h4>
                <p className="text-sm text-slate-200 leading-relaxed bg-[#0D1321] p-4 rounded-xl border border-slate-800">
                  {person.bio || person.headline || 'No summary registered.'}
                </p>
              </div>

              {/* Verified Contact Details */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verified Contact Channels</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {person.emails.length > 0 ? (
                    person.emails.map((email, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-[#0D1321] border border-slate-800 flex items-center justify-between text-xs text-slate-200">
                        <span className="truncate">{email}</span>
                        <Mail className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic">No email fetched yet.</p>
                  )}
                  {person.phones.map((phone, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-[#0D1321] border border-slate-800 flex items-center justify-between text-xs text-slate-200">
                      <span>{phone}</span>
                      <Phone className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Skills & Vector Features */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Extracted Skill Features ({person.skills.length})</h4>
                <div className="flex flex-wrap gap-1.5">
                  {person.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Digital Footprint Links */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Platform Links</h4>
                <div className="flex flex-wrap gap-2">
                  {person.socialLinks.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded-xl bg-[#0D1321] hover:bg-slate-800 text-xs text-slate-200 border border-slate-800 flex items-center gap-2 transition-all"
                    >
                      <span className="capitalize font-semibold text-indigo-400">{link.platform}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ML RESOLUTION METRICS */}
          {activeTab === 'model' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#0D1321] border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  Resolution Strategy & Metadata
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Extraction Engine:</span>
                    <p className="font-mono font-bold text-slate-100">{person.extractionMethod || 'ai-terra'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Deduplication Strategy:</span>
                    <p className="font-mono font-bold text-purple-300">{person.dedupMethod || 'ai-resolved'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Match Confidence:</span>
                    <p className="font-mono font-bold text-emerald-400">{(person.matchConfidence * 100).toFixed(2)}%</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Outreach Status:</span>
                    <p className="font-mono font-bold text-slate-200 capitalize">{person.outreachStatus}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0D1321] border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Classification Tags</h4>
                <div className="flex flex-wrap gap-1.5">
                  {person.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-mono">
                      #{tag}
                    </span>
                  ))}
                  {person.tags.length === 0 && <p className="text-xs text-slate-500 italic">No custom tags assigned.</p>}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RAW FEATURE MATRIX JSON */}
          {activeTab === 'json' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">Canonical Entity Record Schema</span>
                <button
                  onClick={handleCopyJson}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all flex items-center gap-1.5 shadow-md"
                >
                  {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedJson ? 'Copied to Clipboard' : 'Copy JSON'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-[#080C14] border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-[50vh] leading-relaxed">
                {JSON.stringify(person, null, 2)}
              </pre>
            </div>
          )}

          {/* TAB 4: DATA SOURCES & PROVENANCE */}
          {activeTab === 'sources' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ingested Web & API Sources</h4>
              {person.sources && person.sources.length > 0 ? (
                person.sources.map((src, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#0D1321] border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-indigo-300 capitalize">{src.domain}</p>
                      <a href={src.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:underline truncate max-w-sm block text-[11px] font-mono">
                        {src.url}
                      </a>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-500" />
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic">No explicit web sources logged.</p>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
