/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import {
  OwnerUnit,
  OwnerDistributionRuleConfig,
  OwnerDistributionBatch,
  OwnerPoolAllocationLine,
  OwnerPoolDashboardKPIs,
  OwnerPoolReconciliation,
  OwnerTaxTreatment,
} from '../src/types';
import { store as accountingStore } from './store';

const DATA_FILE = path.join(process.cwd(), 'data', 'owner_pool.json');

export const DEFAULT_RULE_CONFIG: OwnerDistributionRuleConfig = {
  config_id: 'CFG-DEFAULT-2024',
  effective_date: '2024-01-01',
  owner_pool_pct: 65.0,
  amg_allocation_pct: 35.0,
  guaranteed_return_rate_pct: 10.0,
  guaranteed_period_years: 3,
  guaranteed_return_basis: 'PURCHASE_PRICE_LESS_VAT',
  distribution_basis: 'UNIT_SQM',
  guarantee_difference_rule: 'FLAG_FOR_REVIEW',
  updated_at: '2024-01-01T00:00:00.000Z',
  updated_by: 'AMG Corporate Controller',
  revision_notes: 'Standard AMG Hotel Operation Owner Pool Configuration (65/35 Split, 10% Guaranteed Return for 3 Years on Net of VAT Basis)',
};

export class OwnerPoolStore {
  public units: Map<string, OwnerUnit> = new Map();
  public batches: Map<string, OwnerDistributionBatch> = new Map();
  public ruleConfig: OwnerDistributionRuleConfig = { ...DEFAULT_RULE_CONFIG };
  public ruleHistory: OwnerDistributionRuleConfig[] = [{ ...DEFAULT_RULE_CONFIG }];

  constructor() {
    this.init();
  }

  public init(): void {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (e) {
        console.warn('Could not create data directory:', e);
      }
    }

    if (fs.existsSync(DATA_FILE)) {
      try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);

        if (Array.isArray(parsed.units) && parsed.units.length > 0) {
          parsed.units.forEach((u: OwnerUnit) => this.units.set(u.unit_id, u));
        } else {
          this.seedUnits();
        }

        if (parsed.ruleConfig) {
          this.ruleConfig = parsed.ruleConfig;
        }
        if (Array.isArray(parsed.ruleHistory)) {
          this.ruleHistory = parsed.ruleHistory;
        }

