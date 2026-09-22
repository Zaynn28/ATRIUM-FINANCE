/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Layers,
  TrendingUp,
  Sliders,
  ShieldAlert,
  Workflow,
  ShieldCheck,
  Database,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Clock,
  Scale,
  ArrowDownLeft,
  ArrowUpRight,
  UserCheck,
  ChevronDown,
  Lock,
  LogOut,
  Package,
  Coins,
  Building2,
} from 'lucide-react';
import { PrimaryNavPillar, SystemUser, UserRoleDefinition } from '../types';

export type NavTab =
  | 'dashboard'
  | 'accounts'
  | 'revenue'
  | 'spending'
  | 'inventory'
  | 'service-charge'
  | 'owner-pool'
  | 'workbench'
  | 'reports'
  | 'ledger'
  | 'trial-balance'
  | 'controls'
  | 'integrations'
  | 'admin'
  | 'configuration';

interface NavbarProps {
  activePillar: PrimaryNavPillar;
  onSelectPillar: (pillar: PrimaryNavPillar) => void;
  // Sub-tabs for pillars that have sub-views
  operationsSubTab?: 'revenue' | 'spending' | 'inventory' | 'service-charge' | 'owner-pool';
  onSelectOperationsSubTab?: (tab: 'revenue' | 'spending' | 'inventory' | 'service-charge' | 'owner-pool') => void;
  accountingCoreSubTab?: 'workbench' | 'ledger' | 'trial-balance';
  onSelectAccountingCoreSubTab?: (tab: 'workbench' | 'ledger' | 'trial-balance') => void;
  // RBAC Current User & Roles
  currentUser?: SystemUser;
  currentRole?: UserRoleDefinition;
  allUsers?: SystemUser[];
  onSwitchUser?: (userId: string) => void;
  onSignOut?: () => void;
  // Legacy / Direct navigations
  pendingJournalsCount: number;
  exceptionsCount?: number;
  dbStatus?: {
    connected?: boolean;
    spreadsheetId?: string;
    hasCredentials?: boolean;
    error?: string | null;
  } | null;
  isDbConnected?: boolean;
  onOpenMappingModal: () => void;
  onOpenDbStatusModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePillar,
  onSelectPillar,
  operationsSubTab = 'revenue',
  onSelectOperationsSubTab,
  accountingCoreSubTab = 'workbench',
  onSelectAccountingCoreSubTab,
  currentUser,
  currentRole,
  allUsers = [],
  onSwitchUser,
  onSignOut,
  pendingJournalsCount,
  exceptionsCount = 0,
  dbStatus,
  isDbConnected,
  onOpenDbStatusModal,
}) => {
  const isConnected = Boolean(dbStatus?.connected ?? isDbConnected);
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);

  const pillars: {
    id: PrimaryNavPillar;
    num: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | null;
    badgeColor?: 'rose' | 'amber';
  }[] = [
    { id: 'command-centre', num: '1', label: 'Command Centre', icon: LayoutDashboard },
    { id: 'operations', num: '2', label: 'Operations', icon: ArrowLeftRight },
    {
      id: 'accounting-core',
      num: '3',
      label: 'Accounting Core',
      icon: Layers,
      badge: pendingJournalsCount > 0 ? pendingJournalsCount : null,
      badgeColor: 'amber',
    },
    { id: 'reports', num: '4', label: 'Reports', icon: TrendingUp },
    { id: 'configuration', num: '5', label: 'Configuration', icon: Sliders },
    {
      id: 'controls-audit',
      num: '6',
      label: 'Controls & Audit',
      icon: ShieldAlert,
      badge: exceptionsCount > 0 ? exceptionsCount : null,
      badgeColor: 'rose',
    },
    { id: 'integrations', num: '7', label: 'Integrations', icon: Workflow },
    { id: 'administration', num: '8', label: 'Administration', icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md">
      {/* Primary Brand & Status Utility Bar */}
      <div className="border-b border-slate-800/80 px-4 lg:px-6">
        <div className="flex items-center justify-between h-14 max-w-7xl mx-auto">
          {/* Brand: AMG ATRIUM FINANCE / WOLF COMMAND */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => onSelectPillar('command-centre')}
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 font-extrabold tracking-wider font-mono text-xs shadow-inner shadow-emerald-950">
              AMG
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-100 tracking-tight text-sm uppercase">
                  AMG <span className="text-slate-500 font-normal">/</span> Atrium Finance <span className="text-slate-500 font-normal">/</span>{' '}
                  <span className="text-emerald-400">Wolf Command</span>
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 font-semibold">
                  USALI 12
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Autonomous Double-Entry Hotel Financial Operating System
              </p>
            </div>
          </div>

          {/* Right Status Controls */}
          <div className="flex items-center gap-2.5">
            <button
              id="btn-db-status"
              onClick={onOpenDbStatusModal}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border font-mono transition-colors ${
                isConnected
                  ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/40'
                  : 'bg-amber-950/50 text-amber-300 border-amber-800/60 hover:bg-amber-900/40'
              }`}
              title={isConnected ? 'Google Sheets Live Connected' : 'Google Sheets Disconnected'}
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Sheets DB:</span>
              {isConnected ? (
                <span className="flex items-center gap-1 font-semibold text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> Live
                </span>
              ) : (
                <span className="flex items-center gap-1 font-semibold text-amber-400">
                  <AlertCircle className="w-3 h-3" /> Sandbox
                </span>
              )}
            </button>

            {/* Dynamic RBAC User Profile Badge & Quick Persona Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 pl-2.5 pr-2 py-1 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-950/60 hover:bg-slate-850 transition-colors"
                title="Current authenticated user session"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold ring-1 ring-emerald-500/40">
                  {currentUser?.name?.charAt(0) || 'U'}
                </div>
                <div className="text-left leading-tight hidden sm:block">
                  <span className="block text-xs font-semibold text-slate-100 max-w-[110px] truncate">
                    {currentUser?.name || 'Authorized User'}
                  </span>
                  <span className="block text-[10px] text-emerald-400 font-mono max-w-[120px] truncate">
                    {currentRole?.name?.split('(')[0]?.trim() || 'Staff'}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
              </button>

              {/* Quick Persona Switcher Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 text-xs">
                  <div className="p-2 border-b border-slate-800 pb-2 mb-1.5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      Active User Session
                    </span>
                    <span className="font-bold text-slate-100 text-sm block">
                      {currentUser?.name}
                    </span>
                    <span className="text-[11px] text-emerald-400 font-mono block">
                      {currentRole?.name}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider px-2 block">
                      Switch Role Persona (Simulator):
                    </span>
                    {allUsers.map((user) => {
                      const isCurrent = user.id === currentUser?.id;
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            if (onSwitchUser) onSwitchUser(user.id);
                            setIsUserMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                            isCurrent
                              ? 'bg-emerald-950/70 border border-emerald-800/60 text-emerald-300 font-semibold'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="truncate">
                            <span className="block text-xs">{user.name}</span>
                            <span className="block text-[10px] text-slate-400 font-mono truncate">
                              {user.email}
                            </span>
                          </div>
                          {isCurrent && (
                            <span className="text-[10px] font-mono text-emerald-400 font-bold ml-1">
                              ACTIVE
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 mt-2 border-t border-slate-800 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectPillar('administration');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-center py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                    >
                      Manage Access in Administration →
                    </button>
                    {onSignOut && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onSignOut();
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded hover:bg-rose-950/60 text-rose-400 hover:text-rose-300 text-xs font-medium transition-colors border border-transparent hover:border-rose-900/50"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Keluar / Kunci Sesi</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Primary 8-Pillar Navigation Bar */}
      <div className="px-4 lg:px-6 bg-slate-950/60">
        <div className="max-w-7xl mx-auto overflow-x-auto no-scrollbar py-1">
          <nav className="flex items-center gap-1 min-w-max">
            {pillars.map((pillar) => {
              const Icon = pillar.icon;
              const isActive = activePillar === pillar.id;
              // Check if current user has permission to view this pillar
              const hasViewAccess = currentRole
                ? Boolean(currentRole.permissions?.[pillar.id]?.canView)
                : true;

              return (
                <button
                  key={pillar.id}
                  id={`nav-pillar-${pillar.id}`}
                  onClick={() => onSelectPillar(pillar.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all relative ${
                    isActive
                      ? 'bg-slate-800 text-emerald-300 border border-emerald-500/40 shadow-sm font-semibold'
                      : !hasViewAccess
                      ? 'text-slate-500 hover:text-slate-400 hover:bg-slate-900/60 opacity-70'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                  }`}
                  title={!hasViewAccess ? `Access to ${pillar.label} is restricted for your role (${currentRole?.name})` : undefined}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : !hasViewAccess ? 'text-slate-600' : 'text-slate-400'}`} />
                  <span className="font-mono text-[11px] text-slate-500 mr-0.5">{pillar.num}.</span>
                  <span>{pillar.label}</span>
                  {!hasViewAccess && (
                    <Lock className="w-3 h-3 text-amber-500/70 ml-0.5" />
                  )}
                  {pillar.badge ? (
                    <span
                      className={`ml-1 px-1.5 py-0.2 text-[10px] rounded-full font-mono border ${
                        pillar.badgeColor === 'rose'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {pillar.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Contextual Sub-Navigation Bar for Multi-View Pillars */}
      {activePillar === 'operations' && (
        <div className="px-4 lg:px-6 py-1.5 bg-slate-900/70 border-t border-slate-800/80">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mr-2">
                Operations Cycle:
              </span>
              <button
                onClick={() => onSelectOperationsSubTab && onSelectOperationsSubTab('revenue')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                  operationsSubTab === 'revenue'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Revenue Cycle (Sales &amp; PMS Ingestion)</span>
              </button>

              <button
                onClick={() => onSelectOperationsSubTab && onSelectOperationsSubTab('spending')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                  operationsSubTab === 'spending'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Spending Cycle (Procurement, AP &amp; Payroll)</span>
              </button>

              <button
                id="nav-operations-inventory"
                onClick={() => onSelectOperationsSubTab && onSelectOperationsSubTab('inventory')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                  operationsSubTab === 'inventory'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Package className="w-3.5 h-3.5 text-blue-400" />
                <span>Hotel Inventory &amp; Storerooms</span>
              </button>

              <button
                id="nav-operations-service-charge"
                onClick={() => onSelectOperationsSubTab && onSelectOperationsSubTab('service-charge')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                  operationsSubTab === 'service-charge'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>Staff Service Charge &amp; Gratuities Pool</span>
              </button>

              <button
                id="nav-operations-owner-pool"
                onClick={() => onSelectOperationsSubTab && onSelectOperationsSubTab('owner-pool')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                  operationsSubTab === 'owner-pool'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Owner Pool &amp; Return Distribution</span>
              </button>
            </div>
            <span className="text-[11px] font-mono text-slate-400 hidden md:block">
              Auto-generates balanced double-entry drafts
            </span>
          </div>
        </div>
      )}

      {activePillar === 'accounting-core' && (
        <div className="px-4 lg:px-6 py-1.5 bg-slate-900/70 border-t border-slate-800/80">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mr-2">
                Accounting Core:
              </span>
              <button
                onClick={() => onSelectAccountingCoreSubTab && onSelectAccountingCoreSubTab('workbench')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                  accountingCoreSubTab === 'workbench'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Journal Workbench</span>
                {pendingJournalsCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-slate-950 font-bold">
                    {pendingJournalsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => onSelectAccountingCoreSubTab && onSelectAccountingCoreSubTab('ledger')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                  accountingCoreSubTab === 'ledger'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>General Ledger</span>
              </button>

              <button
                onClick={() => onSelectAccountingCoreSubTab && onSelectAccountingCoreSubTab('trial-balance')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                  accountingCoreSubTab === 'trial-balance'
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Trial Balance</span>
              </button>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 hidden md:block">
              Rule 31 &amp; 32 Enforced: Balanced Proof
            </span>
          </div>
        </div>
      )}
    </header>
  );
};
