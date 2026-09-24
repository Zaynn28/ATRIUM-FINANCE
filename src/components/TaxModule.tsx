/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt,
  FileText,
  CreditCard,
  Scale,
  Settings,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  RefreshCw,
  Plus,
  Paperclip,
  Check,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Info,
  Building,
  HelpCircle,
} from 'lucide-react';
import {
  TaxTypeCode,
  TaxRuleConfig,
  TaxObligationItem,
  TaxPeriodSummaryKPIs,
  TaxReconciliationLine,
  TaxPeriodCloseValidation,
  TaxFilingStatus,
  SystemUser,
  UserRoleDefinition,
} from '../types';
import { api } from '../services/api';

interface TaxModuleProps {
  currentUser?: SystemUser;
  currentRole?: UserRoleDefinition;
}

type TaxInternalTab =
  | 'overview'
  | 'obligations'
  | 'filing'
  | 'reconciliation'
  | 'settings';

export const TaxModule: React.FC<TaxModuleProps> = ({ currentUser, currentRole }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-09');
  const [activeTab, setActiveTab] = useState<TaxInternalTab>('overview');

  const [summary, setSummary] = useState<TaxPeriodSummaryKPIs | null>(null);
  const [obligations, setObligations] = useState<TaxObligationItem[]>([]);
  const [rules, setRules] = useState<TaxRuleConfig[]>([]);
  const [reconciliations, setReconciliations] = useState<TaxReconciliationLine[]>([]);
  const [closeValidation, setCloseValidation] = useState<TaxPeriodCloseValidation | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals state
  const [paymentModalItem, setPaymentModalItem] = useState<TaxObligationItem | null>(null);
  const [paymentForm, setPaymentForm] = useState<{
    date: string;
    ntpn: string;
    amount: number;
    bankAccount: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    ntpn: '',
    amount: 0,
    bankAccount: 'BCA Operating Account (1010)',
  });

  const [filingModalItem, setFilingModalItem] = useState<TaxObligationItem | null>(null);
  const [filingForm, setFilingForm] = useState<{
    date: string;
    bpe: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    bpe: '',
  });

  const [docModalItem, setDocModalItem] = useState<TaxObligationItem | null>(null);
  const [docForm, setDocForm] = useState<{
    docType: string;
    fileName: string;
    notes: string;
  }>({
    docType: 'Bukti Potong',
    fileName: '',
    notes: '',
  });

  const [ruleModalItem, setRuleModalItem] = useState<TaxRuleConfig | null>(null);
  const [ruleForm, setRuleForm] = useState<{
    rate: number;
    glAccount: string;
    filingDueDay: number;
    paymentDueDay: number;
    active: 'Y' | 'N';
    taxBaseDesc: string;
    notes: string;
  }>({
    rate: 0,
    glAccount: '',
    filingDueDay: 20,
    paymentDueDay: 10,
    active: 'Y',
    taxBaseDesc: '',
    notes: '',
  });

  const [isCloseModalOpen, setIsCloseModalOpen] = useState<boolean>(false);
  const [closeNotes, setCloseNotes] = useState<string>('');

  // Currency Formatter
  const formatIDR = (val?: number) => {
    if (typeof val !== 'number' || isNaN(val)) return 'Rp0';
    return `Rp${Math.round(val).toLocaleString('id-ID')}`;
  };

  // Month period display: e.g. "SEPTEMBER 2026"
  const getPeriodFormatted = (periodStr: string) => {
    try {
      const [year, month] = periodStr.split('-');
      const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
    } catch {
      return periodStr.toUpperCase();
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [sumRes, obRes, ruleRes, reconRes, checkRes] = await Promise.all([
        api.getTaxSummary(selectedPeriod),
        api.getTaxObligations(selectedPeriod),
        api.getTaxRules(),
        api.getTaxReconciliation(selectedPeriod),
        api.checkTaxPeriodClose(selectedPeriod),
      ]);

      setSummary(sumRes);
      setObligations(obRes);
      setRules(ruleRes);
      setReconciliations(reconRes);
      setCloseValidation(checkRes);
    } catch (err: any) {
      console.error('Failed to load tax data:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Error loading tax data.' });
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Action: Calculate Obligation
  const handleCalculate = async (taxCode: TaxTypeCode) => {
    try {
      setActionLoading(true);
      setStatusMessage(null);
      await api.calculateTaxObligation(selectedPeriod, taxCode, currentUser?.name);
      setStatusMessage({ type: 'success', text: `Tax calculation updated for ${taxCode}.` });
      await loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to calculate tax.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Record Payment
  const handleSavePayment = async () => {
    if (!paymentModalItem) return;
    try {
      setActionLoading(true);
      await api.recordTaxPayment({
        period: selectedPeriod,
        tax_code: paymentModalItem.tax_code,
        payment_date: paymentForm.date,
        ntpn_reference: paymentForm.ntpn,
        amount: Number(paymentForm.amount),
        payment_bank_account: paymentForm.bankAccount,
        user: currentUser?.name,
      });
      setPaymentModalItem(null);
      setStatusMessage({ type: 'success', text: `Tax payment reference recorded for ${paymentModalItem.tax_name}.` });
      await loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to record tax payment.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Record Filing
  const handleSaveFiling = async () => {
    if (!filingModalItem) return;
    try {
      setActionLoading(true);
      await api.recordTaxFiling({
        period: selectedPeriod,
        tax_code: filingModalItem.tax_code,
        filing_date: filingForm.date,
        bpe_reference: filingForm.bpe,
        user: currentUser?.name,
      });
      setFilingModalItem(null);
      setStatusMessage({ type: 'success', text: `Tax filing reference recorded for ${filingModalItem.tax_name}.` });
      await loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to record tax filing.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Save Document Attachment
  const handleSaveDocument = async () => {
    if (!docModalItem) return;
    try {
      setActionLoading(true);
      await api.attachTaxDocument({
        period: selectedPeriod,
        tax_code: docModalItem.tax_code,
        doc_type: docForm.docType,
        file_name: docForm.fileName,
        notes: docForm.notes,
        user: currentUser?.name,
      });
      setDocModalItem(null);
      setStatusMessage({ type: 'success', text: `Document attached to ${docModalItem.tax_name}.` });
      await loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to attach document.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Update Tax Rule
  const handleSaveRule = async () => {
    if (!ruleModalItem) return;
    try {
      setActionLoading(true);
      await api.updateTaxRule(
        ruleModalItem.tax_code,
        {
          tax_rate_pct: Number(ruleForm.rate),
          gl_liability_account: ruleForm.glAccount,
          filing_due_day: Number(ruleForm.filingDueDay),
          payment_due_day: Number(ruleForm.paymentDueDay),
          active: ruleForm.active,
          tax_base_description: ruleForm.taxBaseDesc,
          notes: ruleForm.notes,
        },
        currentUser?.name
      );
      setRuleModalItem(null);
      setStatusMessage({ type: 'success', text: `Tax rule configuration updated for ${ruleModalItem.tax_code}.` });
      await loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update tax rule.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Close Period
  const handleClosePeriod = async () => {
    try {
      setActionLoading(true);
      await api.closeTaxPeriod(selectedPeriod, closeNotes, currentUser?.name);
      setIsCloseModalOpen(false);
      setStatusMessage({ type: 'success', text: `Tax period ${selectedPeriod} closed and locked successfully.` });
      await loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Cannot close tax period.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Reopen Period
  const handleReopenPeriod = async () => {
    if (!window.confirm(`Are you sure you want to reopen tax period ${selectedPeriod}?`)) return;
    try {
      setActionLoading(true);
      await api.reopenTaxPeriod(selectedPeriod, currentUser?.name);
      setStatusMessage({ type: 'success', text: `Tax period ${selectedPeriod} reopened.` });
      await loadData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to reopen period.' });
    } finally {
      setActionLoading(false);
    }
  };

  const isPeriodClosed = summary?.is_period_closed ?? false;

  return (
    <div className="space-y-6">
      {/* Top Header & Period Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/80">
              TAX COMPLIANCE
            </span>
            {isPeriodClosed ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-rose-950/80 text-rose-300 border border-rose-800">
                <Lock className="w-3 h-3" /> PERIOD CLOSED (READ-ONLY)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-blue-950/80 text-blue-300 border border-blue-800">
                <Clock className="w-3 h-3" /> PERIOD ACTIVE
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight mt-1 flex items-center gap-2">
            TAX — {getPeriodFormatted(selectedPeriod)}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Local PBJT Hotel, statutory withholdings (PPh 21/23/26/4(2)), Corporate Tax (PPh 25/Badan), and Owner Tax.
          </p>
        </div>

        {/* Period Control & Close Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            <label className="text-xs text-slate-400 font-medium">Period:</label>
            <input
              type="month"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-transparent text-sm text-slate-200 font-mono focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => loadData()}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
            title="Refresh Tax Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {isPeriodClosed ? (
            <button
              onClick={handleReopenPeriod}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-800/80 bg-amber-950/40 text-amber-300 hover:bg-amber-900/50 text-xs font-medium transition-colors font-mono"
            >
              <Unlock className="w-3.5 h-3.5" /> REOPEN PERIOD
            </button>
          ) : (
            <button
              onClick={() => setIsCloseModalOpen(true)}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold text-xs transition-colors shadow-sm font-mono"
            >
              <Lock className="w-3.5 h-3.5" /> CLOSE PERIOD
            </button>
          )}
        </div>
      </div>

      {/* Status Notifications */}
      {statusMessage && (
        <div
          className={`p-3 rounded-lg text-xs font-medium flex items-center justify-between border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/50 border-rose-800 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-200 text-sm ml-4 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Internal Navigation Tabs (Simple: 5 items) */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        {[
          { id: 'overview', label: 'Tax Overview', icon: Receipt },
          { id: 'obligations', label: 'Tax Obligations', icon: FileText, count: obligations.length },
          { id: 'filing', label: 'Tax Filing', icon: CreditCard },
          { id: 'reconciliation', label: 'Tax Reconciliation', icon: Scale },
          { id: 'settings', label: 'Tax Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TaxInternalTab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-emerald-500 text-emerald-400 bg-slate-900/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: TAX OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {!summary?.has_data ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 space-y-2">
              <Receipt className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-medium text-slate-300">No tax data for this period.</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No revenue, payroll, or spending activity has been registered in the accounting core for{' '}
                <span className="font-mono text-slate-300">{selectedPeriod}</span>.
              </p>
            </div>
          ) : (
            <>
              {/* 5 KPI Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {/* 1. Tax Payable */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Tax Payable</div>
                  <div className="text-lg sm:text-xl font-bold font-mono text-slate-100 mt-1">
                    {formatIDR(summary.tax_payable)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Calculated liabilities for {selectedPeriod}</div>
                </div>

                {/* 2. Tax Paid */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">Tax Paid</div>
                  <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400 mt-1">
                    {formatIDR(summary.tax_paid)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Recorded with valid NTPN references</div>
                </div>

                {/* 3. Tax Outstanding */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400">Tax Outstanding</div>
                  <div
                    className={`text-lg sm:text-xl font-bold font-mono mt-1 ${
                      summary.tax_outstanding > 0 ? 'text-amber-400' : 'text-slate-300'
                    }`}
                  >
                    {formatIDR(summary.tax_outstanding)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Remaining payment balance</div>
                </div>

                {/* 4. Filing Due */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Filing Due</div>
                  <div className="text-lg sm:text-xl font-bold font-mono text-slate-100 mt-1">
                    {summary.filing_due_count} <span className="text-xs font-normal text-slate-400">obligations</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Pending BPE filing confirmation</div>
                </div>

                {/* 5. Overdue */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-rose-400">Overdue</div>
                  <div
                    className={`text-lg sm:text-xl font-bold font-mono mt-1 ${
                      summary.overdue_count > 0 ? 'text-rose-400' : 'text-slate-400'
                    }`}
                  >
                    {summary.overdue_count}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Past statutory deadline</div>
                </div>
              </div>

              {/* Quick Summary Grid */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
                    Statutory Tax Obligations Summary — {getPeriodFormatted(selectedPeriod)}
                  </h3>
                  <button
                    onClick={() => setActiveTab('obligations')}
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
                  >
                    View Obligations Table <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="divide-y divide-slate-800/80">
                  {obligations.map((ob) => (
                    <div key={ob.tax_code} className="px-5 py-3 flex items-center justify-between text-xs hover:bg-slate-800/30">
                      <div>
                        <div className="font-semibold text-slate-200">{ob.tax_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Base: {formatIDR(ob.tax_base)} @ {ob.is_rate_configured ? `${ob.tax_rate_pct}%` : 'Not Configured'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-slate-200">{formatIDR(ob.tax_amount)}</div>
                        <div className="text-[10px] font-mono mt-0.5">
                          Paid: {formatIDR(ob.paid_amount)} |{' '}
                          <span
                            className={
                              ob.status === 'Filed' || ob.status === 'Closed' || ob.status === 'Reconciled'
                                ? 'text-emerald-400'
                                : ob.status === 'Paid'
                                ? 'text-blue-400'
                                : 'text-amber-400'
                            }
                          >
                            {ob.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: TAX OBLIGATIONS */}
      {activeTab === 'obligations' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
                  Monthly Tax Obligations Table
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Reads real ERP revenue, payroll, spending vouchers, and owner pool distributions.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 font-mono uppercase tracking-wider border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Tax</th>
                    <th className="py-3 px-3">Period</th>
                    <th className="py-3 px-4 text-right">Tax Base</th>
                    <th className="py-3 px-4 text-right">Tax Amount</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-3">Filing Due</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {obligations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                        No source data available for this period.
                      </td>
                    </tr>
                  ) : (
                    obligations.map((ob) => {
                      const isReadyToCalc = ob.source_data_available && ob.is_rate_configured;
                      return (
                        <tr key={ob.tax_code} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-sans">
                            <div className="font-semibold text-slate-200">{ob.tax_name}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                              <span>GL: {ob.gl_account_code}</span>
                              <span>•</span>
                              <span>Source: {ob.source_reference}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-slate-300 font-mono">{ob.period}</td>
                          <td className="py-3.5 px-4 text-right text-slate-200">
                            {ob.source_data_available ? (
                              formatIDR(ob.tax_base)
                            ) : (
                              <span className="text-slate-500 italic text-[11px] font-sans">No source data available</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-slate-100">
                            {!ob.is_rate_configured ? (
                              <span className="text-rose-400 text-[11px] font-sans">Tax rate not configured.</span>
                            ) : (
                              formatIDR(ob.tax_amount)
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right text-emerald-400">
                            {formatIDR(ob.paid_amount)}
                          </td>
                          <td className="py-3.5 px-3 text-slate-400 text-[11px]">
                            {ob.filing_due_date}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                                ob.status === 'Closed'
                                  ? 'bg-slate-800 text-slate-300 border border-slate-700'
                                  : ob.status === 'Filed' || ob.status === 'Reconciled'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : ob.status === 'Paid'
                                  ? 'bg-blue-950 text-blue-400 border border-blue-800'
                                  : ob.status === 'Ready'
                                  ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                                  : 'bg-amber-950/80 text-amber-300 border border-amber-800'
                              }`}
                            >
                              {ob.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleCalculate(ob.tax_code)}
                              disabled={isPeriodClosed || actionLoading || !ob.is_rate_configured || !ob.source_data_available}
                              className={`px-3 py-1 rounded text-xs font-semibold uppercase font-mono transition-colors ${
                                isPeriodClosed || !ob.is_rate_configured || !ob.source_data_available
                                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                  : 'bg-emerald-700 hover:bg-emerald-600 text-slate-950 shadow-sm'
                              }`}
                            >
                              CALCULATE
                            </button>
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
      )}

      {/* TAB 3: TAX FILING */}
      {activeTab === 'filing' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
                  Tax Filing & External Payment Settlement Registry
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Record official Payment (NTPN) and Tax Return Filing (BPE) certificates. (Does not simulate fake submissions).
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 font-mono uppercase tracking-wider border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Tax</th>
                    <th className="py-3 px-3">Period</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Filing</th>
                    <th className="py-3 px-4">Evidence</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {obligations.map((ob) => (
                    <tr key={ob.tax_code} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-semibold text-slate-200">{ob.tax_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{ob.tax_code}</div>
                      </td>
                      <td className="py-3.5 px-3 text-slate-300 font-mono">{ob.period}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-100">
                        {formatIDR(ob.tax_amount)}
                      </td>
                      <td className="py-3.5 px-4 font-sans text-xs">
                        {ob.payment_date && ob.ntpn_reference ? (
                          <div>
                            <div className="text-emerald-400 font-mono text-[11px] font-semibold">
                              {ob.ntpn_reference}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Paid: {ob.payment_date} ({formatIDR(ob.paid_amount)})
                            </div>
                          </div>
                        ) : (
                          <span className="text-amber-500 text-[11px] italic">Not Recorded</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-sans text-xs">
                        {ob.filing_date && ob.bpe_reference ? (
                          <div>
                            <div className="text-emerald-400 font-mono text-[11px] font-semibold">
                              {ob.bpe_reference}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">Filed: {ob.filing_date}</div>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px] italic">Pending Filing</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-sans text-xs">
                        {ob.documents && ob.documents.length > 0 ? (
                          <div className="flex items-center gap-1.5 text-emerald-400">
                            <Paperclip className="w-3.5 h-3.5" />
                            <span className="font-mono text-[11px]">{ob.documents.length} doc(s)</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-[11px] italic">No document</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                            ob.status === 'Closed'
                              ? 'bg-slate-800 text-slate-300 border border-slate-700'
                              : ob.status === 'Filed' || ob.status === 'Reconciled'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : ob.status === 'Paid'
                              ? 'bg-blue-950 text-blue-400 border border-blue-800'
                              : 'bg-amber-950/80 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {ob.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-sans">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setPaymentModalItem(ob);
                              setPaymentForm({
                                date: ob.payment_date || new Date().toISOString().split('T')[0],
                                ntpn: ob.ntpn_reference || '',
                                amount: ob.paid_amount > 0 ? ob.paid_amount : ob.tax_amount,
                                bankAccount: ob.payment_bank_account || 'BCA Operating Account (1010)',
                              });
                            }}
                            disabled={isPeriodClosed}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium border border-slate-700"
                            title="Record Payment / NTPN"
                          >
                            Payment
                          </button>
                          <button
                            onClick={() => {
                              setFilingModalItem(ob);
                              setFilingForm({
                                date: ob.filing_date || new Date().toISOString().split('T')[0],
                                bpe: ob.bpe_reference || '',
                              });
                            }}
                            disabled={isPeriodClosed}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium border border-slate-700"
                            title="Record Filing / BPE"
                          >
                            Filing
                          </button>
                          <button
                            onClick={() => {
                              setDocModalItem(ob);
                              setDocForm({
                                docType: 'Bukti Potong',
                                fileName: '',
                                notes: '',
                              });
                            }}
                            disabled={isPeriodClosed}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                            title="Attach Document"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TAX RECONCILIATION */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
                  Statutory 4-Way Tax Reconciliation Engine
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Direct audit verification: Tax Calculation vs GL Tax Balance vs Tax Paid vs Tax Filed.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 font-mono uppercase tracking-wider border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Tax Type</th>
                    <th className="py-3 px-3">GL Account</th>
                    <th className="py-3 px-4 text-right">Calculated</th>
                    <th className="py-3 px-4 text-right">GL Balance</th>
                    <th className="py-3 px-4 text-right">Tax Paid</th>
                    <th className="py-3 px-4 text-right">Tax Filed</th>
                    <th className="py-3 px-4 text-right">Difference</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {reconciliations.map((r) => {
                    const isReconciled = r.status === 'RECONCILED';
                    return (
                      <tr key={r.tax_code} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-sans">
                          <div className="font-semibold text-slate-200">{r.tax_name}</div>
                          {r.discrepancy_note && (
                            <div className="text-[10px] text-amber-400/90 font-mono mt-0.5 max-w-sm truncate">
                              {r.discrepancy_note}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-slate-400">
                          {r.gl_account_code}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-slate-200">
                          {formatIDR(r.calculated_amount)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-slate-200">
                          {formatIDR(r.gl_balance_amount)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-emerald-400">
                          {formatIDR(r.paid_amount)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-blue-400">
                          {formatIDR(r.filed_amount)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold">
                          {r.difference_amount > 0 ? (
                            <span className="text-rose-400">+{formatIDR(r.difference_amount)}</span>
                          ) : (
                            <span className="text-emerald-400">Rp0</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isReconciled
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}
                          >
                            {isReconciled ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" /> RECONCILED
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3 h-3" /> DIFFERENCE FOUND
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: TAX SETTINGS */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
                  Master Tax Rules & Statutory Configuration
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tax rates and deadlines are configurable by authorized controllers. Historical calculated periods will not mutate.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 font-mono uppercase tracking-wider border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Tax</th>
                    <th className="py-3 px-3 text-right">Rate</th>
                    <th className="py-3 px-5">Tax Base</th>
                    <th className="py-3 px-3">GL Account</th>
                    <th className="py-3 px-3">Filing Due</th>
                    <th className="py-3 px-3 text-center">Active</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {rules.map((rule) => (
                    <tr key={rule.tax_code} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-semibold text-slate-200">{rule.tax_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{rule.tax_code}</div>
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-slate-200">
                        {rule.is_rate_configured ? `${rule.tax_rate_pct}%` : <span className="text-rose-400 font-sans text-[11px]">Unconfigured</span>}
                      </td>
                      <td className="py-3.5 px-5 font-sans text-slate-300 text-xs max-w-xs">
                        {rule.tax_base_description}
                      </td>
                      <td className="py-3.5 px-3 text-slate-300 font-mono">
                        {rule.gl_liability_account}
                      </td>
                      <td className="py-3.5 px-3 text-slate-400 text-xs">
                        Day {rule.filing_due_day} of following month
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            rule.active === 'Y'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {rule.active === 'Y' ? 'YES' : 'NO'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-sans">
                        <button
                          onClick={() => {
                            setRuleModalItem(rule);
                            setRuleForm({
                              rate: rule.tax_rate_pct,
                              glAccount: rule.gl_liability_account,
                              filingDueDay: rule.filing_due_day,
                              paymentDueDay: rule.payment_due_day,
                              active: rule.active,
                              taxBaseDesc: rule.tax_base_description,
                              notes: rule.notes || '',
                            });
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 font-medium"
                        >
                          Edit Rule
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Record Payment */}
      {paymentModalItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                Record Tax Payment
              </h3>
              <button
                onClick={() => setPaymentModalItem(null)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="text-xs text-slate-300">
              <span className="font-semibold text-slate-100">{paymentModalItem.tax_name}</span> ({paymentModalItem.period})
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={paymentForm.date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">NTPN / Payment Reference *</label>
                <input
                  type="text"
                  placeholder="e.g. 78A9C12844F0"
                  value={paymentForm.ntpn}
                  onChange={(e) => setPaymentForm({ ...paymentForm, ntpn: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Amount Paid (IDR)</label>
                <input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Disbursing Bank Account</label>
                <select
                  value={paymentForm.bankAccount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, bankAccount: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200"
                >
                  <option value="BCA Operating Account (1010)">BCA Operating Account (Acct 1010)</option>
                  <option value="Mandiri Tax Clearing Account (1020)">Mandiri Tax Clearing (Acct 1020)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setPaymentModalItem(null)}
                className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePayment}
                disabled={actionLoading || !paymentForm.ntpn.trim()}
                className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow"
              >
                Save Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Record Filing */}
      {filingModalItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                Record Tax Return Filing
              </h3>
              <button
                onClick={() => setFilingModalItem(null)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="text-xs text-slate-300">
              <span className="font-semibold text-slate-100">{filingModalItem.tax_name}</span> ({filingModalItem.period})
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Filing Date</label>
                <input
                  type="date"
                  value={filingForm.date}
                  onChange={(e) => setFilingForm({ ...filingForm, date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">BPE / Filing Reference Number *</label>
                <input
                  type="text"
                  placeholder="e.g. S-091823/PPN/WPJ.09/KP.0203/2026"
                  value={filingForm.bpe}
                  onChange={(e) => setFilingForm({ ...filingForm, bpe: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 font-mono uppercase"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setFilingModalItem(null)}
                className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFiling}
                disabled={actionLoading || !filingForm.bpe.trim()}
                className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow"
              >
                Save Filing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Attach Document */}
      {docModalItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                Attach Supporting Tax Evidence
              </h3>
              <button
                onClick={() => setDocModalItem(null)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="text-xs text-slate-300">
              <span className="font-semibold text-slate-100">{docModalItem.tax_name}</span> ({docModalItem.period})
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Document Type</label>
                <select
                  value={docForm.docType}
                  onChange={(e) => setDocForm({ ...docForm, docType: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200"
                >
                  <option value="Bukti Potong">Bukti Potong (Withholding Tax Slip)</option>
                  <option value="Invoice">Tax Invoice / Faktur Pajak</option>
                  <option value="NTPN">NTPN Payment Receipt</option>
                  <option value="BPE">BPE Official Filing Receipt</option>
                  <option value="Tax Return">SPT / Monthly Tax Return</option>
                  <option value="Payment Receipt">Bank Transfer Voucher</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Document Reference / Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Bukti-Potong-PPh23-VendorX.pdf"
                  value={docForm.fileName}
                  onChange={(e) => setDocForm({ ...docForm, fileName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Audit Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional verification note or physical file reference"
                  value={docForm.notes}
                  onChange={(e) => setDocForm({ ...docForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setDocModalItem(null)}
                className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDocument}
                disabled={actionLoading || !docForm.fileName.trim()}
                className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow"
              >
                Attach Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Edit Tax Rule */}
      {ruleModalItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">
                Configure Tax Rule
              </h3>
              <button
                onClick={() => setRuleModalItem(null)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="text-xs text-slate-300">
              <span className="font-semibold text-slate-100">{ruleModalItem.tax_name}</span> ({ruleModalItem.tax_code})
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={ruleForm.rate}
                  onChange={(e) => setRuleForm({ ...ruleForm, rate: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">GL Liability Account</label>
                <input
                  type="text"
                  value={ruleForm.glAccount}
                  onChange={(e) => setRuleForm({ ...ruleForm, glAccount: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Filing Due (Day)</label>
                  <input
                    type="number"
                    value={ruleForm.filingDueDay}
                    onChange={(e) => setRuleForm({ ...ruleForm, filingDueDay: parseInt(e.target.value, 10) || 20 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Payment Due (Day)</label>
                  <input
                    type="number"
                    value={ruleForm.paymentDueDay}
                    onChange={(e) => setRuleForm({ ...ruleForm, paymentDueDay: parseInt(e.target.value, 10) || 10 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Status</label>
                <select
                  value={ruleForm.active}
                  onChange={(e) => setRuleForm({ ...ruleForm, active: e.target.value as 'Y' | 'N' })}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200"
                >
                  <option value="Y">Active</option>
                  <option value="N">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Tax Base Description</label>
                <input
                  type="text"
                  value={ruleForm.taxBaseDesc}
                  onChange={(e) => setRuleForm({ ...ruleForm, taxBaseDesc: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setRuleModalItem(null)}
                className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRule}
                disabled={actionLoading}
                className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs shadow"
              >
                Save Rule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Close Period Confirmation & Checklist */}
      {isCloseModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" /> Close Tax Period — {getPeriodFormatted(selectedPeriod)}
              </h3>
              <button
                onClick={() => setIsCloseModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="text-xs text-slate-300">
              Before closing, all tax obligations must pass the statutory audit validation checklist:
            </div>

            {/* Checklist */}
            <div className="space-y-2 bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">✓ Tax calculated</span>
                {closeValidation?.checks.all_taxes_calculated ? (
                  <span className="text-emerald-400 font-mono text-[11px] font-bold">PASSED</span>
                ) : (
                  <span className="text-rose-400 font-mono text-[11px] font-bold">PENDING</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">✓ Payment recorded where required (NTPN)</span>
                {closeValidation?.checks.all_payments_recorded ? (
                  <span className="text-emerald-400 font-mono text-[11px] font-bold">PASSED</span>
                ) : (
                  <span className="text-rose-400 font-mono text-[11px] font-bold">MISSING</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">✓ Filing recorded where required (BPE)</span>
                {closeValidation?.checks.all_filings_recorded ? (
                  <span className="text-emerald-400 font-mono text-[11px] font-bold">PASSED</span>
                ) : (
                  <span className="text-rose-400 font-mono text-[11px] font-bold">MISSING</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">✓ Required evidence attached</span>
                {closeValidation?.checks.required_evidence_attached ? (
                  <span className="text-emerald-400 font-mono text-[11px] font-bold">PASSED</span>
                ) : (
                  <span className="text-rose-400 font-mono text-[11px] font-bold">MISSING</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">✓ 4-Way Reconciled</span>
                {closeValidation?.checks.all_reconciled ? (
                  <span className="text-emerald-400 font-mono text-[11px] font-bold">PASSED</span>
                ) : (
                  <span className="text-rose-400 font-mono text-[11px] font-bold">VARIANCE</span>
                )}
              </div>
            </div>

            {/* Missing items warnings */}
            {closeValidation && !closeValidation.can_close && (
              <div className="bg-rose-950/40 border border-rose-800/80 rounded-lg p-3 text-xs text-rose-300 space-y-1.5 max-h-40 overflow-y-auto">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Requirements not satisfied:
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-200">
                  {closeValidation.missing_items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <label className="block text-xs text-slate-400 mb-1">Controller Close Notes</label>
              <textarea
                rows={2}
                placeholder="Optional sign-off statement for chronological audit trail..."
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-200"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsCloseModalOpen(false)}
                className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleClosePeriod}
                disabled={actionLoading || !closeValidation?.can_close}
                className={`px-4 py-1.5 rounded font-bold text-xs shadow font-mono ${
                  closeValidation?.can_close
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                CONFIRM & LOCK PERIOD
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