        if (Array.isArray(parsed.batches)) {
          parsed.batches.forEach((b: OwnerDistributionBatch) => this.batches.set(b.batch_id, b));
        }
      } catch (err) {
        console.error('Failed to parse data/owner_pool.json, seeding defaults:', err);
        this.seedUnits();
      }
    } else {
      this.seedUnits();
    }
  }

  public saveToDisk(): void {
    try {
      const payload = {
        units: Array.from(this.units.values()),
        batches: Array.from(this.batches.values()),
        ruleConfig: this.ruleConfig,
        ruleHistory: this.ruleHistory,
        saved_at: new Date().toISOString(),
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving data/owner_pool.json:', err);
    }
  }

  // --- UNITS & OWNERS MASTER REGISTRY ---

  public getUnits(): OwnerUnit[] {
    return Array.from(this.units.values()).sort((a, b) => {
      if (a.floor_number !== b.floor_number) {
        return a.floor_number - b.floor_number;
      }
      return a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true });
    });
  }

  public getUnit(unitId: string): OwnerUnit | null {
    return this.units.get(unitId) || null;
  }

  public saveUnit(unitData: Partial<OwnerUnit> & { unit_number: string; owner_name: string; unit_sqm: number }): OwnerUnit {
    const unit_number = unitData.unit_number.trim();
    if (!unit_number) throw new Error('Unit number is required');
    if (!unitData.owner_name?.trim()) throw new Error('Owner name is required');
    if (!unitData.unit_sqm || unitData.unit_sqm <= 0) throw new Error('Unit SQM must be greater than zero');

    const floor_number = unitData.floor_number || parseInt(unit_number.substring(0, unit_number.length - 2), 10) || 3;
    const unit_id = unitData.unit_id || `UNIT-${unit_number.padStart(4, '0')}`;
    const existing = this.units.get(unit_id);

    const purchase_price = unitData.purchase_price !== undefined ? unitData.purchase_price : (existing?.purchase_price || 1500000000);
    const vat_amount = unitData.vat_amount !== undefined ? unitData.vat_amount : (existing?.vat_amount || Math.round(purchase_price * 0.1));

    const unit: OwnerUnit = {
      unit_id,
      unit_number,
      floor_number,
      unit_type: unitData.unit_type || existing?.unit_type || (unitData.unit_sqm < 40 ? 'Studio' : unitData.unit_sqm < 60 ? '1-Bedroom' : unitData.unit_sqm < 90 ? '2-Bedroom' : 'Penthouse Suite'),
      owner_id: unitData.owner_id || existing?.owner_id || `OWN-${Math.floor(100 + Math.random() * 900)}`,
      owner_name: unitData.owner_name.trim(),
      owner_email: unitData.owner_email || existing?.owner_email || '',
      owner_phone: unitData.owner_phone || existing?.owner_phone || '',
      unit_sqm: Math.round(unitData.unit_sqm * 100) / 100,
      purchase_price: Math.round(purchase_price),
      vat_amount: Math.round(vat_amount),
      contract_start_date: unitData.contract_start_date || existing?.contract_start_date || '2024-01-01',
      contract_end_date: unitData.contract_end_date || existing?.contract_end_date || '2034-01-01',
      ownership_status: unitData.ownership_status || existing?.ownership_status || 'Active',
      distribution_status: unitData.distribution_status || existing?.distribution_status || 'Eligible',
      tax_treatment: unitData.tax_treatment || existing?.tax_treatment || 'WHT_FINAL_10_PCT',
      tax_rate_pct: unitData.tax_rate_pct !== undefined ? unitData.tax_rate_pct : (unitData.tax_treatment === 'WHT_FINAL_10_PCT' ? 10.0 : unitData.tax_treatment === 'WHT_PPh23_2_PCT' ? 2.0 : unitData.tax_treatment === 'WHT_PPh23_NON_NPWP_4_PCT' ? 4.0 : unitData.tax_treatment === 'TAX_EXEMPT' ? 0 : undefined),
      bank_name: unitData.bank_name || existing?.bank_name || 'BCA',
      bank_account_number: unitData.bank_account_number || existing?.bank_account_number || '883-001928',
      bank_account_name: unitData.bank_account_name || existing?.bank_account_name || unitData.owner_name.trim(),
      notes: unitData.notes || existing?.notes || '',
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.units.set(unit_id, unit);
    this.saveToDisk();
    return unit;
  }

  public deleteUnit(unitId: string): { success: boolean } {
    if (!this.units.has(unitId)) {
      throw new Error(`Unit ${unitId} not found`);
    }
    this.units.delete(unitId);
    this.saveToDisk();
    return { success: true };
  }

  public getDynamicUnitsSummary(): {
    totalUnitsCount: number;
    activeUnitsCount: number;
    eligibleUnitsCount: number;
    totalEligibleSqm: number;
    distinctOwnersCount: number;
    averageSqm: number;
  } {
    const all = Array.from(this.units.values());
    const eligible = all.filter((u) => u.ownership_status === 'Active' && u.distribution_status === 'Eligible');
    const totalSqm = eligible.reduce((sum, u) => sum + (u.unit_sqm || 0), 0);
    const uniqueOwners = new Set(eligible.map((u) => u.owner_id));

    return {
      totalUnitsCount: all.length,
      activeUnitsCount: all.filter((u) => u.ownership_status === 'Active').length,
      eligibleUnitsCount: eligible.length,
      totalEligibleSqm: Math.round(totalSqm * 100) / 100,
      distinctOwnersCount: uniqueOwners.size,
      averageSqm: eligible.length > 0 ? Math.round((totalSqm / eligible.length) * 100) / 100 : 0,
    };
  }

  // --- CONFIGURATION & EFFECTIVE DATING ---

  public getRuleConfig(): OwnerDistributionRuleConfig {
    return this.ruleConfig;
  }

  public getRuleHistory(): OwnerDistributionRuleConfig[] {
    return this.ruleHistory;
  }

  public updateRuleConfig(newConfig: Partial<OwnerDistributionRuleConfig>, updatedBy: string = 'Financial Controller'): OwnerDistributionRuleConfig {
    const configId = `CFG-${Date.now().toString(36).toUpperCase()}`;
    const effectiveDate = newConfig.effective_date || new Date().toISOString().substring(0, 10);

    const ownerPoolPct = newConfig.owner_pool_pct !== undefined ? newConfig.owner_pool_pct : this.ruleConfig.owner_pool_pct;
    const amgAllocationPct = newConfig.amg_allocation_pct !== undefined ? newConfig.amg_allocation_pct : (100 - ownerPoolPct);

    if (Math.abs((ownerPoolPct + amgAllocationPct) - 100) > 0.001) {
      throw new Error(`Owner Pool % (${ownerPoolPct}%) + AMG Allocation % (${amgAllocationPct}%) must equal exactly 100%`);
    }

    const updated: OwnerDistributionRuleConfig = {
      config_id: configId,
      effective_date: effectiveDate,
      owner_pool_pct: ownerPoolPct,
      amg_allocation_pct: amgAllocationPct,
      guaranteed_return_rate_pct: newConfig.guaranteed_return_rate_pct !== undefined ? newConfig.guaranteed_return_rate_pct : this.ruleConfig.guaranteed_return_rate_pct,
      guaranteed_period_years: newConfig.guaranteed_period_years !== undefined ? newConfig.guaranteed_period_years : this.ruleConfig.guaranteed_period_years,
      guaranteed_return_basis: newConfig.guaranteed_return_basis || this.ruleConfig.guaranteed_return_basis,
      distribution_basis: 'UNIT_SQM',
      guarantee_difference_rule: newConfig.guarantee_difference_rule || this.ruleConfig.guarantee_difference_rule,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
      revision_notes: newConfig.revision_notes || `Policy configuration updated by ${updatedBy} (Effective: ${effectiveDate})`,
    };

    this.ruleConfig = updated;
    this.ruleHistory.unshift(updated);
    this.saveToDisk();
    return this.ruleConfig;
  }

  // --- AUTOMATIC MONTHLY DISTRIBUTION ENGINE ---

  public getBatches(): OwnerDistributionBatch[] {
    return Array.from(this.batches.values()).sort((a, b) => b.period.localeCompare(a.period));
  }

  public getBatch(batchId: string): OwnerDistributionBatch | null {
    return this.batches.get(batchId) || null;
  }

  /**
   * 14-Step Automatic Monthly Distribution Calculation:
   * 1. Retrieves posted eligible Room Revenue from Accounting Ledger (Account 4010 & 4020)
   * 2. Calculates Owner Pool (e.g. 65%)
   * 3. Calculates AMG Allocation (e.g. 35%)
   * 4. Retrieves eligible owners/units dynamically
   * 5. Retrieves each unit's SQM
   * 6. Calculates total eligible SQM
   * 7. Calculates each unit's distribution percentage (Unit SQM / Total Eligible SQM)
   * 8. Calculates each unit's Owner Pool allocation
   * 9. Automatically determines whether owner is within first 3 years of contract
   * 10. Calculates applicable guaranteed return (Purchase Price - VAT) * 10% / 12
   * 11. Calculates applicable tax withholding (PPh Final 4(2) 10% / PPh 23 / or requires config)
   * 12. Calculates net distribution
   * 13. Creates draft/calculated distribution batch
   * 14. Runs all 8 reconciliation checks
   */
  public calculateMonthlyDistribution(params: {
    period: string; // e.g. "2026-09"
    custom_room_revenue?: number; // Optional override if simulating
    title?: string;
    created_by?: string;
  }): OwnerDistributionBatch {
    const period = params.period;
    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      throw new Error('Valid period in YYYY-MM format is required');
    }

    // Step 1: Retrieve posted eligible Room Revenue from Accounting Store
    const postedRevData = accountingStore.getPostedRoomRevenue(period);
    const roomRevenueAmount = params.custom_room_revenue !== undefined
      ? params.custom_room_revenue
      : postedRevData.totalRoomRevenue;

    const isPosted = params.custom_room_revenue !== undefined ? true : (postedRevData.totalRoomRevenue > 0);

    // Step 2 & 3: Owner Pool & AMG Allocation
    const configSnapshot = { ...this.ruleConfig };
    const ownerPoolPct = configSnapshot.owner_pool_pct;
    const amgAllocationPct = configSnapshot.amg_allocation_pct;
    const ownerPoolAmount = Math.round(roomRevenueAmount * (ownerPoolPct / 100) * 100) / 100;
    const amgAllocationAmount = Math.round(roomRevenueAmount * (amgAllocationPct / 100) * 100) / 100;

    // Step 4, 5, 6: Dynamic eligible units & SQM
    const eligibleUnits = Array.from(this.units.values())
      .filter((u) => u.ownership_status === 'Active' && u.distribution_status === 'Eligible')
      .sort((a, b) => a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true }));

    const totalEligibleSqm = Math.round(
      eligibleUnits.reduce((sum, u) => sum + (u.unit_sqm || 0), 0) * 100
    ) / 100;

    if (totalEligibleSqm <= 0) {
      throw new Error('Total eligible SQM is 0. Cannot compute distribution.');
    }

    // Steps 7-12: Line-by-line calculations
    const lines: OwnerPoolAllocationLine[] = [];
    let totalPoolAllocations = 0;
    let totalGuaranteedReturns = 0;
    let totalGrossReturn = 0;
    let totalTaxWithholding = 0;
    let totalNetDistribution = 0;
    let totalShortfall = 0;
    let unitsWithShortfall = 0;
    let unitsWithSurplus = 0;

    const periodYear = parseInt(period.substring(0, 4), 10);
    const periodMonth = parseInt(period.substring(5, 7), 10);
    const periodEpochMonth = periodYear * 12 + (periodMonth - 1);

    for (const unit of eligibleUnits) {
      // Step 7: Allocation % based on exact SQM share
      const allocationPct = unit.unit_sqm / totalEligibleSqm;

      // Step 8: Pool-based allocation
      const poolAllocAmount = Math.round((ownerPoolAmount * (unit.unit_sqm / totalEligibleSqm)) * 100) / 100;
      totalPoolAllocations += poolAllocAmount;

      // Step 9 & 10: Guaranteed Return determination
      // Parse contract start date
      const contractStart = unit.contract_start_date || '2024-01-01';
      const startYear = parseInt(contractStart.substring(0, 4), 10) || 2024;
      const startMonth = parseInt(contractStart.substring(5, 7), 10) || 1;
      const startEpochMonth = startYear * 12 + (startMonth - 1);

      const monthsElapsed = periodEpochMonth - startEpochMonth;
      const contractYearNumber = Math.max(1, Math.floor(monthsElapsed / 12) + 1);
      const isWithinGuarantee = monthsElapsed >= 0 && monthsElapsed < (configSnapshot.guaranteed_period_years * 12);

      // Return basis: Purchase Price - VAT (or configurable)
      let returnBasisAmount = unit.purchase_price - unit.vat_amount;
      if (configSnapshot.guaranteed_return_basis === 'PURCHASE_PRICE') {
        returnBasisAmount = unit.purchase_price;
      }
      returnBasisAmount = Math.max(0, returnBasisAmount);

      const annualGuaranteed = Math.round(returnBasisAmount * (configSnapshot.guaranteed_return_rate_pct / 100) * 100) / 100;
      const monthlyGuaranteed = Math.round((annualGuaranteed / 12) * 100) / 100;
      totalGuaranteedReturns += monthlyGuaranteed;

      // Comparison
      const guaranteeDiff = Math.round((monthlyGuaranteed - poolAllocAmount) * 100) / 100;
      let diffFlag: 'NONE' | 'SHORTFALL' | 'SURPLUS' = 'NONE';
      let diffNote = 'Exact match.';

      if (isWithinGuarantee) {
        if (guaranteeDiff > 0.5) {
          diffFlag = 'SHORTFALL';
          unitsWithShortfall++;
          totalShortfall += guaranteeDiff;
          diffNote = 'Pool allocation is below 10% guarantee. Guarantee adjustment rule requires configuration.';
        } else if (guaranteeDiff < -0.5) {
          diffFlag = 'SURPLUS';
          unitsWithSurplus++;
          diffNote = 'Pool allocation exceeds 10% guarantee.';
        }
      }

      // Applicable Return & Rule Description
      let applicableReturnBasisType: 'GUARANTEED_RETURN' | 'POOL_ALLOCATION' = 'POOL_ALLOCATION';
      let grossReturnAmount = poolAllocAmount;
      let ruleAppliedDesc = '';

      if (isWithinGuarantee) {
        applicableReturnBasisType = 'GUARANTEED_RETURN';
        grossReturnAmount = monthlyGuaranteed;
        ruleAppliedDesc = `Contractual Guaranteed Return (10% Annualized, Year ${contractYearNumber} of ${configSnapshot.guaranteed_period_years} on Basis Rp${returnBasisAmount.toLocaleString()})`;
      } else {
        applicableReturnBasisType = 'POOL_ALLOCATION';
        grossReturnAmount = poolAllocAmount;
        ruleAppliedDesc = `SQM-Based Pool Allocation (${(allocationPct * 100).toFixed(4)}% of 65% Hotel Room Revenue, Contract Year ${contractYearNumber} - Post Guarantee)`;
      }

      totalGrossReturn += grossReturnAmount;

      // Step 11: Tax Withholding
      let taxRate = 0;
      let taxLabel = 'Unconfigured';
      let taxStatus: 'CONFIGURED' | 'REQUIRES_CONFIGURATION' = 'CONFIGURED';

      if (unit.tax_treatment === 'WHT_FINAL_10_PCT') {
        taxRate = 10.0;
        taxLabel = 'PPh Final Pasal 4(2) Sewa (10%)';
      } else if (unit.tax_treatment === 'WHT_PPh23_2_PCT') {
        taxRate = 2.0;
        taxLabel = 'PPh 23 Jasa Manajemen / Badan (2%)';
      } else if (unit.tax_treatment === 'WHT_PPh23_NON_NPWP_4_PCT') {
        taxRate = 4.0;
        taxLabel = 'PPh 23 Non-NPWP (4%)';
      } else if (unit.tax_treatment === 'TAX_EXEMPT') {
        taxRate = 0;
        taxLabel = 'Tax Exempt (0%)';
      } else {
        taxRate = 0;
        taxLabel = 'Tax treatment requires configuration';
        taxStatus = 'REQUIRES_CONFIGURATION';
      }

      const taxBase = grossReturnAmount;
      const taxWithheld = taxStatus === 'CONFIGURED' ? Math.round(taxBase * (taxRate / 100) * 100) / 100 : 0;
      totalTaxWithholding += taxWithheld;

      // Step 12: Net Distribution
      const netDistAmount = Math.round((grossReturnAmount - taxWithheld) * 100) / 100;
      totalNetDistribution += netDistAmount;

      lines.push({
        line_id: `OPL-${unit.unit_id}-${period.replace('-', '')}`,
        unit_id: unit.unit_id,
        unit_number: unit.unit_number,
        owner_id: unit.owner_id,
        owner_name: unit.owner_name,
        unit_sqm: unit.unit_sqm,
        allocation_pct: allocationPct,
        pool_allocation_amount: poolAllocAmount,
        purchase_price: unit.purchase_price,
        vat_amount: unit.vat_amount,
        return_basis_amount: returnBasisAmount,
        annual_guaranteed_return: annualGuaranteed,
        monthly_guaranteed_return: monthlyGuaranteed,
        contract_start_date: unit.contract_start_date,
        contract_end_date: unit.contract_end_date,
        is_within_guarantee_period: isWithinGuarantee,
        contract_year_number: contractYearNumber,
        applicable_return_basis_type: applicableReturnBasisType,
        gross_return_amount: grossReturnAmount,
        rule_applied_description: ruleAppliedDesc,
        guarantee_pool_difference: guaranteeDiff,
        difference_flag: diffFlag,
        difference_note: diffNote,
        tax_treatment: unit.tax_treatment,
        tax_type_label: taxLabel,
        tax_rate_pct: taxRate,
        tax_base_amount: taxBase,
        tax_withheld_amount: taxWithheld,
        tax_status: taxStatus,
        net_distribution_amount: netDistAmount,
        bank_name: unit.bank_name,
        bank_account_number: unit.bank_account_number,
        bank_account_name: unit.bank_account_name,
        status: 'CALCULATED',
      });
    }

    // Absorb any minor rounding residual on the last line so sumAlloc === ownerPoolAmount exactly to 0.00
    const preliminarySum = lines.reduce((s, l) => s + l.pool_allocation_amount, 0);
    const residual = Math.round((ownerPoolAmount - preliminarySum) * 100) / 100;
    if (Math.abs(residual) > 0 && lines.length > 0) {
      const lastLine = lines[lines.length - 1];
      lastLine.pool_allocation_amount = Math.round((lastLine.pool_allocation_amount + residual) * 100) / 100;
      if (lastLine.applicable_return_basis_type === 'POOL_ALLOCATION') {
        lastLine.gross_return_amount = lastLine.pool_allocation_amount;
        if (lastLine.tax_rate_pct > 0) {
          lastLine.tax_base_amount = lastLine.gross_return_amount;
          lastLine.tax_withheld_amount = Math.round(lastLine.tax_base_amount * (lastLine.tax_rate_pct / 100) * 100) / 100;
          lastLine.net_distribution_amount = Math.round((lastLine.gross_return_amount - lastLine.tax_withheld_amount) * 100) / 100;
        } else {
          lastLine.net_distribution_amount = lastLine.gross_return_amount;
        }
      }
    }

    // Step 14: Strict 8 Reconciliation Checks
    const check1Diff = Math.round(Math.abs((ownerPoolAmount + amgAllocationAmount) - roomRevenueAmount) * 100) / 100;
    const check1Pass = check1Diff < 0.05;

    const sumAlloc = lines.reduce((s, l) => s + l.pool_allocation_amount, 0);
    const check2Diff = Math.round(Math.abs(sumAlloc - ownerPoolAmount) * 100) / 100;
    const check2Pass = check2Diff < 0.05;

    const sumSqm = lines.reduce((s, l) => s + l.unit_sqm, 0);
    const check3Diff = Math.round(Math.abs(sumSqm - totalEligibleSqm) * 100) / 100;
    const check3Pass = check3Diff < 0.01;

    const sumGross = lines.reduce((s, l) => s + l.gross_return_amount, 0);
    const sumTax = lines.reduce((s, l) => s + l.tax_withheld_amount, 0);
    const sumNet = lines.reduce((s, l) => s + l.net_distribution_amount, 0);
    const check4Diff = Math.round(Math.abs((sumGross - sumTax) - sumNet) * 100) / 100;
    const check4Pass = check4Diff < 0.05;

    const check5Pass = lines.every((l) => l.owner_id && l.unit_id && l.unit_sqm > 0 && l.contract_start_date);
    const unitIds = lines.map((l) => l.unit_id);
    const check6Pass = new Set(unitIds).size === unitIds.length;
    const check7Pass = lines.every((l) => {
      const u = this.units.get(l.unit_id);
      return u && u.ownership_status === 'Active' && u.distribution_status === 'Eligible';
    });
    const check8Pass = isPosted;

    const discrepancies: string[] = [];
    if (!check1Pass) discrepancies.push(`Check 1 Failed: Owner Pool (Rp${ownerPoolAmount.toLocaleString()}) + AMG Allocation (Rp${amgAllocationAmount.toLocaleString()}) != Room Revenue (Rp${roomRevenueAmount.toLocaleString()}). Discrepancy: Rp${check1Diff}`);
    if (!check2Pass) discrepancies.push(`Check 2 Failed: Sum of Unit Allocations (Rp${sumAlloc.toLocaleString()}) != Distributable Pool (Rp${ownerPoolAmount.toLocaleString()}). Discrepancy: Rp${check2Diff}`);
    if (!check3Pass) discrepancies.push(`Check 3 Failed: Sum of Allocated SQM (${sumSqm} sqm) != Total Eligible SQM (${totalEligibleSqm} sqm). Discrepancy: ${check3Diff} sqm`);
    if (!check4Pass) discrepancies.push(`Check 4 Failed: Total Gross (Rp${sumGross.toLocaleString()}) - Tax Withheld (Rp${sumTax.toLocaleString()}) != Net Distribution (Rp${sumNet.toLocaleString()}). Discrepancy: Rp${check4Diff}`);
    if (!check5Pass) discrepancies.push('Check 5 Failed: One or more distribution recipients missing required contract, owner, or SQM data.');
    if (!check6Pass) discrepancies.push('Check 6 Failed: Duplicate unit numbers detected in batch.');
    if (!check7Pass) discrepancies.push('Check 7 Failed: Inactive or suspended ownership contract included in distribution.');
    if (!check8Pass) discrepancies.push('Check 8 Notice: Source Room Revenue is not yet posted to General Ledger for this period.');

    const isReconciled = check1Pass && check2Pass && check3Pass && check4Pass && check5Pass && check6Pass && check7Pass && check8Pass;

    const reconciliation: OwnerPoolReconciliation = {
      is_reconciled: isReconciled,
      check1_pool_plus_amg_equals_revenue: check1Pass,
      check1_diff: check1Diff,
      check2_allocations_sum_equals_pool: check2Pass,
      check2_diff: check2Diff,
      check3_sqm_sum_equals_total_sqm: check3Pass,
      check3_diff: check3Diff,
      check4_gross_minus_tax_equals_net: check4Pass,
      check4_diff: check4Diff,
      check5_all_recipients_valid: check5Pass,
      check6_no_duplicate_units: check6Pass,
      check7_no_inactive_contracts: check7Pass,
      check8_source_revenue_posted: check8Pass,
      discrepancy_messages: discrepancies,
    };

    const batchId = `ODB-${period}`;
    const batch: OwnerDistributionBatch = {
      batch_id: batchId,
      period,
      batch_title: params.title || `Owner Pool & Return Distribution Cycle - ${period}`,
      status: 'CALCULATED',
      room_revenue_amount: roomRevenueAmount,
      room_revenue_source_accounts: ['4010', '4020'],
      room_revenue_source_transactions_count: postedRevData.transactionsCount,
      is_source_revenue_posted: isPosted,
      applied_rule_config: configSnapshot,
      owner_pool_pct: ownerPoolPct,
      owner_pool_amount: ownerPoolAmount,
      amg_allocation_pct: amgAllocationPct,
      amg_allocation_amount: amgAllocationAmount,
      total_eligible_sqm: totalEligibleSqm,
      eligible_units_count: eligibleUnits.length,
      active_owners_count: new Set(eligibleUnits.map((u) => u.owner_id)).size,
      total_pool_allocations: Math.round(totalPoolAllocations * 100) / 100,
      total_guaranteed_returns: Math.round(totalGuaranteedReturns * 100) / 100,
      total_gross_return: Math.round(totalGrossReturn * 100) / 100,
      total_tax_withholding: Math.round(totalTaxWithholding * 100) / 100,
      total_net_distribution: Math.round(totalNetDistribution * 100) / 100,
      total_guarantee_shortfall: Math.round(totalShortfall * 100) / 100,
      units_with_shortfall_count: unitsWithShortfall,
      units_with_surplus_count: unitsWithSurplus,
      reconciliation,
      created_by: params.created_by || 'Financial Controller (Owner Pool Engine)',
      created_at: new Date().toISOString(),
      lines,
    };

    this.batches.set(batchId, batch);
    this.saveToDisk();
    return batch;
  }

  // --- WORKFLOW: REVIEW -> APPROVE -> POST ---

  public markBatchInReview(batchId: string): OwnerDistributionBatch {
    const batch = this.batches.get(batchId);
    if (!batch) throw new Error(`Batch ${batchId} not found`);
    if (batch.status === 'POSTED') throw new Error('Cannot edit a POSTED batch');

    batch.status = 'REVIEW';
    this.saveToDisk();
    return batch;
  }

  public approveBatch(batchId: string, approverName: string = 'Director of Finance'): OwnerDistributionBatch {
    const batch = this.batches.get(batchId);
    if (!batch) throw new Error(`Batch ${batchId} not found`);
    if (batch.status === 'POSTED') throw new Error('Cannot re-approve an already POSTED batch');

    batch.status = 'APPROVED';
    batch.approved_by = approverName;
    batch.approved_at = new Date().toISOString();

    for (const l of batch.lines) {
      l.status = 'APPROVED';
    }

    this.saveToDisk();
    return batch;
  }

  /**
   * Posts the distribution batch to General Ledger:
   * 1. Confirms reconciliation checks passed
   * 2. Generates balanced double-entry Journal:
   *    - Debit: Account 5030 (Owner Pool Return Distribution Allocation) = Total Gross Return
   *    - Credit: Account 2060 (Owner Return & Distribution Payable) = Total Net Distribution
   *    - Credit: Account 2070 (Tax Payable - Owner Withholding PPh Final 4(2)) = Total Tax Withheld
   * 3. Locks batch to POSTED status (immutable historical record)
   */
  public async postBatch(batchId: string, postedBy: string = 'Financial Controller'): Promise<OwnerDistributionBatch> {
    const batch = this.batches.get(batchId);
    if (!batch) throw new Error(`Batch ${batchId} not found`);
    if (batch.status === 'POSTED') return batch;

    // Check reconciliation
    if (!batch.reconciliation.is_reconciled) {
      throw new Error(
        `Cannot post batch ${batchId}: Reconciliation failed. Resolve discrepancies first: ${batch.reconciliation.discrepancy_messages.join('; ')}`
      );
    }

    accountingStore.ensureOwnerPoolAccounts();

    const journalId = `JRN-OPD-${batch.period.replace('-', '')}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const journalDate = `${batch.period}-28`;

    const gross = Math.round(batch.total_gross_return);
    const tax = Math.round(batch.total_tax_withholding);
    const net = Math.round(batch.total_net_distribution);

    // Double-entry balancing check: gross = net + tax
    const balancingDiff = gross - (net + tax);
    const adjustedNet = net + balancingDiff; // Absorb minor integer rounding into net liability

    const journalLines = [
      {
        account_code: '5030', // Owner Pool Return Distribution Allocation
        department_code: '100', // Rooms Department
        debit: gross,
        credit: 0,
        description: `Owner Pool Return Allocation (${batch.applied_rule_config.owner_pool_pct}% pool): ${batch.period} (${batch.eligible_units_count} Units)`,
      },
      {
        account_code: '2060', // Owner Return & Distribution Payable
        department_code: '100',
        debit: 0,
        credit: adjustedNet,
        description: `Net Owner Return Payable to Apartment Unit Owners: ${batch.period}`,
      },
    ];

    if (tax > 0) {
      journalLines.push({
        account_code: '2070', // Tax Payable - Owner Withholding
        department_code: '100',
        debit: 0,
        credit: tax,
        description: `Withholding Tax Payable - PPh Final 4(2) / PPh 23 on Owner Rental Returns: ${batch.period}`,
      });
    }

    // Create and auto-post the balanced journal
    await accountingStore.createJournal(
      {
        journal_id: journalId,
        journal_date: journalDate,
        period: batch.period,
        source_type: 'REVENUE',
        source_reference: batch.batch_id,
        created_by: postedBy,
      },
      journalLines
    );

    // Approve & post journal
    await accountingStore.postJournal(journalId, { autoApprove: true, approver: postedBy });

    batch.status = 'POSTED';
    batch.journal_id = journalId;
    batch.posted_by = postedBy;
    batch.posted_at = new Date().toISOString();

    for (const l of batch.lines) {
      l.status = 'POSTED';
    }

    this.saveToDisk();
    return batch;
  }

  /**
   * Reversal workflow (Never overwrites historical batch directly):
   * Creates an offsetting reversing journal and marks batch REVERSED.
   */
  public async reverseBatch(batchId: string, reversedBy: string, reason: string): Promise<OwnerDistributionBatch> {
    const batch = this.batches.get(batchId);
    if (!batch) throw new Error(`Batch ${batchId} not found`);
    if (batch.status !== 'POSTED') {
      throw new Error(`Only POSTED batches can be reversed. Current status: ${batch.status}`);
    }

    if (batch.journal_id) {
      const revJournalId = `REV-${batch.journal_id}`;
      const revDate = new Date().toISOString().substring(0, 10);
      const gross = Math.round(batch.total_gross_return);
      const tax = Math.round(batch.total_tax_withholding);
      const net = Math.round(batch.total_net_distribution);

      // Reversing lines: opposite debits and credits
      const lines = [
        {
          account_code: '5030',
          department_code: '100',
          debit: 0,
          credit: gross,
          description: `Reversal of Owner Pool Allocation: ${batch.period} (${reason})`,
        },
        {
          account_code: '2060',
          department_code: '100',
          debit: net,
          credit: 0,
          description: `Reversal of Net Owner Return Payable: ${batch.period} (${reason})`,
        },
      ];

      if (tax > 0) {
        lines.push({
          account_code: '2070',
          department_code: '100',
          debit: tax,
          credit: 0,
          description: `Reversal of Tax Withholding Payable: ${batch.period} (${reason})`,
        });
      }

      await accountingStore.createJournal(
        {
          journal_id: revJournalId,
          journal_date: revDate,
          period: revDate.substring(0, 7),
          source_type: 'REVERSAL',
          source_reference: batch.journal_id,
          reversal_of: batch.journal_id,
          created_by: reversedBy,
        },
        lines
      );

      await accountingStore.postJournal(revJournalId, { autoApprove: true, approver: reversedBy });
    }

    batch.status = 'REVERSED';
    batch.notes = `Batch reversed on ${new Date().toISOString()} by ${reversedBy}. Reason: ${reason}`;
    this.saveToDisk();
    return batch;
  }

  // --- OWNER STATEMENT QUERY ---

  public getOwnerStatement(unitId: string, period?: string): {
    unit: OwnerUnit | null;
    distributionLine: OwnerPoolAllocationLine | null;
    batch: OwnerDistributionBatch | null;
    historicalLines: { period: string; line: OwnerPoolAllocationLine; batchStatus: string }[];
  } {
    const unit = this.units.get(unitId) || null;
    if (!unit) {
      return { unit: null, distributionLine: null, batch: null, historicalLines: [] };
    }

    const historicalLines: { period: string; line: OwnerPoolAllocationLine; batchStatus: string }[] = [];
    let selectedLine: OwnerPoolAllocationLine | null = null;
    let selectedBatch: OwnerDistributionBatch | null = null;

    const sortedBatches = Array.from(this.batches.values()).sort((a, b) => b.period.localeCompare(a.period));

    for (const b of sortedBatches) {
      const line = b.lines.find((l) => l.unit_id === unitId);
      if (line) {
        historicalLines.push({
          period: b.period,
          line,
          batchStatus: b.status,
        });

        if (period && b.period === period) {
          selectedLine = line;
          selectedBatch = b;
        }
      }
    }

    // Default to newest if period not specified
    if (!selectedLine && historicalLines.length > 0) {
      selectedLine = historicalLines[0].line;
      selectedBatch = sortedBatches.find((b) => b.period === historicalLines[0].period) || null;
    }

    return {
      unit,
      distributionLine: selectedLine,
      batch: selectedBatch,
      historicalLines,
    };
  }

  // --- DASHBOARD KPIS ---

  public getDashboardKPIs(period: string = '2026-09'): OwnerPoolDashboardKPIs {
    const postedRev = accountingStore.getPostedRoomRevenue(period);
    const existingBatch = this.batches.get(`ODB-${period}`);

    const unitsSummary = this.getDynamicUnitsSummary();
    const config = this.ruleConfig;

    const roomRev = existingBatch ? existingBatch.room_revenue_amount : postedRev.totalRoomRevenue;
    const ownerPool = existingBatch ? existingBatch.owner_pool_amount : Math.round(roomRev * (config.owner_pool_pct / 100) * 100) / 100;
    const amgAlloc = existingBatch ? existingBatch.amg_allocation_amount : Math.round(roomRev * (config.amg_allocation_pct / 100) * 100) / 100;
    const grossReturn = existingBatch ? existingBatch.total_gross_return : 0;
    const taxWithholding = existingBatch ? existingBatch.total_tax_withholding : 0;
    const netDistribution = existingBatch ? existingBatch.total_net_distribution : 0;

    const unreconciledAmount = existingBatch
      ? (existingBatch.reconciliation.is_reconciled ? 0 : existingBatch.reconciliation.check1_diff + existingBatch.reconciliation.check2_diff)
      : 0;

    const isReconciled = existingBatch ? existingBatch.reconciliation.is_reconciled : (roomRev > 0);

    const allBatches = Array.from(this.batches.values());

    return {
      period,
      room_revenue: roomRev,
      owner_pool_amount: ownerPool,
      amg_allocation_amount: amgAlloc,
      eligible_units_count: existingBatch ? existingBatch.eligible_units_count : unitsSummary.eligibleUnitsCount,
      total_eligible_sqm: existingBatch ? existingBatch.total_eligible_sqm : unitsSummary.totalEligibleSqm,
      gross_owner_return: grossReturn,
      tax_withholding: taxWithholding,
      net_distribution: netDistribution,
      unreconciled_amount: unreconciledAmount,
      reconciliation_status: isReconciled ? 'RECONCILED' : 'REQUIRES_REVIEW',
      has_posted_data: roomRev > 0,
      active_batches_count: allBatches.filter((b) => b.status !== 'POSTED' && b.status !== 'REVERSED').length,
      posted_batches_count: allBatches.filter((b) => b.status === 'POSTED').length,
      current_batch_id: existingBatch?.batch_id,
      current_batch_status: existingBatch?.status,
    };
  }

  // --- SEEDING DYNAMIC REALISTIC APARTMENT UNITS ---

  private seedUnits(): void {
    // Generates realistic hotel apartment units across floors 3 to 12
    // Approximately 98 distinct units, dynamically stored, NOT hardcoded in calculation
    const ownersList = [
      { name: 'Ir. Hendra Gunawan', email: 'hendra.gunawan@investor.co.id', bank: 'BCA', tax: 'WHT_FINAL_10_PCT' as OwnerTaxTreatment },
      { name: 'Dr. Maya Kartika Dewi', email: 'maya.dewi@klinikmedika.com', bank: 'Mandiri', tax: 'WHT_FINAL_10_PCT' as OwnerTaxTreatment },
      { name: 'Bambang Sutrisno, SE', email: 'bambang.sutrisno@holding.id', bank: 'BCA', tax: 'WHT_FINAL_10_PCT' as OwnerTaxTreatment },
      { name: 'PT Surya Sentosa Investama', email: 'finance@suryasentosa.com', bank: 'BCA', tax: 'WHT_PPh23_2_PCT' as OwnerTaxTreatment },
      { name: 'Vivian Chen Li', email: 'vchen@singapore-holdings.sg', bank: 'DBS Indonesia', tax: 'WHT_FINAL_10_PCT' as OwnerTaxTreatment },
      { name: 'Agus Pratama & Siska Wardani', email: 'agus.pratama@gmail.com', bank: 'BNI', tax: 'WHT_FINAL_10_PCT' as OwnerTaxTreatment },
      { name: 'Kusuma Adiwidjaja', email: 'k.adiwidjaja@adifamily.com', bank: 'Mandiri', tax: 'WHT_FINAL_10_PCT' as OwnerTaxTreatment },
      { name: 'PT Bali Nusa Propertindo', email: 'acc@balinusa.co.id', bank: 'BCA', tax: 'WHT_PPh23_2_PCT' as OwnerTaxTreatment },
      { name: 'Jonathan & Rachel Miller', email: 'jmiller.bali@residences.com', bank: 'BCA', tax: 'WHT_FINAL_10_PCT' as OwnerTaxTreatment },
      { name: 'Dra. Endang Rahayu', email: 'endang.rahayu@consultant.id', bank: 'BRI', tax: 'NOT_CONFIGURED' as OwnerTaxTreatment },
      { name: 'Rudy Hartono Tanuwidjaja', email: 'rudy.hartono@tanugroup.id', bank: 'BCA', tax: 'WHT_FINAL_10_PCT' as OwnerTaxTreatment },
      { name: 'Stefan Lindqvist', email: 'stefan.l@nordic-invest.se', bank: 'Mandiri', tax: 'WHT_FINAL_10_PCT' as OwnerTaxTreatment },
    ];

    const unitTemplates = [
      { type: 'Studio' as const, baseSqm: 36.5, price: 1250000000 },
      { type: 'Studio' as const, baseSqm: 38.0, price: 1320000000 },
      { type: '1-Bedroom' as const, baseSqm: 48.5, price: 1750000000 },
      { type: '1-Bedroom' as const, baseSqm: 52.0, price: 1890000000 },
      { type: '2-Bedroom' as const, baseSqm: 68.5, price: 2550000000 },
      { type: '2-Bedroom' as const, baseSqm: 74.0, price: 2780000000 },
      { type: 'Penthouse Suite' as const, baseSqm: 108.5, price: 4200000000 },
    ];

    // Floors 3 to 12
    // Floors 3-11: 10 units per floor (301-310) = 90 units
    // Floor 12: 8 units (Penthouse suites 1201-1208) = 8 units
    // Total = 98 units
    let ownerIdx = 0;
    for (let floor = 3; floor <= 12; floor++) {
      const unitsOnFloor = floor === 12 ? 8 : 10;
      for (let u = 1; u <= unitsOnFloor; u++) {
        const unitNum = `${floor}${u.toString().padStart(2, '0')}`;
        const unitId = `UNIT-${unitNum.padStart(4, '0')}`;

        const template = floor === 12
          ? unitTemplates[6] // Penthouse
          : unitTemplates[(floor + u) % 6];

        const owner = ownersList[ownerIdx % ownersList.length];
        ownerIdx++;

        // Stagger contract start dates:
        // Floors 3-6: 2024-01-01 (Year 3 of contract in 2026 -> Within guarantee)
        // Floors 7-9: 2025-06-01 (Year 2 of contract in 2026 -> Within guarantee)
        // Floors 10-11: 2026-01-01 (Year 1 of contract in 2026 -> Within guarantee)
        // Floor 12 (Units 1201-1204): 2022-01-01 (Year 5 -> Post guarantee, demonstrates pure pool allocation!)
        let contractStart = '2024-01-01';
        if (floor >= 7 && floor <= 9) contractStart = '2025-06-01';
        if (floor >= 10 && floor <= 11) contractStart = '2026-01-01';
        if (floor === 12 && u <= 4) contractStart = '2022-01-01';

        const purchasePrice = template.price;
        const vatAmount = Math.round(purchasePrice * 0.1); // 10% VAT basis

        // Minor variation in SQM for realistic fractional values
        const sqmVariation = ((u % 5) - 2) * 0.25;
        const unitSqm = Math.round((template.baseSqm + sqmVariation) * 100) / 100;

        this.units.set(unitId, {
          unit_id: unitId,
          unit_number: unitNum,
          floor_number: floor,
          unit_type: template.type,
          owner_id: `OWN-${((ownerIdx % ownersList.length) + 1).toString().padStart(3, '0')}`,
          owner_name: owner.name,
          owner_email: owner.email,
          owner_phone: `+62 812-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
          unit_sqm: unitSqm,
          purchase_price: purchasePrice,
          vat_amount: vatAmount,
          contract_start_date: contractStart,
          contract_end_date: `${parseInt(contractStart.substring(0, 4), 10) + 10}-12-31`,
          ownership_status: 'Active',
          distribution_status: 'Eligible',
          tax_treatment: owner.tax,
          tax_rate_pct: owner.tax === 'WHT_FINAL_10_PCT' ? 10.0 : owner.tax === 'WHT_PPh23_2_PCT' ? 2.0 : owner.tax === 'TAX_EXEMPT' ? 0 : undefined,
          bank_name: owner.bank,
          bank_account_number: `${Math.floor(100 + Math.random() * 900)}-${Math.floor(100000 + Math.random() * 900000)}`,
          bank_account_name: owner.name.replace(/^(Ir\.|Dr\.|Dra\.|PT\s+)/, '').replace(/,?\s*(SE|Dewi).*$/, ''),
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        });
      }
    }

    this.saveToDisk();
  }
}

export const ownerPoolStore = new OwnerPoolStore();
