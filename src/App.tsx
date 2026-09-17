/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { RevenueCycleView } from './components/RevenueCycleView';
import { SpendingCycleView } from './components/SpendingCycleView';
import { JournalWorkbenchView } from './components/JournalWorkbenchView';
import { GeneralLedgerView } from './components/GeneralLedgerView';
import { TrialBalanceView } from './components/TrialBalanceView';
import { ConfigurationView } from './components/ConfigurationView';
import { ReportsHubView } from './components/reports/ReportsHubView';
import { ControlsAuditView } from './components/ControlsAuditView';
import { IntegrationsView } from './components/IntegrationsView';
import { AdministrationView } from './components/AdministrationView';
import { MappingModal } from './components/MappingModal';
import { DbStatusModal } from './components/DbStatusModal';
import { ManualJournalModal } from './components/ManualJournalModal';
import {
  Account,
  Department,
  JournalWithLines,
  RevenueTransaction,
  SpendingTransaction,
  MappingConfig,
  DEFAULT_MAPPING_CONFIG,
  PrimaryNavPillar,
} from './types';
import { api } from './services/api';

export default function App() {
  // Primary 8-Pillar Navigation State
  const [activePillar, setActivePillar] = useState<PrimaryNavPillar>('command-centre');

  // Sub-navigation within multi-view pillars
  const [operationsSubTab, setOperationsSubTab] = useState<'revenue' | 'spending'>('revenue');
  const [accountingCoreSubTab, setAccountingCoreSubTab] = useState<'workbench' | 'ledger' | 'trial-balance'>('workbench');

  // Master and Transactional Ledger State
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [journals, setJournals] = useState<JournalWithLines[]>([]);
  const [revenueTransactions, setRevenueTransactions] = useState<RevenueTransaction[]>([]);
  const [spendingTransactions, setSpendingTransactions] = useState<SpendingTransaction[]>([]);
  const [mappingConfig, setMappingConfig] = useState<MappingConfig>(DEFAULT_MAPPING_CONFIG);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [exceptionsCount, setExceptionsCount] = useState<number>(0);

  // Modals state
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [isDbStatusModalOpen, setIsDbStatusModalOpen] = useState(false);
  const [isManualJournalOpen, setIsManualJournalOpen] = useState(false);
  const [selectedJournalId, setSelectedJournalId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  // Load all master data and transactions
  const refreshAll = useCallback(async () => {
    try {
      const [
        accsRes,
        deptsRes,
        journalsRes,
        revRes,
        spendRes,
        mappingRes,
        dbStatusRes,
        exceptionsRes,
      ] = await Promise.all([
        api.getAccounts(),
        api.getDepartments(),
        api.getJournals(),
        api.getRevenue(),
        api.getSpending(),
        api.getMapping(),
        api.getStatus(),
        api.getExceptions().catch(() => []),
      ]);

      setAccounts(accsRes || []);
      setDepartments(deptsRes || []);
      setJournals(journalsRes || []);
      setRevenueTransactions(revRes || []);
      setSpendingTransactions(spendRes || []);
      setMappingConfig(
        mappingRes && !(mappingRes as any).error ? mappingRes : DEFAULT_MAPPING_CONFIG
      );
      setDbStatus(dbStatusRes);
      setExceptionsCount(Array.isArray(exceptionsRes) ? exceptionsRes.length : 0);
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Direct Pillar Navigation Handler
  const handleNavigateToPillar = (pillar: PrimaryNavPillar, subView?: string) => {
    setActivePillar(pillar);
    if (pillar === 'operations' && (subView === 'revenue' || subView === 'spending')) {
      setOperationsSubTab(subView);
    } else if (
      pillar === 'accounting-core' &&
      (subView === 'workbench' || subView === 'ledger' || subView === 'trial-balance')
    ) {
      setAccountingCoreSubTab(subView);
    }
  };

  // Cross-Tab Navigation Handler for backward compatibility
  const handleCrossTabNavigate = (tab: string) => {
    if (tab === 'revenue' || tab === 'spending') {
      setActivePillar('operations');
      setOperationsSubTab(tab);
    } else if (tab === 'workbench' || tab === 'ledger' || tab === 'trial-balance') {
      setActivePillar('accounting-core');
      setAccountingCoreSubTab(tab as any);
    } else if (tab === 'reports') {
      setActivePillar('reports');
    } else if (tab === 'accounts' || tab === 'configuration') {
      setActivePillar('configuration');
    } else if (tab === 'controls') {
      setActivePillar('controls-audit');
    } else if (tab === 'integrations') {
      setActivePillar('integrations');
    } else if (tab === 'admin') {
      setActivePillar('administration');
    } else {
      setActivePillar('command-centre');
    }
  };

  // Navigate directly to Journal Workbench and focus on a specific journal
  const handleViewJournal = (journalId: string) => {
    setSelectedJournalId(journalId);
    setActivePillar('accounting-core');
    setAccountingCoreSubTab('workbench');
  };

  const handleJournalCreated = (journalId: string) => {
    refreshAll();
    handleViewJournal(journalId);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Primary Top Navigation - 8 Pillars */}
      <Navbar
        activePillar={activePillar}
        onSelectPillar={handleNavigateToPillar}
        operationsSubTab={operationsSubTab}
        onSelectOperationsSubTab={setOperationsSubTab}
        accountingCoreSubTab={accountingCoreSubTab}
        onSelectAccountingCoreSubTab={setAccountingCoreSubTab}
        onOpenMappingModal={() => setIsMappingModalOpen(true)}
        onOpenDbStatusModal={() => setIsDbStatusModalOpen(true)}
        dbStatus={dbStatus}
        isDbConnected={Boolean(dbStatus?.connected)}
        pendingJournalsCount={
          journals.filter((j) => j.status === 'VALIDATED' || j.status === 'DRAFT').length
        }
        exceptionsCount={exceptionsCount}
      />

      {/* Main Workspace Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400 space-y-3">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-mono">Initializing Atrium Finance ledger...</p>
          </div>
        ) : (
          <>
            {/* 1. COMMAND CENTRE (Dashboard overview/control surface) */}
            {activePillar === 'command-centre' && (
              <DashboardView
                onNavigateToPillar={handleNavigateToPillar}
                onNavigate={handleCrossTabNavigate}
                onOpenMappingModal={() => setIsMappingModalOpen(true)}
                onOpenDbStatusModal={() => setIsDbStatusModalOpen(true)}
                dbStatus={dbStatus}
              />
            )}

            {/* 2. OPERATIONS (Revenue & Spending operational cycles) */}
            {activePillar === 'operations' && operationsSubTab === 'revenue' && (
              <RevenueCycleView
                transactions={revenueTransactions}
                accounts={accounts}
                departments={departments}
                mappingConfig={mappingConfig}
                onRefresh={refreshAll}
                onOpenMappingModal={() => setIsMappingModalOpen(true)}
                onViewJournal={handleViewJournal}
              />
            )}

            {activePillar === 'operations' && operationsSubTab === 'spending' && (
              <SpendingCycleView
                transactions={spendingTransactions}
                accounts={accounts}
                departments={departments}
                mappingConfig={mappingConfig}
                onRefresh={refreshAll}
                onOpenMappingModal={() => setIsMappingModalOpen(true)}
                onViewJournal={handleViewJournal}
              />
            )}

            {/* 3. ACCOUNTING CORE (Actual independent double-entry accounting module) */}
            {activePillar === 'accounting-core' && accountingCoreSubTab === 'workbench' && (
              <JournalWorkbenchView
                journals={journals}
                accounts={accounts}
                departments={departments}
                selectedJournalId={selectedJournalId}
                onRefresh={refreshAll}
                onOpenManualJournalModal={() => setIsManualJournalOpen(true)}
              />
            )}

            {activePillar === 'accounting-core' && accountingCoreSubTab === 'ledger' && (
              <GeneralLedgerView
                accounts={accounts}
                onViewJournal={handleViewJournal}
              />
            )}

            {activePillar === 'accounting-core' && accountingCoreSubTab === 'trial-balance' && (
              <TrialBalanceView />
            )}

            {/* 4. REPORTS (Dedicated USALI 12 & Financial Reporting Layer) */}
            {activePillar === 'reports' && (
              <ReportsHubView onOpenJournalInWorkbench={handleViewJournal} />
            )}

            {/* 5. CONFIGURATION (Isolated from accounting transactions: COA, Depts, Clearing rules) */}
            {activePillar === 'configuration' && (
              <ConfigurationView
                accounts={accounts}
                departments={departments}
                mappingConfig={mappingConfig}
                onRefresh={refreshAll}
              />
            )}

            {/* 6. CONTROLS & AUDIT (Continuous integrity scanner and chronological audit trail) */}
            {activePillar === 'controls-audit' && (
              <ControlsAuditView onNavigateToTab={handleCrossTabNavigate} />
            )}

            {/* 7. INTEGRATIONS (Google Sheets DB, PMS Night Audit ingestion, external feeds) */}
            {activePillar === 'integrations' && (
              <IntegrationsView
                onViewJournal={handleViewJournal}
                onRefresh={refreshAll}
              />
            )}

            {/* 8. ADMINISTRATION (Period close locks, property profile, controller governance) */}
            {activePillar === 'administration' && (
              <AdministrationView
                accounts={accounts}
                onRefresh={refreshAll}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ATRIUM FINANCE / WOLF COMMAND &bull; Strict Double-Entry Ledger</span>
          <span>USALI 12th Revised Edition &bull; Immutable Audit Logs</span>
        </div>
      </footer>

      {/* Global Modals */}
      <MappingModal
        isOpen={isMappingModalOpen}
        onClose={() => setIsMappingModalOpen(false)}
        accounts={accounts}
        currentMapping={mappingConfig}
        currentConfig={mappingConfig}
        onSaveMapping={async (config) => {
          await api.updateMapping(config);
          await refreshAll();
        }}
        onSaved={refreshAll}
      />

      <DbStatusModal
        isOpen={isDbStatusModalOpen}
        onClose={() => setIsDbStatusModalOpen(false)}
        dbStatus={dbStatus}
        onRefresh={refreshAll}
      />

      <ManualJournalModal
        isOpen={isManualJournalOpen}
        onClose={() => setIsManualJournalOpen(false)}
        accounts={accounts}
        departments={departments}
        onCreated={handleJournalCreated}
      />
    </div>
  );
}
