/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
export type NormalBalance = 'Debit' | 'Credit';
export type ActiveStatus = 'Y' | 'N';

export interface Account {
  account_code: string;
  account_name: string;
  account_type: AccountType;
  normal_balance: NormalBalance;
  statutory_line: string;
  usali_line: string;
  active: ActiveStatus;
}

export interface Department {
  department_code: string;
  department_name: string;
  active: ActiveStatus;
}

export type JournalStatus = 'DRAFT' | 'VALIDATED' | 'APPROVED' | 'POSTED' | 'REVERSED';
export type SourceType = 'REVENUE' | 'SPENDING' | 'MANUAL' | 'REVERSAL';

export interface JournalHeader {
  journal_id: string;
  journal_date: string; // YYYY-MM-DD
  period: string; // YYYY-MM
  status: JournalStatus;
  source_type: SourceType;
  source_reference: string;
  created_by: string;
  approved_by: string;
  posted_at: string;
  reversal_of: string;
}

export interface JournalLine {
  journal_id: string;
  line_no: number;
  account_code: string;
  department_code: string;
  debit: number;
  credit: number;
  description: string;
}

export interface JournalWithLines extends JournalHeader {
  lines: JournalLine[];
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
}

export type RevenueSource = 'Manual' | 'PMS';

export interface RevenueTransaction {
  transaction_id: string;
  date: string;
  source: RevenueSource;
  department_code: string;
  account_code: string;
  amount: number;
  description: string;
  journal_id: string;
}

export type SpendingType = 'Procurement' | 'Payroll' | 'Other';

export interface SpendingTransaction {
  transaction_id: string;
  date: string;
  type: SpendingType;
  vendor_or_employee: string;
  department_code: string;
  account_code: string;
  amount: number;
  description: string;
  journal_id: string;
}

export interface MappingConfig {
  revenue_default_debit_account: string; // e.g. Cash in Transit / Guest Ledger (Asset)
  spending_procurement_credit_account: string; // e.g. Accounts Payable (Liability)
  spending_payroll_credit_account: string; // e.g. Accrued Payroll / Bank (Liability/Asset)
  spending_other_credit_account: string;
  confirmed_by_controller: boolean;
}

export const DEFAULT_MAPPING_CONFIG: MappingConfig = {
  revenue_default_debit_account: '',
  spending_procurement_credit_account: '',
  spending_payroll_credit_account: '',
  spending_other_credit_account: '',
  confirmed_by_controller: false,
};

export interface GeneralLedgerEntry {
  journal_id: string;
  journal_date: string;
  period: string;
  source_type: string;
  source_reference: string;
  department_code: string;
  description: string;
  debit: number;
  credit: number;
  running_balance: number;
}

export interface TrialBalanceItem {
  account_code: string;
  account_name: string;
  account_type: AccountType;
  normal_balance: NormalBalance;
  debit_sum: number;
  credit_sum: number;
  net_balance: number;
  net_debit: number;
  net_credit: number;
}

export interface TrialBalanceReport {
  period: string;
  items: TrialBalanceItem[];
  total_debits: number;
  total_credits: number;
  is_balanced: boolean;
  variance: number;
}

export interface DatabaseStatus {
  connected: boolean;
  type: 'google_sheets' | 'session_storage';
  spreadsheet_id?: string;
  service_account?: string;
  error?: string;
  tabs_initialized: string[];
}

export interface SystemSettings {
  property_name: string;
  room_count: number;
  base_currency: string;
  fiscal_year: string;
  period_lock_date: string; // e.g. '2026-08-31'
  controller_name: string;
}

export interface SheetsDiagnostics {
  connected: boolean;
  latency_ms: number;
  spreadsheet_title?: string;
  spreadsheet_id: string;
  tabs_verified: {
    tab_name: string;
    rows_count: number;
    has_headers: boolean;
  }[];
  checked_at: string;
}

export type MasterModule =
  | 'command-centre'
  | 'operations'
  | 'accounting-core'
  | 'reports'
  | 'configuration'
  | 'controls-audit'
  | 'integrations'
  | 'administration';

