/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Settings,
  BookOpen,
  Building2,
  Sliders,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  PowerOff,
  Sparkles,
  Save,
  RotateCw,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Account, Department, MappingConfig, AccountType, NormalBalance } from '../types';
import { api } from '../services/api';
import { ReportConfigDesigner } from './configuration/ReportConfigDesigner';

interface ConfigurationViewProps {
  accounts: Account[];
  departments: Department[];
  mappingConfig: MappingConfig;
  onRefresh: () => void;
  initialTab?: 'coa' | 'departments' | 'mappings' | 'reports';
}

export const ConfigurationView: React.FC<ConfigurationViewProps> = ({
  accounts,
  departments,
  mappingConfig,
  onRefresh,
  initialTab = 'coa',
}) => {
  const [activeConfigTab, setActiveConfigTab] = useState<'coa' | 'departments' | 'mappings' | 'reports'>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveConfigTab(initialTab);
    }
  }, [initialTab]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  // Account Modal State
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountForm, setAccountForm] = useState<Account>({
    account_code: '',
    account_name: '',
    account_type: 'Asset',
    normal_balance: 'Debit',
    statutory_line: '',
    usali_line: '',
    active: 'Y',
  });

  // Department Modal State
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptForm, setDeptForm] = useState<Department>({
    department_code: '',
    department_name: '',
    active: 'Y',
  });

  // Mapping Form State
  const [mappings, setMappings] = useState<MappingConfig>(mappingConfig);
  const [savingMapping, setSavingMapping] = useState(false);
  const [mappingMessage, setMappingMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filter Accounts
  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.account_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (acc.usali_line && acc.usali_line.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = selectedType === 'ALL' || acc.account_type === selectedType;

    return matchesSearch && matchesType;
  });

  // Filter Departments
  const filteredDepartments = departments.filter(
    (dept) =>
      dept.department_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.department_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Account Handlers
  const handleOpenAddAccount = () => {
    setEditingAccount(null);
    setAccountForm({
      account_code: '',
      account_name: '',
      account_type: 'Asset',
      normal_balance: 'Debit',
      statutory_line: '',
      usali_line: '',
      active: 'Y',
    });
    setIsAccountModalOpen(true);
  };

  const handleOpenEditAccount = (acc: Account) => {
    setEditingAccount(acc);
    setAccountForm({ ...acc });
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setActionError(null);
    try {
      await api.saveAccount(accountForm);
      setIsAccountModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to save account');
    } finally {
      setLoading(false);
    }
  };

  const safeConfirm = (msg: string): boolean => {
    try {
      return window.confirm(msg);
    } catch {
      return true;
    }
  };

  const handleDeactivateAccount = async (code: string) => {
    if (!safeConfirm(`Deactivate account ${code}? It will no longer be available for new transactions.`)) return;
    setLoading(true);
    setActionError(null);
    try {
      await api.deactivateAccount(code);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to deactivate account');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (code: string) => {
    if (!safeConfirm(`Permanently delete account ${code}? Only accounts with no posted journal history can be deleted.`)) return;
    setLoading(true);
    setActionError(null);
    try {
      await api.deleteAccount(code);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedUsali = async () => {
    if (!safeConfirm('Populate standard USALI 12th Edition Chart of Accounts and hotel departmental schedules?')) return;
    setLoading(true);
    setActionError(null);
    try {
      await api.seedUsaliAccounts();
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to seed accounts');
    } finally {
      setLoading(false);
    }
  };

  // Department Handlers
  const handleOpenAddDept = () => {
    setDeptForm({ department_code: '', department_name: '', active: 'Y' });
    setIsDeptModalOpen(true);
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setActionError(null);
    try {
      await api.saveDepartment(deptForm);
      setIsDeptModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Failed to save department');
    } finally {
      setLoading(false);
    }
  };

  // Mappings Handler
  const handleSaveMappings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMapping(true);
    setMappingMessage(null);
    try {
      await api.updateMapping({ ...mappings, confirmed_by_controller: true });
      setMappingMessage({ type: 'success', text: 'Automated journal clearing accounts updated successfully.' });
      onRefresh();
    } catch (err: any) {
      setMappingMessage({ type: 'error', text: err.message || 'Failed to save account mappings' });
    } finally {
      setSavingMapping(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Settings className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-slate-100 tracking-tight">
                Configuration & Master Setup
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-950/60 border border-emerald-800/40 text-emerald-300">
                PILLAR 5
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Chart of Accounts, Departmental Cost Centers, and automated double-entry clearing rules (isolated from transaction activity)
            </p>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-950 border border-slate-800">
            <button
              onClick={() => setActiveConfigTab('coa')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeConfigTab === 'coa'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Chart of Accounts ({accounts.length})</span>
            </button>

            <button
              onClick={() => setActiveConfigTab('departments')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeConfigTab === 'departments'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Cost Centers ({departments.length})</span>
            </button>

            <button
              onClick={() => setActiveConfigTab('mappings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeConfigTab === 'mappings'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Clearing Mappings</span>
            </button>

            <button
              onClick={() => setActiveConfigTab('reports')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeConfigTab === 'reports'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Report Formats & Structure</span>
            </button>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-[11px] font-mono hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: CHART OF ACCOUNTS */}
      {activeConfigTab === 'coa' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search code, title, USALI line..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500 outline-none"
                />
              </div>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:border-emerald-500 outline-none"
              >
                <option value="ALL">All Account Types</option>
                <option value="Asset">Assets (1000s)</option>
                <option value="Liability">Liabilities (2000s)</option>
                <option value="Equity">Equity (3000s)</option>
                <option value="Revenue">Revenue (4000s)</option>
                <option value="Expense">Expenses (5000-9000s)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleSeedUsali}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                title="Populate standard USALI 12th Edition accounts"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Seed USALI 12</span>
              </button>

              <button
                onClick={handleOpenAddAccount}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Account</span>
              </button>
            </div>
          </div>

          {/* Accounts Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-mono text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Account Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Normal Balance</th>
                    <th className="py-3 px-4">USALI 12 Schedule</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No accounts match your query. Click &quot;Seed USALI 12&quot; to initialize standard hotel accounts.
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((acc) => (
                      <tr key={acc.account_code} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-4 font-bold text-emerald-400">
                          {acc.account_code}
                        </td>
                        <td className="py-2.5 px-4 text-slate-200 font-sans font-medium">
                          {acc.account_name}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              acc.account_type === 'Asset'
                                ? 'bg-blue-950/60 text-blue-300 border border-blue-800/40'
                                : acc.account_type === 'Liability'
                                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                                : acc.account_type === 'Revenue'
                                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                                : 'bg-purple-950/60 text-purple-300 border border-purple-800/40'
                            }`}
                          >
                            {acc.account_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-400">
                          {acc.normal_balance}
                        </td>
                        <td className="py-2.5 px-4 text-slate-300 text-[11px] font-sans">
                          {acc.usali_line || '—'}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {acc.active === 'Y' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
                              <XCircle className="w-3 h-3" /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditAccount(acc)}
                              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
                              title="Edit Account"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {acc.active === 'Y' ? (
                              <button
                                onClick={() => handleDeactivateAccount(acc.account_code)}
                                className="p-1 hover:bg-slate-800 rounded text-amber-400/80 hover:text-amber-400"
                                title="Deactivate Account"
                              >
                                <PowerOff className="w-3.5 h-3.5" />
                              </button>
                            ) : null}
                            <button
                              onClick={() => handleDeleteAccount(acc.account_code)}
                              className="p-1 hover:bg-slate-800 rounded text-rose-400/80 hover:text-rose-400"
                              title="Delete Account (if no transactions)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COST CENTERS / DEPARTMENTS */}
      {activeConfigTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search department code or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500 outline-none"
              />
            </div>

            <button
              onClick={handleOpenAddDept}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Department</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-mono text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Cost Center Code</th>
                    <th className="py-3 px-4">Department / Division Name</th>
                    <th className="py-3 px-4">Role in USALI 12</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredDepartments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500">
                        No departments found.
                      </td>
                    </tr>
                  ) : (
                    filteredDepartments.map((dept) => (
                      <tr key={dept.department_code} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-4 font-bold text-emerald-400">
                          {dept.department_code}
                        </td>
                        <td className="py-2.5 px-4 text-slate-200 font-sans font-medium">
                          {dept.department_name}
                        </td>
                        <td className="py-2.5 px-4 text-slate-400 font-sans text-[11px]">
                          {dept.department_code === '100'
                            ? 'Operated Department: Rooms (Schedule 1)'
                            : dept.department_code === '200'
                            ? 'Operated Department: Food & Beverage (Schedule 2)'
                            : dept.department_code === '300'
                            ? 'Undistributed: Administrative & General'
                            : dept.department_code === '400'
                            ? 'Undistributed: Sales & Marketing'
                            : dept.department_code === '500'
                            ? 'Undistributed: Property Operations & Maintenance'
                            : dept.department_code === '600'
                            ? 'Undistributed: Utilities'
                            : 'Support / Non-Operating Division'}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {dept.active === 'Y' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
                              <XCircle className="w-3 h-3" /> Inactive
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
        </div>
      )}

      {/* TAB 3: CLEARING & SETTLEMENT MAPPINGS */}
      {activeConfigTab === 'mappings' && (
        <form onSubmit={handleSaveMappings} className="space-y-6">
          {mappingMessage && (
            <div
              className={`p-4 rounded-xl text-xs flex items-center justify-between ${
                mappingMessage.type === 'success'
                  ? 'bg-emerald-950/40 border border-emerald-800/50 text-emerald-200'
                  : 'bg-rose-950/40 border border-rose-800/50 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{mappingMessage.text}</span>
              </div>
              <button type="button" onClick={() => setMappingMessage(null)} className="text-[11px] font-mono hover:underline">
                Dismiss
              </button>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Automated Journal Clearing Rules</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                These default counterpart accounts are automatically assigned during operational transaction ingestion to guarantee balanced double-entry journals.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <label className="block text-slate-200 font-semibold">
                  Revenue Default Debit Account (Guest Settlement):
                </label>
                <select
                  value={mappings.revenue_default_debit_account || '1020'}
                  onChange={(e) => setMappings({ ...mappings, revenue_default_debit_account: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-mono focus:border-emerald-500 outline-none"
                >
                  {accounts
                    .filter((a) => a.account_type === 'Asset')
                    .map((a) => (
                      <option key={a.account_code} value={a.account_code}>
                        {a.account_code} - {a.account_name}
                      </option>
                    ))}
                </select>
                <span className="text-[11px] text-slate-400 block">
                  Typically: 1020 (Guest Ledger Clearing) or 1010 (Cash in Bank)
                </span>
              </div>

              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <label className="block text-slate-200 font-semibold">
                  Procurement Default Credit Account (Accounts Payable):
                </label>
                <select
                  value={mappings.spending_procurement_credit_account || '2010'}
                  onChange={(e) => setMappings({ ...mappings, spending_procurement_credit_account: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-mono focus:border-emerald-500 outline-none"
                >
                  {accounts
                    .filter((a) => a.account_type === 'Liability')
                    .map((a) => (
                      <option key={a.account_code} value={a.account_code}>
                        {a.account_code} - {a.account_name}
                      </option>
                    ))}
                </select>
                <span className="text-[11px] text-slate-400 block">
                  Typically: 2010 (Accounts Payable - Trade)
                </span>
              </div>

              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <label className="block text-slate-200 font-semibold">
                  Payroll Default Credit Account (Staff Accrual):
                </label>
                <select
                  value={mappings.spending_payroll_credit_account || '2020'}
                  onChange={(e) => setMappings({ ...mappings, spending_payroll_credit_account: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-mono focus:border-emerald-500 outline-none"
                >
                  {accounts
                    .filter((a) => a.account_type === 'Liability')
                    .map((a) => (
                      <option key={a.account_code} value={a.account_code}>
                        {a.account_code} - {a.account_name}
                      </option>
                    ))}
                </select>
                <span className="text-[11px] text-slate-400 block">
                  Typically: 2020 (Accrued Payroll & Benefits)
                </span>
              </div>

              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <label className="block text-slate-200 font-semibold">
                  Other Spending Default Credit Account (Cash Out):
                </label>
                <select
                  value={mappings.spending_other_credit_account || '1010'}
                  onChange={(e) => setMappings({ ...mappings, spending_other_credit_account: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-mono focus:border-emerald-500 outline-none"
                >
                  {accounts
                    .filter((a) => a.account_type === 'Asset')
                    .map((a) => (
                      <option key={a.account_code} value={a.account_code}>
                        {a.account_code} - {a.account_name}
                      </option>
                    ))}
                </select>
                <span className="text-[11px] text-slate-400 block">
                  Typically: 1010 (Operating Cash in Bank)
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingMapping}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                {savingMapping ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{savingMapping ? 'Saving Rules...' : 'Save Clearing Rules'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 4: REPORT FORMATS & STRUCTURE */}
      {activeConfigTab === 'reports' && (
        <ReportConfigDesigner
          accounts={accounts}
          onConfigSaved={() => {
            onRefresh();
          }}
        />
      )}

      {/* Account Add/Edit Modal */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-100">
              {editingAccount ? 'Edit Account' : 'Add New Account'}
            </h3>

            <form onSubmit={handleSaveAccount} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Account Code:</label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingAccount)}
                  value={accountForm.account_code}
                  onChange={(e) => setAccountForm({ ...accountForm, account_code: e.target.value })}
                  placeholder="e.g. 1010"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono focus:border-emerald-500 outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Account Name:</label>
                <input
                  type="text"
                  required
                  value={accountForm.account_name}
                  onChange={(e) => setAccountForm({ ...accountForm, account_name: e.target.value })}
                  placeholder="e.g. Operating Cash in Bank"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Type:</label>
                  <select
                    value={accountForm.account_type}
                    onChange={(e) => setAccountForm({ ...accountForm, account_type: e.target.value as AccountType })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:border-emerald-500 outline-none"
                  >
                    <option value="Asset">Asset</option>
                    <option value="Liability">Liability</option>
                    <option value="Equity">Equity</option>
                    <option value="Revenue">Revenue</option>
                    <option value="Expense">Expense</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Normal Balance:</label>
                  <select
                    value={accountForm.normal_balance}
                    onChange={(e) => setAccountForm({ ...accountForm, normal_balance: e.target.value as NormalBalance })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:border-emerald-500 outline-none"
                  >
                    <option value="Debit">Debit</option>
                    <option value="Credit">Credit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">USALI 12th Edition Schedule Line:</label>
                <input
                  type="text"
                  value={accountForm.usali_line}
                  onChange={(e) => setAccountForm({ ...accountForm, usali_line: e.target.value })}
                  placeholder="e.g. Schedule 1 - Rooms Revenue"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Statutory Tax / Financial Line:</label>
                <input
                  type="text"
                  value={accountForm.statutory_line}
                  onChange={(e) => setAccountForm({ ...accountForm, statutory_line: e.target.value })}
                  placeholder="e.g. Current Assets / Cash & Equivalents"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  {loading ? 'Saving...' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Department Add Modal */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-100">Add Cost Center / Department</h3>

            <form onSubmit={handleSaveDept} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Cost Center Code:</label>
                <input
                  type="text"
                  required
                  value={deptForm.department_code}
                  onChange={(e) => setDeptForm({ ...deptForm, department_code: e.target.value })}
                  placeholder="e.g. 100"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Department Name:</label>
                <input
                  type="text"
                  required
                  value={deptForm.department_name}
                  onChange={(e) => setDeptForm({ ...deptForm, department_name: e.target.value })}
                  placeholder="e.g. Rooms Division"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  {loading ? 'Saving...' : 'Save Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
