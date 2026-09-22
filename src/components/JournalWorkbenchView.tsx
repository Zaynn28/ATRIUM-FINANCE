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
  X,
  ArrowRight,
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
  onNavigateToLedger?: (accountCode?: string) => void;
}

export const JournalWorkbenchView: React.FC<JournalWorkbenchViewProps> = ({
  journals = [],
  accounts = [],
  departments = [],
  selectedJournalId,
  onRefresh,
  onOpenManualJournalModal,
  onNavigateToLedger,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedJournals, setExpandedJournals] = useState<Set<string>>(
    new Set(selectedJournalId ? [selectedJournalId] : [])
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // In-app interactive confirmation modals (No iframe window.confirm or window.prompt)
  const [postingJournal, setPostingJournal] = useState<JournalWithLines | null>(null);
  const [reversingJournal, setReversingJournal] = useState<JournalWithLines | null>(null);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);
  const [reversalDateInput, setReversalDateInput] = useState<string>('');

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
      setErrorMessage(err.message || 'Validation failed');
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
      setErrorMessage(err.message || 'Approval failed');
    } finally {
      setActionLoading(null);
    }
  };

  // Action: Post (Confirmed via in-app modal, auto-approving if needed)
  const executePost = async (id: string) => {
    setActionLoading(id);
    setErrorMessage(null);
    try {
      await api.postJournal(id, { autoApprove: true });
      setSuccessMessage(
        `Journal ${id} POSTED and permanently locked. It is now active in General Ledger & Trial Balance.`
      );
      setPostingJournal(null);
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to post journal to ledger');
    } finally {
      setActionLoading(null);
    }
  };

  // Action: Reverse (Confirmed via in-app modal)
  const executeReverse = async (id: string) => {
    if (!reversalDateInput) {
      setErrorMessage('Please enter an effective date for the reversal journal.');
      return;
    }
    setActionLoading(id);
    setErrorMessage(null);
    try {
      const res = await api.reverseJournal(id, reversalDateInput);
      setSuccessMessage(
        `Journal ${id} reversed. Offsetting reversal journal ${res.reversal.journal_id} generated.`
      );
      setReversingJournal(null);
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reverse journal');
    } finally {
      setActionLoading(null);
    }
  };

  // Action: Delete Draft (Confirmed via in-app modal)
  const executeDeleteDraft = async (id: string) => {
    setActionLoading(id);
    setErrorMessage(null);
    try {
      await api.deleteJournal(id);
      setSuccessMessage(`Draft journal ${id} deleted.`);
      setDeletingDraftId(null);
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete draft');
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
        <div className="p-3.5 bg-red-950/40 border border-red-800/60 rounded-xl flex items-center justify-between text-xs text-red-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="font-sans">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-300 text-xs px-2 py-0.5 rounded hover:bg-red-900/40"
          >
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center justify-between text-xs text-emerald-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-sans">{successMessage}</span>
          </div>
          <div className="flex items-center gap-3">
            {onNavigateToLedger && (
              <button
                onClick={() => onNavigateToLedger()}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <span>View in General Ledger</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-400 hover:text-emerald-300 text-xs px-2 py-0.5 rounded hover:bg-emerald-900/40"
            >
              Dismiss
            </button>
          </div>
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
                      {/* Step 1: DRAFT -> VALIDATE or DIRECT POST */}
                      {journal.status === 'DRAFT' && (
                        <>
                          <button
                            id={`btn-validate-${journal.journal_id}`}
                            onClick={() => handleValidate(journal.journal_id)}
                            disabled={isLoading}
                            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm flex items-center gap-1"
                            title="Verify Debits = Credits balance"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            <span>Validate</span>
                          </button>
                          <button
                            id={`btn-post-draft-${journal.journal_id}`}
                            onClick={() => setPostingJournal(journal)}
                            disabled={isLoading}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5"
                            title="Post to General Ledger (auto-validates and approves)"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Post to Ledger</span>
                          </button>
                          <button
                            onClick={() => setDeletingDraftId(journal.journal_id)}
                            disabled={isLoading}
                            className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800"
                            title="Delete Draft"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      {/* Step 2: VALIDATED -> APPROVE or DIRECT POST */}
                      {journal.status === 'VALIDATED' && (
                        <>
                          <button
                            id={`btn-approve-${journal.journal_id}`}
                            onClick={() => handleApprove(journal.journal_id)}
                            disabled={isLoading}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            id={`btn-post-val-${journal.journal_id}`}
                            onClick={() => setPostingJournal(journal)}
                            disabled={isLoading}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5"
                            title="Post to General Ledger (Permanent & Immutable)"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Post to Ledger</span>
                          </button>
                        </>
                      )}

                      {/* Step 3: APPROVED -> POST (LOCKS PERMANENTLY) */}
                      {journal.status === 'APPROVED' && (
                        <button
                          id={`btn-post-${journal.journal_id}`}
                          onClick={() => setPostingJournal(journal)}
                          disabled={isLoading}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5"
                          title="Post to General Ledger (Permanent & Immutable)"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Post to Ledger</span>
                        </button>
                      )}

                      {/* Step 4: POSTED -> REVERSE & VIEW GL */}
                      {journal.status === 'POSTED' && (
                        <>
                          {onNavigateToLedger && (
                            <button
                              onClick={() => onNavigateToLedger()}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                              title="View entries in General Ledger"
                            >
                              <span>View in GL</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            id={`btn-reverse-${journal.journal_id}`}
                            onClick={() => {
                              setReversingJournal(journal);
                              setReversalDateInput(new Date().toISOString().split('T')[0]);
                            }}
                            disabled={isLoading}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                            title="Post offsetting reversal journal (Original remains locked)"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reverse</span>
                          </button>
                        </>
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
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-900/70 p-3 rounded-lg border border-slate-800 font-mono">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase tracking-wider">
                          Created By
                        </span>
                        <span className="text-slate-200">{journal.created_by}</span>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {journal.created_at ? new Date(journal.created_at).toLocaleString() : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase tracking-wider">
                          Approved By
                        </span>
                        <span className="text-slate-200">{journal.approved_by || 'Pending'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase tracking-wider">
                          Posted Timestamp
                        </span>
                        <span className="text-slate-200">
                          {journal.posted_at ? new Date(journal.posted_at).toLocaleString() : 'Unposted'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase tracking-wider">
                          Status &amp; Lock
                        </span>
                        <span
                          className={
                            journal.status === 'POSTED'
                              ? 'text-emerald-400 font-semibold'
                              : 'text-amber-400 font-semibold'
                          }
                        >
                          {journal.status === 'POSTED' ? 'LOCKED & IMMUTABLE' : 'MUTABLE DRAFT'}
                        </span>
                      </div>
                    </div>

                    {/* Journal Lines Table */}
                    <div className="overflow-x-auto rounded-lg border border-slate-800">
                      <table className="w-full text-xs font-mono">
                        <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 text-left">
                          <tr>
                            <th className="py-2 px-3">#</th>
                            <th className="py-2 px-3">Account Code</th>
                            <th className="py-2 px-3">Account Name</th>
                            <th className="py-2 px-3">Department</th>
                            <th className="py-2 px-3 text-right">Debit ($)</th>
                            <th className="py-2 px-3 text-right">Credit ($)</th>
                            <th className="py-2 px-3">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                          {journal.lines.map((line) => {
                            const acc = (accounts || []).find((a) => a.account_code === line.account_code);
                            const dept = (departments || []).find(
                              (d) => d.department_code === line.department_code
                            );
                            return (
                              <tr key={line.line_number} className="hover:bg-slate-900/50">
                                <td className="py-2 px-3 text-slate-500">{line.line_number}</td>
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
                                  {(line.debit ?? 0) > 0
                                    ? (line.debit ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                    : '—'}
                                </td>
                                <td className="py-2 px-3 text-right font-semibold text-blue-400">
                                  {(line.credit ?? 0) > 0
                                    ? (line.credit ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
                      <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-lg flex items-center justify-between gap-3 text-xs text-emerald-300/80">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>
                            <strong>Immutable Record:</strong> This journal is locked. Editing or deletion is disabled per accounting standards. To correct errors, use the <strong>Reverse</strong> button to post an offsetting entry.
                          </span>
                        </div>
                        {onNavigateToLedger && (
                          <button
                            onClick={() => onNavigateToLedger()}
                            className="px-2.5 py-1 text-xs bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 rounded-lg hover:bg-emerald-900/60 flex items-center gap-1 font-medium shrink-0 transition-colors"
                          >
                            <span>Open in GL</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: In-app Post Confirmation (Replaces window.confirm) */}
      {postingJournal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 rounded-lg">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Post Journal to General Ledger
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {postingJournal.journal_id} &bull; Period: {postingJournal.period}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPostingJournal(null)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Journal Date:</span>
                  <span className="text-slate-200">{postingJournal.journal_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Source:</span>
                  <span className="text-slate-200">{postingJournal.source_type} ({postingJournal.source_reference || 'Manual'})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Debits:</span>
                  <span className="text-emerald-400 font-semibold">${postingJournal.total_debit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Credits:</span>
                  <span className="text-blue-400 font-semibold">${postingJournal.total_credit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Double-Entry Status:</span>
                  <span className={postingJournal.is_balanced ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
                    {postingJournal.is_balanced ? "Balanced (Debits = Credits)" : "Out of Balance!"}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-lg flex items-start gap-2.5 text-amber-300/90 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-200">Audit Rule (Permanent Immutable Lock)</p>
                  <p className="mt-0.5 text-slate-300 text-[11px]">
                    Once posted, this journal is permanently locked. It will immediately update the General Ledger balances and the Trial Balance.
                  </p>
                </div>
              </div>

              {postingJournal.status !== 'APPROVED' && (
                <div className="p-2.5 bg-indigo-950/30 border border-indigo-800/40 rounded-lg text-[11px] text-indigo-300 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>
                    Current status: <strong>{postingJournal.status}</strong>. Confirming will automatically validate balance and apply Financial Controller Approval before posting.
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPostingJournal(null)}
                disabled={actionLoading === postingJournal.journal_id}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executePost(postingJournal.journal_id)}
                disabled={actionLoading === postingJournal.journal_id || !postingJournal.is_balanced}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                {actionLoading === postingJournal.journal_id ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Posting to Ledger...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Confirm &amp; Post to Ledger</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: In-app Reversal Date Picker (Replaces window.prompt) */}
      {reversingJournal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-950/80 text-amber-400 border border-amber-800/50 rounded-lg">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Reverse Posted Journal
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {reversingJournal.journal_id} &bull; Original: {reversingJournal.journal_date}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReversingJournal(null)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                Reversing will create a linked offsetting journal entry with inverted debits and credits. The original journal remains locked for complete audit trail compliance.
              </p>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Reversal Effective Date
                </label>
                <input
                  type="date"
                  value={reversalDateInput}
                  onChange={(e) => setReversalDateInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setReversingJournal(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeReverse(reversingJournal.journal_id)}
                disabled={actionLoading === reversingJournal.journal_id || !reversalDateInput}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                {actionLoading === reversingJournal.journal_id ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generating Reversal...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Create Reversal Entry</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: In-app Discard Draft Confirmation (Replaces window.confirm) */}
      {deletingDraftId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-sm overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-950/80 text-red-400 border border-red-800/50 rounded-lg">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Discard Draft Voucher
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {deletingDraftId}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to permanently discard this unposted draft journal? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingDraftId(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDeleteDraft(deletingDraftId)}
                disabled={actionLoading === deletingDraftId}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                {actionLoading === deletingDraftId ? 'Deleting...' : 'Discard Draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