export interface ReportLineItem {
  line_id: string;
  label: string;
  amount: number;
  prior_amount?: number;
  account_codes: string[];
  is_subtotal?: boolean;
  is_header?: boolean;
  indent_level: number;
}

export type ReportNumberScale = 'full' | 'thousands' | 'millions';
export type NegativeNumberFormat = 'parentheses' | 'minus' | 'red';
export type ZeroValueFormat = 'dash' | 'zero' | 'blank';
export type ReportTableDensity = 'compact' | 'standard' | 'spacious';
export type ReportVisualTheme = 'slate' | 'classic' | 'emerald' | 'contrast';

export interface ReportFormattingSettings {
  currency_symbol: string;
  currency_code: string;
  currency_position: 'prefix' | 'suffix';
  decimal_places: number;
  number_scale: ReportNumberScale;
  negative_format: NegativeNumberFormat;
  zero_format: ZeroValueFormat;
  table_density: ReportTableDensity;
  visual_theme: ReportVisualTheme;
  show_account_codes: boolean;
  show_department_tags: boolean;
  show_variance_column: boolean;
  show_percent_of_revenue: boolean;
  double_underline_totals: boolean;
  show_signature_block: boolean;
  header_company_name: string;
  header_subtitle: string;
  footer_disclaimer: string;
}

export interface ConfigurableReportLine {
  id: string;
  label: string;
  category: string;
  account_prefixes: string[]; // e.g. ['40', '4010']
  indent_level: number;
  is_visible: boolean;
  is_bold: boolean;
  order: number;
}

export interface ConfigurableReportSection {
  section_id: string;
  section_title: string;
  is_visible: boolean;
  lines: ConfigurableReportLine[];
}

export interface ReportStructureConfig {
  usali_sections: ConfigurableReportSection[];
  balance_sheet_sections: ConfigurableReportSection[];
  income_statement_sections: ConfigurableReportSection[];
}

export interface MasterReportConfig {
  formatting: ReportFormattingSettings;
  structures: ReportStructureConfig;
  updated_at: string;
}

