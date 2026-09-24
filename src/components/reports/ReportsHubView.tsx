/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Scale,
  TrendingUp,
  BookOpen,
  PieChart,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { FinancialStatementsView } from './FinancialStatementsView';
import { UsaliStatementsView } from './UsaliStatementsView';
import { GeneralLedgerView } from '../GeneralLedgerView';
import { TrialBalanceView } from '../TrialBalanceView';
import { OwnerPoolModule } from '../operations/owner-pool/OwnerPoolModule';

interface ReportsHubViewProps {
  initialReport?: 'financial' | 'usali' | 'ledger' | 'trial-balance' | 'owner-pool';
  onOpenJournalInWorkbench?: (journalId: string) => void;
  activeReport?: 'financial' | 'usali' | 'ledger' | 'trial-balance' | 'owner-pool';
  onSelectReport?: (report: 'financial' | 'usali' | 'ledger' | 'trial-balance' | 'owner-pool') => void;
}

export const ReportsHubView: React.FC<ReportsHubViewProps> = ({
  initialReport = 'usali',
  onOpenJournalInWorkbench,
  activeReport: controlledReport,
  onSelectReport,
}) => {
  const [internalReport, setInternalReport] = useState<
    'financial' | 'usali' | 'ledger' | 'trial-balance' | 'owner-pool'
  >(initialReport);

  const activeReport = controlledReport || internalReport;
  const handleSelectReport = (rep: 'financial' | 'usali' | 'ledger' | 'trial-balance' | 'owner-pool') => {
    if (onSelectReport) {
      onSelectReport(rep);
    } else {
      setInternalReport(rep);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Report Category Selector */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2 flex flex-wrap items-center gap-1.5 print:hidden">
        <button
          onClick={() => handleSelectReport('usali')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeReport === 'usali'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>USALI 12 Operating Statements</span>
        </button>

        <button
          onClick={() => handleSelectReport('financial')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeReport === 'financial'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Financial Statements (Balance Sheet & P&L)</span>
        </button>

        <button
          onClick={() => handleSelectReport('trial-balance')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeReport === 'trial-balance'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Trial Balance</span>
        </button>

        <button
          onClick={() => handleSelectReport('ledger')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeReport === 'ledger'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>General Ledger</span>
        </button>

        <button
          id="reports-tab-owner-pool"
          onClick={() => handleSelectReport('owner-pool')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeReport === 'owner-pool'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <PieChart className="w-4 h-4 text-indigo-400" />
          <span>Owner Pool &amp; Return Distribution</span>
        </button>
      </div>

      {/* Render selected report view */}
      {activeReport === 'usali' && (
        <UsaliStatementsView onOpenJournalInWorkbench={onOpenJournalInWorkbench} />
      )}

      {activeReport === 'financial' && (
        <FinancialStatementsView onOpenJournalInWorkbench={onOpenJournalInWorkbench} />
      )}

      {activeReport === 'trial-balance' && <TrialBalanceView />}

      {activeReport === 'ledger' && <GeneralLedgerView />}

      {activeReport === 'owner-pool' && <OwnerPoolModule />}
    </div>
  );
};
