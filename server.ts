/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { store } from './server/store';

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();

  app.use(express.json());

  // Initialize store and attempt Google Sheets connection on boot
  store.init().catch((err) => {
    console.warn('Initial Google Sheets load notice:', err?.message || err);
  });

  // --- API ROUTES ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Google Sheets Connection Status
  app.get('/api/status', (req, res) => {
    const sheetStatus = store.sheetsClient.getStatus();
    res.json({
      connected: sheetStatus.connected,
      hasCredentials: sheetStatus.hasCredentials,
      spreadsheetId: sheetStatus.spreadsheetId,
      clientEmail: sheetStatus.clientEmail,
      initializedTabs: sheetStatus.initializedTabs,
      error: sheetStatus.error,
      systemSettings: store.systemSettings,
      storeStats: {
        accounts: store.accounts.size,
        departments: store.departments.size,
        journals: store.journalHeaders.size,
        revenueTransactions: store.revenueTransactions.size,
        spendingTransactions: store.spendingTransactions.size,
      },
    });
  });

  // Google Sheets Live Diagnostics
  app.get('/api/sheets/diagnostics', async (req, res) => {
    try {
      const diag = await store.sheetsClient.getDiagnostics();
      res.json(diag);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to run diagnostics' });
    }
  });

  // System Administration Settings (Hotel profile, Period locks, Currency)
  app.get('/api/admin/settings', (req, res) => {
    res.json(store.systemSettings);
  });

  app.post('/api/admin/settings', (req, res) => {
    try {
      store.systemSettings = {
        ...store.systemSettings,
        ...req.body,
      };
      res.json({ success: true, settings: store.systemSettings });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // PMS Night Audit Ingestion
  app.post('/api/integrations/pms-audit', async (req, res) => {
    try {
      const result = await store.ingestPmsNightAudit(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Re-initialize / Test Google Sheets connection
  app.post('/api/sheets/init', async (req, res) => {
    try {
      dotenv.config();
      store.sheetsClient = new (await import('./server/sheets')).GoogleSheetsClient();
      const connected = await store.sheetsClient.initialize();
      if (connected) {
        await store.loadFromSheets();
        if (store.accounts.size === 0) {
          await store.seedStandardHotelAccounts();
        }
      }
      res.json({ success: connected, status: store.sheetsClient.getStatus() });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to initialize Google Sheets' });
    }
  });

  // --- CHART OF ACCOUNTS & DEPARTMENTS ---

  app.get('/api/accounts', (req, res) => {
    res.json(store.getAccounts());
  });

  app.post('/api/accounts', async (req, res) => {
    try {
      const saved = await store.saveAccount(req.body);
      res.json(saved);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/accounts/deactivate', async (req, res) => {
    try {
      const { account_code } = req.body;
      const deactivated = await store.deactivateAccount(account_code);
      res.json(deactivated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/accounts/:code', async (req, res) => {
    try {
      await store.deleteAccount(req.params.code);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/accounts/seed-usali', async (req, res) => {
    try {
      await store.seedStandardHotelAccounts();
      res.json({
        success: true,
        accounts: store.getAccounts(),
        departments: store.getDepartments(),
        mappingConfig: store.mappingConfig,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/departments', (req, res) => {
    res.json(store.getDepartments());
  });

  app.post('/api/departments', async (req, res) => {
    try {
      const saved = await store.saveDepartment(req.body);
      res.json(saved);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- MAPPING CONFIGURATION ---

  app.get('/api/mapping', (req, res) => {
    res.json(store.mappingConfig);
  });

  app.post('/api/mapping', (req, res) => {
    store.mappingConfig = {
      ...store.mappingConfig,
      ...req.body,
      confirmed_by_controller: true,
    };
    res.json(store.mappingConfig);
  });

  // --- REPORT CONFIGURATION (FORMAT & STRUCTURE) ---

  app.get('/api/config/reports', (req, res) => {
    res.json(store.getReportConfig());
  });

  app.post('/api/config/reports', (req, res) => {
    try {
      const updated = store.updateReportConfig(req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/config/reports/reset', (req, res) => {
    try {
      const reset = store.resetReportConfig();
      res.json(reset);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- REVENUE CYCLE ---

  app.get('/api/revenue', (req, res) => {
    res.json(store.getRevenueTransactions());
  });

  app.post('/api/revenue', async (req, res) => {
    try {
      const result = await store.recordRevenueTransaction(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- SPENDING CYCLE ---

  app.get('/api/spending', (req, res) => {
    res.json(store.getSpendingTransactions());
  });

  app.post('/api/spending', async (req, res) => {
    try {
      const result = await store.recordSpendingTransaction(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- JOURNAL WORKBENCH & WORKFLOW ---

  app.get('/api/journals', (req, res) => {
    res.json(store.getJournals());
  });

  app.get('/api/journals/:id', (req, res) => {
    const journal = store.getJournalById(req.params.id);
    if (!journal) {
      return res.status(404).json({ error: 'Journal not found' });
    }
    res.json(journal);
  });

  // Create manual journal
  app.post('/api/journals', async (req, res) => {
    try {
      const { header, lines } = req.body;
      const journal = await store.createJournal(header, lines);
      res.json(journal);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Validate step
  app.post('/api/journals/:id/validate', async (req, res) => {
    try {
      const validated = await store.validateJournal(req.params.id);
      res.json(validated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Approve step
  app.post('/api/journals/:id/approve', async (req, res) => {
    try {
      const approver = req.body.approver || 'Zayen (Controller)';
      const approved = await store.approveJournal(req.params.id, approver);
      res.json(approved);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Post step (locks journal)
  app.post('/api/journals/:id/post', async (req, res) => {
    try {
      const posted = await store.postJournal(req.params.id);
      res.json(posted);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Reverse step (creates offsetting journal)
  app.post('/api/journals/:id/reverse', async (req, res) => {
    try {
      const { reversalDate } = req.body;
      const result = await store.reverseJournal(req.params.id, reversalDate);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Delete draft journal
  app.delete('/api/journals/:id', async (req, res) => {
    try {
      await store.deleteDraftJournal(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- GENERAL LEDGER ---

  app.get('/api/ledger', (req, res) => {
    const { account_code, period, start_date, end_date } = req.query;
    const ledger = store.getGeneralLedger({
      account_code: account_code ? String(account_code) : undefined,
      period: period ? String(period) : undefined,
      start_date: start_date ? String(start_date) : undefined,
      end_date: end_date ? String(end_date) : undefined,
    });
    res.json(ledger);
  });

  // --- TRIAL BALANCE ---

  app.get('/api/trial-balance', (req, res) => {
    const { period } = req.query;
    const tb = store.getTrialBalance(period ? String(period) : undefined);
    res.json(tb);
  });

  // --- DASHBOARD ---

  app.get('/api/dashboard', (req, res) => {
    const { period } = req.query;
    const metrics = store.getDashboardMetrics(period ? String(period) : undefined);
    res.json(metrics);
  });

  // --- REUSABLE REPORT ENGINE ROUTES ---

  // Financial Statements (Balance Sheet & Income Statement)
  app.get('/api/reports/financial-statements', (req, res) => {
    const { period } = req.query;
    const rep = store.getFinancialStatements(period ? String(period) : undefined);
    res.json(rep);
  });

  // USALI 12th Revised Edition Summary Operating Statement
  app.get('/api/reports/usali', (req, res) => {
    const { period } = req.query;
    const rep = store.getUsaliOperatingStatement(period ? String(period) : undefined);
    res.json(rep);
  });

  // Universal Drill-Down
  app.get('/api/reports/drilldown', (req, res) => {
    const { report_type, line_id, account_code, period } = req.query;
    const drilldown = store.getDrilldown({
      report_type: String(report_type || 'USALI'),
      line_id: line_id ? String(line_id) : undefined,
      account_code: account_code ? String(account_code) : undefined,
      period: period ? String(period) : undefined,
    });
    res.json(drilldown);
  });

  // Controls & Exceptions Audit
  app.get('/api/controls/exceptions', (req, res) => {
    const { period } = req.query;
    const exceptions = store.getControlExceptions(period ? String(period) : undefined);
    res.json(exceptions);
  });


  // --- VITE MIDDLEWARE / STATIC ASSETS ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Atrium Finance Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