export const DEFAULT_MASTER_REPORT_CONFIG: MasterReportConfig = {
  formatting: {
    currency_symbol: 'Rp',
    currency_code: 'IDR',
    currency_position: 'prefix',
    decimal_places: 0,
    number_scale: 'full',
    negative_format: 'parentheses',
    zero_format: 'dash',
    table_density: 'standard',
    visual_theme: 'slate',
    show_account_codes: false,
    show_department_tags: true,
    show_variance_column: false,
    show_percent_of_revenue: true,
    double_underline_totals: true,
    show_signature_block: true,
    header_company_name: 'Atrium Hotel & Resort',
    header_subtitle: 'USALI 12th Revised Edition & Statutory Financial Reporting',
    footer_disclaimer: 'CONFIDENTIAL • Generated from strict double-entry posted journals. Zero variance verified.',
  },
  structures: {
    usali_sections: [
      {
        section_id: 'operating_revenue',
        section_title: 'Operating Revenue',
        is_visible: true,
        lines: [
          { id: 'USALI-REV-ROOMS', label: 'Rooms Revenue', category: 'Revenue', account_prefixes: ['40'], indent_level: 1, is_visible: true, is_bold: false, order: 1 },
          { id: 'USALI-REV-FB', label: 'Food & Beverage Revenue', category: 'Revenue', account_prefixes: ['41'], indent_level: 1, is_visible: true, is_bold: false, order: 2 },
          { id: 'USALI-REV-OTHER', label: 'Other Operated Departments', category: 'Revenue', account_prefixes: ['42'], indent_level: 1, is_visible: true, is_bold: false, order: 3 },
          { id: 'USALI-REV-MISC', label: 'Miscellaneous Income', category: 'Revenue', account_prefixes: ['49'], indent_level: 1, is_visible: true, is_bold: false, order: 4 },
        ],
      },
      {
        section_id: 'departmental_expenses',
        section_title: 'Departmental Expenses',
        is_visible: true,
        lines: [
          { id: 'USALI-EXP-ROOMS', label: 'Rooms Expenses', category: 'Expense', account_prefixes: ['60', '70'], indent_level: 1, is_visible: true, is_bold: false, order: 1 },
          { id: 'USALI-EXP-FB', label: 'Food & Beverage Expenses', category: 'Expense', account_prefixes: ['50', '61'], indent_level: 1, is_visible: true, is_bold: false, order: 2 },
          { id: 'USALI-EXP-OTHER', label: 'Other Operated Departments Expenses', category: 'Expense', account_prefixes: ['62'], indent_level: 1, is_visible: true, is_bold: false, order: 3 },
        ],
      },
      {
        section_id: 'undistributed_expenses',
        section_title: 'Undistributed Operating Expenses',
        is_visible: true,
        lines: [
          { id: 'USALI-UND-AG', label: 'Administrative & General (A&G)', category: 'Expense', account_prefixes: ['80'], indent_level: 1, is_visible: true, is_bold: false, order: 1 },
          { id: 'USALI-UND-POM', label: 'Property Operation & Maintenance (POM)', category: 'Expense', account_prefixes: ['85'], indent_level: 1, is_visible: true, is_bold: false, order: 2 },
          { id: 'USALI-UND-SM', label: 'Sales & Marketing', category: 'Expense', account_prefixes: ['90'], indent_level: 1, is_visible: true, is_bold: false, order: 3 },
          { id: 'USALI-UND-ENERGY', label: 'Energy, Water & Waste (Utilities)', category: 'Expense', account_prefixes: ['75'], indent_level: 1, is_visible: true, is_bold: false, order: 4 },
        ],
      },
      {
        section_id: 'management_fees',
        section_title: 'Management Fees',
        is_visible: true,
        lines: [
          { id: 'USALI-MGMT-FEES', label: 'Base & Incentive Management Fees', category: 'Expense', account_prefixes: ['88'], indent_level: 1, is_visible: true, is_bold: false, order: 1 },
        ],
      },
      {
        section_id: 'non_operating_expenses',
        section_title: 'Non-Operating Income & Expenses',
        is_visible: true,
        lines: [
          { id: 'USALI-NON-OP', label: 'Non-Operating Income & Expenses', category: 'Expense', account_prefixes: ['95'], indent_level: 1, is_visible: true, is_bold: false, order: 1 },
        ],
      },
    ],
    balance_sheet_sections: [
      {
        section_id: 'assets_current',
        section_title: 'Current Assets',
        is_visible: true,
        lines: [
          { id: 'BS-AST-CASH', label: 'Cash & Cash Equivalents', category: 'Asset', account_prefixes: ['1010'], indent_level: 1, is_visible: true, is_bold: false, order: 1 },
          { id: 'BS-AST-RECEIVABLES', label: 'Accounts Receivable & Guest Ledger', category: 'Asset', account_prefixes: ['1020', '1030'], indent_level: 1, is_visible: true, is_bold: false, order: 2 },
          { id: 'BS-AST-INVENTORY', label: 'Inventories & Operating Supplies', category: 'Asset', account_prefixes: ['1040'], indent_level: 1, is_visible: true, is_bold: false, order: 3 },
          { id: 'BS-AST-PREPAID', label: 'Prepaid Expenses & Security Deposits', category: 'Asset', account_prefixes: ['1050'], indent_level: 1, is_visible: true, is_bold: false, order: 4 },
        ],
      },
      {
        section_id: 'assets_noncurrent',
        section_title: 'Non-Current Assets & PPE',
        is_visible: true,
        lines: [
          { id: 'BS-AST-PPE', label: 'Property, Plant & Equipment', category: 'Asset', account_prefixes: ['1510'], indent_level: 1, is_visible: true, is_bold: false, order: 1 },
          { id: 'BS-AST-DEPR', label: 'Less: Accumulated Depreciation', category: 'Asset', account_prefixes: ['1520'], indent_level: 1, is_visible: true, is_bold: false, order: 2 },
        ],
      },
      {
        section_id: 'liabilities_current',
        section_title: 'Current Liabilities',
        is_visible: true,
        lines: [
          { id: 'BS-LIA-AP', label: 'Accounts Payable (Trade Payables)', category: 'Liability', account_prefixes: ['2010'], indent_level: 1, is_visible: true, is_bold: false, order: 1 },
          { id: 'BS-LIA-ACCRUED', label: 'Accrued Payroll & Operational Expenses', category: 'Liability', account_prefixes: ['2020', '2030'], indent_level: 1, is_visible: true, is_bold: false, order: 2 },
          { id: 'BS-LIA-TAX', label: 'Hotel & Sales Taxes Payable', category: 'Liability', account_prefixes: ['2040'], indent_level: 1, is_visible: true, is_bold: false, order: 3 },
        ],
      },
      {
        section_id: 'liabilities_longterm',
        section_title: 'Long-Term Liabilities',
        is_visible: true,
        lines: [
          { id: 'BS-LIA-DEBT', label: 'Long-Term Debt & Bank Borrowings', category: 'Liability', account_prefixes: ['2510'], indent_level: 1, is_visible: true, is_bold: false, order: 1 },
        ],
      },
      {
        section_id: 'equity_sections',
        section_title: "Owner's Equity & Retained Capital",
        is_visible: true,
        lines: [
          { id: 'BS-EQU-CAPITAL', label: 'Contributed Capital / Shareholder Capital', category: 'Equity', account_prefixes: ['3010'], indent_level: 1, is_visible: true, is_bold: false, order: 1 },
          { id: 'BS-EQU-RETAINED', label: 'Retained Earnings (Prior Periods)', category: 'Equity', account_prefixes: ['3020'], indent_level: 1, is_visible: true, is_bold: false, order: 2 },
        ],
      },
    ],
    income_statement_sections: [
      {
        section_id: 'is_revenue',
        section_title: 'Operating Revenue',
        is_visible: true,
        lines: [
          { id: 'IS-REV-ROOMS', label: 'Rooms Revenue', category: 'Revenue', account_prefixes: ['40'], indent_level: 1, is_visible: true, is_bold: false, order: 1 },
          { id: 'IS-REV-FB', label: 'Food & Beverage Revenue', category: 'Revenue', account_prefixes: ['41'], indent_level: 1, is_visible: true, is_bold: false, order: 2 },
          { id: 'IS-REV-OTHER', label: 'Other Operating Revenue', category: 'Revenue', account_prefixes: ['42', '49'], indent_level: 1, is_visible: true, is_bold: false, order: 3 },
        ],
      },
      {
        section_id: 'is_cost_of_sales',
        section_title: 'Cost of Sales (COGS)',
        is_visible: true,
        lines: [
          { id: 'IS-COS-FB', label: 'Food & Beverage Cost of Sales', category: 'Expense', account_prefixes: ['50'], indent_level: 1, is_visible: true, is_bold: false, order: 1 },
          { id: 'IS-COS-OTHER', label: 'Other Department Direct Costs', category: 'Expense', account_prefixes: ['51'], indent_level: 1, is_visible: true, is_bold: false, order: 2 },
        ],
      },
      {
        section_id: 'is_operating_expenses',
        section_title: 'Operating Expenses',
        is_visible: true,
        lines: [
          { id: 'IS-EXP-ROOMS', label: 'Rooms Department Operating Expenses', category: 'Expense', account_prefixes: ['60', '70'], indent_level: 1, is_visible: true, is_bold: false, order: 1 },
          { id: 'IS-EXP-FB', label: 'Food & Beverage Operating Expenses', category: 'Expense', account_prefixes: ['61'], indent_level: 1, is_visible: true, is_bold: false, order: 2 },
          { id: 'IS-EXP-AG', label: 'Administrative & General Expenses', category: 'Expense', account_prefixes: ['80'], indent_level: 1, is_visible: true, is_bold: false, order: 3 },
          { id: 'IS-EXP-POM', label: 'Property Operation & Maintenance', category: 'Expense', account_prefixes: ['85'], indent_level: 1, is_visible: true, is_bold: false, order: 4 },
          { id: 'IS-EXP-SM', label: 'Sales & Marketing Expenses', category: 'Expense', account_prefixes: ['90'], indent_level: 1, is_visible: true, is_bold: false, order: 5 },
          { id: 'IS-EXP-UTILITIES', label: 'Utilities & Energy Costs', category: 'Expense', account_prefixes: ['75'], indent_level: 1, is_visible: true, is_bold: false, order: 6 },
        ],
      },
    ],
  },
  updated_at: new Date().toISOString(),
};

