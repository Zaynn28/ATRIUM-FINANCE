/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  TrendingDown,
  AlertCircle,
  Clock,
  CheckCircle2,
  Search,
  Filter,
  ArrowDownLeft,
  FileText,
  Calendar,
  Building,
  User,
  CreditCard,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import { ARAgingItem, AgingSummary, Account, Department } from '../../types';
import { api } from '../../services/api';

interface AccountsReceivableModuleProps {
  accounts: Account[];
  departments: Department[];
  onViewJournal?: (journalId: string) => void;
}

export const AccountsReceivableModule: React.FC<AccountsReceivableModuleProps> = ({
  accounts,
  departments,
  onViewJournal,
}) => {
  const [items, setItems] = useState<ARAgingItem[]>([]);
  const [summary, setSummary] = useState<AgingSummary>({
    total_outstanding: 0,
    current: 0,
    bucket_1_30: 0,
    bucket_31_60: 0,
    bucket_61_90: 0,
    bucket_over_90: 0,
    count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [bucketFilter, setBucketFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('ALL');

  // Settlement Modal State
  const [settlementModalItem, setSettlementModalItem] = useState<ARAgingItem | null>(null);
  const [settleAmount, setSettleAmount] = useState<string>('');
  const [settleDate, setSettleDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [settleMethod, setSettleMethod] = useState<string>('Bank Transfer (BCA / Mandiri)');
  const [settleBankAcc, setSettleBankAcc] = useState<string>('1010');
  const [settleRef, setSettleRef] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const bankAccounts = useMemo(() => {
    return accounts.filter((a) => a.account_type === 'Asset' && a.active === 'Y');
  }, [accounts]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getARItems();
      setItems(res.items || []);
      setSummary(
        res.summary || {
          total_outstanding: 0,
          current: 0,
          bucket_1_30: 0,
          bucket_31_60: 0,
          bucket_61_90: 0,
          bucket_over_90: 0,
          count: 0,
        }
      );
    } catch (err: any) {
      console.error('Failed to load AR data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (bucketFilter !== 'ALL' && item.aging_bucket !== bucketFilter) return false;
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (customerTypeFilter !== 'ALL' && item.customer_type !== customerTypeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCust = item.customer_name.toLowerCase().includes(q);
        const matchTx = item.transaction_id.toLowerCase().includes(q);
        const matchNotes = (item.notes || '').toLowerCase().includes(q);
        const matchDept = item.department_name.toLowerCase().includes(q);
        if (!matchCust && !matchTx && !matchNotes && !matchDept) return false;
      }
      return true;
    });
  }, [items, bucketFilter, statusFilter, customerTypeFilter, searchQuery]);

  const handleOpenSettleModal = (item: ARAgingItem) => {
    setSettlementModalItem(item);
    setSettleAmount(item.outstanding_balance.toString());
    setSettleDate(new Date().toISOString().split('T')[0]);
    setSettleRef(`Ref-${item.transaction_id.substring(4)}`);
    setFeedback(null);
  };

  const handleProcessSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlementModalItem) return;

    const amt = parseFloat(settleAmount);
    if (isNaN(amt) || amt <= 0) {
      setFeedback({ type: 'error', message: 'Please enter a valid positive payment amount.' });
      return;
    }

    try {
      setIsSubmitting(true);
      setFeedback(null);
      const res = await api.recordARSettlement({
        ar_id: settlementModalItem.id,
        amount: amt,
        payment_date: settleDate,
        payment_method: settleMethod,
        bank_account_code: settleBankAcc,
        reference: settleRef,
      });

      setFeedback({
        type: 'success',
        message: `Settlement of Rp ${amt.toLocaleString()} recorded! Journal ${res.journal_id} posted to GL.`,
      });

      await loadData();
      setTimeout(() => {
        setSettlementModalItem(null);
      }, 1500);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to record settlement.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBucketBadge = (bucket: ARAgingItem['aging_bucket'], days: number) => {
    switch (bucket) {
      case 'CURRENT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
            Current (0d)
          </span>
        );
      case '1_30':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-950/80 text-blue-300 border border-blue-800/60">
            1-30 Days ({days}d)
          </span>
        );
      case '31_60':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/60">
            31-60 Days ({days}d)
          </span>
        );
      case '61_90':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-950/80 text-orange-300 border border-orange-800/60">
            61-90 Days ({days}d)
          </span>
        );
      case 'OVER_90':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/60 animate-pulse">
            &gt;90 Days Overdue ({days}d)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Banner & Quick Controls */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-slate-900 to-slate-900 border border-emerald-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
              Automatic Operational Subledger
            </span>
            <span className="text-slate-500 text-xs">•</span>
            <span className="text-xs text-slate-400 font-mono">Synced from Revenue &amp; PMS Folios</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
            Accounts Receivable (AR) Monitor &amp; Control
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-1">
            Real-time aging analysis, City Ledger credit control, guest folio collection tracking, and automatic double-entry GL receipt posting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync AR Data</span>
          </button>
        </div>
      </div>

      {/* AR Aging Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Outstanding */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Total AR Ledger</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold font-mono text-white">
            Rp {(summary.total_outstanding / 1_000_000).toFixed(1)}M
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">
            {summary.count} Total Receivables
          </div>
        </div>

        {/* Current (Not Due) */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-900/30 shadow-sm">
          <div className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Current (Not Due)</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold font-mono text-emerald-300">
            Rp {(summary.current / 1_000_000).toFixed(1)}M
          </div>
          <div className="text-[10px] text-emerald-500/70 mt-1 font-mono">
            {summary.total_outstanding > 0
              ? `${Math.round((summary.current / summary.total_outstanding) * 100)}% of total`
              : '0%'}
          </div>
        </div>

        {/* 1 - 30 Days */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-blue-900/30 shadow-sm">
          <div className="text-[11px] font-mono text-blue-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>1 - 30 Days</span>
            <Clock className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-lg font-bold font-mono text-blue-300">
            Rp {(summary.bucket_1_30 / 1_000_000).toFixed(1)}M
          </div>
          <div className="text-[10px] text-blue-500/70 mt-1 font-mono">Within standard grace</div>
        </div>

        {/* 31 - 60 Days */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-900/30 shadow-sm">
          <div className="text-[11px] font-mono text-amber-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>31 - 60 Days</span>
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-bold font-mono text-amber-300">
            Rp {(summary.bucket_31_60 / 1_000_000).toFixed(1)}M
          </div>
          <div className="text-[10px] text-amber-500/70 mt-1 font-mono">Follow-up required</div>
        </div>

        {/* 61 - 90 Days */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-orange-900/30 shadow-sm">
          <div className="text-[11px] font-mono text-orange-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>61 - 90 Days</span>
            <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="text-lg font-bold font-mono text-orange-300">
            Rp {(summary.bucket_61_90 / 1_000_000).toFixed(1)}M
          </div>
          <div className="text-[10px] text-orange-500/70 mt-1 font-mono">Critical collections</div>
        </div>

        {/* Over 90 Days */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-rose-900/40 shadow-sm">
          <div className="text-[11px] font-mono text-rose-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>&gt;90 Days Overdue</span>
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-lg font-bold font-mono text-rose-300">
            Rp {(summary.bucket_over_90 / 1_000_000).toFixed(1)}M
          </div>
          <div className="text-[10px] text-rose-500/70 mt-1 font-mono">Doubtful debt review</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 ml-1" />
          <input
            type="text"
            placeholder="Search guest folio, corporate account, voucher #, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Bucket Filter */}
          <select
            value={bucketFilter}
            onChange={(e) => setBucketFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Aging Buckets</option>
            <option value="CURRENT">Current (Not Overdue)</option>
            <option value="1_30">1 - 30 Days</option>
            <option value="31_60">31 - 60 Days</option>
            <option value="61_90">61 - 90 Days</option>
            <option value="OVER_90">&gt; 90 Days Overdue</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending (Unpaid)</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="SETTLED">Settled (Full)</option>
          </select>

          {/* Customer Type Filter */}
          <select
            value={customerTypeFilter}
            onChange={(e) => setCustomerTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Debtor Channels</option>
            <option value="CITY_LEDGER_CORPORATE">Corporate City Ledger</option>
            <option value="OTA_COLLECT">OTA Channel Collect</option>
            <option value="GUEST_FOLIO">Guest Folio Ledger</option>
            <option value="BANQUET_CLIENT">Banquet / Catering</option>
          </select>
        </div>
      </div>

      {/* AR Aging Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-400" />
              Accounts Receivable Aging Schedule
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Showing {filteredItems.length} active receivable items
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-1 rounded-lg">
            Auto-Linked to Chart of Accounts (1020)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 font-mono text-[11px] border-b border-slate-800 uppercase tracking-wider">
                <th className="p-3.5 font-semibold">Debtor / Account</th>
                <th className="p-3.5 font-semibold">Channel Type</th>
                <th className="p-3.5 font-semibold">Invoice / Due Date</th>
                <th className="p-3.5 font-semibold">Department</th>
                <th className="p-3.5 font-semibold text-right">Original Amount</th>
                <th className="p-3.5 font-semibold text-right">Paid Amount</th>
                <th className="p-3.5 font-semibold text-right">Balance Due</th>
                <th className="p-3.5 font-semibold">Aging Bucket</th>
                <th className="p-3.5 font-semibold">Status</th>
                <th className="p-3.5 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    No Accounts Receivable items match your search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-850/60 transition-colors group"
                  >
                    <td className="p-3.5 font-medium text-slate-100">
                      <div className="font-semibold text-slate-200">{item.customer_name}</div>
                      <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mt-0.5">
                        <span>{item.transaction_id}</span>
                        {item.journal_id && onViewJournal && (
                          <button
                            onClick={() => onViewJournal(item.journal_id)}
                            className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-0.5 ml-1"
                            title="Inspect GL Journal"
                          >
                            <span>GL</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        {item.customer_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-[11px]">
                      <div>{item.date}</div>
                      <div className="text-slate-400 text-[10px]">Due: {item.due_date}</div>
                    </td>
                    <td className="p-3.5 text-slate-300">{item.department_name}</td>
                    <td className="p-3.5 font-mono text-right text-slate-300">
                      Rp {item.original_amount.toLocaleString()}
                    </td>
                    <td className="p-3.5 font-mono text-right text-emerald-400">
                      Rp {item.paid_amount.toLocaleString()}
                    </td>
                    <td className="p-3.5 font-mono text-right font-bold text-white">
                      Rp {item.outstanding_balance.toLocaleString()}
                    </td>
                    <td className="p-3.5">
                      {getBucketBadge(item.aging_bucket, item.days_overdue)}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                          item.status === 'SETTLED'
                            ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60'
                            : item.status === 'PARTIALLY_PAID'
                            ? 'bg-blue-950/70 text-blue-300 border border-blue-800/60'
                            : 'bg-amber-950/70 text-amber-300 border border-amber-800/60'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      {item.outstanding_balance > 0 ? (
                        <button
                          onClick={() => handleOpenSettleModal(item)}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 mx-auto shadow-sm"
                        >
                          <CreditCard className="w-3 h-3" />
                          <span>Receive</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-mono text-emerald-500 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Settled</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collect / Receive Payment Modal */}
      {settlementModalItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                  Record Accounts Receivable Settlement
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Debtor: {settlementModalItem.customer_name} ({settlementModalItem.transaction_id})
                </p>
              </div>
              <button
                onClick={() => setSettlementModalItem(null)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/70 border border-rose-800 text-rose-300'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleProcessSettlement} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Outstanding AR Due</span>
                  <span className="text-base font-bold text-emerald-400">
                    Rp {settlementModalItem.outstanding_balance.toLocaleString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px] uppercase">Aging Bucket</span>
                  <span className="text-xs font-semibold text-slate-300">
                    {settlementModalItem.aging_bucket} ({settlementModalItem.days_overdue} days)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Receipt Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={settleDate}
                    onChange={(e) => setSettleDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Settlement Amount (IDR) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={settlementModalItem.outstanding_balance}
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-emerald-400 font-mono text-xs font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Receiving Bank / Cash Account (Debit) *
                </label>
                <select
                  value={settleBankAcc}
                  onChange={(e) => setSettleBankAcc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                >
                  {bankAccounts.map((acc) => (
                    <option key={acc.account_code} value={acc.account_code}>
                      {acc.account_code} - {acc.account_name}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Automatically posts: Debit Bank ({settleBankAcc}) | Credit AR Guest/City Ledger (1020)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Payment Method
                  </label>
                  <select
                    value={settleMethod}
                    onChange={(e) => setSettleMethod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Bank Transfer (BCA / Mandiri)">Bank Transfer (BCA / Mandiri)</option>
                    <option value="Corporate Virtual Account (VA)">Corporate Virtual Account (VA)</option>
                    <option value="Credit Card Settlement">Credit Card Settlement (EDC)</option>
                    <option value="Direct Cash Folio Settlement">Front Office Cash Deposit</option>
                    <option value="OTA Virtual Card Clearing">OTA Virtual Card Clearing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Payment Reference / Bank Slip #
                  </label>
                  <input
                    type="text"
                    value={settleRef}
                    onChange={(e) => setSettleRef(e.target.value)}
                    placeholder="e.g. TRF-BCA-9812938"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSettlementModalItem(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-950 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                  <span>Post AR Receipt &amp; Journal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
