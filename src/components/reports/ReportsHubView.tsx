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

interface ReportsHubViewProps {
  initialReport?: 'financial' | 'usali' | 'ledger' | 'trial-balance';
  onOpenJournalInWorkbench?: (journalId: string) => void;
}

export const ReportsHubView: React.FC<ReportsHubViewProps> = ({
  initialReport = 'usali',
  onOpenJournalInWorkbench,
}) => {
  const [activeReport, setActiveReport] = useState<
    'financial' | 'usali' | 'ledger' | 'trial-balance'
  >(initialReport);

  return (
    <div className="space-y-6">
      {/* Top Report Category Selector */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2 flex flex-wrap items-center gap-1.5 print:hidden">
        <button
          onClick={() => setActiveReport('usali')}
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
          onClick={() => setActiveReport('financial')}
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
          onClick={() => setActiveReport('trial-balance')}
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
          onClick={() => setActiveReport('ledger')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeReport === 'ledger'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>General Ledger</span>
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
    </div>
  );
};
