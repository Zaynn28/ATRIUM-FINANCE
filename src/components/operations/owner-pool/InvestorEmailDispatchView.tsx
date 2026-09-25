/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  OwnerDistributionEmailConfig,
  OwnerEmailDispatchLog,
  OwnerDistributionBatch,
  OwnerUnit,
} from '../../../types';
import { api } from '../../../services/api';
import {
  Mail,
  Send,
  Settings,
  Paperclip,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Eye,
  FileText,
  Sliders,
  Building,
  Shield,
  Search,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';

export const InvestorEmailDispatchView: React.FC<{
  batches: OwnerDistributionBatch[];
  units: OwnerUnit[];
  initialBatchId?: string;
  initialUnitId?: string;
}> = ({ batches, units, initialBatchId, initialUnitId }) => {
  const [activeSubTab, setActiveSubTab] = useState<'send' | 'config' | 'logs'>('send');

  // Configuration State
  const [emailConfig, setEmailConfig] = useState<OwnerDistributionEmailConfig | null>(null);
  const [configForm, setConfigForm] = useState<Partial<OwnerDistributionEmailConfig>>({});
  const [configSaving, setConfigSaving] = useState(false);
  const [configSuccess, setConfigSuccess] = useState<string | null>(null);

  // Dispatch / Compose State
  const [selectedBatchId, setSelectedBatchId] = useState<string>(initialBatchId || (batches[0]?.batch_id || ''));
  const [dispatchMode, setDispatchMode] = useState<'batch' | 'single'>('batch');
  const [selectedUnitId, setSelectedUnitId] = useState<string>(initialUnitId || (units[0]?.unit_id || ''));
  const [singleOverrideEmail, setSingleOverrideEmail] = useState<string>('');
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  // Live Email Preview State
  const [previewData, setPreviewData] = useState<{
    recipient_name: string;
    recipient_email: string;
    subject: string;
    body: string;
    attachments: OwnerEmailDispatchLog['attachments'];
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Audit Logs State
  const [emailLogs, setEmailLogs] = useState<OwnerEmailDispatchLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logFilterUnit, setLogFilterUnit] = useState<string>('');
  const [selectedLogDetail, setSelectedLogDetail] = useState<OwnerEmailDispatchLog | null>(null);

  // Load configuration and audit logs on mount
  useEffect(() => {
    loadConfig();
    loadLogs();
  }, []);

  useEffect(() => {
    if (batches.length > 0 && !selectedBatchId) {
      setSelectedBatchId(batches[0].batch_id);
    }
  }, [batches]);

  useEffect(() => {
    if (units.length > 0 && !selectedUnitId) {
      setSelectedUnitId(units[0].unit_id);
    }
  }, [units]);

  // Sync recipient override email when selected unit changes
  useEffect(() => {
    if (selectedUnitId) {
      const u = units.find((item) => item.unit_id === selectedUnitId);
      if (u) {
        setSingleOverrideEmail(u.owner_email || '');
      }
    }
  }, [selectedUnitId, units]);

  // Fetch live preview when batch or unit changes
  useEffect(() => {
    if (selectedBatchId && selectedUnitId) {
      fetchPreview(selectedUnitId, selectedBatchId);
    }
  }, [selectedBatchId, selectedUnitId, emailConfig]);

  const loadConfig = async () => {
    try {
      const cfg = await api.getOwnerEmailConfig();
      setEmailConfig(cfg);
      setConfigForm(cfg);
    } catch (err) {
      console.error('Failed to load email config:', err);
    }
  };

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const logs = await api.getOwnerEmailLogs();
      setEmailLogs(logs);
    } catch (err) {
      console.error('Failed to load email logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchPreview = async (unitId: string, batchId: string) => {
    setPreviewLoading(true);
    try {
      const p = await api.getOwnerEmailPreview(unitId, batchId);
      setPreviewData(p);
    } catch (err) {
      console.warn('Failed to fetch preview:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigSaving(true);
    setConfigSuccess(null);
    try {
      const updated = await api.updateOwnerEmailConfig(configForm);
      setEmailConfig(updated);
      setConfigSuccess('Email dispatch and document attachment settings saved successfully.');
      if (selectedBatchId && selectedUnitId) {
        fetchPreview(selectedUnitId, selectedBatchId);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save configuration');
    } finally {
      setConfigSaving(false);
    }
  };

  const handleSendSingle = async () => {
    if (!selectedBatchId || !selectedUnitId) return;
    setIsDispatching(true);
    setDispatchResult(null);
    try {
      const res = await api.sendSingleOwnerEmail({
        batch_id: selectedBatchId,
        unit_id: selectedUnitId,
        override_email: singleOverrideEmail || undefined,
      });
      setDispatchResult({
        success: true,
        message: `Statement successfully sent to ${res.recipient_email} for Unit ${res.unit_number}!`,
        details: res,
      });
      loadLogs();
    } catch (err: any) {
      setDispatchResult({
        success: false,
        message: err.message || 'Failed to send email to investor.',
      });
    } finally {
      setIsDispatching(false);
    }
  };

  const handleSendBatch = async () => {
    if (!selectedBatchId) return;
    const batch = batches.find((b) => b.batch_id === selectedBatchId);
    const count = batch?.eligible_units_count || batch?.lines.length || 0;

    const confirmed = window.confirm(
      `Are you sure you want to dispatch distribution statement emails with configured attachments to all ${count} apartment unit investors for period ${batch?.period}?`
    );
    if (!confirmed) return;

    setIsDispatching(true);
    setDispatchResult(null);
    try {
      const res = await api.sendBatchOwnerEmails({
        batch_id: selectedBatchId,
      });
      setDispatchResult({
        success: true,
        message: `Batch email dispatch complete! Successfully transmitted statements to ${res.sent_count} unit owners.`,
        details: res,
      });
      loadLogs();
    } catch (err: any) {
      setDispatchResult({
        success: false,
        message: err.message || 'Failed to complete batch dispatch.',
      });
    } finally {
      setIsDispatching(false);
    }
  };

  const activeBatch = batches.find((b) => b.batch_id === selectedBatchId);
  const activeUnit = units.find((u) => u.unit_id === selectedUnitId);

  const filteredLogs = emailLogs.filter((log) => {
    if (logFilterUnit && !log.unit_number.toLowerCase().includes(logFilterUnit.toLowerCase()) && !log.owner_name.toLowerCase().includes(logFilterUnit.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Subnavigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveSubTab('send')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeSubTab === 'send'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            Dispatch Statements
          </button>

          <button
            onClick={() => setActiveSubTab('config')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeSubTab === 'config'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Email & Attachment Template
          </button>

          <button
            onClick={() => {
              setActiveSubTab('logs');
              loadLogs();
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeSubTab === 'logs'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Transmission Logs &amp; Audit ({emailLogs.length})
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            {emailConfig?.enable_auto_send_on_post ? 'Auto-Send on GL Post Enabled' : 'Manual Trigger Only'}
          </span>
        </div>
      </div>

      {/* SUB-TAB 1: DISPATCH / COMPOSE VIEW */}
      {activeSubTab === 'send' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Dispatch Controls */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  Dispatch Parameters
                </h3>
                <span className="text-[11px] font-semibold text-slate-400">Step 1 of 2</span>
              </div>

              {/* Batch Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Distribution Batch:
                </label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                >
                  {batches.map((b) => (
                    <option key={b.batch_id} value={b.batch_id}>
                      {b.period} — {b.batch_title || `Batch ${b.batch_id}`} [{b.status}]
                    </option>
                  ))}
                </select>
                {activeBatch && (
                  <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
                    <span>
                      Eligible: <strong>{activeBatch.eligible_units_count} Units</strong>
                    </span>
                    <span>
                      GL Status:{' '}
                      <strong className={activeBatch.status === 'POSTED' ? 'text-emerald-700' : 'text-amber-700'}>
                        {activeBatch.status}
                      </strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Mode Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Transmission Mode:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDispatchMode('batch')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border text-center transition-all ${
                      dispatchMode === 'batch'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Broadcast to All Owners ({activeBatch?.eligible_units_count || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDispatchMode('single')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border text-center transition-all ${
                      dispatchMode === 'single'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Send to Individual Unit
                  </button>
                </div>
              </div>

              {/* Single Unit Selector */}
              {dispatchMode === 'single' && (
                <div className="space-y-3 p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Select Unit / Investor:
                    </label>
                    <select
                      value={selectedUnitId}
                      onChange={(e) => setSelectedUnitId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                    >
                      {units.map((u) => (
                        <option key={u.unit_id} value={u.unit_id}>
                          Unit {u.unit_number} — {u.owner_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Recipient Email (Can override for testing):
                    </label>
                    <input
                      type="email"
                      value={singleOverrideEmail}
                      onChange={(e) => setSingleOverrideEmail(e.target.value)}
                      placeholder="e.g. investor@example.com"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800"
                    />
                  </div>
                </div>
              )}

              {/* Document Attachments Checklist Preview */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="block text-xs font-semibold text-slate-700">
                  Configured Documents to Attach:
                </span>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle className={`w-3.5 h-3.5 ${emailConfig?.include_statement_summary_pdf ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span>Monthly Return Statement (Formal USALI breakdown PDF)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className={`w-3.5 h-3.5 ${emailConfig?.include_tax_withholding_slip ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span>Statutory Tax Withholding Certificate (Bukti Potong PPh)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className={`w-3.5 h-3.5 ${emailConfig?.include_hotel_operating_breakdown ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span>Audited Room Revenue &amp; Occupancy Performance Schedule</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className={`w-3.5 h-3.5 ${emailConfig?.include_bank_payment_voucher ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span>Bank Disbursement &amp; Payment Advice Voucher</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                {dispatchMode === 'batch' ? (
                  <button
                    onClick={handleSendBatch}
                    disabled={isDispatching || !selectedBatchId}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                  >
                    {isDispatching ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Dispatch to All {activeBatch?.eligible_units_count || 0} Investors Now
                  </button>
                ) : (
                  <button
                    onClick={handleSendSingle}
                    disabled={isDispatching || !selectedUnitId || !selectedBatchId}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                  >
                    {isDispatching ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Send Statement to Unit {activeUnit?.unit_number} Owner
                  </button>
                )}
              </div>

              {/* Result Notification */}
              {dispatchResult && (
                <div
                  className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                    dispatchResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {dispatchResult.success ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-semibold">{dispatchResult.message}</p>
                    {dispatchResult.details?.sent_count && (
                      <p className="text-[11px] opacity-90">
                        {dispatchResult.details.sent_count} successful deliveries recorded in audit trail.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Dynamic Live Preview */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-full">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold text-slate-800">
                    Live Email Transmission Preview (Unit {activeUnit?.unit_number})
                  </span>
                </div>
                {previewLoading && (
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Updating preview...
                  </span>
                )}
              </div>

              {previewData ? (
                <div className="p-6 space-y-4 font-sans text-xs flex-1 overflow-y-auto">
                  {/* Email Headers Box */}
                  <div className="p-3.5 bg-slate-50/80 rounded-lg border border-slate-200 space-y-2 text-xs">
                    <div className="flex">
                      <span className="w-20 text-slate-400 font-semibold">From:</span>
                      <span className="font-semibold text-slate-800">
                        {emailConfig?.sender_name} &lt;{emailConfig?.sender_email}&gt;
                      </span>
                    </div>
                    <div className="flex">
                      <span className="w-20 text-slate-400 font-semibold">To:</span>
                      <span className="font-semibold text-indigo-700">
                        {previewData.recipient_name} &lt;{singleOverrideEmail || previewData.recipient_email}&gt;
                      </span>
                    </div>
                    {emailConfig?.cc_finance_office && (
                      <div className="flex">
                        <span className="w-20 text-slate-400 font-semibold">Cc:</span>
                        <span className="text-slate-600">{emailConfig.finance_office_email}</span>
                      </div>
                    )}
                    <div className="flex">
                      <span className="w-20 text-slate-400 font-semibold">Subject:</span>
                      <span className="font-bold text-slate-900">{previewData.subject}</span>
                    </div>
                  </div>

                  {/* Email Body Preformatted Display */}
                  <div className="p-4 border border-slate-200 rounded-lg bg-white text-slate-800 whitespace-pre-wrap font-mono text-[11px] leading-relaxed shadow-xs">
                    {previewData.body}
                  </div>

                  {/* Attached Documents Preview Pills */}
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                      Attached Documents ({previewData.attachments.length} files generated):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {previewData.attachments.map((att, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px]"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span className="font-semibold text-slate-800 truncate" title={att.name}>
                              {att.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                            {att.file_size_kb} KB
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 text-xs">
                  Select a valid distribution batch and apartment unit to inspect the live formatted email preview.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: CONFIGURATION & TEMPLATE CUSTOMIZATION */}
      {activeSubTab === 'config' && (
        <form onSubmit={handleSaveConfig} className="space-y-6">
          {configSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              {configSuccess}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sender & Server Routing */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
                <Building className="w-4 h-4 text-indigo-600" />
                Sender &amp; Routing Identity
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Display Sender Name:
                  </label>
                  <input
                    type="text"
                    value={configForm.sender_name || ''}
                    onChange={(e) => setConfigForm({ ...configForm, sender_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sender Email Address:
                  </label>
                  <input
                    type="email"
                    value={configForm.sender_email || ''}
                    onChange={(e) => setConfigForm({ ...configForm, sender_email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reply-To Email Address:
                  </label>
                  <input
                    type="email"
                    value={configForm.reply_to || ''}
                    onChange={(e) => setConfigForm({ ...configForm, reply_to: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">
                        Carbon Copy (CC) Hotel Finance Records
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Sends a duplicate record to corporate controller mailbox
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={configForm.cc_finance_office || false}
                      onChange={(e) => setConfigForm({ ...configForm, cc_finance_office: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                  </div>

                  {configForm.cc_finance_office && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Finance Office CC Email:
                      </label>
                      <input
                        type="email"
                        value={configForm.finance_office_email || ''}
                        onChange={(e) => setConfigForm({ ...configForm, finance_office_email: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 block">
                        Automatic Dispatch upon GL Posting
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Instantly send emails to all investors when Financial Controller posts batch
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={configForm.enable_auto_send_on_post || false}
                      onChange={(e) => setConfigForm({ ...configForm, enable_auto_send_on_post: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Document Attachments Configuration */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
                <Paperclip className="w-4 h-4 text-indigo-600" />
                Attached Document Types
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-start justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="pr-3">
                    <span className="font-bold text-slate-800 block">
                      1. Official Owner Return Statement (PDF)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Standard USALI breakdown including Gross Revenue, 65% Pool, SQM weight, and Net Payout.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={configForm.include_statement_summary_pdf || false}
                    onChange={(e) => setConfigForm({ ...configForm, include_statement_summary_pdf: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 mt-1"
                  />
                </div>

                <div className="flex items-start justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="pr-3">
                    <span className="font-bold text-slate-800 block">
                      2. Statutory Tax Withholding Slip (Bukti Potong PPh)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Official Indonesian tax withholding receipt (PPh Final 4(2) 10% or PPh 23 2%).
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={configForm.include_tax_withholding_slip || false}
                    onChange={(e) => setConfigForm({ ...configForm, include_tax_withholding_slip: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 mt-1"
                  />
                </div>

                <div className="flex items-start justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="pr-3">
                    <span className="font-bold text-slate-800 block">
                      3. Hotel Operating &amp; Performance Schedule
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Audited USALI summary of Room Revenue, Occupancy Rate, and Transient vs Group split.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={configForm.include_hotel_operating_breakdown || false}
                    onChange={(e) => setConfigForm({ ...configForm, include_hotel_operating_breakdown: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 mt-1"
                  />
                </div>

                <div className="flex items-start justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="pr-3">
                    <span className="font-bold text-slate-800 block">
                      4. Bank Disbursement &amp; Payment Advice
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Transfer proof linking to GL Journal Voucher (Account 1010 Bank to 2060 Owner Payable).
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={configForm.include_bank_payment_voucher || false}
                    onChange={(e) => setConfigForm({ ...configForm, include_bank_payment_voucher: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 mt-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Email Subject & Body Customization */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
              <Sliders className="w-4 h-4 text-indigo-600" />
              Email Template &amp; Merge Variables
            </h3>

            {/* Template Variables Helper */}
            <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 text-[11px] text-slate-600 space-y-1">
              <span className="font-bold text-indigo-900 block flex items-center gap-1">
                <Info className="w-3.5 h-3.5" /> Supported Dynamic Merge Tags:
              </span>
              <p className="font-mono text-[10px] text-indigo-800">
                {'{owner_name}'} • {'{unit_number}'} • {'{period}'} • {'{room_revenue}'} • {'{owner_pool}'} • {'{gross_return}'} • {'{return_basis_type}'} • {'{tax_withheld}'} • {'{tax_treatment_label}'} • {'{net_distribution}'} • {'{bank_name}'} • {'{bank_account_number}'} • {'{journal_id}'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Subject Format:
              </label>
              <input
                type="text"
                value={configForm.email_subject_template || ''}
                onChange={(e) => setConfigForm({ ...configForm, email_subject_template: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Body Format:
              </label>
              <textarea
                rows={12}
                value={configForm.email_body_template || ''}
                onChange={(e) => setConfigForm({ ...configForm, email_body_template: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Legal Disclaimer / Confidentiality Notice:
              </label>
              <input
                type="text"
                value={configForm.disclaimer_note || ''}
                onChange={(e) => setConfigForm({ ...configForm, disclaimer_note: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
              />
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={configSaving}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-2"
              >
                {configSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Save Configuration &amp; Apply to Templates
              </button>
            </div>
          </div>
        </form>
      )}

      {/* SUB-TAB 3: TRANSMISSION LOGS & AUDIT TRAIL */}
      {activeSubTab === 'logs' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                Investor Statement Transmission Audit Trail
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Full chronological record of all automated and manual email deliveries with document payload details.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by Unit or Owner..."
                  value={logFilterUnit}
                  onChange={(e) => setLogFilterUnit(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                />
              </div>

              <button
                onClick={loadLogs}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 text-xs font-semibold"
                title="Refresh logs"
              >
                <RefreshCw className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {logsLoading ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Loading transmission audit logs...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs space-y-2">
              <Mail className="w-8 h-8 text-slate-300 mx-auto" />
              <p>No email dispatches recorded yet.</p>
              <p className="text-[11px] text-slate-400">
                Use the "Dispatch Statements" tab or post a distribution batch to generate investor email statements.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-3">Dispatch Time</th>
                    <th className="py-2.5 px-3">Unit &amp; Owner</th>
                    <th className="py-2.5 px-3">Recipient Email</th>
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3">Attachments</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => (
                    <tr key={log.dispatch_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                        {new Date(log.sent_at).toLocaleString('id-ID')}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900 block">Unit {log.unit_number}</span>
                        <span className="text-[11px] text-slate-500">{log.owner_name}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-mono text-[11px]">
                        {log.recipient_email}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-semibold text-[11px]">
                          {log.period}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          <Paperclip className="w-3 h-3 text-slate-400" />
                          {log.attachments?.length || 0} files
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-3 h-3" />
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setSelectedLogDetail(log)}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded"
                        >
                          View Email
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Modal for viewing detailed log record */}
          {selectedLogDetail && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4 text-xs font-sans max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      Dispatch Log: {selectedLogDetail.dispatch_id}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Sent on {new Date(selectedLogDetail.sent_at).toLocaleString('id-ID')} by {selectedLogDetail.sent_by}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedLogDetail(null)}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px]">
                  <p><strong>Recipient:</strong> {selectedLogDetail.owner_name} &lt;{selectedLogDetail.recipient_email}&gt;</p>
                  <p><strong>Unit:</strong> Unit {selectedLogDetail.unit_number} (Period: {selectedLogDetail.period})</p>
                  <p><strong>Subject:</strong> {selectedLogDetail.email_subject}</p>
                  {selectedLogDetail.journal_id && (
                    <p><strong>GL Voucher Ref:</strong> {selectedLogDetail.journal_id}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Attached Files:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedLogDetail.attachments.map((att, i) => (
                      <div key={i} className="p-2 bg-white border border-slate-200 rounded text-[11px] flex justify-between items-center">
                        <span className="truncate">{att.name}</span>
                        <span className="text-slate-400 font-mono text-[10px]">{att.file_size_kb} KB</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Body Preview:</label>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono whitespace-pre-wrap">
                    {selectedLogDetail.email_body_preview}
                  </pre>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedLogDetail(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
