/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Account,
  Department,
  JournalWithLines,
  RevenueTransaction,
  SpendingTransaction,
  MappingConfig,
  GeneralLedgerEntry,
  TrialBalanceReport,
  FinancialStatementsReport,
  UsaliStatementReport,
  DrilldownDetail,
  ControlException,
  MasterReportConfig,
  AccessControlState,
  SystemUser,
  UserRoleDefinition,
} from '../types';

export const api = {
  async getStatus() {
    const res = await fetch('/api/status');
    return res.json();
  },

  async reinitSheets() {
    const res = await fetch('/api/sheets/init', { method: 'POST' });
    return res.json();
  },

  async getAccounts(): Promise<Account[]> {
    const res = await fetch('/api/accounts');
    return res.json();
  },

  async saveAccount(account: Account): Promise<Account> {
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save account');
    }
    return res.json();
  },

  async deactivateAccount(code: string): Promise<Account> {
    const res = await fetch('/api/accounts/deactivate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_code: code }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to deactivate account');
    }
    return res.json();
  },

  async deleteAccount(code: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/accounts/${encodeURIComponent(code)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete account');
    }
    return res.json();
  },

  async seedUsaliAccounts(): Promise<any> {
    const res = await fetch('/api/accounts/seed-usali', { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to seed USALI accounts');
    }
    return res.json();
  },

  async getDepartments(): Promise<Department[]> {
    const res = await fetch('/api/departments');
    return res.json();
  },

  async saveDepartment(department: Department): Promise<Department> {
    const res = await fetch('/api/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(department),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save department');
    }
    return res.json();
  },

  async getMapping(): Promise<MappingConfig> {
    const res = await fetch('/api/mapping');
    return res.json();
  },

  async updateMapping(config: Partial<MappingConfig>): Promise<MappingConfig> {
    const res = await fetch('/api/mapping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return res.json();
  },

  async getRevenue(): Promise<RevenueTransaction[]> {
    const res = await fetch('/api/revenue');
    return res.json();
  },

  async recordRevenue(data: {
    date: string;
    source: 'Manual' | 'PMS';
    department_code: string;
    account_code: string;
    amount: number;
    description: string;
    debit_account_code?: string;
  }): Promise<{ transaction: RevenueTransaction; draftJournal: JournalWithLines }> {
    const res = await fetch('/api/revenue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to record revenue');
    }
    return res.json();
  },

  async getSpending(): Promise<SpendingTransaction[]> {
    const res = await fetch('/api/spending');
    return res.json();
  },

  async recordSpending(data: {
    date: string;
    type: 'Procurement' | 'Payroll' | 'Other';
    vendor_or_employee: string;
    department_code: string;
    account_code: string;
    amount: number;
    description: string;
    credit_account_code?: string;
  }): Promise<{ transaction: SpendingTransaction; draftJournal: JournalWithLines }> {
    const res = await fetch('/api/spending', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to record spending');
    }
    return res.json();
  },

  async getJournals(): Promise<JournalWithLines[]> {
    const res = await fetch('/api/journals');
    return res.json();
  },

  async getJournal(id: string): Promise<JournalWithLines> {
    const res = await fetch(`/api/journals/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Journal not found');
    return res.json();
  },

  async createJournal(data: {
    header: any;
    lines: any[];
  }): Promise<JournalWithLines> {
    const res = await fetch('/api/journals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create journal');
    }
    return res.json();
  },

  async validateJournal(id: string): Promise<JournalWithLines> {
    const res = await fetch(`/api/journals/${encodeURIComponent(id)}/validate`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to validate journal');
    }
    return res.json();
  },

  async approveJournal(id: string, approver?: string): Promise<JournalWithLines> {
    const res = await fetch(`/api/journals/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approver }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to approve journal');
    }
    return res.json();
  },

  async postJournal(id: string): Promise<JournalWithLines> {
    const res = await fetch(`/api/journals/${encodeURIComponent(id)}/post`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to post journal');
    }
    return res.json();
  },

  async reverseJournal(id: string, reversalDate?: string): Promise<any> {
    const res = await fetch(`/api/journals/${encodeURIComponent(id)}/reverse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reversalDate }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to reverse journal');
    }
    return res.json();
  },

  async deleteJournal(id: string): Promise<void> {
    const res = await fetch(`/api/journals/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete draft journal');
    }
  },

  async getLedger(params?: {
    account_code?: string;
    period?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<{
    account: Account | null;
    entries: GeneralLedgerEntry[];
    total_debit: number;
    total_credit: number;
    ending_balance: number;
  }> {
    const query = new URLSearchParams();
    if (params?.account_code) query.set('account_code', params.account_code);
    if (params?.period) query.set('period', params.period);
    if (params?.start_date) query.set('start_date', params.start_date);
    if (params?.end_date) query.set('end_date', params.end_date);

    const res = await fetch(`/api/ledger?${query.toString()}`);
    return res.json();
  },

  async getTrialBalance(period?: string): Promise<TrialBalanceReport> {
    const query = new URLSearchParams();
    if (period) query.set('period', period);
    const res = await fetch(`/api/trial-balance?${query.toString()}`);
    return res.json();
  },

  async getDashboard(period?: string): Promise<any> {
    const query = new URLSearchParams();
    if (period) query.set('period', period);
    const res = await fetch(`/api/dashboard?${query.toString()}`);
    return res.json();
  },

  async getFinancialStatements(period?: string): Promise<FinancialStatementsReport> {
    const query = new URLSearchParams();
    if (period) query.set('period', period);
    const res = await fetch(`/api/reports/financial-statements?${query.toString()}`);
    return res.json();
  },

  async getUsaliStatement(period?: string): Promise<UsaliStatementReport> {
    const query = new URLSearchParams();
    if (period) query.set('period', period);
    const res = await fetch(`/api/reports/usali?${query.toString()}`);
    return res.json();
  },

  async getDrilldown(params: {
    report_type: string;
    line_id?: string;
    account_code?: string;
    period?: string;
  }): Promise<DrilldownDetail> {
    const query = new URLSearchParams();
    query.set('report_type', params.report_type);
    if (params.line_id) query.set('line_id', params.line_id);
    if (params.account_code) query.set('account_code', params.account_code);
    if (params.period) query.set('period', params.period);
    const res = await fetch(`/api/reports/drilldown?${query.toString()}`);
    return res.json();
  },

  async getExceptions(period?: string): Promise<ControlException[]> {
    const query = new URLSearchParams();
    if (period) query.set('period', period);
    const res = await fetch(`/api/controls/exceptions?${query.toString()}`);
    return res.json();
  },

  async getAdminSettings(): Promise<any> {
    const res = await fetch('/api/admin/settings');
    return res.json();
  },

  async updateAdminSettings(settings: any): Promise<any> {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update admin settings');
    }
    return res.json();
  },

  async getSheetsDiagnostics(): Promise<any> {
    const res = await fetch('/api/sheets/diagnostics');
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch diagnostics');
    }
    return res.json();
  },

  async ingestPmsAudit(data: {
    date: string;
    room_revenue: number;
    fb_revenue: number;
    other_revenue?: number;
    description?: string;
  }): Promise<any> {
    const res = await fetch('/api/integrations/pms-audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to ingest PMS night audit');
    }
    return res.json();
  },

  async getReportConfig(): Promise<MasterReportConfig> {
    const res = await fetch('/api/config/reports');
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to load report configuration');
    }
    return res.json();
  },

  async updateReportConfig(config: Partial<MasterReportConfig>): Promise<MasterReportConfig> {
    const res = await fetch('/api/config/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update report configuration');
    }
    return res.json();
  },

  async resetReportConfig(): Promise<MasterReportConfig> {
    const res = await fetch('/api/config/reports/reset', {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to reset report configuration');
    }
    return res.json();
  },

  // --- ACCESS CONTROL & USER ROLE APIS ---
  async verifyUser(params: { email: string; password?: string; isGoogleOAuth?: boolean } | string): Promise<{ authorized: boolean; user: SystemUser; role: UserRoleDefinition; state: AccessControlState }> {
    const payload = typeof params === 'string' ? { email: params } : params;
    const res = await fetch('/api/auth/verify-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to authenticate user');
    }
    return res.json();
  },

  async getAccessControl(): Promise<AccessControlState> {
    const res = await fetch('/api/admin/access-control');
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to fetch access control state');
    }
    return res.json();
  },

  async switchActiveUser(userId: string): Promise<AccessControlState> {
    const res = await fetch('/api/admin/access-control/switch-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to switch active user');
    }
    return res.json();
  },

  async saveUser(user: Partial<SystemUser> & { name: string; email: string; roleId: string }): Promise<{ user: SystemUser; state: AccessControlState }> {
    const res = await fetch('/api/admin/access-control/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save user');
    }
    return res.json();
  },

  async deleteUser(userId: string): Promise<{ success: boolean; state: AccessControlState }> {
    const res = await fetch(`/api/admin/access-control/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete user');
    }
    return res.json();
  },

  async saveRole(role: UserRoleDefinition): Promise<{ role: UserRoleDefinition; state: AccessControlState }> {
    const res = await fetch('/api/admin/access-control/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(role),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save role');
    }
    return res.json();
  },

  async deleteRole(roleId: string): Promise<{ success: boolean; state: AccessControlState }> {
    const res = await fetch(`/api/admin/access-control/roles/${encodeURIComponent(roleId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete role');
    }
    return res.json();
  },

  async resetAccessControl(): Promise<AccessControlState> {
    const res = await fetch('/api/admin/access-control/reset', {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to reset access control');
    }
    return res.json();
  },
};

