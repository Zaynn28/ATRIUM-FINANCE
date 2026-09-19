/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
  Lock,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { Account, GeneralLedgerEntry } from '../types';
import { api } from '../services/api';

interface GeneralLedgerViewProps {
  accounts: Account[];
  onViewJournal: (journalId: string) => void;
}

export const GeneralLedgerView: React.FC<GeneralLedgerViewProps> = ({
  accounts,
  onViewJournal,
}) => {
  const [selectedAccountCode, setSelectedAccountCode] = useState<string>('');
  const [periodFilter, setPeriodFilter] = useState<string>('');
  const [ledgerData, setLedgerData] = useState<{
    account: Account | null;
    entries: GeneralLedgerEntry[];
    total_debit: number;
    total_credit: number;
    ending_balance: number;
  }>({
    account: null,
    entries: [],
    total_debit: 0,
    total_credit: 0,
    ending_balance: 0,
  });
  const [loading, setLoading] = useState(false);

  // Set default selected account when accounts load
  useEffect(() => {
    if (!selectedAccountCode && accounts.length > 0) {
      setSelectedAccountCode(accounts[0].account_code);
    }
  }, [accounts, selectedAccountCode]);

  // Fetch Ledger data whenever selected account or period changes
  useEffect(() => {
    if (!selectedAccountCode) return;
    let isMounted = true;
    setLoading(true);

    api
      .getLedger({
        account_code: selectedAccountCode,
        period: periodFilter || undefined,
      })
      .then((data) => {
        if (isMounted) {
          setLedgerData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load ledger:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedAccountCode, periodFilter]);

  const currentAccount = accounts.find((a) => a.account_code === selectedAccountCode) || ledgerData.account;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <span>General Ledger</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Chronological audit book of all POSTED journal lines with dynamic running balance
          </p>
        </div>

        {/* Strict Accounting Rule Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs font-mono">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Strictly POSTED Entries Only</span>
        </div>
      </div>

      {/* Account Selector & Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Account Selector */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Select General Ledger Account:
          </label>
          <select
            id="select-ledger-account"
            value={selectedAccountCode}
            onChange={(e) => setSelectedAccountCode(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:border-emerald-500 outline-none"
          >
            {accounts.length === 0 && (
              <option value="">No accounts available</option>
            )}
            {accounts.map((acc) => (
              <option key={acc.account_code} value={acc.account_code}>
                [{acc.account_code}] {acc.account_name} &bull; {acc.account_type} (Normal: {acc.normal_balance})
              </option>
            ))}
          </select>
        </div>

        {/* Period Filter */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Accounting Period:
          </label>
          <input
            type="month"
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:border-emerald-500 outline-none"
          />
          {periodFilter && (
            <button
              onClick={() => setPeriodFilter('')}
              className="text-[11px] text-slate-400 hover:text-slate-200 mt-1"
            >
              Clear filter (Show all periods)
            </button>
          )}
        </div>
      </div>

      {/* Account Summary Cards */}
      {currentAccount && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400 block font-medium">Normal Balance</span>
            <span className="text-base font-bold text-slate-200 font-mono mt-1 block">
              {currentAccount.normal_balance}
            </span>
            <span className="text-[11px] text-slate-500 font-sans">Type: {currentAccount.account_type}</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400 block font-medium">Total Debits</span>
            <span className="text-base font-bold text-emerald-400 font-mono mt-1 block">
              ${(ledgerData.total_debit ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-500 font-sans">Debited lines</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400 block font-medium">Total Credits</span>
            <span className="text-base font-bold text-blue-400 font-mono mt-1 block">
              ${(ledgerData.total_credit ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-500 font-sans">Credited lines</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400 block font-medium">Ending Balance</span>
            <span
              className={`text-base font-bold font-mono mt-1 block ${
                (ledgerData.ending_balance ?? 0) >= 0 ? 'text-slate-100' : 'text-rose-400'
              }`}
            >
              ${(ledgerData.ending_balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-500 font-sans">Net ledger balance</span>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-200 text-xs">
              Account Ledger: {currentAccount?.account_code} - {currentAccount?.account_name}
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {ledgerData.entries.length} posted record(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Journal ID</th>
                <th className="py-3 px-3">Source Ref</th>
                <th className="py-3 px-3">Dept</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3 text-right">Debit ($)</th>
                <th className="py-3 px-3 text-right">Credit ($)</th>
                <th className="py-3 px-3 text-right">Running Balance ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                    Loading General Ledger entries...
                  </td>
                </tr>
              ) : ledgerData.entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-500 font-sans">
                    <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                    <p className="font-medium text-slate-400">No posted entries in General Ledger</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Transactions only appear here after their draft journals have been approved and POSTED in the Journal Workbench.
                    </p>
                  </td>
                </tr>
              ) : (
                ledgerData.entries.map((entry, idx) => (
                  <tr key={`${entry.journal_id}-${idx}`} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">{entry.journal_date}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <button
                        onClick={() => onViewJournal(entry.journal_id)}
                        className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 hover:underline font-semibold"
                        title="Click to view journal voucher"
                      >
                        <span>{entry.journal_id}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-400 truncate max-w-[120px]">
                      {entry.source_reference || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{entry.department_code || '—'}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-300 max-w-[200px] truncate">
                      {entry.description || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-emerald-400">
                      {(entry.debit ?? 0) > 0
                        ? (entry.debit ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-blue-400">
                      {(entry.credit ?? 0) > 0
                        ? (entry.credit ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-100 bg-slate-950/40">
                      ${(entry.running_balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