export interface FinancialStatementsReport {
  period: string;
  property_name: string;
  currency: string;
  formatting?: ReportFormattingSettings;
  balance_sheet: {
    assets: ReportLineItem[];
    total_assets: number;
    liabilities: ReportLineItem[];
    total_liabilities: number;
    equity: ReportLineItem[];
    total_equity: number;
    total_liabilities_and_equity: number;
    is_balanced: boolean;
    variance: number;
  };
  income_statement: {
    operating_revenue: ReportLineItem[];
    total_operating_revenue: number;
    cost_of_sales: ReportLineItem[];
    total_cost_of_sales: number;
    gross_profit: number;
    operating_expenses: ReportLineItem[];
    total_operating_expenses: number;
    net_operating_income: number;
  };
}

export interface UsaliStatementReport {
  period: string;
  property_name: string;
  currency: string;
  formatting?: ReportFormattingSettings;
  operating_revenue: ReportLineItem[];
  total_operating_revenue: number;
  departmental_expenses: ReportLineItem[];
  total_departmental_expenses: number;
  total_departmental_profit: number;
  undistributed_operating_expenses: ReportLineItem[];
  total_undistributed_expenses: number;
  gross_operating_profit: number; // GOP
  management_fees: ReportLineItem[];
  total_management_fees: number;
  income_before_non_operating: number;
  non_operating_expenses: ReportLineItem[];
  total_non_operating_expenses: number;
  ebitda: number;
  schedules_summary: {
    rooms_revenue: number;
    rooms_expense: number;
    rooms_profit: number;
    fb_revenue: number;
    fb_expense: number;
    fb_profit: number;
    ag_expense: number;
    pom_expense: number;
    sm_expense: number;
    energy_expense: number;
  };
  reconciliation: {
    posted_revenue_total: number;
    posted_expense_total: number;
    report_revenue_total: number;
    report_expense_total: number;
    variance: number;
    is_reconciled: boolean;
  };
}

