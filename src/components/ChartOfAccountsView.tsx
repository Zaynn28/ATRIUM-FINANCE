/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Plus,
  Search,
  Building2,
  BookOpen,
  Filter,
  AlertCircle,
  CheckCircle2,
  XCircle,
  DownloadCloud,
  Edit2,
  Trash2,
  PowerOff,
} from 'lucide-react';
import { Account, Department, AccountType, NormalBalance } from '../types';
import { api } from '../services/api';

interface ChartOfAccountsViewProps {
  accounts: Account[];
  departments: Department[];
  onRefresh: () => void;
}

export const ChartOfAccountsView: React.FC<ChartOfAccountsViewProps> = ({
  accounts,
  departments,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'accounts' | 'departments'>('accounts');
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

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter accounts
  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch =
      acc.account_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.usali_line.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'ALL' || acc.account_type === selectedType;
    return matchesSearch && matchesType;
  });

  // Open Create Account
  const handleOpenCreateAccount = () => {
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

  // Open Edit Account
  const handleOpenEditAccount = (acc: Account) => {
    setEditingAccount(acc);
    setAccountForm({ ...acc });
    setIsAccountModalOpen(true);
  };

  // Save Account
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    try {
      await api.saveAccount(accountForm);
      setIsAccountModalOpen(false);
      setSuccessMessage(`Account ${accountForm.account_code} successfully saved.`);
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save account');
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

  // Deactivate Account
  const handleDeactivate = async (code: string) => {
    if (!safeConfirm(`Are you sure you want to deactivate Account ${code}? It will remain in historical journals but cannot be used in new entries.`)) {
      return;
    }
    try {
      await api.deactivateAccount(code);
      setSuccessMessage(`Account ${code} deactivated.`);
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Delete Account (only if no posted history)
  const handleDelete = async (code: string) => {
    if (!safeConfirm(`Attempt delete of Account ${code}? (Rule: Deletion is rejected if any posted journal history exists).`)) {
      return;
    }
    try {
      await api.deleteAccount(code);
      setSuccessMessage(`Account ${code} deleted.`);
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Seed USALI Standard Accounts
  const handleSeedUSALI = async () => {
    if (!safeConfirm('Load standard USALI hotel chart of accounts and operating departments (Rooms, F&B, Cash, AP, Payroll)? This initializes standard baseline accounts.')) {
      return;
    }
    setLoading(true);
    try {
      await api.seedUsaliAccounts();
      setSuccessMessage('Standard USALI Hotel Chart of Accounts and Departments loaded.');
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Save Department
  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.saveDepartment(deptForm);
      setIsDeptModalOpen(false);
      setSuccessMessage(`Department ${deptForm.department_code} saved.`);
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <span>Chart of Accounts &amp; Departments</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Master ledger account taxonomy and departmental hierarchy for hotel financial reporting
          </p>
        </div>

        <div className="flex items-center gap-2">
          {accounts.length === 0 && (
            <button
              id="btn-seed-usali"
              onClick={handleSeedUSALI}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
              title="Preload standard hotel accounts"
            >
              <DownloadCloud className="w-3.5 h-3.5 text-emerald-400" />
              <span>Seed USALI Accounts</span>
            </button>
          )}

          {activeTab === 'accounts' ? (
            <button
              id="btn-add-account"
              onClick={handleOpenCreateAccount}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Account</span>
            </button>
          ) : (
            <button
              id="btn-add-department"
              onClick={() => {
                setDeptForm({ department_code: '', department_name: '', active: 'Y' });
                setIsDeptModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Department</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-lg flex items-center justify-between text-xs text-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-300">
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-lg flex items-center justify-between text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-300">
            Dismiss
          </button>
        </div>
      )}

      {/* Section Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'accounts'
              ? 'bg-slate-800 text-emerald-400 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>General Ledger Accounts ({accounts.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'departments'
              ? 'bg-slate-800 text-emerald-400 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Operating Departments ({departments.length})</span>
        </button>
      </div>

      {/* ACCOUNTS VIEW */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search account code, name, USALI..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            {/* Type Filters */}
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1">
              <span className="text-xs text-slate-500 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Type:
              </span>
              {['ALL', 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-2.5 py-1 rounded text-xs whitespace-nowrap font-medium transition-colors ${
                    selectedType === type
                      ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Accounts Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider font-mono">
                  <tr>
                    <th className="py-3 px-4">Account Code</th>
                    <th className="py-3 px-4">Account Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Normal Balance</th>
                    <th className="py-3 px-4">USALI Line</th>
                    <th className="py-3 px-4">Statutory Line</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                        <BookOpen className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                        <p className="font-medium text-slate-400">No accounts found</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {accounts.length === 0
                            ? 'Create an account manually or seed standard USALI accounts to get started.'
                            : 'Try adjusting your search query or type filter.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((acc) => {
                      const isActive = acc.active === 'Y';
                      return (
                        <tr
                          key={acc.account_code}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            !isActive ? 'opacity-50 bg-slate-950/30' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-semibold text-slate-200">{acc.account_code}</td>
                          <td className="py-3 px-4 font-sans font-medium text-slate-100">{acc.account_name}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-sans font-medium ${
                                acc.account_type === 'Asset'
                                  ? 'bg-blue-950/60 text-blue-300 border border-blue-800/40'
                                  : acc.account_type === 'Liability'
                                  ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                                  : acc.account_type === 'Equity'
                                  ? 'bg-purple-950/60 text-purple-300 border border-purple-800/40'
                                  : acc.account_type === 'Revenue'
                                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                                  : 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                              }`}
                            >
                              {acc.account_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300">{acc.normal_balance}</td>
                          <td className="py-3 px-4 font-sans text-slate-300">{acc.usali_line || '—'}</td>
                          <td className="py-3 px-4 font-sans text-slate-400">{acc.statutory_line || '—'}</td>
                          <td className="py-3 px-4 text-center">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-sans text-emerald-400 font-medium">
                                <CheckCircle2 className="w-3 h-3" /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-sans text-slate-500 font-medium">
                                <XCircle className="w-3 h-3" /> Inactive
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 font-sans">
                              <button
                                onClick={() => handleOpenEditAccount(acc)}
                                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded"
                                title="Edit Account"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {isActive ? (
                                <button
                                  onClick={() => handleDeactivate(acc.account_code)}
                                  className="p-1 text-amber-400 hover:text-amber-300 hover:bg-slate-800 rounded"
                                  title="Deactivate Account"
                                >
                                  <PowerOff className="w-3.5 h-3.5" />
                                </button>
                              ) : null}
                              <button
                                onClick={() => handleDelete(acc.account_code)}
                                className="p-1 text-red-400 hover:text-red-300 hover:bg-slate-800 rounded"
                                title="Delete (Only allowed if no posted history)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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

      {/* DEPARTMENTS VIEW */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider font-mono">
                  <tr>
                    <th className="py-3 px-4">Department Code</th>
                    <th className="py-3 px-4">Department Name</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {departments.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-slate-500 font-sans">
                        <Building2 className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
                        <p className="font-medium text-slate-400">No departments configured</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Add hotel departments (Rooms, Food &amp; Beverage, Administrative, etc.).
                        </p>
                      </td>
                    </tr>
                  ) : (
                    departments.map((dept) => (
                      <tr key={dept.department_code} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-semibold text-slate-200">{dept.department_code}</td>
                        <td className="py-3 px-4 font-sans text-slate-100 font-medium">{dept.department_name}</td>
                        <td className="py-3 px-4 text-center font-sans">
                          {dept.active === 'Y' ? (
                            <span className="text-emerald-400 font-medium inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="text-slate-500 font-medium inline-flex items-center gap-1">
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

      {/* CREATE / EDIT ACCOUNT MODAL */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-100">
                {editingAccount ? `Edit Account: ${editingAccount.account_code}` : 'New Ledger Account'}
              </h3>
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Account Code *</label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingAccount)}
                    value={accountForm.account_code}
                    onChange={(e) => setAccountForm({ ...accountForm, account_code: e.target.value })}
                    placeholder="e.g. 1010, 4010"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Account Type *</label>
                  <select
                    value={accountForm.account_type}
                    onChange={(e) => {
                      const type = e.target.value as AccountType;
                      const normal = type === 'Liability' || type === 'Equity' || type === 'Revenue' ? 'Credit' : 'Debit';
                      setAccountForm({ ...accountForm, account_type: type, normal_balance: normal });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-sans"
                  >
                    <option value="Asset">Asset</option>
                    <option value="Liability">Liability</option>
                    <option value="Equity">Equity</option>
                    <option value="Revenue">Revenue</option>
                    <option value="Expense">Expense</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Account Name *</label>
                <input
                  type="text"
                  required
                  value={accountForm.account_name}
                  onChange={(e) => setAccountForm({ ...accountForm, account_name: e.target.value })}
                  placeholder="e.g. Cash - Operating Bank, Rooms Revenue - Transient"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Normal Balance *</label>
                  <select
                    value={accountForm.normal_balance}
                    onChange={(e) => setAccountForm({ ...accountForm, normal_balance: e.target.value as NormalBalance })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                  >
                    <option value="Debit">Debit</option>
                    <option value="Credit">Credit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Active Status</label>
                  <select
                    value={accountForm.active}
                    onChange={(e) => setAccountForm({ ...accountForm, active: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                  >
                    <option value="Y">Active (Y)</option>
                    <option value="N">Inactive (N)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">USALI Line Classification</label>
                <input
                  type="text"
                  value={accountForm.usali_line}
                  onChange={(e) => setAccountForm({ ...accountForm, usali_line: e.target.value })}
                  placeholder="e.g. Rooms - Transient, Food - Outlets, A&G - Insurance"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Statutory Line Grouping</label>
                <input
                  type="text"
                  value={accountForm.statutory_line}
                  onChange={(e) => setAccountForm({ ...accountForm, statutory_line: e.target.value })}
                  placeholder="e.g. Current Assets, Operating Revenue, Personnel Expenses"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-sans"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg font-sans shadow-sm"
                >
                  {loading ? 'Saving...' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE DEPARTMENT MODAL */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-100">Add Operating Department</h3>
              <button
                onClick={() => setIsDeptModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSaveDepartment} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Department Code *</label>
                <input
                  type="text"
                  required
                  value={deptForm.department_code}
                  onChange={(e) => setDeptForm({ ...deptForm, department_code: e.target.value })}
                  placeholder="e.g. 100, 200, 700"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  value={deptForm.department_name}
                  onChange={(e) => setDeptForm({ ...deptForm, department_name: e.target.value })}
                  placeholder="e.g. Rooms Division, Food & Beverage"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-sans"
                />
              </div>
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg font-sans shadow-sm"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
