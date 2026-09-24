/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  FileText,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  Printer,
  ExternalLink,
  Split,
  Truck,
  ArrowRight,
  DollarSign,
  AlertCircle,
  X,
  Search,
  BookOpen,
  Filter,
  Check,
  ChevronDown,
  Warehouse,
  Coins,
  ShieldCheck,
} from 'lucide-react';
import {
  PurchaseOrder,
  PurchaseOrderItem,
  DepartmentRequisition,
  InventoryItem,
  InventoryStoreroom,
  Department,
} from '../../types';
import { api } from '../../services/api';
import { PurchaseOrderDocumentModal } from './PurchaseOrderDocumentModal';

interface PurchaseOrdersViewProps {
  departments: Department[];
  onViewJournal?: (journalId: string) => void;
  onNavigateToReceiving?: (poNumber: string) => void;
  initialSelectedPoId?: string;
  initialRequisitionIdToOrder?: string;
}

export const PurchaseOrdersView: React.FC<PurchaseOrdersViewProps> = ({
  departments,
  onViewJournal,
  onNavigateToReceiving,
  initialSelectedPoId,
  initialRequisitionIdToOrder,
}) => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [requisitions, setRequisitions] = useState<DepartmentRequisition[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [storerooms, setStorerooms] = useState<InventoryStoreroom[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');

  // Detail Modal / Print Preview
  const [activePoDetail, setActivePoDetail] = useState<PurchaseOrder | null>(null);

  // Create PO Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedReqForOrdering, setSelectedReqForOrdering] = useState<DepartmentRequisition | null>(null);

  // Form Fields
  const [supplierName, setSupplierName] = useState('PT Sukses Jaya Pangan');
  const [supplierContact, setSupplierContact] = useState('Budi Pratama (Sales Rep)');
  const [supplierEmail, setSupplierEmail] = useState('orders@suksesjayapangan.co.id');
  const [supplierAddress, setSupplierAddress] = useState('Kawasan Industri Sentul Blok B4, Bogor');
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [storeroomId, setStoreroomId] = useState('CSR-01');
  const [departmentCode, setDepartmentCode] = useState('200'); // Food & Beverage default
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Days');
  const [taxRatePct, setTaxRatePct] = useState<number>(11); // 11% standard Indonesian VAT
  const [notes, setNotes] = useState('Standard hotel procurement contract. Inspection on delivery required.');

  // PO Line Items
  interface PoLineDraft {
    item_id: string;
    ordered_quantity: number;
    unit_cost: number;
    requisition_id?: string;
    notes?: string;
  }
  const [poLines, setPoLines] = useState<PoLineDraft[]>([
    { item_id: '', ordered_quantity: 10, unit_cost: 0, notes: '' },
  ]);

  // Selected Requisitions Multi-Link Tracker
  const [selectedRequisitionIds, setSelectedRequisitionIds] = useState<string[]>([]);

  // Journaling modal / action state
  const [journalingPo, setJournalingPo] = useState<PurchaseOrder | null>(null);
  const [journalMode, setJournalMode] = useState<'COMMITMENT' | 'ACCRUAL'>('COMMITMENT');
  const [journalActionLoading, setJournalActionLoading] = useState(false);

  // Feedback Notifications
  const [notification, setNotification] = useState<{ text: string; journalId?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load all master and operational data
  const loadData = async () => {
    try {
      setLoading(true);
      const [pos, reqs, items, rooms] = await Promise.all([
        api.getPurchaseOrders(),
        api.getRequisitions(),
        api.getInventoryItems(),
        api.getInventoryStorerooms(),
      ]);

      setPurchaseOrders(pos);
      setRequisitions(reqs);
      setInventoryItems(items);
      setStorerooms(rooms);

      if (items.length > 0 && !poLines[0]?.item_id) {
        setPoLines([
          {
            item_id: items[0].item_id,
            ordered_quantity: 10,
            unit_cost: items[0].average_cost || items[0].last_purchase_cost || 50000,
            notes: '',
          },
        ]);
      }

      if (initialSelectedPoId) {
        const found = pos.find((p) => p.po_id === initialSelectedPoId || p.po_number === initialSelectedPoId);
        if (found) setActivePoDetail(found);
      }

      if (initialRequisitionIdToOrder) {
        const req = reqs.find((r) => r.requisition_id === initialRequisitionIdToOrder);
        if (req) {
          handleInitFromRequisition(req, items);
        }
      }
    } catch (err: any) {
      console.error('Failed to load PO data:', err);
      setError(err.message || 'Error loading purchase orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick Initialize PO draft from an existing Requisition (compatible with 1 Req -> Many Suppliers)
  const handleInitFromRequisition = (req: DepartmentRequisition, allItems = inventoryItems) => {
    setSelectedReqForOrdering(req);
    setSelectedRequisitionIds([req.requisition_id]);
    setDepartmentCode(req.department_code || '200');
    setStoreroomId(req.storeroom_id || 'CSR-01');
    setNotes(`PO generated from approved Requisition #${req.requisition_id} (${req.department_name}).`);

    // Prepopulate lines with remaining quantities from this requisition
    const lines: PoLineDraft[] = req.items.map((item) => {
      const match = allItems.find((i) => i.item_id === item.item_id);
      return {
        item_id: item.item_id,
        ordered_quantity: item.approved_quantity || item.requested_quantity || 1,
        unit_cost: item.unit_cost || match?.average_cost || 0,
        requisition_id: req.requisition_id,
        notes: `Requisition line: ${item.item_name}`,
      };
    });

    setPoLines(lines.length > 0 ? lines : [{ item_id: allItems[0]?.item_id || '', ordered_quantity: 1, unit_cost: 0 }]);
    setIsCreateOpen(true);
  };

  // Add line to PO
  const handleAddLine = () => {
    const firstItem = inventoryItems[0];
    setPoLines([
      ...poLines,
      {
        item_id: firstItem ? firstItem.item_id : '',
        ordered_quantity: 1,
        unit_cost: firstItem?.average_cost || 0,
        requisition_id: selectedRequisitionIds[0] || undefined,
        notes: '',
      },
    ]);
  };

  // Remove line from PO
  const handleRemoveLine = (idx: number) => {
    if (poLines.length === 1) return;
    setPoLines(poLines.filter((_, i) => i !== idx));
  };

  // Line item change
  const handleItemSelect = (idx: number, itemId: string) => {
    const selected = inventoryItems.find((i) => i.item_id === itemId);
    const updated = [...poLines];
    updated[idx] = {
      ...updated[idx],
      item_id: itemId,
      unit_cost: selected?.last_purchase_cost || selected?.average_cost || 0,
    };
    setPoLines(updated);
  };

  // Calculate totals
  const subtotal = poLines.reduce((sum, l) => sum + (Number(l.ordered_quantity) || 0) * (Number(l.unit_cost) || 0), 0);
  const taxAmount = Math.round(subtotal * (Number(taxRatePct) / 100) * 100) / 100;
  const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

  // Submit PO
  const handleCreatePoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      setError('Please provide a valid supplier or vendor name.');
      return;
    }
    if (poLines.some((l) => !l.item_id || l.ordered_quantity <= 0)) {
      setError('All lines must have an item selected and a positive ordered quantity.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const created = await api.createPurchaseOrder({
        order_date: orderDate,
        expected_delivery_date: expectedDeliveryDate,
        supplier_name: supplierName,
        supplier_contact: supplierContact,
        supplier_email: supplierEmail,
        supplier_address: supplierAddress,
        storeroom_id: storeroomId,
        department_code: departmentCode,
        requisition_ids: selectedRequisitionIds,
        items: poLines.map((l) => ({
          item_id: l.item_id,
          ordered_quantity: Number(l.ordered_quantity),
          unit_cost: Number(l.unit_cost),
          requisition_id: l.requisition_id || undefined,
          notes: l.notes,
        })),
        tax_rate_pct: Number(taxRatePct),
        payment_terms: paymentTerms,
        notes,
        created_by: 'Procurement Specialist',
      });

      setNotification({
        text: `Purchase Order ${created.po_number} successfully created & approved! Linked to ${created.requisition_ids.length} requisition(s).`,
      });
      setIsCreateOpen(false);
      await loadData();
      setActivePoDetail(created);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create Purchase Order');
    } finally {
      setSubmitting(false);
    }
  };

  // Generate Accounting Journal for PO
  const handleGenerateJournal = async (po: PurchaseOrder) => {
    setJournalingPo(po);
  };

  const handleConfirmJournalCreation = async () => {
    if (!journalingPo) return;
    setJournalActionLoading(true);
    setError(null);
    try {
      const result = await api.generatePurchaseOrderJournal(journalingPo.po_id, journalMode);
      setNotification({
        text: `PO ${result.po.po_number} journalized successfully!`,
        journalId: result.journal_id,
      });
      setJournalingPo(null);
      await loadData();
      if (activePoDetail?.po_id === result.po.po_id) {
        setActivePoDetail(result.po);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to journalize purchase order');
    } finally {
      setJournalActionLoading(false);
    }
  };

  // Filtered POs
  const filteredOrders = purchaseOrders.filter((po) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      po.po_number.toLowerCase().includes(q) ||
      po.supplier_name.toLowerCase().includes(q) ||
      po.department_name.toLowerCase().includes(q) ||
      po.items.some((i) => i.item_name.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'ALL' || po.status === statusFilter;
    const matchesDept = deptFilter === 'ALL' || po.department_code === deptFilter;

    return matchesSearch && matchesStatus && matchesDept;
  });

  // Requisitions awaiting procurement (Pending or Approved or Partially Ordered)
  const pendingRequisitions = requisitions.filter(
    (r) => r.status === 'APPROVED' || r.status === 'PARTIALLY_ORDERED'
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Fast Actions */}
      <div className="bg-slate-900/70 p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <ShoppingCart className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Purchase Order &amp; Procurement Management</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-blue-600/30 text-blue-300 border border-blue-500/30">
                  USALI 12 Compatible
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate formal PO documents linked directly to department requisitions, split single requisitions across multiple suppliers, and generate balanced encumbrance or accrual accounting journals.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              setSelectedReqForOrdering(null);
              setSelectedRequisitionIds([]);
              setIsCreateOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-950 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New PO</span>
          </button>
        </div>
      </div>

      {/* Requisition Multi-Supplier Procurement Assistant Banner */}
      {pendingRequisitions.length > 0 && (
        <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-800/40 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-purple-300 font-bold text-xs">
              <Split className="w-4 h-4 text-purple-400" />
              <span>Approved Requisitions Awaiting Supplier Procurement ({pendingRequisitions.length})</span>
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              1 Requisition can be split into multiple POs to different suppliers
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingRequisitions.slice(0, 3).map((req) => (
              <div
                key={req.requisition_id}
                className="bg-slate-950/70 border border-purple-900/40 hover:border-purple-600/60 p-3 rounded-xl transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-purple-300 font-bold text-xs">
                      #{req.requisition_id}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {req.status}
                    </span>
                  </div>
                  <div className="text-white text-xs font-semibold">{req.department_name} ({req.department_code})</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Requester: <span className="text-slate-300">{req.requester_name}</span> • {req.items.length} items
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Target Store: <span className="text-slate-300">{req.storeroom_id}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400">{req.date}</span>
                  <button
                    onClick={() => handleInitFromRequisition(req)}
                    className="px-2.5 py-1 bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white rounded-lg text-[11px] font-bold flex items-center gap-1 border border-purple-500/30 transition-all"
                  >
                    <span>Generate PO</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifications */}
      {notification && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs space-y-1.5 shadow-lg">
          <div className="flex items-center gap-2 font-bold text-emerald-300">
            <CheckCircle2 className="w-4 h-4" />
            <span>{notification.text}</span>
          </div>
          {notification.journalId && onViewJournal && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-slate-300">Double-Entry Accounting Journal:</span>
              <button
                onClick={() => onViewJournal(notification.journalId!)}
                className="px-2 py-0.5 bg-emerald-600/30 text-emerald-300 rounded font-mono font-bold flex items-center gap-1 hover:bg-emerald-600/50 transition-colors"
              >
                <span>{notification.journalId}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters & Search Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search PO #, supplier, SKU or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono"
            >
              <option value="ALL">All Statuses</option>
              <option value="APPROVED">APPROVED</option>
              <option value="PARTIALLY_RECEIVED">PARTIALLY_RECEIVED</option>
              <option value="FULFILLED">FULFILLED</option>
              <option value="DRAFT">DRAFT</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.department_code} value={d.department_code}>
                  {d.department_code} - {d.department_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono text-right">
          Total POs: <span className="text-white font-bold">{purchaseOrders.length}</span> (
          {filteredOrders.length} showing)
        </div>
      </div>

      {/* PO Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">PO Number</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Supplier / Vendor</th>
                <th className="px-4 py-3">Dept &amp; Storeroom</th>
                <th className="px-4 py-3">Requisition Link</th>
                <th className="px-4 py-3 text-right">Total (IDR)</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Accounting Journal</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-mono">
                    Loading Purchase Orders &amp; Procurement Ledgers...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 font-mono">
                    No purchase orders found matching criteria. Create one above!
                  </td>
                </tr>
              ) : (
                filteredOrders.map((po) => (
                  <tr key={po.po_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-blue-400">
                      <button
                        onClick={() => setActivePoDetail(po)}
                        className="hover:underline flex items-center gap-1.5 text-left"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{po.po_number}</span>
                      </button>
                    </td>

                    <td className="px-4 py-3 font-mono text-slate-400">{po.order_date}</td>

                    <td className="px-4 py-3 font-semibold text-white">
                      <div>{po.supplier_name}</div>
                      {po.supplier_contact && (
                        <div className="text-[11px] text-slate-400 font-normal">{po.supplier_contact}</div>
                      )}
                    </td>

                    <td className="px-4 py-3 text-slate-300">
                      <div>{po.department_name} ({po.department_code})</div>
                      <div className="text-[11px] text-slate-400 font-mono">Store: {po.storeroom_name}</div>
                    </td>

                    <td className="px-4 py-3">
                      {po.requisition_ids && po.requisition_ids.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {po.requisition_ids.map((id) => (
                            <span
                              key={id}
                              className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded font-mono text-[10px] border border-purple-500/30"
                              title="Linked Department Requisition"
                            >
                              #{id.slice(-8)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono text-[11px]">Direct Order</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-bold text-white">
                      IDR {po.total_amount.toLocaleString('id-ID')}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          po.status === 'APPROVED'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : po.status === 'FULFILLED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : po.status === 'PARTIALLY_RECEIVED'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {po.status}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      {po.journal_id ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-mono text-[10px] rounded border border-emerald-500/30">
                            POSTED
                          </span>
                          {onViewJournal && (
                            <button
                              onClick={() => onViewJournal(po.journal_id!)}
                              title="Inspect Double-Entry Journal in Workbench"
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleGenerateJournal(po)}
                          className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-semibold flex items-center gap-1 mx-auto transition-colors"
                        >
                          <Coins className="w-3 h-3" />
                          <span>Journalize PO</span>
                        </button>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setActivePoDetail(po)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 border border-slate-700"
                        >
                          <span>View Doc</span>
                        </button>

                        {onNavigateToReceiving && (
                          <button
                            onClick={() => onNavigateToReceiving(po.po_number)}
                            title="Ingest Goods Delivery into Inventory"
                            className="p-1.5 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40"
                          >
                            <Truck className="w-3.5 h-3.5" />
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

      {/* Modal: Create New Purchase Order */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                  <ShoppingCart className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">Create Purchase Order Document</h3>
                  <p className="text-xs text-slate-400">
                    Establish official procurement contract with supplier and link requisition items.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePoSubmit} className="space-y-5">
              {/* Linked Requisition Helper Notice */}
              {selectedReqForOrdering && (
                <div className="p-3.5 bg-purple-950/40 border border-purple-800/40 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between text-purple-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Split className="w-4 h-4" />
                      Linked Requisition: #{selectedReqForOrdering.requisition_id}
                    </span>
                    <span className="font-mono text-[11px] bg-purple-900/60 px-2 py-0.5 rounded">
                      Dept: {selectedReqForOrdering.department_name}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px]">
                    You can fulfill all or only selected items with this supplier (e.g. Fresh Meat). If other items (Vegetables/Dairy) are required, you can create separate POs for other vendors using this same requisition!
                  </p>
                </div>
              )}

              {/* Vendor & General Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Supplier / Vendor Name *</label>
                  <input
                    type="text"
                    required
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="e.g. PT Sukses Jaya Pangan"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Contact Person / Rep</label>
                  <input
                    type="text"
                    value={supplierContact}
                    onChange={(e) => setSupplierContact(e.target.value)}
                    placeholder="e.g. Budi Pratama (Sales)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Supplier Email</label>
                  <input
                    type="email"
                    value={supplierEmail}
                    onChange={(e) => setSupplierEmail(e.target.value)}
                    placeholder="orders@vendor.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="text-xs font-mono text-slate-400 block mb-1">Supplier Billing / Delivery Address</label>
                  <input
                    type="text"
                    value={supplierAddress}
                    onChange={(e) => setSupplierAddress(e.target.value)}
                    placeholder="e.g. Kawasan Industri Sentul Blok B4, Bogor"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* PO Date, Terms, Storeroom, Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">PO Order Date</label>
                  <input
                    type="date"
                    required
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Target Receiving Storeroom</label>
                  <select
                    value={storeroomId}
                    onChange={(e) => setStoreroomId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  >
                    {storerooms.map((s) => (
                      <option key={s.storeroom_id} value={s.storeroom_id}>
                        {s.storeroom_id} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Cost Center / Department</label>
                  <select
                    value={departmentCode}
                    onChange={(e) => setDepartmentCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  >
                    {departments.map((d) => (
                      <option key={d.department_code} value={d.department_code}>
                        {d.department_code} - {d.department_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Payment Terms</label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="Net 30 Days">Net 30 Days</option>
                    <option value="Net 14 Days">Net 14 Days</option>
                    <option value="Net 60 Days">Net 60 Days</option>
                    <option value="COD (Cash on Delivery)">COD (Cash on Delivery)</option>
                    <option value="50% Advance, 50% on Arrival">50% Advance, 50% on Arrival</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">VAT / PPN Rate (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={taxRatePct}
                    onChange={(e) => setTaxRatePct(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-mono text-slate-400 block mb-1">PO Notes / Delivery Instructions</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Delivery between 08:00 - 12:00 at loading dock."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Order Line Items */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Order Line Items ({poLines.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {poLines.map((line, idx) => {
                    const lineSubtotal = (Number(line.ordered_quantity) || 0) * (Number(line.unit_cost) || 0);
                    return (
                      <div
                        key={idx}
                        className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 grid grid-cols-12 gap-2 items-center text-xs"
                      >
                        <div className="col-span-12 sm:col-span-4">
                          <label className="text-[10px] text-slate-500 font-mono block mb-0.5">Item SKU</label>
                          <select
                            value={line.item_id}
                            onChange={(e) => handleItemSelect(idx, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white"
                          >
                            <option value="">Select Item...</option>
                            {inventoryItems.map((item) => (
                              <option key={item.item_id} value={item.item_id}>
                                [{item.item_code}] {item.item_name} ({item.uom})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-4 sm:col-span-2">
                          <label className="text-[10px] text-slate-500 font-mono block mb-0.5">Qty</label>
                          <input
                            type="number"
                            min={1}
                            required
                            value={line.ordered_quantity}
                            onChange={(e) => {
                              const updated = [...poLines];
                              updated[idx].ordered_quantity = Number(e.target.value);
                              setPoLines(updated);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white font-mono"
                          />
                        </div>

                        <div className="col-span-8 sm:col-span-3">
                          <label className="text-[10px] text-slate-500 font-mono block mb-0.5">Unit Price (IDR)</label>
                          <input
                            type="number"
                            min={0}
                            required
                            value={line.unit_cost}
                            onChange={(e) => {
                              const updated = [...poLines];
                              updated[idx].unit_cost = Number(e.target.value);
                              setPoLines(updated);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white font-mono"
                          />
                        </div>

                        <div className="col-span-10 sm:col-span-2 text-right">
                          <label className="text-[10px] text-slate-500 font-mono block mb-0.5">Subtotal</label>
                          <div className="font-mono font-bold text-white">
                            {lineSubtotal.toLocaleString('id-ID')}
                          </div>
                        </div>

                        <div className="col-span-2 sm:col-span-1 text-right">
                          <label className="text-[10px] text-transparent block mb-0.5">del</label>
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Financial Calculation Summary */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal Amount:</span>
                  <span>IDR {subtotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>VAT / PPN ({taxRatePct}%):</span>
                  <span>IDR {taxAmount.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                  <span>Total Purchase Order Commitment:</span>
                  <span className="text-emerald-400">IDR {totalAmount.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-950 transition-all flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{submitting ? 'Generating PO Document...' : 'Create & Approve PO'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Document Detail & Configurable / Printable View */}
      {activePoDetail && (
        <PurchaseOrderDocumentModal
          po={activePoDetail}
          departments={departments}
          storerooms={storerooms}
          inventoryItems={inventoryItems}
          onClose={() => setActivePoDetail(null)}
          onUpdated={(updated) => {
            setActivePoDetail(updated);
            setPurchaseOrders((prev) => prev.map((p) => (p.po_id === updated.po_id ? updated : p)));
          }}
          onViewJournal={onViewJournal}
          onNavigateToReceiving={onNavigateToReceiving}
          onGenerateJournal={handleGenerateJournal}
        />
      )}

      {/* Modal: Journalize PO Dialog */}
      {journalingPo && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
                  <Coins className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-white">Generate Double-Entry Journal for PO</h3>
              </div>
              <button
                onClick={() => setJournalingPo(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-3">
              <p>
                Posting an accounting entry for Purchase Order{' '}
                <span className="text-blue-400 font-mono font-bold">{journalingPo.po_number}</span> (IDR{' '}
                {journalingPo.total_amount.toLocaleString('id-ID')}). Choose your preferred standard accounting policy:
              </p>

              <div className="space-y-2">
                <label className={`block p-3 rounded-xl border cursor-pointer transition-all ${
                  journalMode === 'COMMITMENT'
                    ? 'bg-blue-950/40 border-blue-500/50 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="journalMode"
                      checked={journalMode === 'COMMITMENT'}
                      onChange={() => setJournalMode('COMMITMENT')}
                      className="text-blue-600"
                    />
                    <span className="font-bold text-xs">USALI 12 Encumbrance / Commitment Accounting (Recommended)</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 pl-5 font-mono">
                    Dr 9010 PO Encumbrance Expense • Cr 9020 Reserve for Commitments
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 pl-5">
                    Locks hotel operational budget before shipment arrives, avoiding department overspending without prematurely booking AP trade debt.
                  </p>
                </label>

                <label className={`block p-3 rounded-xl border cursor-pointer transition-all ${
                  journalMode === 'ACCRUAL'
                    ? 'bg-blue-950/40 border-blue-500/50 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="journalMode"
                      checked={journalMode === 'ACCRUAL'}
                      onChange={() => setJournalMode('ACCRUAL')}
                      className="text-blue-600"
                    />
                    <span className="font-bold text-xs">Direct Trade AP / In-Transit Accrual</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 pl-5 font-mono">
                    Dr 1080 Inventory (Subtotal) • Dr 1100 VAT In • Cr 2010 AP Trade
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 pl-5">
                    Records standard trade liability and input tax accrual immediately upon purchase order issuance.
                  </p>
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setJournalingPo(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={journalActionLoading}
                onClick={handleConfirmJournalCreation}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950 transition-all"
              >
                {journalActionLoading ? 'Creating Journal...' : 'Confirm & Post Journal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
