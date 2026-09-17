/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Scale,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Download,
  Printer,
} from 'lucide-react';
import { TrialBalanceReport } from '../types';
import { api } from '../services/api';

export const TrialBalanceView: React.FC = () => {
  const [period, setPeriod] = useState<string>('');
  const [report, setReport] = useState<TrialBalanceReport | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTrialBalance = (selectedPeriod?: string) => {
    setLoading(true);
    api
      .getTrialBalance(selectedPeriod || undefined)
      .then((data) => {
        setReport(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load trial balance:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTrialBalance(period);
  }, [period]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <Scale className="w-5 h-5 text-emerald-400" />
            <span>Trial Balance Report</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Comprehensive verification of debit and credit ledger balances for POSTED transactions
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period Filter */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-transparent text-slate-200 font-mono outline-none"
            />
            {period && (
              <button
                onClick={() => setPeriod('')}
                className="text-[11px] text-slate-400 hover:text-slate-200 ml-1"
              >
                Clear
              </button>
            )}
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Balance Verification Banner */}
      {report && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
            report.is_balanced
              ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
              : 'bg-red-950/40 border-red-800/60 text-red-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {report.is_balanced ? (
              <div className="p-2 bg-emerald-900/40 rounded-lg text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            ) : (
              <div className="p-2 bg-red-900/40 rounded-lg text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold font-sans">
                {report.is_balanced
                  ? 'Double-Entry In Balance: Total Debits strictly equal Total Credits'
                  : 'CRITICAL AUDIT EXCEPTION: Trial Balance is Out of Balance!'}
              </h3>
              <p className="text-xs opacity-80 mt-0.5">
                Period: <span className="font-mono">{report.period}</span> &bull; Variance:{' '}
                <span className="font-mono font-semibold">${report.variance.toFixed(2)}</span>
              </p>
            </div>
          </div>

          <div className="text-right font-mono hidden sm:block">
            <div className="text-xs opacity-75">Net Sum:</div>
            <div className="text-sm font-bold">
              ${report.total_debits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Account Code</th>
                <th className="py-3 px-4">Account Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Normal</th>
                <th className="py-3 px-4 text-right">Debit Total ($)</th>
                <th className="py-3 px-4 text-right">Credit Total ($)</th>
                <th className="py-3 px-4 text-right">Net Debit ($)</th>
                <th className="py-3 px-4 text-right">Net Credit ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                    Calculating Trial Balance from POSTED journal lines...
                  </td>
                </tr>
              ) : !report || report.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-500 font-sans">
                    <Scale className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                    <p className="font-medium text-slate-400">No posted transactions recorded</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Trial Balance is computed exclusively from POSTED journals. Pending drafts are excluded.
                    </p>
                  </td>
                </tr>
              ) : (
                report.items.map((item) => {
                  const hasActivity = item.debit_sum > 0 || item.credit_sum > 0;
                  return (
                    <tr
                      key={item.account_code}
                      className={`hover:bg-slate-800/40 ${!hasActivity ? 'opacity-40' : ''}`}
                    >
                      <td className="py-2.5 px-4 font-semibold text-slate-200">{item.account_code}</td>
                      <td className="py-2.5 px-4 font-sans text-slate-100 font-medium">{item.account_name}</td>
                      <td className="py-2.5 px-4 font-sans text-slate-400">{item.account_type}</td>
                      <td className="py-2.5 px-4 text-slate-400">{item.normal_balance}</td>
                      <td className="py-2.5 px-4 text-right text-slate-300">
                        {item.debit_sum > 0
                          ? item.debit_sum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-300">
                        {item.credit_sum > 0
                          ? item.credit_sum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-emerald-400 bg-slate-950/30">
                        {item.net_debit > 0
                          ? item.net_debit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-blue-400 bg-slate-950/30">
                        {item.net_credit > 0
                          ? item.net_credit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Grand Totals */}
            {report && (
              <tfoot className="bg-slate-950 border-t-2 border-slate-700 font-bold text-xs">
                <tr>
                  <td colSpan={6} className="py-3 px-4 text-right text-slate-300 font-sans uppercase">
                    Grand Totals:
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-400 text-sm">
                    ${report.total_debits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right text-blue-400 text-sm">
                    ${report.total_credits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