export interface DrilldownJournalLine {
  journal_id: string;
  journal_date: string;
  period: string;
  source_type: string;
  source_reference: string;
  created_by: string;
  approved_by: string;
  posted_at: string;
  account_code: string;
  department_code: string;
  debit: number;
  credit: number;
  net_amount: number;
  description: string;
  source_transaction?: {
    type: string;
    id: string;
    date: string;
    description: string;
    vendor_or_guest: string;
    department: string;
    amount: number;
  } | null;
  voucher?: {
    attached: boolean;
    document_type?: string;
    reference_number?: string;
    notes?: string;
  };
}

export interface DrilldownAccountSummary {
  account_code: string;
  account_name: string;
  account_type: string;
  balance: number;
  lines_count: number;
}

export interface DrilldownDetail {
  report_type: string;
  line_id: string;
  line_label: string;
  period: string;
  line_total: number;
  accounts: DrilldownAccountSummary[];
  journal_lines: DrilldownJournalLine[];
}

export interface ControlException {
  id: string;
  category: 'UNMAPPED_ACCOUNT' | 'UNASSIGNED_DEPARTMENT' | 'DRAFT_PENDING' | 'MISSING_SOURCE' | 'MISSING_VOUCHER' | 'RECONCILIATION_VARIANCE';
  severity: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  account_code?: string;
  journal_id?: string;
  posted_amount?: number;
  action_label: string;
  action_target: string;
}

export type PrimaryNavPillar =
  | 'command-centre'
  | 'operations'
  | 'accounting-core'
  | 'reports'
  | 'configuration'
  | 'controls-audit'
  | 'integrations'
  | 'administration';


