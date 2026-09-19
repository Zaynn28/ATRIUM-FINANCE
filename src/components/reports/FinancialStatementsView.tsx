/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Scale,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Sliders,
} from 'lucide-react';
import { FinancialStatementsReport, ReportLineItem } from '../../types';
import { api } from '../../services/api';
import { UniversalReportToolbar } from './UniversalReportToolbar';
import { UniversalDrilldownModal } from './UniversalDrilldownModal';
import { formatAmount, getThemeClasses, getDensityClasses } from '../../utils/reportFormatter';

interface FinancialStatementsViewProps {
  onOpenJournalInWorkbench?: (journalId: string) => void;
}

export const FinancialStatementsView: React.FC<FinancialStatementsViewProps> = ({
  onOpenJournalInWorkbench,
}) => {
  const [period, setPeriod] = useState<string>('');
  const [property, setProperty] = useState<string>('Atrium Hotel & Resort');
  const [activeTab, setActiveTab] = useState<'balance-sheet' | 'income-statement'>('balance-sheet');
  const [report, setReport] = useState<FinancialStatementsReport | null>(null);
  const [loading, setLoading] = useState(false);

  // Drilldown modal state
  const [drilldownLineId, setDrilldownLineId] = useState<string | null>(null);
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);

  const fetchReport = (selectedPeriod?: string) => {
    setLoading(true);
    api
      .getFinancialStatements(selectedPeriod || undefined)
      .then((data) => {
        setReport(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load financial statements:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchReport(period);
  }, [period]);

  const handleDrilldown = (lineId: string) => {
    setDrilldownLineId(lineId);
    setIsDrilldownOpen(true);
  };

  const handleExportCsv = () => {
    if (!report) return;
    const lines: string[] = [];
    if (activeTab === 'balance-sheet') {
      lines.push(`"Statement of Financial Position (Balance Sheet)"`);
      lines.push(`"Property:","${property}"`);
      lines.push(`"Period:","${period || 'All Time'}"`);
      lines.push(`"Generated:","${new Date().toISOString()}"`);
      lines.push('');
      lines.push(`"Category","Line Item","Amount (IDR)","Accounts Mapped"`);

      lines.push(`"Assets"`);
      report.balance_sheet.assets.forEach((r) => {
        lines.push(`,"${r.label}",${r.amount},"${r.account_codes.join('; ')}"`);
      });
      lines.push(`,"Total Assets",${report.balance_sheet.total_assets}`);
      lines.push('');

      lines.push(`"Liabilities"`);
      report.balance_sheet.liabilities.forEach((r) => {
        lines.push(`,"${r.label}",${r.amount},"${r.account_codes.join('; ')}"`);
      });
      lines.push(`,"Total Liabilities",${report.balance_sheet.total_liabilities}`);
      lines.push('');

      lines.push(`"Equity"`);
      report.balance_sheet.equity.forEach((r) => {
        lines.push(`,"${r.label}",${r.amount},"${r.account_codes.join('; ')}"`);
      });
      lines.push(`,"Total Equity",${report.balance_sheet.total_equity}`);
      lines.push(`,"Total Liabilities & Equity",${report.balance_sheet.total_liabilities_and_equity}`);
    } else {
      lines.push(`"Statement of Profit & Loss (Income Statement)"`);
      lines.push(`"Property:","${property}"`);
      lines.push(`"Period:","${period || 'All Time'}"`);
      lines.push(`"Generated:","${new Date().toISOString()}"`);
      lines.push('');
      lines.push(`"Category","Line Item","Amount (IDR)","Accounts Mapped"`);

      lines.push(`"Revenue"`);
      report.income_statement.operating_revenue.forEach((r) => {
        lines.push(`,"${r.label}",${r.amount},"${r.account_codes.join('; ')}"`);
      });
      lines.push(`,"Total Revenue",${report.income_statement.total_revenue}`);
      lines.push('');

      lines.push(`"Expenses"`);
      report.income_statement.operating_expenses.forEach((r) => {
        lines.push(`,"${r.label}",${r.amount},"${r.account_codes.join('; ')}"`);
      });
      lines.push(`,"Total Expenses",${report.income_statement.total_expenses}`);
      lines.push(`,"Net Operating Income",${report.income_statement.net_income}`);
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `${activeTab === 'balance-sheet' ? 'Balance_Sheet' : 'Income_Statement'}_${period || 'All_Time'}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Universal Report Toolbar */}
      <UniversalReportToolbar
        reportTitle="Financial Statements"
        reportSubtitle="Audited Balance Sheet & Income Statement strictly calculated from POSTED General Ledger"
        period={period}
        onPeriodChange={setPeriod}
        property={property}
        onPropertyChange={setProperty}
        onRefresh={() => fetchReport(period)}
        onExportCsv={handleExportCsv}
        loading={loading}
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 print:hidden">
        <button
          onClick={() => setActiveTab('balance-sheet')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'balance-sheet'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Statement of Financial Position (Balance Sheet)</span>
        </button>
        <button
          onClick={() => setActiveTab('income-statement')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'income-statement'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Statement of Profit & Loss (Income Statement)</span>
        </button>
      </div>

      {/* Main Content */}
      {report && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                {property}
              </div>
              <h2 className="text-base font-bold text-slate-100">
                {activeTab === 'balance-sheet'
                  ? 'Statement of Financial Position'
                  : 'Statement of Profit and Loss'}
              </h2>
            </div>
            <div className="text-xs font-mono text-slate-400">
              Period: <strong className="text-slate-200">{period || 'All Available Posted Periods'}</strong>
            </div>
          </div>

          <div className="p-6 overflow-x-auto">
            {/* BALANCE SHEET TAB */}
            {activeTab === 'balance-sheet' && (
              <div className="space-y-8">
                {/* Balance verification banner */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    {report.balance_sheet.is_balanced ? (
                      <div className="flex items-center gap-2 text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="font-semibold">
                          Accounting Equation Balanced: Assets = Liabilities + Equity
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-300">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span className="font-semibold">
                          Balance Sheet Out of Balance by {formatAmount(report.balance_sheet.variance ?? 0, report.formatting)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-slate-500">Total Assets: </span>
                      <span className="font-bold text-slate-200">
                        {formatAmount(report.balance_sheet.total_assets, report.formatting)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Liabilities + Equity: </span>
                      <span className="font-bold text-slate-200">
                        {formatAmount(report.balance_sheet.total_liabilities_and_equity, report.formatting)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Variance: </span>
                      <span className={report.balance_sheet.is_balanced ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                        {formatAmount(report.balance_sheet.variance ?? 0, report.formatting)}
                      </span>
                    </div>
                  </div>
                </div>

                <table className="w-full text-xs font-mono">
                  <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4 text-left">Line Item</th>
                      <th className="py-2.5 px-4 text-right">Amount ({report.formatting?.currency_symbol || 'IDR'})</th>
                      <th className="py-2.5 px-4 text-center">Accounts</th>
                      <th className="py-2.5 px-4 text-center">Drill-Down</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {/* ASSETS */}
                    <tr className="bg-slate-950/40 text-emerald-400 font-bold uppercase tracking-wider">
                      <td colSpan={4} className="py-2.5 px-4">
                        1. Assets
                      </td>
                    </tr>
                    {report.balance_sheet.assets.map((row) => (
                      <tr
                        key={row.line_id}
                        onClick={() => handleDrilldown(row.line_id)}
                        className="hover:bg-slate-800/60 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-4 pl-8 text-slate-200 font-medium">
                          {row.label}
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-100 font-semibold">
                          {formatAmount(row.amount, report.formatting)}
                        </td>
                        <td className="py-2.5 px-4 text-center text-slate-400">
                          {row.account_codes.join(', ')}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline">
                            <span>Inspect</span>
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-900 font-bold border-t-2 border-slate-700 text-slate-100">
                      <td className="py-3 px-4 pl-4 uppercase">Total Assets</td>
                      <td className="py-3 px-4 text-right text-emerald-400 text-sm">
                        {formatAmount(report.balance_sheet.total_assets, report.formatting)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>

                    {/* LIABILITIES */}
                    <tr className="bg-slate-950/40 text-amber-400 font-bold uppercase tracking-wider">
                      <td colSpan={4} className="py-2.5 px-4 pt-4">
                        2. Liabilities
                      </td>
                    </tr>
                    {report.balance_sheet.liabilities.map((row) => (
                      <tr
                        key={row.line_id}
                        onClick={() => handleDrilldown(row.line_id)}
                        className="hover:bg-slate-800/60 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-4 pl-8 text-slate-200 font-medium">
                          {row.label}
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-100 font-semibold">
                          {formatAmount(row.amount, report.formatting)}
                        </td>
                        <td className="py-2.5 px-4 text-center text-slate-400">
                          {row.account_codes.join(', ')}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline">
                            <span>Inspect</span>
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-900 font-bold border-t border-slate-700 text-slate-300">
                      <td className="py-2.5 px-4 pl-4 uppercase">Total Liabilities</td>
                      <td className="py-2.5 px-4 text-right text-amber-300">
                        {formatAmount(report.balance_sheet.total_liabilities, report.formatting)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>

                    {/* EQUITY */}
                    <tr className="bg-slate-950/40 text-indigo-400 font-bold uppercase tracking-wider">
                      <td colSpan={4} className="py-2.5 px-4 pt-4">
                        3. Equity
                      </td>
                    </tr>
                    {report.balance_sheet.equity.map((row) => (
                      <tr
                        key={row.line_id}
                        onClick={() => handleDrilldown(row.line_id)}
                        className="hover:bg-slate-800/60 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-4 pl-8 text-slate-200 font-medium">
                          {row.label}
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-100 font-semibold">
                          {formatAmount(row.amount, report.formatting)}
                        </td>
                        <td className="py-2.5 px-4 text-center text-slate-400">
                          {row.account_codes.join(', ')}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline">
                            <span>Inspect</span>
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-900 font-bold border-t border-slate-700 text-slate-300">
                      <td className="py-2.5 px-4 pl-4 uppercase">Total Equity</td>
                      <td className="py-2.5 px-4 text-right text-indigo-300">
                        {formatAmount(report.balance_sheet.total_equity, report.formatting)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>

                    {/* TOTAL LIABILITIES & EQUITY */}
                    <tr className="bg-emerald-950/60 font-bold border-t-2 border-b-2 border-emerald-500/50 text-emerald-200 text-sm">
                      <td className="py-3.5 px-4 pl-4 uppercase">Total Liabilities & Equity</td>
                      <td className="py-3.5 px-4 text-right text-emerald-300 font-mono text-base">
                        {formatAmount(report.balance_sheet.total_liabilities_and_equity, report.formatting)}
                      </td>
                      <td colSpan={2} className="py-3.5 px-4 text-center text-xs text-emerald-400">
                        {report.balance_sheet.is_balanced ? 'BALANCED' : 'OUT OF BALANCE'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* INCOME STATEMENT TAB */}
            {activeTab === 'income-statement' && (
              <table className="w-full text-xs font-mono">
                <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 text-left">Line Item</th>
                    <th className="py-2.5 px-4 text-right">Amount ({report.formatting?.currency_symbol || 'IDR'})</th>
                    <th className="py-2.5 px-4 text-center">Accounts</th>
                    <th className="py-2.5 px-4 text-center">Drill-Down</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {/* OPERATING REVENUE */}
                  <tr className="bg-slate-950/40 text-emerald-400 font-bold uppercase tracking-wider">
                    <td colSpan={4} className="py-2.5 px-4">
                      Operating Revenues
                    </td>
                  </tr>
                  {report.income_statement.operating_revenue.map((row) => (
                    <tr
                      key={row.line_id}
                      onClick={() => handleDrilldown(row.line_id)}
                      className="hover:bg-slate-800/60 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-4 pl-8 text-slate-200 font-medium">
                        {row.label}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-100 font-semibold">
                        {formatAmount(row.amount, report.formatting)}
                      </td>
                      <td className="py-2.5 px-4 text-center text-slate-400">
                        {row.account_codes.join(', ')}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline">
                          <span>Inspect</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-900 font-bold border-t-2 border-slate-700 text-slate-100">
                    <td className="py-3 px-4 pl-4 uppercase">Total Operating Revenues</td>
                    <td className="py-3 px-4 text-right text-emerald-400 text-sm">
                      {formatAmount(report.income_statement.total_operating_revenue ?? 0, report.formatting)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>

                  {/* COST OF SALES (if configured) */}
                  {report.income_statement.cost_of_sales && report.income_statement.cost_of_sales.length > 0 && (
                    <>
                      <tr className="bg-slate-950/40 text-amber-400 font-bold uppercase tracking-wider">
                        <td colSpan={4} className="py-2.5 px-4 pt-4">
                          Cost of Sales
                        </td>
                      </tr>
                      {report.income_statement.cost_of_sales.map((row) => (
                        <tr
                          key={row.line_id}
                          onClick={() => handleDrilldown(row.line_id)}
                          className="hover:bg-slate-800/60 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 px-4 pl-8 text-slate-200 font-medium">
                            {row.label}
                          </td>
                          <td className="py-2.5 px-4 text-right text-slate-100 font-semibold">
                            {formatAmount(row.amount, report.formatting)}
                          </td>
                          <td className="py-2.5 px-4 text-center text-slate-400">
                            {row.account_codes.join(', ')}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline">
                              <span>Inspect</span>
                              <ChevronRight className="w-3 h-3" />
                            </span>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-900 font-bold border-t border-slate-700 text-slate-300">
                        <td className="py-2.5 px-4 pl-4 uppercase">Total Cost of Sales</td>
                        <td className="py-2.5 px-4 text-right text-amber-300">
                          {formatAmount(report.income_statement.total_cost_of_sales ?? 0, report.formatting)}
                        </td>
                        <td colSpan={2}></td>
                      </tr>

                      {/* GROSS PROFIT */}
                      <tr className="bg-slate-900/80 font-bold border-t border-slate-700 text-emerald-300">
                        <td className="py-2.5 px-4 pl-4 uppercase">Gross Profit</td>
                        <td className="py-2.5 px-4 text-right text-emerald-300">
                          {formatAmount(report.income_statement.gross_profit ?? 0, report.formatting)}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </>
                  )}

                  {/* OPERATING EXPENSES */}
                  <tr className="bg-slate-950/40 text-rose-400 font-bold uppercase tracking-wider">
                    <td colSpan={4} className="py-2.5 px-4 pt-4">
                      Operating Expenses
                    </td>
                  </tr>
                  {report.income_statement.operating_expenses.map((row) => (
                    <tr
                      key={row.line_id}
                      onClick={() => handleDrilldown(row.line_id)}
                      className="hover:bg-slate-800/60 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-4 pl-8 text-slate-200 font-medium">
                        {row.label}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-100 font-semibold">
                        {formatAmount(row.amount, report.formatting)}
                      </td>
                      <td className="py-2.5 px-4 text-center text-slate-400">
                        {row.account_codes.join(', ')}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline">
                          <span>Inspect</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-900 font-bold border-t border-slate-700 text-slate-300">
                    <td className="py-2.5 px-4 pl-4 uppercase">Total Operating Expenses</td>
                    <td className="py-2.5 px-4 text-right text-rose-300">
                      {formatAmount(report.income_statement.total_operating_expenses ?? 0, report.formatting)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>

                  {/* NET OPERATING INCOME */}
                  <tr className="bg-emerald-950/60 font-bold border-t-2 border-b-2 border-emerald-500/50 text-emerald-200 text-sm">
                    <td className="py-3.5 px-4 pl-4 uppercase">Net Operating Income</td>
                    <td className="py-3.5 px-4 text-right text-emerald-300 font-mono text-base">
                      {formatAmount(report.income_statement.net_operating_income ?? 0, report.formatting)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Universal Drilldown Modal */}
      <UniversalDrilldownModal
        isOpen={isDrilldownOpen}
        onClose={() => setIsDrilldownOpen(false)}
        reportType="Financial Statements"
        lineId={drilldownLineId || undefined}
        period={period}
        onOpenJournalInWorkbench={onOpenJournalInWorkbench}
      />
    </div>
  );
};
