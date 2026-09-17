/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  RotateCw,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  Filter,
} from 'lucide-react';
import { ControlException } from '../types';
import { api } from '../services/api';

interface ControlsAuditViewProps {
  onNavigateToTab?: (tab: string, context?: any) => void;
}

export const ControlsAuditView: React.FC<ControlsAuditViewProps> = ({ onNavigateToTab }) => {
  const [period, setPeriod] = useState<string>('');
  const [exceptions, setExceptions] = useState<ControlException[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const fetchExceptions = (selectedPeriod?: string) => {
    setLoading(true);
    api
      .getExceptions(selectedPeriod || undefined)
      .then((data) => {
        setExceptions(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch exceptions:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchExceptions(period);
  }, [period]);

  const highCount = exceptions.filter((e) => e.severity === 'HIGH').length;
  const mediumCount = exceptions.filter((e) => e.severity === 'MEDIUM').length;
  const lowCount = exceptions.filter((e) => e.severity === 'LOW').length;

  const filteredExceptions =
    filterSeverity === 'ALL'
      ? exceptions
      : exceptions.filter((e) => e.severity === filterSeverity);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-slate-100 tracking-tight">
                Controls & Audit Exceptions
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-950/60 border border-amber-800/40 text-amber-300">
                AUDIT INTEGRITY MONITOR
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Continuous integrity audit for unmapped accounts, missing departments, unposted drafts, and reconciliation gaps
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Period Selector */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="bg-transparent text-slate-200 font-mono outline-none cursor-pointer"
              />
              {period && (
                <button
                  onClick={() => setPeriod('')}
                  className="text-[11px] text-slate-400 hover:text-slate-200 font-medium ml-1"
                >
                  All
                </button>
              )}
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="bg-transparent text-slate-200 outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900">All Severities</option>
                <option value="HIGH" className="bg-slate-900">High Severity ({highCount})</option>
                <option value="MEDIUM" className="bg-slate-900">Medium Severity ({mediumCount})</option>
                <option value="LOW" className="bg-slate-900">Low Severity ({lowCount})</option>
              </select>
            </div>

            {/* Refresh */}
            <button
              onClick={() => fetchExceptions(period)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-lg font-medium transition-colors"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
              <span>Run Audit Scan</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400">Total Exceptions</div>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
            {exceptions.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Active ledger audit issues
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-rose-400">High Severity</div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
            {highCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Require immediate controller action
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-amber-400">Medium Severity</div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {mediumCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Unassigned departments / mappings
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-emerald-400">Audit Status</div>
          <div className="text-base font-bold text-emerald-300 mt-1 flex items-center gap-1.5">
            {highCount === 0 ? (
              <>
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Healthy</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <span>Exceptions Found</span>
              </>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Updated from live ledger
          </div>
        </div>
      </div>

      {/* Exception List Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider">
            Exception Log & Remediation Actions
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Showing {filteredExceptions.length} of {exceptions.length} items
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-mono uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Severity</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Code / ID</th>
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-4">Impact</th>
                <th className="py-2.5 px-4">Recommended Action</th>
                <th className="py-2.5 px-4 text-center">Resolve</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredExceptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                      <span className="text-sm font-medium text-slate-200">
                        No audit exceptions found for this period!
                      </span>
                      <span className="text-xs text-slate-500">
                        All posted journal lines, accounts, and departments are fully reconciled.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExceptions.map((ex) => (
                  <tr key={ex.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ex.severity === 'HIGH'
                            ? 'bg-rose-950/60 border border-rose-800/50 text-rose-300'
                            : ex.severity === 'MEDIUM'
                            ? 'bg-amber-950/60 border border-amber-800/50 text-amber-300'
                            : 'bg-blue-950/60 border border-blue-800/50 text-blue-300'
                        }`}
                      >
                        {ex.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-300">
                      {ex.category}
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-bold">
                      {ex.target_code || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-200 font-sans max-w-sm">
                      {ex.description}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-sans">
                      {ex.impact}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-sans">
                      {ex.recommended_action}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          if (onNavigateToTab) {
                            if (ex.category === 'DRAFT_APPROVAL') {
                              onNavigateToTab('workbench');
                            } else if (ex.category === 'UNMAPPED_ACCOUNT') {
                              onNavigateToTab('coa');
                            } else if (ex.category === 'UNASSIGNED_DEPT') {
                              onNavigateToTab('workbench');
                            } else {
                              onNavigateToTab('ledger');
                            }
                          }
                        }}
                        className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium font-sans"
                      >
                        <span>Fix</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
