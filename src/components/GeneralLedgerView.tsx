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
  Printer,
  Eye,
  Download,
} from 'lucide-react';
import { Account, GeneralLedgerEntry } from '../types';
import { api } from '../services/api';
import { PrintableReportContainer } from './reports/PrintableReportContainer';
import { exportReportToExcel } from '../utils/excelExporter';

interface GeneralLedgerViewProps {
  accounts?: Account[];
  onViewJournal?: (journalId: string) => void;
}

export const GeneralLedgerView: React.FC<GeneralLedgerViewProps> = ({
  accounts: propAccounts,
  onViewJournal,
}) => {
  const [internalAccounts, setInternalAccounts] = useState<Account[]>([]);
  const [selectedAccountCode, setSelectedAccountCode] = useState<string>('');
  const [periodFilter, setPeriodFilter] = useState<string>('');
  const [previewMode, setPreviewMode] = useState(false);
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

  const handlePrint = () => {
    window.dispatchEvent(new CustomEvent('atrium-open-print-preview'));
  };

  const handleExportExcel = () => {
    if (!currentAccount) return;

    const rows: (string | number)[][] = (ledgerData.entries || []).map((e) => [
      e.journal_date,
      e.journal_id,
      e.source_reference || '',
      e.department_code || '',
      e.description || '',
      e.debit ?? 0,
      e.credit ?? 0,
      e.running_balance ?? 0,
    ]);

    // Totals row
    rows.push([
      'TOTAL',
      '',
      '',
      '',
      'Total Period Activity',
      ledgerData.total_debit ?? 0,
      ledgerData.total_credit ?? 0,
      ledgerData.ending_balance ?? 0,
    ]);

    exportReportToExcel(
      `General_Ledger_${currentAccount.account_code}_PT_Atrium_Management_Group_${periodFilter || 'All_Time'}.xlsx`,
      [
        {
          name: `GL ${currentAccount.account_code}`.slice(0, 31),
          title: `GENERAL LEDGER — [${currentAccount.account_code}] ${currentAccount.account_name.toUpperCase()}`,
          subtitle: `Account Type: ${currentAccount.account_type} | Normal: ${currentAccount.normal_balance}`,
          period: periodFilter || 'All Time',
          headers: [
            'Date',
            'Journal ID',
            'Source Ref',
            'Dept',
            'Description',
            'Debit (Rp)',
            'Credit (Rp)',
            'Running Balance (Rp)',
          ],
          rows,
          colWidths: [14, 16, 16, 10, 35, 18, 18, 20],
        },
      ]
    );
  };

  // Fetch accounts internally if not passed as prop
  useEffect(() => {
    if (!propAccounts || propAccounts.length === 0) {
      api.getAccounts().then((accs) => {
        if (Array.isArray(accs)) {
          setInternalAccounts(accs);
        }
      }).catch((err) => {
        console.error('Failed to load accounts in GeneralLedgerView:', err);
      });
    }
  }, [propAccounts]);

  const effectiveAccounts: Account[] = (propAccounts && propAccounts.length > 0)
    ? propAccounts
    : internalAccounts;

  // Set default selected account when accounts load
  useEffect(() => {
    if (!selectedAccountCode && effectiveAccounts.length > 0) {
      setSelectedAccountCode(effectiveAccounts[0].account_code);
    }
  }, [effectiveAccounts, selectedAccountCode]);

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
          setLedgerData({
            account: data?.account || null,
            entries: Array.isArray(data?.entries) ? data.entries : [],
            total_debit: data?.total_debit || 0,
            total_credit: data?.total_credit || 0,
            ending_balance: data?.ending_balance || 0,
          });
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

  const currentAccount = effectiveAccounts.find((a) => a.account_code === selectedAccountCode) || ledgerData.account;

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

        {/* Action Controls & Audit Pill */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs font-mono">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Strictly POSTED Entries</span>
          </div>

          {/* Direct Excel Download Button */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors border border-emerald-600"
            title="Export this ledger account to Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel (.xlsx)</span>
          </button>

          {/* Toggle PDF Preview */}
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              previewMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{previewMode ? 'Screen View' : 'PDF Preview'}</span>
          </button>

          {/* Print to PDF */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600/90 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print to PDF</span>
          </button>
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
            {effectiveAccounts.length === 0 && (
              <option value="">No accounts available</option>
            )}
            {effectiveAccounts.map((acc) => (
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

      {/* Printable Report Wrapper */}
      <PrintableReportContainer
        reportTitle={
          currentAccount
            ? `GENERAL LEDGER — [${currentAccount.account_code}] ${currentAccount.account_name}`
            : 'GENERAL LEDGER AUDIT REPORT'
        }
        reportSubtitle="Chronological Audit Ledger of All POSTED Journal Entries"
        period={periodFilter}
        property="PT Atrium Management Group"
        orientation="landscape"
        previewMode={previewMode}
        onExitPreview={() => setPreviewMode(false)}
        onExportExcel={handleExportExcel}
      >
        <div className="space-y-6">
          {/* Account Summary Cards */}
          {currentAccount && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 print:border-black print:p-2">
                <span className="text-xs text-slate-400 block font-medium print:text-black">Normal Balance</span>
                <span className="text-base font-bold text-slate-200 font-mono mt-1 block print:text-black">
                  {currentAccount.normal_balance}
                </span>
                <span className="text-[11px] text-slate-500 font-sans print:text-black">Type: {currentAccount.account_type}</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 print:border-black print:p-2">
                <span className="text-xs text-slate-400 block font-medium print:text-black">Total Debits</span>
                <span className="text-base font-bold text-emerald-400 font-mono mt-1 block print:text-black">
                  Rp {(ledgerData.total_debit ?? 0).toLocaleString('id-ID')}
                </span>
                <span className="text-[11px] text-slate-500 font-sans print:text-black">Debited lines</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 print:border-black print:p-2">
                <span className="text-xs text-slate-400 block font-medium print:text-black">Total Credits</span>
                <span className="text-base font-bold text-blue-400 font-mono mt-1 block print:text-black">
                  Rp {(ledgerData.total_credit ?? 0).toLocaleString('id-ID')}
                </span>
                <span className="text-[11px] text-slate-500 font-sans print:text-black">Credited lines</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 print:border-black print:p-2">
                <span className="text-xs text-slate-400 block font-medium print:text-black">Ending Balance</span>
                <span
                  className={`text-base font-bold font-mono mt-1 block print:text-black ${
                    (ledgerData.ending_balance ?? 0) >= 0 ? 'text-slate-100' : 'text-rose-400'
                  }`}
                >
                  Rp {(ledgerData.ending_balance ?? 0).toLocaleString('id-ID')}
                </span>
                <span className="text-[11px] text-slate-500 font-sans print:text-black">Net ledger balance</span>
              </div>
            </div>
          )}

          {/* Ledger Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden print:border-none print:bg-transparent">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-200 text-xs">
                  Account Ledger: {currentAccount?.account_code} - {currentAccount?.account_name}
                </span>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {(ledgerData?.entries?.length || 0)} posted record(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono print:text-[9pt] print:font-sans">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider print:border-b-2 print:border-black print:text-black">
                  <tr>
                    <th className="py-3 px-3 print:py-1.5 print:px-1">Date</th>
                    <th className="py-3 px-3 print:py-1.5 print:px-1">Journal ID</th>
                    <th className="py-3 px-3 print:py-1.5 print:px-1">Source Ref</th>
                    <th className="py-3 px-3 print:py-1.5 print:px-1">Dept</th>
                    <th className="py-3 px-3 print:py-1.5 print:px-1">Description</th>
                    <th className="py-3 px-3 text-right print:py-1.5 print:px-1">Debit (Rp)</th>
                    <th className="py-3 px-3 text-right print:py-1.5 print:px-1">Credit (Rp)</th>
                    <th className="py-3 px-3 text-right print:py-1.5 print:px-1">Balance (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 print:divide-slate-300">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                        Loading General Ledger entries...
                      </td>
                    </tr>
                  ) : !ledgerData?.entries || ledgerData.entries.length === 0 ? (
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
                    (ledgerData.entries || []).map((entry, idx) => (
                      <tr key={`${entry.journal_id}-${idx}`} className="hover:bg-slate-800/40 print:hover:bg-transparent">
                        <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap print:py-1 print:px-1 print:text-black">{entry.journal_date}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap print:py-1 print:px-1 print:text-black">
                          {onViewJournal ? (
                            <button
                              onClick={() => onViewJournal(entry.journal_id)}
                              className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 hover:underline font-semibold print:text-black print:no-underline"
                              title="Click to view journal voucher"
                            >
                              <span>{entry.journal_id}</span>
                              <ExternalLink className="w-3 h-3 print:hidden" />
                            </button>
                          ) : (
                            <span className="text-emerald-400 font-semibold print:text-black">{entry.journal_id}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-400 truncate max-w-[120px] print:py-1 print:px-1 print:text-black print:max-w-none">
                          {entry.source_reference || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 print:py-1 print:px-1 print:text-black">{entry.department_code || '—'}</td>
                        <td className="py-2.5 px-3 font-sans text-slate-300 max-w-[200px] truncate print:py-1 print:px-1 print:text-black print:max-w-none print:whitespace-normal">
                          {entry.description || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-400 print:py-1 print:px-1 print:text-black">
                          {(entry.debit ?? 0) > 0
                            ? (entry.debit ?? 0).toLocaleString('id-ID')
                            : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-blue-400 print:py-1 print:px-1 print:text-black">
                          {(entry.credit ?? 0) > 0
                            ? (entry.credit ?? 0).toLocaleString('id-ID')
                            : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-100 bg-slate-950/40 print:py-1 print:px-1 print:text-black print:bg-transparent">
                          {(entry.running_balance ?? 0).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {/* Print and on-screen footer total */}
                {ledgerData?.entries && ledgerData.entries.length > 0 && (
                  <tfoot className="border-t-2 border-slate-700 bg-slate-950 font-bold print:border-black print:bg-transparent print:text-black">
                    <tr>
                      <td colSpan={5} className="py-2.5 px-3 text-right uppercase tracking-wider print:py-1.5 print:px-1">
                        Period Activity Totals:
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 print:text-black print:py-1.5 print:px-1">
                        Rp {(ledgerData.total_debit ?? 0).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3 text-right text-blue-400 print:text-black print:py-1.5 print:px-1">
                        Rp {(ledgerData.total_credit ?? 0).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-100 print:text-black print:py-1.5 print:px-1 print:border-b-4 print:border-double print:border-black">
                        Rp {(ledgerData.ending_balance ?? 0).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </PrintableReportContainer>
    </div>
  );
};
