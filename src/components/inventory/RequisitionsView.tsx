/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  CheckCircle2,
  Trash2,
  X,
  ExternalLink,
  Building,
  User,
  Warehouse,
  AlertCircle,
  PackageCheck,
  RefreshCw,
  FileText,
  ShoppingCart,
  Split,
} from 'lucide-react';
import {
  DepartmentRequisition,
  InventoryItem,
  InventoryStoreroom,
  Department,
} from '../../types';
import { api } from '../../services/api';

interface RequisitionsViewProps {
  departments: Department[];
  onViewJournal?: (journalId: string) => void;
  onCreatePo?: (requisitionId: string) => void;
}

export const RequisitionsView: React.FC<RequisitionsViewProps> = ({
  departments,
  onViewJournal,
  onCreatePo,
}) => {
  const [requisitions, setRequisitions] = useState<DepartmentRequisition[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [storerooms, setStorerooms] = useState<InventoryStoreroom[]>([]);
  const [loading, setLoading] = useState(true);

  // New Requisition Form
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [reqDept, setReqDept] = useState('F&B');
  const [requesterName, setRequesterName] = useState('Chef Agus Santoso');
  const [targetStoreroom, setTargetStoreroom] = useState('CSR-01');
  const [notes, setNotes] = useState('Daily prep replenishment for banqueting.');
  const [createLines, setCreateLines] = useState<{ item_id: string; requested_quantity: number }[]>([
    { item_id: '', requested_quantity: 5 },
  ]);

  // Approval Modal State
  const [approvingReq, setApprovingReq] = useState<DepartmentRequisition | null>(null);
  const [approverName, setApproverName] = useState('Head Chef Wayan Sudarma');
  const [approvedQtys, setApprovedQtys] = useState<Record<string, number>>({});

  // Issuing State
  const [issuingReq, setIssuingReq] = useState<DepartmentRequisition | null>(null);
  const [issuerName, setIssuerName] = useState('Budi Raharjo (Central Storekeeper)');

  const [notification, setNotification] = useState<{ text: string; journalId?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reqs, itemList, rooms] = await Promise.all([
        api.getRequisitions(),
        api.getInventoryItems(),
        api.getInventoryStorerooms(),
      ]);
      setRequisitions(reqs);
      setItems(itemList);
      setStorerooms(rooms);
      if (itemList.length > 0 && !createLines[0]?.item_id) {
        setCreateLines([{ item_id: itemList[0].item_id, requested_quantity: 5 }]);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddCreateLine = () => {
    setCreateLines([...createLines, { item_id: items[0]?.item_id || '', requested_quantity: 1 }]);
  };

  const handleRemoveCreateLine = (index: number) => {
    if (createLines.length === 1) return;
    setCreateLines(createLines.filter((_, i) => i !== index));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotification(null);

    for (const l of createLines) {
      if (!l.item_id || l.requested_quantity <= 0) {
        setError('Please enter valid items and quantities.');
        return;
      }
    }

    setSubmitting(true);
    try {
      await api.createRequisition({
        date: new Date().toISOString().split('T')[0],
        department_code: reqDept,
        requester_name: requesterName,
        storeroom_id: targetStoreroom,
        items: createLines,
        notes,
      });

      setNotification({ text: 'Requisition submitted successfully. Status: PENDING_APPROVAL.' });
      setIsCreateOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create requisition');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenApproveModal = (req: DepartmentRequisition) => {
    setApprovingReq(req);
    const qtys: Record<string, number> = {};
    req.items.forEach((it) => {
      qtys[it.item_id] = it.requested_quantity;
    });
    setApprovedQtys(qtys);
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingReq) return;

    setSubmitting(true);
    try {
      const payload = Object.entries(approvedQtys).map(([item_id, approved_quantity]) => ({
        item_id,
        approved_quantity: Number(approved_quantity),
      }));

      await api.approveRequisition(approvingReq.requisition_id, approverName, payload);
      setNotification({ text: `Requisition #${approvingReq.requisition_id} approved! Ready for store issue.` });
      setApprovingReq(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to approve requisition');
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issuingReq) return;

    setSubmitting(true);
    try {
      const result = await api.issueRequisition(issuingReq.requisition_id, issuerName);
      setNotification({
        text: `Requisition #${issuingReq.requisition_id} fully issued! Inventory decremented and GL cost journal recorded.`,
        journalId: result.journal_id,
      });
      setIssuingReq(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to issue requisition');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-purple-400" />
            <span>Department Requisitions & Stock Issuance Workflow</span>
          </h3>
          <p className="text-xs text-slate-400">
            Departments submit material requisitions, heads approve, and storerooms issue stock with automated cost accounting.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-purple-950 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Requisition</span>
        </button>
      </div>

      {/* Notifications */}
      {notification && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-emerald-300">
            <CheckCircle2 className="w-4 h-4" />
            <span>{notification.text}</span>
          </div>
          {notification.journalId && onViewJournal && (
            <div className="flex items-center gap-2">
              <span className="text-slate-300">Double-Entry Journal:</span>
              <button
                onClick={() => onViewJournal(notification.journalId!)}
                className="px-2 py-0.5 bg-emerald-600/30 text-emerald-300 rounded font-mono font-bold flex items-center gap-1"
              >
                <span>{notification.journalId}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Requisitions List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Req #</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Requester</th>
                <th className="px-4 py-3">Source Storeroom</th>
                <th className="px-4 py-3 text-right">Items</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Approval / Issuer</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {requisitions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500 font-mono">
                    No department requisitions on record.
                  </td>
                </tr>
              ) : (
                requisitions.map((req) => (
                  <tr key={req.requisition_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-purple-400">
                      {req.requisition_number}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">{req.date}</td>
                    <td className="px-4 py-3 font-semibold text-white">{req.department_code}</td>
                    <td className="px-4 py-3 text-slate-300">{req.requester_name}</td>
                    <td className="px-4 py-3 font-mono text-slate-400">{req.storeroom_id}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium">
                      {req.items.reduce((s, i) => s + (i.issued_quantity || i.requested_quantity), 0)} units (
                      {req.items.length} SKUs)
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          req.status === 'ISSUED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : req.status === 'APPROVED'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : req.status === 'PARTIALLY_ORDERED'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : req.status === 'ORDERED'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : req.status === 'PENDING_APPROVAL'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-400">
                      {req.approved_by ? `Appr: ${req.approved_by}` : 'Awaiting Dept Head'}
                      {req.issued_by ? ` • Issued: ${req.issued_by}` : ''}
                      {req.linked_po_ids && req.linked_po_ids.length > 0 && (
                        <div className="text-[10px] text-purple-400 font-mono mt-0.5 flex items-center gap-1">
                          <ShoppingCart className="w-3 h-3" />
                          <span>{req.linked_po_ids.length} PO(s) Linked</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {req.status === 'PENDING_APPROVAL' && (
                          <button
                            onClick={() => handleOpenApproveModal(req)}
                            className="px-2.5 py-1 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 text-[11px] font-semibold"
                          >
                            Approve
                          </button>
                        )}

                        {(req.status === 'APPROVED' || req.status === 'PARTIALLY_ORDERED') && onCreatePo && (
                          <button
                            onClick={() => onCreatePo(req.requisition_id)}
                            title="Generate Purchase Order to Supplier (supports multi-supplier split)"
                            className="px-2.5 py-1 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 text-[11px] font-semibold flex items-center gap-1"
                          >
                            <ShoppingCart className="w-3 h-3 text-blue-400" />
                            <span>Create PO</span>
                          </button>
                        )}

                        {req.status === 'APPROVED' && (
                          <button
                            onClick={() => setIssuingReq(req)}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow-sm"
                          >
                            <PackageCheck className="w-3 h-3" />
                            <span>Issue Stock</span>
                          </button>
                        )}

                        {req.journal_id && onViewJournal && (
                          <button
                            onClick={() => onViewJournal(req.journal_id!)}
                            title="View Journal in Workbench"
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Requisition */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-purple-400" />
                <span>Submit Department Stock Requisition</span>
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-mono text-slate-400 block mb-1">Requesting Dept</label>
                  <select
                    value={reqDept}
                    onChange={(e) => setReqDept(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                  >
                    {departments.map((d) => (
                      <option key={d.department_code} value={d.department_code}>
                        {d.department_code} - {d.department_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-mono text-slate-400 block mb-1">Requester Name</label>
                  <input
                    type="text"
                    required
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="font-mono text-slate-400 block mb-1">Target Storeroom</label>
                  <select
                    value={targetStoreroom}
                    onChange={(e) => setTargetStoreroom(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono"
                  >
                    {storerooms.map((s) => (
                      <option key={s.storeroom_id} value={s.storeroom_id}>
                        {s.storeroom_id} - {s.storeroom_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono uppercase text-slate-400">Requisition Items</span>
                  <button
                    type="button"
                    onClick={handleAddCreateLine}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {createLines.map((line, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <select
                        value={line.item_id}
                        onChange={(e) => {
                          const newLines = [...createLines];
                          newLines[idx].item_id = e.target.value;
                          setCreateLines(newLines);
                        }}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                      >
                        {items.map((i) => (
                          <option key={i.item_id} value={i.item_id}>
                            [{i.item_code}] {i.item_name} (Stock: {i.current_stock} {i.uom})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        value={line.requested_quantity}
                        onChange={(e) => {
                          const newLines = [...createLines];
                          newLines[idx].requested_quantity = Number(e.target.value);
                          setCreateLines(newLines);
                        }}
                        className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white font-mono text-right"
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveCreateLine(idx)}
                        disabled={createLines.length === 1}
                        className="p-1 text-slate-400 hover:text-rose-400 disabled:opacity-20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-mono text-slate-400 block mb-1">Notes / Justification</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold shadow-lg shadow-purple-950"
                >
                  {submitting ? 'Submitting...' : 'Submit Requisition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Approve Requisition */}
      {approvingReq && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-400" />
                <span>Approve Requisition #{approvingReq.requisition_number}</span>
              </h3>
              <button
                onClick={() => setApprovingReq(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApproveSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-mono text-slate-400 block mb-1">Approver Name (Dept Head)</label>
                <input
                  type="text"
                  required
                  value={approverName}
                  onChange={(e) => setApproverName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="space-y-2 border border-slate-800 rounded-lg p-3 bg-slate-950/50">
                <span className="font-mono uppercase text-slate-400 block mb-2">
                  Verify or Adjust Approved Quantities:
                </span>
                {approvingReq.items.map((item) => (
                  <div key={item.item_id} className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-white font-medium">{item.item_name}</div>
                      <div className="text-[11px] text-slate-400">
                        Requested: {item.requested_quantity} {item.uom}
                      </div>
                    </div>
                    <div className="w-28 flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={approvedQtys[item.item_id] ?? item.requested_quantity}
                        onChange={(e) =>
                          setApprovedQtys({ ...approvedQtys, [item.item_id]: Number(e.target.value) })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-right"
                      />
                      <span className="text-slate-400 text-[11px]">{item.uom}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setApprovingReq(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold"
                >
                  Confirm Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Storekeeper Issue */}
      {issuingReq && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-400" />
                <span>Fulfill & Issue Requisition #{issuingReq.requisition_number}</span>
              </h3>
              <button
                onClick={() => setIssuingReq(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-mono text-slate-400 block mb-1">Storekeeper Name (Issuer)</label>
                <input
                  type="text"
                  required
                  value={issuerName}
                  onChange={(e) => setIssuerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                />
              </div>

              <div className="space-y-2 border border-slate-800 rounded-lg p-3 bg-slate-950/50">
                <span className="font-mono uppercase text-slate-400 block mb-1">Items to Dispatch:</span>
                {issuingReq.items.map((item) => (
                  <div key={item.item_id} className="flex items-center justify-between py-1 border-b border-slate-800/60 last:border-none">
                    <div>
                      <div className="text-white font-medium">{item.item_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        From Storeroom: {issuingReq.storeroom_id}
                      </div>
                    </div>
                    <div className="text-right font-mono font-bold text-emerald-400">
                      {item.approved_quantity || item.requested_quantity} {item.uom}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-blue-950/30 border border-blue-800/40 rounded-lg text-blue-300 text-[11px]">
                Posting this issue will decrement on-hand inventory balances and post a General Ledger
                journal debiting departmental operational cost ({issuingReq.department_code}) and crediting Asset 1080 Inventory.
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIssuingReq(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold"
                >
                  {submitting ? 'Posting Issue...' : 'Confirm Issue & Post Journal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
