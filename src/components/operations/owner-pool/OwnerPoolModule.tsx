/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MonthlyDistributionView } from './MonthlyDistributionView';
import { UnitsRegistryView } from './UnitsRegistryView';
import { OwnerStatementView } from './OwnerStatementView';
import { PoolPolicyConfigView } from './PoolPolicyConfigView';
import {
  PieChart,
  Building2,
  FileText,
  Sliders,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

export const OwnerPoolModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'distribution' | 'units' | 'statements' | 'policy'
  >('distribution');
  const [selectedUnitForStatement, setSelectedUnitForStatement] = useState<string | null>(null);

  const handleNavigateToStatement = (unitId: string) => {
    setSelectedUnitForStatement(unitId);
    setActiveTab('statements');
  };

  return (
    <div className="space-y-6">
      {/* Module Banner & Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Apartment Owner Pool & Return Distribution
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Reports &amp; Returns
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Automatic hotel room revenue allocation (65% Owner Pool / 35% AMG Operation), dynamic unit SQM pro-rata distribution, 10% contractual guaranteed return verification, and statutory tax withholding.
            </p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" /> 65% Pool / 35% AMG
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 text-xs font-semibold border border-blue-200">
            <TrendingUp className="w-3.5 h-3.5" /> 10% Guarantee (3 Yrs)
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('distribution')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'distribution'
              ? 'border-indigo-600 text-indigo-700 font-bold bg-indigo-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <PieChart className="w-4 h-4" />
          Monthly Distribution Engine
        </button>

        <button
          onClick={() => setActiveTab('units')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'units'
              ? 'border-indigo-600 text-indigo-700 font-bold bg-indigo-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Units & Owners Registry
        </button>

        <button
          onClick={() => setActiveTab('statements')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'statements'
              ? 'border-indigo-600 text-indigo-700 font-bold bg-indigo-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          Owner Return Statements
        </button>

        <button
          onClick={() => setActiveTab('policy')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'policy'
              ? 'border-indigo-600 text-indigo-700 font-bold bg-indigo-50/40 rounded-t-lg'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Distribution Policy & Rules
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'distribution' && (
          <MonthlyDistributionView onNavigateToStatement={handleNavigateToStatement} />
        )}
        {activeTab === 'units' && <UnitsRegistryView />}
        {activeTab === 'statements' && <OwnerStatementView />}
        {activeTab === 'policy' && <PoolPolicyConfigView />}
      </div>
    </div>
  );
};
