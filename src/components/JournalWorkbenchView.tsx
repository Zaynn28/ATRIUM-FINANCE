/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  Lock,
  RotateCcw,
  Plus,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  FileCheck,
  Calendar,
  Check,
  Trash2,
  Info,
} from 'lucide-react';
import { JournalWithLines, JournalStatus, Account, Department } from '../types';
import { api } from '../services/api';

interface JournalWorkbenchViewProps {
  journals: JournalWithLines[];
  accounts: Account[];
  departments: Department[];
  selectedJournalId?: string | null;
  onRefresh: () => void;
  onOpenManualJournalModal: () => void;
}

export const JournalWorkbenchView: React.FC<JournalWorkbenchViewProps> = ({
  journals,
  accounts,
  departments,
  selectedJournalId,
  onRefresh,
  onOpenManualJournalModal,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedJournals, setExpandedJournals] = useState<Set<string>>(
    new Set(selectedJournalId ? [selectedJournalId] : [])
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Toggle accordion expand
  const toggleExpand = (id: string) => {
    const next = new Set(expandedJournals);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedJournals(next);
  };

  // Filter journals
  const filteredJournals = journals.filter((j) => {
    const matchesStatus = statusFilter === 'ALL' || j.status === statusFilter;
    const matchesSearch =
      j.journal_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.source_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.period.includes(searchQuery) ||
      j.lines.some((l) => l.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Action: Validate (Debits must equal credits)
  const handleValidate = async (id: string) => {
    setActionLoading(id);
    setErrorMessage(null);
    try {
      await api.validateJournal(id);
      setSuccessMessage(`Journal ${id} successfully validated (Debits = Credits verified).`);
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Action: Approve (Controller step)
  const handleApprove = async (id: string) => {
    setActionLoading(id);
    setErrorMessage(null);
    try {
      await api.approveJournal(id, 'Zayen (Financial Controller)');
      setSuccessMessage(`Journal ${id} approved by Controller.`);
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Action: Post (Locks journal, permanent ledger integration)
  const handlePost = async (id: string) => {
    if (
      !confirm(
        `POST JOURNAL ${id}?\n\nCRITICAL AUDIT RULE: Once posted, this journal is permanently locked and immutable. It cannot be edited or deleted. Are you sure you want to post it to the General Ledger?`
      )
    ) {
      return;
    }

    setActionLoading(id);
    setErrorMessage(null);
    try {
      await api.postJournal(id);
      setSuccessMessage(`Journal ${id} POSTED and locked. It is now active in General Ledger & Trial Balance.`);
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Action: Reverse (Creates offsetting journal, original marked reversed)
  const handleReverse = async (id: string) => {
    const revDate = prompt(
      `REVERSE POSTED JOURNAL ${id}\n\nEnter the reversal effective date (YYYY-MM-DD):`,
      new Date().toISOString().split('T')[0]
    );
    if (!revDate) return;

    setActionLoading(id);
    setErrorMessage(null);
    try {
      const res = await api.reverseJournal(id, revDate);
      setSuccessMessage(
        `Journal ${id} reversed. Offsetting reversal journal ${res.reversal.journal_id} generated.`
      );
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Action: Delete Draft
  const handleDeleteDraft = async (id: string) => {
    if (!confirm(`Delete draft journal ${id}?`)) return;
    setActionLoading(id);
    setErrorMessage(null);
    try {
      await api.deleteJournal(id);
      setSuccessMessage(`Draft journal ${id} deleted.`);
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: JournalStatus) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-sans font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/50 flex items-center gap-1">
            <Clock className="w-3 h-3" /> DRAFT
          </span>
        );
      case 'VALIDATED':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-sans font-semibold bg-sky-950/60 text-sky-300 border border-sky-800/50 flex items-center gap-1">
            <FileCheck className="w-3 h-3" /> VALIDATED
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-sans font-semibold bg-indigo-950/60 text-indigo-300 border border-indigo-800/50 flex items-center gap-1">
            <Check className="w-3 h-3" /> APPROVED
          </span>
        );
      case 'POSTED':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-sans font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 flex items-center gap-1">
            <Lock className="w-3 h-3 text-emerald-400" /> POSTED (LOCKED)
          </span>
        );
      case 'REVERSED':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-sans font-semibold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
            <RotateCcw className="w-3 h-3 text-slate-500" /> REVERSED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-emerald-400" />
            <span>Journal Workbench (Approval &amp; Posting Engine)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Rigorous double-entry governance: Draft &rarr; Validate &rarr; Approve &rarr; Post (Locked) &rarr; Reverse
          </p>
        </div>

        <button
          id="btn-new-manual-journal"
          onClick={onOpenManualJournalModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Manual Journal Voucher</span>
        </button>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-lg flex items-center justify-between text-xs text-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-300">
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-lg flex items-center justify-between text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-300">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Journal ID, reference, period..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1">
          <span className="text-xs text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Status:
          </span>
          {['ALL', 'DRAFT', 'VALIDATED', 'APPROVED', 'POSTED', 'REVERSED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded text-xs whitespace-nowrap font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Journals List */}
      <div className="space-y-3">
        {filteredJournals.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl py-14 text-center text-slate-500">
            <Clock className="w-9 h-9 mx-auto text-slate-600 mb-2 opacity-40" />
            <p className="font-medium text-slate-400">No journals found</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {journals.length === 0
                ? 'Create a transaction in Revenue or Spending Cycle, or click "Manual Journal Voucher" above to begin.'
                : 'No journals match your current status or search filter.'}
            </p>
          </div>
        ) : (
          filteredJournals.map((journal) => {
            const isExpanded = expandedJournals.has(journal.journal_id);
            const isLoading = actionLoading === journal.journal_id;

            return (
              <div
                key={journal.journal_id}
                id={`journal-${journal.journal_id}`}
                className={`bg-slate-900 border rounded-xl overflow-hidden transition-all ${
                  journal.status === 'POSTED'
                    ? 'border-slate-800 hover:border-slate-700'
                    : journal.status === 'APPROVED'
                    ? 'border-indigo-900/40 hover:border-indigo-800/60'
                    : 'border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Journal Row Header */}
                <div
                  onClick={() => toggleExpand(journal.journal_id)}
                  className="px-5 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer bg-slate-900/60 hover:bg-slate-800/30 select-none"
                >
                  <div className="flex items-center gap-3">
                    <button className="text-slate-500 hover:text-slate-300">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    <div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-slate-100 text-sm">
                          {journal.journal_id}
                        </span>
                        {getStatusBadge(journal.status)}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                          {journal.source_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                        <span>Date: {journal.journal_date}</span>
                        <span>&bull;</span>
                        <span>Period: {journal.period}</span>
                        {journal.source_reference && (
                          <>
                            <span>&bull;</span>
                            <span className="truncate max-w-[200px] font-sans">
                              Ref: {journal.source_reference}
                            </span>
                          </>
                        )}
                        {journal.reversal_of && (
                          <>
                            <span>&bull;</span>
                            <span className="text-amber-400">Reversal of: {journal.reversal_of}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side: Balances & Action Bar */}
                  <div
                    className="flex items-center justify-between md:justify-end gap-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Amount & Balance indicator */}
                    <div className="text-right font-mono">
                      <div className="text-xs text-slate-400">
                        Total: <span className="text-slate-200 font-semibold">${journal.total_debit.toFixed(2)}</span>
                      </div>
                      <div className="text-[11px]">
                        {journal.is_balanced ? (
                          <span className="text-emerald-400 font-medium">Debits = Credits</span>
                        ) : (
                          <span className="text-red-400 font-medium">Out of Balance</span>
                        )}
                      </div>
                    </div>

                    {/* Workflow State Transition Buttons */}
                    <div className="flex items-center gap-1.5 font-sans">
                      {/* Step 1: DRAFT -> VALIDATE */}
                      {journal.status === 'DRAFT' && (
                        <>
                          <button
                            id={`btn-validate-${journal.journal_id}`}
                            onClick={() => handleValidate(journal.journal_id)}
                            disabled={isLoading}
                            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm flex items-center gap-1"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            <span>Validate</span>
                          </button>
                          <button
                            onClick={() => handleDeleteDraft(journal.journal_id)}
                            disabled={isLoading}
                            className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800"
                            title="Delete Draft"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      {/* Step 2: VALIDATED -> APPROVE */}
                      {journal.status === 'VALIDATED' && (
                        <button
                          id={`btn-approve-${journal.journal_id}`}
                          onClick={() => handleApprove(journal.journal_id)}
                          disabled={isLoading}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve (Controller)</span>
                        </button>
                      )}

                      {/* Step 3: APPROVED -> POST (LOCKS PERMANENTLY) */}
                      {journal.status === 'APPROVED' && (
                        <button
                          id={`btn-post-${journal.journal_id}`}
                          onClick={() => handlePost(journal.journal_id)}
                          disabled={isLoading}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5"
                          title="Post to General Ledger (Permanent & Immutable)"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Post to Ledger</span>
                        </button>
                      )}

                      {/* Step 4: POSTED -> REVERSE ONLY */}
                      {journal.status === 'POSTED' && (
                        <button
                          id={`btn-reverse-${journal.journal_id}`}
                          onClick={() => handleReverse(journal.journal_id)}
                          disabled={isLoading}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                          title="Post offsetting reversal journal (Original remains locked)"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reverse Journal</span>
                        </button>
                      )}

                      {/* Status REVERSED */}
                      {journal.status === 'REVERSED' && (
                        <span className="text-[11px] text-slate-500 italic font-mono">
                          Reversed &amp; Locked
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details: Lines & Audit Trail */}
                {isExpanded && (
                  <div className="border-t border-slate-800/80 bg-slate-950/60 p-5 space-y-4">
                    {/* Audit Metadata */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Created By:</span>
                        <span className="text-slate-200">{journal.created_by || 'System'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Approved By:</span>
                        <span className="text-slate-200">{journal.approved_by || 'Pending Approval'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Posted At:</span>
                        <span className="text-slate-200">
                          {journal.posted_at ? new Date(journal.posted_at).toLocaleString() : 'Not Posted'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Ledger Status:</span>
                        <span
                          className={`font-semibold ${
                            journal.status === 'POSTED' || journal.status === 'REVERSED'
                              ? 'text-emerald-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {journal.status === 'POSTED'
                            ? 'Active in GL (Real)'
                            : journal.status === 'REVERSED'
                            ? 'Reversed in GL'
                            : 'Excluded from GL (Pending)'}
                        </span>
                      </div>
                    </div>

                    {/* Double-Entry Lines Table */}
                    <div className="border border-slate-800 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3 w-10 text-center">Line</th>
                            <th className="py-2.5 px-3">Account Code</th>
                            <th className="py-2.5 px-3">Account Name</th>
                            <th className="py-2.5 px-3">Dept</th>
                            <th className="py-2.5 px-3 text-right">Debit ($)</th>
                            <th className="py-2.5 px-3 text-right">Credit ($)</th>
                            <th className="py-2.5 px-3">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {journal.lines.map((line) => {
                            const acc = accounts.find((a) => a.account_code === line.account_code);
                            const dept = departments.find((d) => d.department_code === line.department_code);

                            return (
                              <tr key={line.line_no} className="hover:bg-slate-900/40">
                                <td className="py-2 px-3 text-center text-slate-500">{line.line_no}</td>
                                <td className="py-2 px-3 font-semibold text-slate-200">
                                  {line.account_code}
                                </td>
                                <td className="py-2 px-3 font-sans text-slate-300">
                                  {acc ? acc.account_name : 'Unknown Account'}
                                </td>
                                <td className="py-2 px-3 text-slate-400">
                                  {dept ? `[${dept.department_code}] ${dept.department_name}` : line.department_code || '—'}
                                </td>
                                <td className="py-2 px-3 text-right font-semibold text-emerald-400">
                                  {line.debit > 0
                                    ? line.debit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                    : '—'}
                                </td>
                                <td className="py-2 px-3 text-right font-semibold text-blue-400">
                                  {line.credit > 0
                                    ? line.credit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                    : '—'}
                                </td>
                                <td className="py-2 px-3 font-sans text-slate-300">
                                  {line.description || '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-slate-900 border-t border-slate-800 font-semibold">
                          <tr>
                            <td colSpan={4} className="py-2 px-3 text-right text-slate-400 font-sans text-xs">
                              Journal Totals:
                            </td>
                            <td className="py-2 px-3 text-right text-emerald-400">
                              ${journal.total_debit.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right text-blue-400">
                              ${journal.total_credit.toFixed(2)}
                            </td>
                            <td className="py-2 px-3">
                              {journal.is_balanced ? (
                                <span className="text-emerald-400 text-[11px] font-sans flex items-center gap-1 font-medium">
                                  <CheckCircle2 className="w-3 h-3" /> Balanced
                                </span>
                              ) : (
                                <span className="text-red-400 text-[11px] font-sans flex items-center gap-1 font-medium">
                                  <AlertTriangle className="w-3 h-3" /> Imbalance
                                </span>
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Immutable Rule Notice for POSTED journals */}
                    {journal.status === 'POSTED' && (
                      <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-lg flex items-center gap-2 text-xs text-emerald-300/80">
                        <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          <strong>Immutable Record:</strong> This journal is locked. Editing or deletion is disabled per accounting standards. To correct errors, use the <strong>Reverse Journal</strong> button above to post an offsetting entry.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
