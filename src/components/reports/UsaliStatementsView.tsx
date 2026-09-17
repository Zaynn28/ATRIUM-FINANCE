/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Percent,
  Layers,
  Scale,
  Sparkles,
} from 'lucide-react';
import { UsaliStatementReport, ReportLineItem } from '../../types';
import { api } from '../../services/api';
import { UniversalReportToolbar } from './UniversalReportToolbar';
import { UniversalDrilldownModal } from './UniversalDrilldownModal';

interface UsaliStatementsViewProps {
  onOpenJournalInWorkbench?: (journalId: string) => void;
}

type UsaliTab =
  | 'summary-operator'
  | 'summary-owner'
  | 'schedule-rooms'
  | 'schedule-fb'
  | 'undistributed'
  | 'kpis';

export const UsaliStatementsView: React.FC<UsaliStatementsViewProps> = ({
  onOpenJournalInWorkbench,
}) => {
  const [period, setPeriod] = useState<string>('');
  const [property, setProperty] = useState<string>('Atrium Hotel & Resort');
  const [activeTab, setActiveTab] = useState<UsaliTab>('summary-operator');
  const [report, setReport] = useState<UsaliStatementReport | null>(null);
  const [loading, setLoading] = useState(false);

  // Drilldown modal state
  const [drilldownLineId, setDrilldownLineId] = useState<string | null>(null);
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);

  const fetchReport = (selectedPeriod?: string) => {
    setLoading(true);
    api
      .getUsaliStatement(selectedPeriod || undefined)
      .then((data) => {
        setReport(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load USALI statement:', err);
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
    lines.push(`"USALI 12th Revised Edition - Summary Operating Statement"`);
    lines.push(`"Property:","${property}"`);
    lines.push(`"Period:","${period || 'All Time'}"`);
    lines.push(`"Generated:","${new Date().toISOString()}"`);
    lines.push('');
    lines.push(`"Category","Line Item","Amount (IDR)","Accounts Mapped"`);

    lines.push(`"Operating Revenue"`);
    report.operating_revenue.forEach((r) => {
      lines.push(`,"${r.label}",${r.amount},"${r.account_codes.join('; ')}"`);
    });
    lines.push(`,"Total Operating Revenue",${report.total_operating_revenue}`);
    lines.push('');

    lines.push(`"Departmental Expenses"`);
    report.departmental_expenses.forEach((r) => {
      lines.push(`,"${r.label}",${r.amount},"${r.account_codes.join('; ')}"`);
    });
    lines.push(`,"Total Departmental Expenses",${report.total_departmental_expenses}`);
    lines.push(`,"Total Departmental Profit",${report.total_departmental_profit}`);
    lines.push('');

    lines.push(`"Undistributed Operating Expenses"`);
    report.undistributed_operating_expenses.forEach((r) => {
      lines.push(`,"${r.label}",${r.amount},"${r.account_codes.join('; ')}"`);
    });
    lines.push(`,"Total Undistributed Expenses",${report.total_undistributed_expenses}`);
    lines.push(`,"Gross Operating Profit (GOP)",${report.gross_operating_profit}`);

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `USALI_Operating_Statement_${period || 'All_Time'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // KPI Calculations (using posted data)
  const gopMargin =
    report && report.total_operating_revenue > 0
      ? ((report.gross_operating_profit / report.total_operating_revenue) * 100).toFixed(1)
      : '0.0';
  const roomsMargin =
    report && report.schedules_summary.rooms_revenue > 0
      ? ((report.schedules_summary.rooms_profit / report.schedules_summary.rooms_revenue) * 100).toFixed(1)
      : '0.0';
  const fbMargin =
    report && report.schedules_summary.fb_revenue > 0
      ? ((report.schedules_summary.fb_profit / report.schedules_summary.fb_revenue) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="space-y-6">
      {/* Universal Report Toolbar */}
      <UniversalReportToolbar
        reportTitle="USALI 12th Revised Edition — Operating Statements"
        reportSubtitle="Uniform System of Accounts for the Lodging Industry (USALI 12) strictly calculated from POSTED Ledger"
        period={period}
        onPeriodChange={setPeriod}
        property={property}
        onPropertyChange={setProperty}
        onRefresh={() => fetchReport(period)}
        onExportCsv={handleExportCsv}
        loading={loading}
      />

      {/* Sub-Navigation: USALI Schedules & Perspectives */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto print:hidden">
        <button
          onClick={() => setActiveTab('summary-operator')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
            activeTab === 'summary-operator'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          Summary Operating Statement — Operator
        </button>
        <button
          onClick={() => setActiveTab('summary-owner')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
            activeTab === 'summary-owner'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          Summary Operating Statement — Owner
        </button>
        <button
          onClick={() => setActiveTab('schedule-rooms')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
            activeTab === 'schedule-rooms'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          Schedule 1 — Rooms
        </button>
        <button
          onClick={() => setActiveTab('schedule-fb')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
            activeTab === 'schedule-fb'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          Schedule 2 — Food & Beverage
        </button>
        <button
          onClick={() => setActiveTab('undistributed')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
            activeTab === 'undistributed'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          Undistributed Schedules (A&G / POM / S&M / Energy)
        </button>
        <button
          onClick={() => setActiveTab('kpis')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
            activeTab === 'kpis'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          USALI 12 Metrics & KPIs
        </button>
      </div>

      {/* KPI Cards Row */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Gross Operating Profit (GOP)</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-100 mt-1">
              Rp{report.gross_operating_profit.toLocaleString()}
            </div>
            <div className="text-[11px] font-mono text-emerald-400 mt-1">
              GOP Margin: {gopMargin}%
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Total Operating Revenue</span>
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-100 mt-1">
              Rp{report.total_operating_revenue.toLocaleString()}
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-1">
              Rooms: Rp{report.schedules_summary.rooms_revenue.toLocaleString()}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Rooms Dept Profit</span>
              <Percent className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-100 mt-1">
              Rp{report.schedules_summary.rooms_profit.toLocaleString()}
            </div>
            <div className="text-[11px] font-mono text-indigo-400 mt-1">
              Rooms Margin: {roomsMargin}%
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Food & Beverage Profit</span>
              <Percent className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-100 mt-1">
              Rp{report.schedules_summary.fb_profit.toLocaleString()}
            </div>
            <div className="text-[11px] font-mono text-amber-400 mt-1">
              F&B Margin: {fbMargin}%
            </div>
          </div>
        </div>
      )}

      {/* Main Statement Table View */}
      {report && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400">
                {property}
              </div>
              <h2 className="text-base font-bold text-slate-100">
                {activeTab === 'summary-operator' && 'USALI 12 Summary Operating Statement — Operator'}
                {activeTab === 'summary-owner' && 'USALI 12 Summary Operating Statement — Owner Perspective'}
                {activeTab === 'schedule-rooms' && 'Schedule 1 — Rooms Departmental Statement'}
                {activeTab === 'schedule-fb' && 'Schedule 2 — Food & Beverage Departmental Statement'}
                {activeTab === 'undistributed' && 'Undistributed Operating Expenses Schedules (A&G, POM, S&M, Energy)'}
                {activeTab === 'kpis' && 'USALI Operating Metrics & Performance KPIs'}
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Period: <strong className="text-slate-200">{period || 'All Available Posted Periods'}</strong>
            </span>
          </div>

          <div className="p-6 overflow-x-auto">
            {activeTab === 'summary-operator' && (
              <table className="w-full text-xs">
                <thead className="bg-slate-950/60 text-slate-400 font-mono uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 text-left">USALI 12 Line Description</th>
                    <th className="py-2.5 px-4 text-right">Amount (IDR)</th>
                    <th className="py-2.5 px-4 text-right">% Revenue</th>
                    <th className="py-2.5 px-4 text-center">Drill-Down</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {/* OPERATING REVENUE */}
                  <tr className="bg-slate-950/40 text-emerald-400 font-bold uppercase tracking-wider">
                    <td colSpan={4} className="py-2 px-4">
                      Operating Revenue
                    </td>
                  </tr>
                  {report.operating_revenue.map((row) => (
                    <tr
                      key={row.line_id}
                      onClick={() => handleDrilldown(row.line_id)}
                      className="hover:bg-slate-800/60 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-4 pl-8 text-slate-200 font-medium">
                        {row.label}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-100 font-semibold">
                        Rp{row.amount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-400">
                        {report.total_operating_revenue > 0
                          ? `${((row.amount / report.total_operating_revenue) * 100).toFixed(1)}%`
                          : '0.0%'}
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
                    <td className="py-3 px-4 pl-4 uppercase">Total Operating Revenue</td>
                    <td className="py-3 px-4 text-right text-emerald-400 text-sm">
                      Rp{report.total_operating_revenue.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">100.0%</td>
                    <td className="py-3 px-4 text-center">—</td>
                  </tr>

                  {/* DEPARTMENTAL EXPENSES */}
                  <tr className="bg-slate-950/40 text-rose-400 font-bold uppercase tracking-wider">
                    <td colSpan={4} className="py-2 px-4 pt-4">
                      Departmental Expenses
                    </td>
                  </tr>
                  {report.departmental_expenses.map((row) => (
                    <tr
                      key={row.line_id}
                      onClick={() => handleDrilldown(row.line_id)}
                      className="hover:bg-slate-800/60 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-4 pl-8 text-slate-200 font-medium">
                        {row.label}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-100 font-semibold">
                        Rp{row.amount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-400">
                        {report.total_operating_revenue > 0
                          ? `${((row.amount / report.total_operating_revenue) * 100).toFixed(1)}%`
                          : '0.0%'}
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
                    <td className="py-2.5 px-4 pl-4 uppercase">Total Departmental Expenses</td>
                    <td className="py-2.5 px-4 text-right text-rose-300">
                      Rp{report.total_departmental_expenses.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {report.total_operating_revenue > 0
                        ? `${((report.total_departmental_expenses / report.total_operating_revenue) * 100).toFixed(1)}%`
                        : '0.0%'}
                    </td>
                    <td className="py-2.5 px-4 text-center">—</td>
                  </tr>
                  <tr className="bg-emerald-950/30 font-bold border-t border-b border-emerald-800/50 text-emerald-300">
                    <td className="py-3 px-4 pl-4 uppercase">Total Departmental Profit</td>
                    <td className="py-3 px-4 text-right text-sm font-bold text-emerald-300">
                      Rp{report.total_departmental_profit.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {report.total_operating_revenue > 0
                        ? `${((report.total_departmental_profit / report.total_operating_revenue) * 100).toFixed(1)}%`
                        : '0.0%'}
                    </td>
                    <td className="py-3 px-4 text-center">—</td>
                  </tr>

                  {/* UNDISTRIBUTED OPERATING EXPENSES */}
                  <tr className="bg-slate-950/40 text-amber-400 font-bold uppercase tracking-wider">
                    <td colSpan={4} className="py-2 px-4 pt-4">
                      Undistributed Operating Expenses
                    </td>
                  </tr>
                  {report.undistributed_operating_expenses.map((row) => (
                    <tr
                      key={row.line_id}
                      onClick={() => handleDrilldown(row.line_id)}
                      className="hover:bg-slate-800/60 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-4 pl-8 text-slate-200 font-medium">
                        {row.label}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-100 font-semibold">
                        Rp{row.amount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-400">
                        {report.total_operating_revenue > 0
                          ? `${((row.amount / report.total_operating_revenue) * 100).toFixed(1)}%`
                          : '0.0%'}
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
                    <td className="py-2.5 px-4 pl-4 uppercase">Total Undistributed Expenses</td>
                    <td className="py-2.5 px-4 text-right text-amber-300">
                      Rp{report.total_undistributed_expenses.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {report.total_operating_revenue > 0
                        ? `${((report.total_undistributed_expenses / report.total_operating_revenue) * 100).toFixed(1)}%`
                        : '0.0%'}
                    </td>
                    <td className="py-2.5 px-4 text-center">—</td>
                  </tr>

                  {/* GROSS OPERATING PROFIT (GOP) */}
                  <tr className="bg-emerald-950/60 font-bold border-t-2 border-b-2 border-emerald-500/50 text-emerald-200 text-sm">
                    <td className="py-3.5 px-4 pl-4 uppercase">Gross Operating Profit (GOP)</td>
                    <td className="py-3.5 px-4 text-right text-emerald-300 font-mono text-base">
                      Rp{report.gross_operating_profit.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">{gopMargin}%</td>
                    <td className="py-3.5 px-4 text-center">—</td>
                  </tr>

                  {/* MANAGEMENT FEES & EBITDA */}
                  {report.management_fees.map((row) => (
                    <tr
                      key={row.line_id}
                      onClick={() => handleDrilldown(row.line_id)}
                      className="hover:bg-slate-800/60 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-4 pl-8 text-slate-300 font-medium">
                        {row.label}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-300">
                        Rp{row.amount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-400">—</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline">
                          <span>Inspect</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-900 font-bold border-t border-b border-slate-800 text-slate-200">
                    <td className="py-3 px-4 pl-4 uppercase">EBITDA</td>
                    <td className="py-3 px-4 text-right text-sm font-bold text-slate-100">
                      Rp{report.ebitda.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {report.total_operating_revenue > 0
                        ? `${((report.ebitda / report.total_operating_revenue) * 100).toFixed(1)}%`
                        : '0.0%'}
                    </td>
                    <td className="py-3 px-4 text-center">—</td>
                  </tr>
                </tbody>
              </table>
            )}

            {activeTab === 'summary-owner' && (
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                  <p className="font-semibold text-slate-100 mb-1">
                    USALI 12 Summary Operating Statement — Owner Perspective
                  </p>
                  <p className="text-slate-400">
                    Distinguishes hotel operating activity from operator fees, capital reserves, and owner economics.
                  </p>
                </div>

                <table className="w-full text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4 text-left">Line Item</th>
                      <th className="py-2.5 px-4 text-right">Amount (IDR)</th>
                      <th className="py-2.5 px-4 text-right">% Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    <tr>
                      <td className="py-3 px-4 text-slate-200">Total Operating Revenue</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-100">
                        Rp{report.total_operating_revenue.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">100.0%</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-slate-200">Total Operating Expenses (Dept + Undistributed)</td>
                      <td className="py-3 px-4 text-right text-rose-300">
                        Rp{(report.total_departmental_expenses + report.total_undistributed_expenses).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {report.total_operating_revenue > 0
                          ? `${(((report.total_departmental_expenses + report.total_undistributed_expenses) / report.total_operating_revenue) * 100).toFixed(1)}%`
                          : '0.0%'}
                      </td>
                    </tr>
                    <tr className="bg-emerald-950/40 font-bold text-emerald-300">
                      <td className="py-3 px-4 uppercase">Gross Operating Profit (GOP)</td>
                      <td className="py-3 px-4 text-right text-sm">
                        Rp{report.gross_operating_profit.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">{gopMargin}%</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-slate-400 pl-8">Less: Operator Management Fees</td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        Rp{report.total_management_fees.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">—</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-slate-400 pl-8">Less: Non-Operating Income & Expenses</td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        Rp{report.total_non_operating_expenses.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">—</td>
                    </tr>
                    <tr className="bg-slate-900 font-bold text-base text-slate-100 border-t-2 border-slate-700">
                      <td className="py-3.5 px-4 uppercase">Net Operating Profit for Owner (EBITDA)</td>
                      <td className="py-3.5 px-4 text-right text-emerald-400 font-mono">
                        Rp{report.ebitda.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {report.total_operating_revenue > 0
                          ? `${((report.ebitda / report.total_operating_revenue) * 100).toFixed(1)}%`
                          : '0.0%'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'schedule-rooms' && (
              <div className="space-y-4 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h3 className="font-bold text-slate-200">Schedule 1 — Rooms Department Performance</h3>
                  <button
                    onClick={() => handleDrilldown('USALI-REV-ROOMS')}
                    className="text-emerald-400 hover:underline"
                  >
                    Drill-Down Rooms Revenue
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-400">Total Rooms Revenue</div>
                    <div className="text-lg font-bold text-emerald-400 mt-1">
                      Rp{report.schedules_summary.rooms_revenue.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-400">Total Rooms Expenses</div>
                    <div className="text-lg font-bold text-rose-400 mt-1">
                      Rp{report.schedules_summary.rooms_expense.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-400">Rooms Departmental Profit</div>
                    <div className="text-lg font-bold text-indigo-400 mt-1">
                      Rp{report.schedules_summary.rooms_profit.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Margin: {roomsMargin}%
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'schedule-fb' && (
              <div className="space-y-4 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h3 className="font-bold text-slate-200">Schedule 2 — Food & Beverage Department</h3>
                  <button
                    onClick={() => handleDrilldown('USALI-REV-FB')}
                    className="text-emerald-400 hover:underline"
                  >
                    Drill-Down F&B Revenue
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-400">F&B Total Revenue</div>
                    <div className="text-lg font-bold text-emerald-400 mt-1">
                      Rp{report.schedules_summary.fb_revenue.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-400">F&B Departmental Expenses</div>
                    <div className="text-lg font-bold text-rose-400 mt-1">
                      Rp{report.schedules_summary.fb_expense.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-400">F&B Departmental Profit</div>
                    <div className="text-lg font-bold text-amber-400 mt-1">
                      Rp{report.schedules_summary.fb_profit.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Margin: {fbMargin}%
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'undistributed' && (
              <div className="space-y-4 font-mono text-xs">
                <h3 className="font-bold text-slate-200 pb-2 border-b border-slate-800">
                  Undistributed Operating Expenses Breakdown
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-400">Administrative & General (A&G)</div>
                    <div className="text-base font-bold text-slate-100 mt-1">
                      Rp{report.schedules_summary.ag_expense.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-400">Property Maintenance (POM)</div>
                    <div className="text-base font-bold text-slate-100 mt-1">
                      Rp{report.schedules_summary.pom_expense.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-400">Sales & Marketing</div>
                    <div className="text-base font-bold text-slate-100 mt-1">
                      Rp{report.schedules_summary.sm_expense.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-400">Energy, Water & Waste</div>
                    <div className="text-base font-bold text-slate-100 mt-1">
                      Rp{report.schedules_summary.energy_expense.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'kpis' && (
              <div className="space-y-4 font-mono text-xs">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <h3 className="font-bold text-slate-200 mb-2">USALI 12 Operating Performance Metrics</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block">GOP Margin:</span>
                      <span className="text-emerald-400 font-bold text-sm">{gopMargin}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Rooms Margin:</span>
                      <span className="text-indigo-400 font-bold text-sm">{roomsMargin}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">F&B Margin:</span>
                      <span className="text-amber-400 font-bold text-sm">{fbMargin}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Operating Ratio:</span>
                      <span className="text-slate-200 font-bold text-sm">
                        {report.total_operating_revenue > 0
                          ? `${(((report.total_departmental_expenses + report.total_undistributed_expenses) / report.total_operating_revenue) * 100).toFixed(1)}%`
                          : '0.0%'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 32: Drill-Down Reconciliation Banner */}
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
            <div className="flex items-center gap-3">
              {report.reconciliation.is_reconciled ? (
                <div className="flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Report 100% Reconciled with Posted Ledger Entries</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Reconciliation Exception: Variance of Rp{report.reconciliation.variance.toLocaleString()} detected</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-6 text-slate-400">
              <div>
                <span>Posted Revenue: </span>
                <strong className="text-slate-200">
                  Rp{report.reconciliation.posted_revenue_total.toLocaleString()}
                </strong>
              </div>
              <div>
                <span>Posted Expense: </span>
                <strong className="text-slate-200">
                  Rp{report.reconciliation.posted_expense_total.toLocaleString()}
                </strong>
              </div>
              <div>
                <span>Variance: </span>
                <strong className={report.reconciliation.is_reconciled ? 'text-emerald-400' : 'text-red-400'}>
                  Rp{report.reconciliation.variance.toLocaleString()}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Universal Drilldown Modal */}
      <UniversalDrilldownModal
        isOpen={isDrilldownOpen}
        onClose={() => setIsDrilldownOpen(false)}
        reportType="USALI 12"
        lineId={drilldownLineId || undefined}
        period={period}
        onOpenJournalInWorkbench={onOpenJournalInWorkbench}
      />
    </div>
  );
};
