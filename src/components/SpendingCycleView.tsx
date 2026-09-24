/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ArrowUpRight,
  Plus,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Clock,
  Settings2,
  ArrowRight,
} from 'lucide-react';
import {
  SpendingTransaction,
  Account,
  Department,
  MappingConfig,
  SpendingType,
} from '../types';
import { api } from '../services/api';
import { AccountsPayableModule } from './ap/AccountsPayableModule';

interface SpendingCycleViewProps {
  transactions: SpendingTransaction[];
  accounts: Account[];
  departments: Department[];
  mappingConfig?: MappingConfig;
  onRefresh: () => void;
  onOpenMappingModal: () => void;
  onViewJournal: (journalId: string) => void;
}

export const SpendingCycleView: React.FC<SpendingCycleViewProps> = ({
  transactions,
  accounts,
  departments,
  mappingConfig,
  onRefresh,
  onOpenMappingModal,
  onViewJournal,
}) => {
  const [activeCycleTab, setActiveCycleTab] = useState<'AP_MODULE' | 'SPENDING_ENTRY'>('AP_MODULE');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'Procurement' as SpendingType,
    vendor_or_employee: '',
    department_code: '',
    account_code: '', // Expense or Asset (Debit)
    amount: '',
    description: '',
    credit_account_code: '', // Counterpart Liability / Cash (Credit)
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    txId: string;
    journalId: string;
  } | null>(null);

  // Expense or Asset accounts
  const expenseAndAssetAccounts = accounts.filter(
    (a) => (a.account_type === 'Expense' || a.account_type === 'Asset') && a.active === 'Y'
  );

  // Liability and Cash accounts (Counterparts)
  const counterpartCreditAccounts = accounts.filter(
    (a) => (a.account_type === 'Liability' || a.account_type === 'Asset') && a.active === 'Y'
  );

  const activeDepartments = departments.filter((d) => d.active === 'Y');

  // Determine current default credit account based on spending type
  const getDefaultCreditAccount = (type: SpendingType) => {
    if (type === 'Procurement') {
      return mappingConfig?.spending_procurement_credit_account || '';
    }
    if (type === 'Payroll') {
      return mappingConfig?.spending_payroll_credit_account || '';
    }
    return mappingConfig?.spending_other_credit_account || '';
  };

  const currentDefaultCredit = getDefaultCreditAccount(formData.type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessInfo(null);

    const counterpart = formData.credit_account_code || currentDefaultCredit;
    if (!counterpart) {
      setErrorMessage(
        `Counterpart Credit account for ${formData.type} is not configured. Please select or confirm default mapping.`
      );
      return;
    }

    const numericAmount = parseFloat(formData.amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMessage('Amount must be a positive number.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.recordSpending({
        date: formData.date,
        type: formData.type,
        vendor_or_employee: formData.vendor_or_employee,
        department_code: formData.department_code,
        account_code: formData.account_code,
        amount: numericAmount,
        description: formData.description,
        credit_account_code: counterpart,
      });

      setSuccessInfo({
        txId: res.transaction.transaction_id,
        journalId: res.draftJournal.journal_id,
      });

      // Reset form fields
      setFormData({
        ...formData,
        vendor_or_employee: '',
        amount: '',
        description: '',
      });

      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record spending transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
              Procurement &amp; Spending Cycle
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <ArrowUpRight className="w-5 h-5 text-amber-400" />
            <span>Procurement Spending &amp; Accounts Payable (AP)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor and control supplier liabilities, aging schedules, and automated double-entry voucher disbursements
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-tab pills */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setActiveCycleTab('AP_MODULE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeCycleTab === 'AP_MODULE'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Accounts Payable (AP)</span>
            </button>
            <button
              onClick={() => setActiveCycleTab('SPENDING_ENTRY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeCycleTab === 'SPENDING_ENTRY'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Spending Voucher</span>
            </button>
          </div>

          <button
            onClick={onOpenMappingModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Payable Mappings</span>
          </button>
        </div>
      </div>

      {activeCycleTab === 'AP_MODULE' ? (
        <AccountsPayableModule
          departments={departments}
          accounts={accounts}
          onViewJournal={onViewJournal}
        />
      ) : (
        <>
          {/* Unmapped Exception Banner */}
      {!currentDefaultCredit && !formData.credit_account_code && (
        <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl p-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="text-xs font-semibold text-amber-200">
                Accounting Exception: Counterpart Credit Account for {formData.type} Missing
              </h4>
              <p className="text-xs text-amber-300/80 leading-relaxed">
                Confirm whether vendor purchases credit Accounts Payable Trade (2010) or Cash clearing before posting.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenMappingModal}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg shrink-0 transition-colors"
          >
            Configure Mapping
          </button>
        </div>
      )}

      {/* Notifications */}
      {errorMessage && (
        <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-lg flex items-center justify-between text-xs text-red-200">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-300">
            Dismiss
          </button>
        </div>
      )}

      {successInfo && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/50 rounded-xl flex items-center justify-between text-xs text-emerald-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="font-semibold">
                Spending transaction recorded: <span className="font-mono">{successInfo.txId}</span>
              </p>
              <p className="text-emerald-300/80">
                Auto-generated Draft Journal: <span className="font-mono font-medium">{successInfo.journalId}</span> (Pending validation and approval)
              </p>
            </div>
          </div>
          <button
            onClick={() => onViewJournal(successInfo.journalId)}
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
          >
            <span>Review Journal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entry Form */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Record Spending Transaction</span>
            </h2>
            <span className="text-[11px] font-mono uppercase text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              Double-Entry
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Date */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">Transaction Date *</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">Spending Category *</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['Procurement', 'Payroll', 'Other'] as SpendingType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: t, credit_account_code: '' })}
                    className={`py-1.5 px-2 rounded text-center text-xs font-medium border transition-colors ${
                      formData.type === t
                        ? 'bg-amber-950/60 text-amber-300 border-amber-600/60'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 font-mono">
                {formData.type === 'Procurement' && 'Vendor invoices & goods receipt (AP Trade)'}
                {formData.type === 'Payroll' && 'Payroll batch — API not yet connected (manual entry)'}
                {formData.type === 'Other' && 'Direct cash & miscellaneous disbursement'}
              </p>
            </div>

            {/* Vendor or Employee */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                {formData.type === 'Payroll' ? 'Staff Group / Employee Name *' : 'Vendor / Payee Name *'}
              </label>
              <input
                type="text"
                required
                placeholder={
                  formData.type === 'Payroll'
                    ? 'e.g. Front Office Staff Payroll (Batch #10)'
                    : 'e.g. Sysco Foods, Ecolab, Linen Supplies Co.'
                }
                value={formData.vendor_or_employee}
                onChange={(e) => setFormData({ ...formData, vendor_or_employee: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:border-emerald-500 outline-none font-sans"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">Cost Center / Department *</label>
              <select
                required
                value={formData.department_code}
                onChange={(e) => setFormData({ ...formData, department_code: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:border-emerald-500 outline-none"
              >
                <option value="">-- Select Department --</option>
                {activeDepartments.map((dept) => (
                  <option key={dept.department_code} value={dept.department_code}>
                    [{dept.department_code}] {dept.department_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Expense or Asset Account (Debit) */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">Expense or Asset Account (Debit) *</label>
              <select
                required
                value={formData.account_code}
                onChange={(e) => setFormData({ ...formData, account_code: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:border-emerald-500 outline-none font-mono"
              >
                <option value="">-- Select Expense / Asset Account --</option>
                {expenseAndAssetAccounts.map((acc) => (
                  <option key={acc.account_code} value={acc.account_code}>
                    [{acc.account_code}] {acc.account_name} ({acc.account_type})
                  </option>
                ))}
              </select>
            </div>

            {/* Counterpart Credit Account (Liability/Cash) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-medium">Counterpart Credit Account *</label>
                <span className="text-[10px] text-slate-500 font-mono">
                  {currentDefaultCredit ? `Default: ${currentDefaultCredit}` : 'Not set'}
                </span>
              </div>
              <select
                required
                value={formData.credit_account_code || currentDefaultCredit || ''}
                onChange={(e) => setFormData({ ...formData, credit_account_code: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:border-emerald-500 outline-none font-mono"
              >
                <option value="">-- Select Payable / Settlement Account --</option>
                {counterpartCreditAccounts.map((acc) => (
                  <option key={acc.account_code} value={acc.account_code}>
                    [{acc.account_code}] {acc.account_name} ({acc.account_type})
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">Amount ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono text-sm focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">Description / PO Reference</label>
              <textarea
                rows={2}
                placeholder="e.g. Monthly guest amenities replenishment, Meat & poultry kitchen supplies"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 outline-none focus:border-emerald-500"
              />
            </div>

            {/* Double-entry preview hint */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 space-y-1 font-mono text-[11px]">
              <div className="text-slate-400 font-sans font-medium">Double-Entry Preview:</div>
              <div className="text-rose-400">
                DR: [{formData.account_code || 'Expense Pending'}] $
                {formData.amount || '0.00'}
              </div>
              <div className="text-amber-400">
                CR: [{formData.credit_account_code || currentDefaultCredit || 'Payable Pending'}] $
                {formData.amount || '0.00'}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Generating Draft Journal...' : 'Record & Draft Journal'}</span>
            </button>
          </form>
        </div>

        {/* Spending Transactions Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Spending Transactions Log ({transactions.length})</span>
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              Only POSTED journals appear in financial reporting
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Payee / Vendor</th>
                    <th className="py-3 px-3">Dept</th>
                    <th className="py-3 px-3">Account</th>
                    <th className="py-3 px-3 text-right">Amount</th>
                    <th className="py-3 px-3 text-center">Linked Journal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                        <ArrowUpRight className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                        <p className="font-medium text-slate-400">No spending transactions recorded</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Record hotel purchases and payroll above to initiate double-entry journal review.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => {
                      const acc = (accounts || []).find((a) => a.account_code === tx.account_code);
                      return (
                        <tr key={tx.transaction_id} className="hover:bg-slate-800/40">
                          <td className="py-3 px-3 text-slate-300 whitespace-nowrap">{tx.date}</td>
                          <td className="py-3 px-3">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-sans bg-slate-800 text-slate-300 border border-slate-700">
                              {tx.type}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-sans text-slate-200 font-medium truncate max-w-[150px]">
                            {tx.vendor_or_employee}
                          </td>
                          <td className="py-3 px-3 text-slate-400">{tx.department_code}</td>
                          <td className="py-3 px-3">
                            <span className="text-slate-200 font-medium">{tx.account_code}</span>
                            {acc && (
                              <span className="block text-[10px] text-slate-400 font-sans truncate max-w-[130px]">
                                {acc.account_name}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-rose-400">
                            ${(tx.amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-center font-sans">
                            {tx.journal_id ? (
                              <button
                                onClick={() => onViewJournal(tx.journal_id)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-[11px] font-mono transition-colors"
                                title="Click to view journal in Workbench"
                              >
                                <Clock className="w-3 h-3" />
                                <span>{tx.journal_id}</span>
                              </button>
                            ) : (
                              <span className="text-slate-500 text-[11px]">Unlinked</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
