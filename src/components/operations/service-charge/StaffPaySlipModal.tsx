/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Printer, CheckCircle, ShieldCheck, Building2, User, Calendar, Award } from 'lucide-react';
import { ServiceChargeStaffAllocationLine, ServiceChargeDistributionCycle } from '../../../types';

interface StaffPaySlipModalProps {
  line: ServiceChargeStaffAllocationLine;
  cycle: ServiceChargeDistributionCycle;
  onClose: () => void;
}

export const StaffPaySlipModal: React.FC<StaffPaySlipModalProps> = ({ line, cycle, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden my-8 print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850 print:hidden">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
              Official Service Charge Distribution Slip
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Slip Content */}
        <div className="p-8 space-y-6 text-slate-200 print:text-black print:p-0">
          {/* Hotel & Document Branding */}
          <div className="flex items-start justify-between border-b border-slate-800 print:border-black pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-bold print:bg-transparent print:border-black print:text-black">
                  USALI 12 HOSPITALITY
                </span>
                <span className="text-xs text-slate-400 print:text-black">Fiduciary Trust Account 2030</span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-100 print:text-black mt-1">
                ATRIUM HOTEL &amp; RESORT BALI
              </h1>
              <p className="text-xs text-slate-400 print:text-black">
                Staff Service Charge &amp; Gratuities Pool Distribution Voucher
              </p>
            </div>
            <div className="text-right font-mono text-xs text-slate-400 print:text-black">
              <p className="font-bold text-slate-200 print:text-black">{cycle.cycle_id}</p>
              <p>Period: {cycle.period}</p>
              <p>Status: <span className="text-emerald-400 font-bold print:text-black">{cycle.status}</span></p>
            </div>
          </div>

          {/* Employee Summary Card */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800 print:bg-gray-50 print:border-gray-300 text-xs">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-400 print:text-black">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-slate-300 print:text-black">Employee Name:</span>
              </div>
              <p className="text-sm font-bold text-slate-100 print:text-black pl-5">{line.employee_name}</p>
              <p className="text-[11px] text-slate-400 print:text-black pl-5 font-mono">ID: {line.employee_id}</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-400 print:text-black">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-semibold text-slate-300 print:text-black">Department &amp; Position:</span>
              </div>
              <p className="text-sm font-bold text-slate-100 print:text-black pl-5">{line.job_title}</p>
              <p className="text-[11px] text-slate-400 print:text-black pl-5">Dept Code: {line.department_code}</p>
            </div>
          </div>

          {/* Points & Weighting Calculation Formula */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 print:text-black mb-3">
              Tranche &amp; Points Calculation Formula
            </h4>
            <div className="border border-slate-800 rounded-xl overflow-hidden print:border-gray-300 text-xs font-mono">
              <div className="grid grid-cols-4 bg-slate-800/80 print:bg-gray-200 p-2.5 font-bold text-slate-300 print:text-black border-b border-slate-800 print:border-gray-300">
                <span>Grade &amp; Base Pts</span>
                <span>Seniority Bonus</span>
                <span>Days Worked</span>
                <span className="text-right">Effective Points</span>
              </div>
              <div className="grid grid-cols-4 p-3 bg-slate-900/40 print:bg-white text-slate-200 print:text-black">
                <div>
                  <span className="font-bold text-emerald-400 print:text-black">{line.grade_level}</span>
                  <p className="text-[11px] text-slate-400 print:text-black">{line.base_points.toFixed(1)} pts</p>
                </div>
                <div>
                  <span className="font-semibold">+{line.seniority_bonus_pct}%</span>
                  <p className="text-[11px] text-slate-400 print:text-black">{line.years_of_service} yrs service</p>
                </div>
                <div>
                  <span>{line.days_worked} / {line.standard_calendar_days}</span>
                  <p className="text-[11px] text-slate-400 print:text-black">({(line.attendance_ratio * 100).toFixed(0)}% ratio)</p>
                </div>
                <div className="text-right font-bold text-emerald-300 text-sm print:text-black">
                  {line.effective_points.toFixed(2)} pts
                </div>
              </div>
            </div>
          </div>

          {/* Payout Financial Breakdown */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 print:bg-gray-100 print:border-gray-400 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-slate-300 print:text-black">
              <span>Point Value Rate ({cycle.period}):</span>
              <span className="font-bold">Rp {line.point_value_rate.toLocaleString()} / point</span>
            </div>
            <div className="flex justify-between text-slate-300 print:text-black">
              <span>Gross Service Charge ({line.effective_points.toFixed(2)} pts × Rp {line.point_value_rate.toLocaleString()}):</span>
              <span className="font-bold">Rp {line.gross_payout.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-rose-400 print:text-black border-b border-slate-800 print:border-gray-400 pb-2">
              <span>PPh 21 Withholding Tax ({line.tax_withholding_pct}%):</span>
              <span>- Rp {line.tax_withheld_amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-emerald-400 print:text-black pt-1">
              <span>NET PAYABLE DISBURSEMENT:</span>
              <span className="text-base">Rp {line.net_payout.toLocaleString()}</span>
            </div>
          </div>

          {/* Audit & Legal Reconciliation Statement */}
          <div className="text-[11px] text-slate-400 print:text-black leading-relaxed space-y-1">
            <p>
              • <strong>Fiduciary Notice:</strong> This distribution is disbursed from the dedicated Trust Liability Pool (Account 2030) accumulated from 10% guest folio charges in strict accordance with statutory labor agreements and USALI 12 guidelines.
            </p>
            {cycle.journal_id && (
              <p className="font-mono text-[10px] text-slate-500 print:text-black">
                Posted to General Ledger under Journal Voucher: <strong>{cycle.journal_id}</strong>
              </p>
            )}
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-12 pt-6 border-t border-slate-800 print:border-gray-400 text-xs">
            <div className="text-center space-y-12">
              <span className="text-slate-400 print:text-black">Prepared &amp; Verified By:</span>
              <div className="border-t border-slate-700 print:border-black pt-1">
                <p className="font-bold text-slate-200 print:text-black">Financial Controller</p>
                <p className="text-[10px] text-slate-400 print:text-black font-mono">Atrium Finance &amp; Accounting</p>
              </div>
            </div>
            <div className="text-center space-y-12">
              <span className="text-slate-400 print:text-black">Employee Acknowledgment:</span>
              <div className="border-t border-slate-700 print:border-black pt-1">
                <p className="font-bold text-slate-200 print:text-black">{line.employee_name}</p>
                <p className="text-[10px] text-slate-400 print:text-black font-mono">Date Received: {cycle.period}-28</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
