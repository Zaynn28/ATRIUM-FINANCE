import React from 'react';
import { RotateCw, Calendar, Building2, Printer, Eye } from 'lucide-react';
import { ReportExportButtons } from './ReportExportButtons';
import type { ReportExportFormat } from '../../utils/reportExport';

interface UniversalReportToolbarProps {
  reportTitle: string;
  reportSubtitle?: string;
  period: string;
  onPeriodChange: (period: string) => void;
  property?: string;
  onPropertyChange?: (property: string) => void;
  onRefresh: () => void;
  onExportCsv: () => void;
  onExportExcel: (format?: ReportExportFormat) => void;
  onPrint?: () => void;
  previewMode?: boolean;
  onTogglePreview?: () => void;
  loading?: boolean;
  extraControls?: React.ReactNode;
}

export const UniversalReportToolbar: React.FC<UniversalReportToolbarProps> = ({
  reportTitle, reportSubtitle, period, onPeriodChange,
  property = 'PT Atrium Management Group', onPropertyChange, onRefresh,
  onExportExcel, onPrint, previewMode = false, onTogglePreview,
  loading = false, extraControls,
}) => (
  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm backdrop-blur-sm print:hidden">
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <h2 className="text-lg font-bold text-slate-100 tracking-tight">{reportTitle}</h2>
        {reportSubtitle && <p className="text-xs text-slate-400 mt-0.5">{reportSubtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <select aria-label="Property" value={property} onChange={e => onPropertyChange?.(e.target.value)} className="bg-slate-900 text-slate-200 outline-none font-medium">
            <option>PT Atrium Management Group</option>
            <option>Atrium Suites Lombok</option>
            <option value="GGV Properties">GGV (Multi-Property)</option>
          </select>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <input aria-label="Accounting period" type="month" value={period} onChange={e => onPeriodChange(e.target.value)} className="bg-transparent text-slate-200 font-mono outline-none" />
          {period && <button onClick={() => onPeriodChange('')} className="text-slate-400 hover:text-slate-200">All</button>}
        </div>
        {extraControls}
        <button onClick={onRefresh} disabled={loading} title="Refresh report" className="p-2 rounded-lg bg-slate-800 text-slate-200 disabled:opacity-50">
          <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <ReportExportButtons onExport={onExportExcel} disabled={loading} />
        {onTogglePreview && <button onClick={onTogglePreview} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-slate-700 text-slate-300 hover:bg-slate-800">
          <Eye className="w-3.5 h-3.5" />{previewMode ? 'Screen View' : 'Print Preview'}
        </button>}
        <button onClick={() => onPrint ? onPrint() : window.dispatchEvent(new CustomEvent('atrium-open-print-preview'))} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-slate-700 text-slate-300 hover:bg-slate-800">
          <Printer className="w-3.5 h-3.5" />Print
        </button>
      </div>
    </div>
  </div>
);
