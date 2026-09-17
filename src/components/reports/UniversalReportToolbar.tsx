/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  RotateCw,
  Calendar,
  Building2,
  Download,
  Printer,
  ChevronDown,
  Layers,
  FileText,
  Table,
} from 'lucide-react';

interface UniversalReportToolbarProps {
  reportTitle: string;
  reportSubtitle?: string;
  period: string;
  onPeriodChange: (period: string) => void;
  property?: string;
  onPropertyChange?: (property: string) => void;
  onRefresh: () => void;
  onExportCsv: () => void;
  onPrint?: () => void;
  loading?: boolean;
  extraControls?: React.ReactNode;
}

export const UniversalReportToolbar: React.FC<UniversalReportToolbarProps> = ({
  reportTitle,
  reportSubtitle,
  period,
  onPeriodChange,
  property = 'Atrium Hotel & Resort',
  onPropertyChange,
  onRefresh,
  onExportCsv,
  onPrint,
  loading = false,
  extraControls,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm backdrop-blur-sm print:hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Title & Metadata */}
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-100 tracking-tight">{reportTitle}</h2>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-950/60 border border-emerald-800/40 text-emerald-300">
              POSTED LEDGER
            </span>
          </div>
          {reportSubtitle && (
            <p className="text-xs text-slate-400 mt-0.5">{reportSubtitle}</p>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Property Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={property}
              onChange={(e) => onPropertyChange && onPropertyChange(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer"
            >
              <option value="Atrium Hotel & Resort" className="bg-slate-900 text-slate-200">
                Atrium Hotel & Resort
              </option>
              <option value="GGV Properties" className="bg-slate-900 text-slate-200">
                GGV (Multi-Property)
              </option>
              <option value="Uma Blu" className="bg-slate-900 text-slate-200">
                Uma Blu (Multi-Property)
              </option>
            </select>
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="month"
              value={period}
              onChange={(e) => onPeriodChange(e.target.value)}
              className="bg-transparent text-slate-200 font-mono outline-none cursor-pointer"
              title="Filter by Accounting Period"
            />
            {period && (
              <button
                onClick={() => onPeriodChange('')}
                className="text-[11px] text-slate-400 hover:text-slate-200 font-medium ml-1"
                title="View All Periods"
              >
                All
              </button>
            )}
          </div>

          {extraControls}

          {/* Refresh */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
            title="Refresh from Posted Ledger"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showExportMenu && (
              <div
                className="absolute right-0 mt-1.5 w-44 rounded-lg bg-slate-900 border border-slate-800 shadow-xl py-1 z-30 text-xs"
                onMouseLeave={() => setShowExportMenu(false)}
              >
                <button
                  onClick={() => {
                    setShowExportMenu(false);
                    onExportCsv();
                  }}
                  className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                >
                  <Table className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => {
                    setShowExportMenu(false);
                    onExportCsv();
                  }}
                  className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>Export Excel Format</span>
                </button>
                <button
                  onClick={() => {
                    setShowExportMenu(false);
                    handlePrint();
                  }}
                  className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 flex items-center gap-2 border-t border-slate-800"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>Print to PDF</span>
                </button>
              </div>
            )}
          </div>

          {/* Print Direct */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
            title="Print Clean Report"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>
    </div>
  );
};
