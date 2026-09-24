/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Search,
  Filter,
  ArrowUpRight,
  FileText,
  Calendar,
  Building,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Truck,
  DollarSign,
  Send,
  Building2,
} from 'lucide-react';
import { APAgingItem, AgingSummary, Account, Department } from '../../types';
import { api } from '../../services/api';

interface AccountsPayableModuleProps {
  accounts: Account[];
  departments: Department[];
  onViewJournal?: (journalId: string) => void;
}

export const AccountsPayableModule: React.FC<AccountsPayableModuleProps> = ({
  accounts,
  departments,
  onViewJournal,
}) => {
  const [items, setItems] = useState<APAgingItem[]>([]);
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
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');

  // Disbursement Payment Modal State
  const [paymentModalItem, setPaymentModalItem] = useState<APAgingItem | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState<string>('Bank Corporate Transfer (BCA)');
  const [payBankAcc, setPayBankAcc] = useState<string>('1010');
  const [payRef, setPayRef] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const bankAccounts = useMemo(() => {
    return accounts.filter((a) => a.account_type === 'Asset' && a.active === 'Y');
  }, [accounts]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getAPItems();
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
      console.error('Failed to load AP data:', err);
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
      if (sourceFilter !== 'ALL' && item.source !== sourceFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchVendor = item.vendor_name.toLowerCase().includes(q);
        const matchRef = item.reference_id.toLowerCase().includes(q);
        const matchNotes = (item.notes || '').toLowerCase().includes(q);
        const matchDept = item.department_name.toLowerCase().includes(q);
        if (!matchVendor && !matchRef && !matchNotes && !matchDept) return false;
      }
      return true;
    });
  }, [items, bucketFilter, statusFilter, sourceFilter, searchQuery]);

  const handleOpenPayModal = (item: APAgingItem) => {
    setPaymentModalItem(item);
    setPayAmount(item.outstanding_balance.toString());
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayRef(`DISB-${item.reference_id}`);
    setFeedback(null);
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalItem) return;

    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      setFeedback({ type: 'error', message: 'Please enter a valid positive payment amount.' });
      return;
    }

    try {
      setIsSubmitting(true);
      setFeedback(null);
      const res = await api.recordAPPayment({
        ap_id: paymentModalItem.id,
        amount: amt,
        payment_date: payDate,
        payment_method: payMethod,
        bank_account_code: payBankAcc,
        reference: payRef,
      });

      setFeedback({
        type: 'success',
        message: `Disbursement of Rp ${amt.toLocaleString()} to ${paymentModalItem.vendor_name} posted! Journal ${res.journal_id} posted to GL.`,
      });

      await loadData();
      setTimeout(() => {
        setPaymentModalItem(null);
      }, 1500);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to record disbursement payment.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBucketBadge = (bucket: APAgingItem['aging_bucket'], days: number) => {
    switch (bucket) {
      case 'CURRENT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
            Current (Due in future)
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
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/50 via-slate-900 to-slate-900 border border-blue-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
              Automatic Procurement Subledger
            </span>
            <span className="text-slate-500 text-xs">•</span>
            <span className="text-xs text-slate-400 font-mono">Synced from Purchase Orders &amp; Invoices</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-400" />
            Accounts Payable (AP) Monitor &amp; Disbursement Control
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-1">
            Automated vendor aging schedules, PO three-way match liability monitoring, cash flow disbursement scheduling, and GL payment postings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync AP Records</span>
          </button>
        </div>
      </div>

      {/* AP Aging Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Outstanding Payable */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Total AP Due</span>
            <DollarSign className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-lg font-bold font-mono text-white">
            Rp {(summary.total_outstanding / 1_000_000).toFixed(1)}M
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">
            {summary.count} Active Supplier Bills
          </div>
        </div>

        {/* Current (Not Due Yet) */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-900/30 shadow-sm">
          <div className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Current (On Terms)</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold font-mono text-emerald-300">
            Rp {(summary.current / 1_000_000).toFixed(1)}M
          </div>
          <div className="text-[10px] text-emerald-500/70 mt-1 font-mono">
            {summary.total_outstanding > 0
              ? `${Math.round((summary.current / summary.total_outstanding) * 100)}% on term`
              : '0%'}
          </div>
        </div>

        {/* 1 - 30 Days */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-blue-900/30 shadow-sm">
          <div className="text-[11px] font-mono text-blue-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>1 - 30 Days Past Due</span>
            <Clock className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-lg font-bold font-mono text-blue-300">
            Rp {(summary.bucket_1_30 / 1_000_000).toFixed(1)}M
          </div>
          <div className="text-[10px] text-blue-500/70 mt-1 font-mono">Next payment batch</div>
        </div>

        {/* 31 - 60 Days */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-900/30 shadow-sm">
          <div className="text-[11px] font-mono text-amber-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>31 - 60 Days Due</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-bold font-mono text-amber-300">
            Rp {(summary.bucket_31_60 / 1_000_000).toFixed(1)}M
          </div>
          <div className="text-[10px] text-amber-500/70 mt-1 font-mono">Vendor payment warning</div>
        </div>

        {/* 61 - 90 Days */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-orange-900/30 shadow-sm">
          <div className="text-[11px] font-mono text-orange-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>61 - 90 Days Due</span>
            <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="text-lg font-bold font-mono text-orange-300">
            Rp {(summary.bucket_61_90 / 1_000_000).toFixed(1)}M
          </div>
          <div className="text-[10px] text-orange-500/70 mt-1 font-mono">Supply hold risk</div>
        </div>

        {/* Over 90 Days */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-rose-900/40 shadow-sm">
          <div className="text-[11px] font-mono text-rose-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>&gt;90 Days Overdue</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-lg font-bold font-mono text-rose-300">
            Rp {(summary.bucket_over_90 / 1_000_000).toFixed(1)}M
          </div>
          <div className="text-[10px] text-rose-500/70 mt-1 font-mono">Critical vendor escalation</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 ml-1" />
          <input
            type="text"
            placeholder="Search vendor name, PO #, spending reference, department..."
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
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Aging Buckets</option>
            <option value="CURRENT">Current (Within Term)</option>
            <option value="1_30">1 - 30 Days Due</option>
            <option value="31_60">31 - 60 Days Due</option>
            <option value="61_90">61 - 90 Days Due</option>
            <option value="OVER_90">&gt; 90 Days Overdue</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="PENDING">Pending (Unpaid)</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Fully Paid</option>
          </select>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Ingestion Sources</option>
            <option value="PURCHASE_ORDER">Purchase Orders (Procurement)</option>
            <option value="SPENDING_TX">Direct Spending Vouchers</option>
          </select>
        </div>
      </div>

      {/* AP Aging Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              Accounts Payable Aging &amp; Vendor Balance Ledger
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Showing {filteredItems.length} active payable obligations
            </p>
          </div>
          <span className="text-xs font-mono text-blue-400 bg-blue-950/60 border border-blue-800/50 px-2.5 py-1 rounded-lg">
            Auto-Linked to Chart of Accounts (2010 Trade AP)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 font-mono text-[11px] border-b border-slate-800 uppercase tracking-wider">
                <th className="p-3.5 font-semibold">Supplier / Vendor</th>
                <th className="p-3.5 font-semibold">Document Ref</th>
                <th className="p-3.5 font-semibold">Terms &amp; Due Date</th>
                <th className="p-3.5 font-semibold">Department</th>
                <th className="p-3.5 font-semibold text-right">Invoiced Total</th>
                <th className="p-3.5 font-semibold text-right">Paid to Date</th>
                <th className="p-3.5 font-semibold text-right">Payable Balance</th>
                <th className="p-3.5 font-semibold">Aging Bucket</th>
                <th className="p-3.5 font-semibold">Status</th>
                <th className="p-3.5 font-semibold text-center">Disburse</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    No Accounts Payable items match your search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-850/60 transition-colors group"
                  >
                    <td className="p-3.5 font-medium text-slate-100">
                      <div className="font-semibold text-slate-200">{item.vendor_name}</div>
                      {item.vendor_contact && (
                        <div className="text-[10px] text-slate-400 mt-0.5">{item.vendor_contact}</div>
                      )}
                    </td>
                    <td className="p-3.5 font-mono">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700 block max-w-max">
                        {item.reference_id}
                      </span>
                      {item.journal_id && onViewJournal && (
                        <button
                          onClick={() => onViewJournal(item.journal_id!)}
                          className="text-blue-400 hover:text-blue-300 text-[10px] inline-flex items-center gap-0.5 mt-1"
                          title="Inspect AP Journal"
                        >
                          <span>View GL Journal</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-[11px]">
                      <div className="text-slate-200 font-semibold">{item.payment_terms}</div>
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
                          item.status === 'PAID'
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
                          onClick={() => handleOpenPayModal(item)}
                          className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 mx-auto shadow-sm"
                        >
                          <Send className="w-3 h-3" />
                          <span>Pay</span>
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

      {/* Disburse / Pay Vendor Modal */}
      {paymentModalItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                  Process Accounts Payable Disbursement
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Vendor: {paymentModalItem.vendor_name} ({paymentModalItem.reference_id})
                </p>
              </div>
              <button
                onClick={() => setPaymentModalItem(null)}
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
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleProcessPayment} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Outstanding AP Due</span>
                  <span className="text-base font-bold text-blue-400">
                    Rp {paymentModalItem.outstanding_balance.toLocaleString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px] uppercase">Aging Bucket</span>
                  <span className="text-xs font-semibold text-slate-300">
                    {paymentModalItem.aging_bucket} ({paymentModalItem.days_overdue} days)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Disbursement Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Disbursement Amount (IDR) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={paymentModalItem.outstanding_balance}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-blue-400 font-mono text-xs font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Disbursing Bank / Source Account (Credit) *
                </label>
                <select
                  value={payBankAcc}
                  onChange={(e) => setPayBankAcc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                >
                  {bankAccounts.map((acc) => (
                    <option key={acc.account_code} value={acc.account_code}>
                      {acc.account_code} - {acc.account_name}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Automatically posts: Debit Accounts Payable (2010) | Credit Operating Bank ({payBankAcc})
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Payment Method
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="Bank Corporate Transfer (BCA)">Bank Corporate Transfer (BCA)</option>
                    <option value="Bank Corporate Transfer (Mandiri)">Bank Corporate Transfer (Mandiri)</option>
                    <option value="Cheque / Giro Bilyet">Company Cheque / Bilyet Giro</option>
                    <option value="Petty Cash Voucher">General Cash Voucher</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Bank Reference / Voucher #
                  </label>
                  <input
                    type="text"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="e.g. TRF-OUT-99120"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentModalItem(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors flex items-center gap-1.5 shadow-lg shadow-blue-950 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                  <span>Post AP Payment &amp; Journal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
