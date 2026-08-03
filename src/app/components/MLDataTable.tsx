'use client';

import { useState, useEffect, useRef } from 'react';
import { PersonRecord } from '@/db/client';
import { MapPin, Users, Plus, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

export type SortField = 'fullName' | 'matchConfidence' | 'currentCompany' | 'location' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

interface MLDataTableProps {
  people: PersonRecord[];
  loadedCount: number;
  matchingCount: number;
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  loading: boolean;
  selectedPersonId: string | null;
  onSelectPerson: (person: PersonRecord) => void;
  selectedIds: string[];
  allVisibleSelected: boolean;
  onToggleSelectId: (id: string) => void;
  onToggleSelectAll: () => void;
  onOpenIngestModal: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  uncontacted: 'Uncontacted',
  in_sequence: 'In sequence',
  replied: 'Replied',
  do_not_contact: 'Do not contact',
};

const STATUS_STYLES: Record<string, string> = {
  uncontacted: 'bg-slate-800 text-slate-300',
  in_sequence: 'bg-indigo-500/10 text-indigo-300',
  replied: 'bg-emerald-500/10 text-emerald-400',
  do_not_contact: 'bg-rose-500/10 text-rose-400',
};

function confidenceColor(pct: number) {
  if (pct >= 90) return 'text-emerald-400';
  if (pct >= 70) return 'text-amber-400';
  return 'text-rose-400';
}

interface SortHeaderProps {
  label: string;
  field: SortField;
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  className?: string;
  align?: 'left' | 'right';
}

function SortHeader({ label, field, sortField, sortOrder, onSort, className = '', align = 'left' }: SortHeaderProps) {
  const isActive = sortField === field;
  const Icon = !isActive ? ArrowUpDown : sortOrder === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th
      className={`py-2.5 px-4 ${className}`}
      aria-sort={isActive ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1 rounded hover:text-slate-100 transition-colors ${
          align === 'right' ? 'flex-row-reverse' : ''
        } ${isActive ? 'text-slate-100' : ''}`}
      >
        <span>{label}</span>
        <Icon className={`w-3 h-3 ${isActive ? 'text-indigo-400' : 'text-slate-600'}`} />
      </button>
    </th>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          <td className="py-3 px-3.5">
            <div className="w-4 h-4 rounded bg-slate-800 mx-auto" />
          </td>
          <td className="py-3 px-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-800 shrink-0" />
              <div className="space-y-1.5">
                <div className="h-3 w-32 rounded bg-slate-800" />
                <div className="h-2.5 w-24 rounded bg-slate-800/60" />
              </div>
            </div>
          </td>
          <td className="py-3 px-4 text-right">
            <div className="h-3 w-9 rounded bg-slate-800 ml-auto" />
          </td>
          <td className="py-3 px-4">
            <div className="h-3 w-24 rounded bg-slate-800" />
          </td>
          <td className="py-3 px-4 hidden md:table-cell">
            <div className="h-3 w-20 rounded bg-slate-800" />
          </td>
          <td className="py-3 px-4 hidden lg:table-cell">
            <div className="h-3 w-32 rounded bg-slate-800" />
          </td>
          <td className="py-3 px-4 hidden xl:table-cell">
            <div className="h-3 w-24 rounded bg-slate-800" />
          </td>
          <td className="py-3 px-4">
            <div className="h-4 w-20 rounded-full bg-slate-800 mx-auto" />
          </td>
        </tr>
      ))}
    </>
  );
}

export default function MLDataTable({
  people,
  loadedCount,
  matchingCount,
  totalCount,
  page,
  pageSize,
  onPageChange,
  loading,
  selectedPersonId,
  onSelectPerson,
  selectedIds,
  allVisibleSelected,
  onToggleSelectId,
  onToggleSelectAll,
  onOpenIngestModal
}: MLDataTableProps) {
  const [sortField, setSortField] = useState<SortField>('matchConfidence');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [page]);

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

  const totalPages = Math.max(1, Math.ceil(matchingCount / pageSize));
  const rangeStart = matchingCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, matchingCount);
  const hiddenByFilters = loadedCount - people.length;

  const showSkeleton = loading && people.length === 0;
  // Only show the full empty state when there are no matches at all —
  // an empty *page* (offset past the end, or client filters) keeps the
  // table shell so pagination stays reachable.
  const showEmpty = !loading && people.length === 0 && matchingCount === 0;

  if (showEmpty) {
    return (
      <div className="card p-16 text-center space-y-4">
        <Users className="w-10 h-10 text-slate-600 mx-auto" />
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-200">No people found</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Try adjusting your search or filters, or add people from the web.
          </p>
        </div>
        <button
          onClick={onOpenIngestModal}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-md transition-colors inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add people
        </button>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div ref={scrollRef} className="overflow-x-auto max-h-[70vh]">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#0B111C] sticky top-0 z-20 border-b border-slate-800 text-xs font-medium text-slate-400 select-none">
            <tr>
              <th className="py-2.5 px-3.5 w-10 text-center">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={onToggleSelectAll}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
                  aria-label="Select all visible rows"
                />
              </th>
              <SortHeader label="Name" field="fullName" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              <SortHeader label="Confidence" field="matchConfidence" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} className="text-right" align="right" />
              <SortHeader label="Company" field="currentCompany" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
              <SortHeader label="Location" field="location" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} className="hidden md:table-cell" />
              <th className="py-2.5 px-4 hidden lg:table-cell">Skills</th>
              <th className="py-2.5 px-4 hidden xl:table-cell">Sources</th>
              <th className="py-2.5 px-4 text-center">Outreach</th>
            </tr>
          </thead>

          <tbody
            className={`divide-y divide-slate-800/60 text-sm ${
              loading && people.length > 0 ? 'opacity-60' : ''
            }`}
          >
            {showSkeleton ? (
              <SkeletonRows />
            ) : sortedPeople.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-sm text-slate-500">
                  {loadedCount === 0
                    ? 'Nothing on this page — go back a page or adjust your search.'
                    : 'All rows on this page are hidden by the active filters.'}
                </td>
              </tr>
            ) : (
              sortedPeople.map((person) => {
                const isSelectedRow = selectedPersonId === person.id;
                const isChecked = selectedIds.includes(person.id);
                const confidencePct = Math.round(person.matchConfidence * 100);
                const status = person.outreachStatus || 'uncontacted';
                const skills = person.skills.slice(0, 3).join(', ');
                const extraSkills = person.skills.length - 3;
                const domains = (person.sources || [])
                  .slice(0, 3)
                  .map((s) => s.domain.replace('www.', ''));

                return (
                  <tr
                    key={person.id}
                    onClick={() => onSelectPerson(person)}
                    className={`cursor-pointer transition-colors ${
                      isSelectedRow
                        ? 'bg-indigo-950/40'
                        : isChecked
                        ? 'bg-indigo-950/20'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td
                      className="py-3 px-3.5 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleSelectId(person.id)}
                        className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 cursor-pointer"
                        aria-label={`Select ${person.fullName}`}
                      />
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={person.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(person.fullName)}`}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover border border-slate-700/60 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-medium text-slate-100 truncate">
                            {person.fullName}
                          </div>
                          <div className="text-xs text-slate-400 truncate">
                            {person.currentTitle || '—'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <span className={`font-medium tabular-nums ${confidenceColor(confidencePct)}`}>
                        {confidencePct}%
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-300 truncate max-w-[160px]">
                      {person.currentCompany || <span className="text-slate-500">—</span>}
                    </td>

                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap hidden md:table-cell">
                      {person.location ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate max-w-[130px]">{person.location}</span>
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-xs text-slate-400 hidden lg:table-cell max-w-[200px]">
                      {person.skills.length > 0 ? (
                        <span className="truncate block">
                          {skills}
                          {extraSkills > 0 && (
                            <span className="text-slate-500"> +{extraSkills}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-xs text-slate-400 hidden xl:table-cell whitespace-nowrap">
                      {domains.length > 0 ? domains.join(', ') : <span className="text-slate-600">—</span>}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_STYLES[status] || STATUS_STYLES.uncontacted
                        }`}
                      >
                        {STATUS_LABELS[status] || status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer: result range, confidence legend, pagination */}
      <div className="bg-[#0B111C] border-t border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-slate-400">
        <div>
          <span className="font-medium text-slate-200">{rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()}</span>{' '}
          of <span className="font-medium text-slate-200">{matchingCount.toLocaleString()}</span>
          {matchingCount !== totalCount && <> · {totalCount.toLocaleString()} in database</>}
          {hiddenByFilters > 0 && (
            <span className="text-slate-500"> · {hiddenByFilters} on this page hidden by filters</span>
          )}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> ≥ 90%
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span> 70–89%
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span> &lt; 70% confidence
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || loading}
            className="h-7 px-2 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 border border-slate-700 transition-colors inline-flex items-center gap-1"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Prev
          </button>
          <span className="tabular-nums">
            Page <span className="font-medium text-slate-200">{page}</span> of{' '}
            <span className="font-medium text-slate-200">{totalPages.toLocaleString()}</span>
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || loading}
            className="h-7 px-2 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 border border-slate-700 transition-colors inline-flex items-center gap-1"
            aria-label="Next page"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
