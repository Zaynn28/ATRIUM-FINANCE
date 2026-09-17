/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Lock,
  UserCheck,
  Shield,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { Account, MappingConfig, SystemSettings } from '../types';

interface AdministrationViewProps {
  accounts?: Account[];
  onRefresh?: () => void;
}

export const AdministrationView: React.FC<AdministrationViewProps> = ({ accounts = [], onRefresh }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // System Settings State
  const [settings, setSettings] = useState<SystemSettings>({
    property_name: 'Atrium Hotel & Resort (Flagship)',
    room_count: 120,
    base_currency: 'IDR',
    fiscal_year: '2026',
    period_lock_date: '2026-07-31',
    controller_name: 'Financial Controller',
  });

  // Mapping Config State
  const [mapping, setMapping] = useState<MappingConfig>({
    revenue_default_debit_account: '1020',
    spending_procurement_credit_account: '2010',
    spending_payroll_credit_account: '2020',
    spending_other_credit_account: '1010',
    confirmed_by_controller: true,
  });

  // Interactive Period Lock Checker
  const [testDate, setTestDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Load real configurations from backend on mount
  useEffect(() => {
    let isMounted = true;
    async function loadConfig() {
      try {
        setLoading(true);
        const [settingsRes, mappingRes] = await Promise.all([
          api.getAdminSettings().catch(() => null),
          api.getMapping().catch(() => null),
        ]);
        if (isMounted) {
          if (settingsRes) setSettings(settingsRes);
          if (mappingRes && !mappingRes.error) setMapping(mappingRes);
        }
      } catch (err: any) {
        if (isMounted) setErrorMessage(err.message || 'Failed to load configuration');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveAll = async () => {
    setSaving(true);
    setSaveSuccess(null);
    setErrorMessage(null);

    try {
      await Promise.all([
        api.updateAdminSettings(settings),
        api.updateMapping({ ...mapping, confirmed_by_controller: true }),
      ]);
      setSaveSuccess('Accounting period policies, hotel metadata, and journal mappings saved successfully.');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleSeedUsali = async () => {
    if (!window.confirm('Seed standard USALI 12th Edition Chart of Accounts and hotel departmental cost centers?')) {
      return;
    }
    try {
      setSaving(true);
      await api.seedUsaliAccounts();
      setSaveSuccess('Standard USALI Chart of Accounts and Departments successfully initialized.');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to seed accounts');
    } finally {
      setSaving(false);
    }
  };

  const isTestDateLocked = Boolean(
    settings.period_lock_date && testDate && testDate <= settings.period_lock_date
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Settings className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-slate-100 tracking-tight">
                System Administration & Policy Configuration
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-950/60 border border-emerald-800/40 text-emerald-300">
                FINANCIAL CONTROLLER
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Period closing locks, automated journal clearing accounts, fiscal calendar, and property settings
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSeedUsali}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Seed USALI COA</span>
            </button>

            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              {saving ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{saveSuccess}</span>
          </div>
          <button onClick={() => setSaveSuccess(null)} className="text-emerald-400 hover:text-emerald-300 font-mono text-[11px]">
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-300 font-mono text-[11px]">
            Dismiss
          </button>
        </div>
      )}

      {/* Grid of Admin Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Period Lock & Controls */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="font-bold text-slate-100 text-sm">Period Closing & Posting Cut-Off</h3>
                <span className="text-xs text-slate-400">Strict General Ledger Cut-Off Rules</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-amber-950/60 border border-amber-800/40 text-amber-300">
              {settings.period_lock_date ? `LOCKED <= ${settings.period_lock_date}` : 'OPEN'}
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Accounting Period Lock Date:
              </label>
              <input
                type="date"
                value={settings.period_lock_date || ''}
                onChange={(e) => setSettings({ ...settings, period_lock_date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono focus:border-emerald-500 outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Journals and transactions with dates on or before this cut-off are strictly locked. No creations, postings, or reversals are permitted.
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Active Fiscal Year:
              </label>
              <select
                value={settings.fiscal_year || '2026'}
                onChange={(e) => setSettings({ ...settings, fiscal_year: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono focus:border-emerald-500 outline-none"
              >
                <option value="2026">Fiscal Year 2026 (Jan 1, 2026 – Dec 31, 2026)</option>
                <option value="2025">Fiscal Year 2025 (Jan 1, 2025 – Dec 31, 2025)</option>
              </select>
            </div>

            {/* Interactive Lock Verification Tool */}
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="text-slate-300 font-semibold text-[11px]">Test Period Lock Status:</div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs flex-1"
                />
                <span
                  className={`px-2.5 py-1 rounded text-xs font-mono font-semibold ${
                    isTestDateLocked
                      ? 'bg-rose-950/80 text-rose-300 border border-rose-800/50'
                      : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50'
                  }`}
                >
                  {isTestDateLocked ? 'CLOSED & LOCKED' : 'OPEN FOR POSTING'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Property & Entity Hierarchy */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Hotel Property Profile</h3>
              <span className="text-xs text-slate-400">Master Entity Architecture</span>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Property Legal Name:
              </label>
              <input
                type="text"
                value={settings.property_name || ''}
                onChange={(e) => setSettings({ ...settings, property_name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:border-emerald-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Available Room Keys:
                </label>
                <input
                  type="number"
                  value={settings.room_count || 120}
                  onChange={(e) => setSettings({ ...settings, room_count: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Base Reporting Currency:
                </label>
                <select
                  value={settings.base_currency || 'IDR'}
                  onChange={(e) => setSettings({ ...settings, base_currency: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-mono focus:border-emerald-500 outline-none"
                >
                  <option value="IDR">IDR - Indonesian Rupiah (Rp)</option>
                  <option value="USD">USD - US Dollar ($)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Financial Controller Name:
              </label>
              <input
                type="text"
                value={settings.controller_name || ''}
                onChange={(e) => setSettings({ ...settings, controller_name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Automated Journal Clearing & Settlement Mappings */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 md:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="font-bold text-slate-100 text-sm">Automated Double-Entry Clearing Accounts</h3>
                <span className="text-xs text-slate-400">
                  Rules used when converting operational revenue & spending transactions into journals
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950/60 border border-emerald-800/40 text-emerald-300">
              USALI 12 COMPLIANT
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <label className="block text-slate-300 font-medium">
                Revenue Default Settlement:
              </label>
              <input
                type="text"
                value={mapping.revenue_default_debit_account || ''}
                onChange={(e) => setMapping({ ...mapping, revenue_default_debit_account: e.target.value })}
                placeholder="e.g. 1020"
                className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono focus:border-emerald-500 outline-none"
              />
              <span className="text-[11px] text-slate-500 block">
                Default: 1020 (Guest Ledger Clearing)
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <label className="block text-slate-300 font-medium">
                Procurement Trade Payable:
              </label>
              <input
                type="text"
                value={mapping.spending_procurement_credit_account || ''}
                onChange={(e) => setMapping({ ...mapping, spending_procurement_credit_account: e.target.value })}
                placeholder="e.g. 2010"
                className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono focus:border-emerald-500 outline-none"
              />
              <span className="text-[11px] text-slate-500 block">
                Default: 2010 (Accounts Payable - Trade)
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <label className="block text-slate-300 font-medium">
                Payroll Accrual Account:
              </label>
              <input
                type="text"
                value={mapping.spending_payroll_credit_account || ''}
                onChange={(e) => setMapping({ ...mapping, spending_payroll_credit_account: e.target.value })}
                placeholder="e.g. 2020"
                className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono focus:border-emerald-500 outline-none"
              />
              <span className="text-[11px] text-slate-500 block">
                Default: 2020 (Accrued Staff Payroll)
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <label className="block text-slate-300 font-medium">
                Other Disbursements:
              </label>
              <input
                type="text"
                value={mapping.spending_other_credit_account || ''}
                onChange={(e) => setMapping({ ...mapping, spending_other_credit_account: e.target.value })}
                placeholder="e.g. 1010"
                className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono focus:border-emerald-500 outline-none"
              />
              <span className="text-[11px] text-slate-500 block">
                Default: 1010 (Operating Cash in Bank)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
