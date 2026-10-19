/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Warehouse,
  Plus,
  Edit2,
  Trash2,
  Building,
  User,
  Package,
  MapPin,
  X,
  RefreshCw,
  Search,
  DollarSign,
  Download,
  FileSpreadsheet,
  Printer,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { InventoryStoreroom, InventoryItem, Department } from '../../types';
import { api } from '../../services/api';
import { exportReportToExcel } from '../../utils/excelExporter';
import { printReportElement } from '../../utils/printManager';

interface StoreroomsViewProps {
  departments: Department[];
  selectedStoreroomId?: string;
  onOpenStockCard: (itemId: string) => void;
}

export const StoreroomsView: React.FC<StoreroomsViewProps> = ({
  departments,
  selectedStoreroomId,
  onOpenStockCard,
}) => {
  const [storerooms, setStorerooms] = useState<InventoryStoreroom[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [activeStoreroomId, setActiveStoreroomId] = useState<string>(selectedStoreroomId || '');
  const [searchItem, setSearchItem] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Partial<InventoryStoreroom> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // In-app Delete Confirmation State (Bypasses iframe window.confirm blocks)
  const [roomToDelete, setRoomToDelete] = useState<InventoryStoreroom | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);
  const [saveModalError, setSaveModalError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async (): Promise<InventoryStoreroom[]> => {
    try {
      setLoading(true);
      const [rooms, allItems] = await Promise.all([
        api.getInventoryStorerooms(),
        api.getInventoryItems(),
      ]);
      const normalizedRooms = (rooms || []).map((r) => ({
        ...r,
        name: r.name || r.storeroom_name || 'Storeroom',
        storeroom_name: r.storeroom_name || r.name || 'Storeroom',
      }));
      setStorerooms(normalizedRooms);
      setItems(allItems);
      setActiveStoreroomId((current) => {
        if (!current || !normalizedRooms.some((r) => r.storeroom_id === current)) {
          return normalizedRooms[0]?.storeroom_id || '';
        }
        return current;
      });
      return normalizedRooms;
    } catch (err: any) {
      console.error(err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedStoreroomId) {
      setActiveStoreroomId(selectedStoreroomId);
    }
  }, [selectedStoreroomId]);

  const handleOpenCreate = () => {
    setEditingRoom({
      storeroom_id: `STORE-${Date.now().toString().slice(-4)}`,
      name: '',
      storeroom_name: '',
      department_code: departments[0]?.department_code || 'F&B',
      in_charge: '',
      default_bin_prefix: 'LOC',
      is_active: true,
      description: '',
    });
    setSaveModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sr: InventoryStoreroom) => {
    setEditingRoom({
      ...sr,
      name: sr.name || sr.storeroom_name || '',
      storeroom_name: sr.storeroom_name || sr.name || '',
    });
    setSaveModalError(null);
    setIsModalOpen(true);
  };

  const promptDeleteStoreroom = (sr: InventoryStoreroom) => {
    // Close edit modal immediately if open so confirmation dialog is crystal clear
    setIsModalOpen(false);
    setRoomToDelete(sr);
    setDeleteModalError(null);
  };

  const handleConfirmDelete = async () => {
    if (!roomToDelete) return;

    try {
      setIsDeleting(true);
      setDeleteModalError(null);
      const targetId = roomToDelete.storeroom_id;
      const displayName = roomToDelete.storeroom_name || roomToDelete.name || targetId;

      await api.deleteInventoryStoreroom(targetId);
      const updatedRooms = await loadData();

      setActiveStoreroomId((current) => {
        if (current === targetId || !updatedRooms.some((r) => r.storeroom_id === current)) {
          return updatedRooms[0]?.storeroom_id || '';
        }
        return current;
      });

      setIsModalOpen(false);
      setEditingRoom(null);
      setRoomToDelete(null);
      setActionFeedback({
        type: 'success',
        message: `Storeroom "${displayName}" (${targetId}) was permanently deleted.`,
      });
    } catch (err: any) {
      console.error('Delete storeroom error:', err);
      setDeleteModalError(err.message || 'Failed to delete storeroom. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const roomName = editingRoom?.name || editingRoom?.storeroom_name;
    if (!editingRoom || !roomName?.trim()) {
      setSaveModalError('Please enter a valid storeroom name.');
      return;
    }

    setSaving(true);
    setSaveModalError(null);
    try {
      await api.saveInventoryStoreroom({
        ...editingRoom,
        name: roomName.trim(),
        storeroom_name: roomName.trim(),
      });
      await loadData();
      setIsModalOpen(false);
      setEditingRoom(null);
      setActionFeedback({
        type: 'success',
        message: `Storeroom "${roomName.trim()}" saved successfully.`,
      });
    } catch (err: any) {
      console.error('Save storeroom error:', err);
      setSaveModalError(err.message || 'Failed to save storeroom');
    } finally {
      setSaving(false);
    }
  };

  const currentStoreroom = (storerooms || []).find((s) => s.storeroom_id === activeStoreroomId);

  // Items in active storeroom
  const storeroomStockItems = (items || [])
    .map((item) => {
      const loc = item.storeroom_stocks?.find((s) => s.storeroom_id === activeStoreroomId);
      const qty = loc ? loc.quantity : 0;
      const bin = loc?.bin_location || '-';
      const val = qty * item.average_cost;
      return { item, qty, bin, val };
    })
    .filter((entry) => {
      const matchSearch =
        entry.item.item_name.toLowerCase().includes(searchItem.toLowerCase()) ||
        entry.item.item_code.toLowerCase().includes(searchItem.toLowerCase()) ||
        entry.bin.toLowerCase().includes(searchItem.toLowerCase());
      return matchSearch;
    });

  const totalStoreValuation = storeroomStockItems.reduce((sum, e) => sum + e.val, 0);
  const totalStoreStockQty = storeroomStockItems.reduce((sum, e) => sum + e.qty, 0);

  const handleExportCSV = () => {
    if (!currentStoreroom) return;
    const headers = [
      'Item Code',
      'Item Name',
      'Category',
      'Bin Location',
      'Quantity In Store',
      'Unit',
      'Avg Cost (IDR)',
      'Store Valuation (IDR)',
    ];
    const rows = storeroomStockItems.map((e) => [
      `"${e.item.item_code}"`,
      `"${e.item.item_name}"`,
      `"${e.item.category_id}"`,
      `"${e.bin}"`,
      e.qty,
      `"${e.item.unit_of_measure}"`,
      e.item.average_cost,
      e.val,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Storeroom_Stock_${currentStoreroom.storeroom_id}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    if (!currentStoreroom) return;
    exportReportToExcel(`Storeroom_Stock_${currentStoreroom.storeroom_id}`, [
      {
        name: 'Storeroom Stock',
        title: `Storeroom Stock & Valuation — ${currentStoreroom.storeroom_name}`,
        subtitle: `Department: ${currentStoreroom.department_code} | In-Charge: ${currentStoreroom.in_charge || 'N/A'}`,
        period: new Date().toISOString().slice(0, 10),
        headers: [
          'Item Code',
          'Item Name',
          'Category',
          'Bin Location',
          'Qty in Store',
          'Unit',
          'Avg Cost (IDR)',
          'Store Value (IDR)',
        ],
        rows: storeroomStockItems.map((e) => [
          e.item.item_code,
          e.item.item_name,
          e.item.category_id,
          e.bin,
          e.qty,
          e.item.unit_of_measure,
          e.item.average_cost,
          e.val,
        ]),
        colWidths: [14, 30, 16, 14, 14, 10, 16, 18],
      },
    ]);
  };

  const handlePrint = () => {
    if (!currentStoreroom) return;
    printReportElement('storeroom-printable-area', {
      title: `Storeroom Stock & Valuation — ${currentStoreroom.storeroom_name}`,
      subtitle: `Department: ${currentStoreroom.department_code} | Total Valuation: Rp ${totalStoreValuation.toLocaleString('id-ID')}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-blue-400" />
            <span>Storerooms, Bins & Stock Distribution</span>
          </h3>
          <p className="text-xs text-slate-400">
            Physical hotel storerooms linked to operating departments and assigned storekeepers.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-950 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Storeroom</span>
        </button>
      </div>

      {/* Action Notification Banner */}
      {actionFeedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all animate-in fade-in ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-950/50 border-emerald-800 text-emerald-200'
              : 'bg-rose-950/50 border-rose-800 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-0.5"
          >
            ×
          </button>
        </div>
      )}

      {/* Storerooms Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {storerooms.map((sr) => {
          const isSelected = sr.storeroom_id === activeStoreroomId;
          const storeItems = items.filter((i) =>
            i.storeroom_stocks?.some((s) => s.storeroom_id === sr.storeroom_id && s.quantity > 0)
          );
          const storeVal = storeItems.reduce((sum, i) => {
            const qty = i.storeroom_stocks?.find((s) => s.storeroom_id === sr.storeroom_id)?.quantity || 0;
            return sum + qty * i.average_cost;
          }, 0);

          return (
            <div
              key={sr.storeroom_id}
              onClick={() => setActiveStoreroomId(sr.storeroom_id)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 ${
                isSelected
                  ? 'bg-blue-950/30 border-blue-500 shadow-lg shadow-blue-950/40'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-blue-400">
                    {sr.storeroom_id}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(sr);
                      }}
                      className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Edit Storeroom"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        promptDeleteStoreroom(sr);
                      }}
                      className="p-1.5 rounded-md text-rose-400 hover:text-rose-200 hover:bg-rose-950/60 transition-colors"
                      title="Delete Storeroom"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h4 className="text-xs font-bold text-white mt-1 line-clamp-1">{sr.storeroom_name}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  <span>{sr.department_code}</span>
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <div className="text-xs font-bold font-mono text-emerald-400">
                  Rp {(storeVal ?? 0).toLocaleString('id-ID')}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {storeItems.length} SKUs Stocked
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Storeroom Detailed Content */}
      {currentStoreroom && (
        <div id="storeroom-printable-area" className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl space-y-4 p-5">
          {/* Active room summary bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-white">{currentStoreroom.storeroom_name}</h4>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {currentStoreroom.storeroom_id}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Dept: <span className="text-slate-200">{currentStoreroom.department_code}</span> • In-Charge:{' '}
                <span className="text-slate-200">{currentStoreroom.in_charge || 'Unassigned'}</span> • Bin Prefix:{' '}
                <span className="font-mono text-emerald-400">{currentStoreroom.default_bin_prefix}-*</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="text-right mr-2">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Total Store Value</span>
                <span className="text-base font-bold font-mono text-emerald-400">
                  Rp {(totalStoreValuation ?? 0).toLocaleString('id-ID')}
                </span>
              </div>

              {/* Action Buttons: Edit and Delete for active storeroom */}
              <div className="flex items-center gap-1.5 no-print">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(currentStoreroom)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
                  title="Edit Storeroom Configuration"
                >
                  <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => promptDeleteStoreroom(currentStoreroom)}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 hover:text-rose-100 text-xs font-semibold flex items-center gap-1.5 border border-rose-800/80 transition-colors shadow-xs"
                  title="Delete This Storeroom"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Delete Storeroom</span>
                </button>
              </div>

              {/* Export Buttons */}
              <div className="flex items-center gap-1.5 no-print">
                <button
                  onClick={handleExportCSV}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 border border-slate-700"
                  title="Export to CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={handleExportExcel}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 shadow-xs"
                  title="Export to Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 border border-slate-700"
                  title="Print / Save PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
              </div>

              <div className="relative min-w-[200px] no-print">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchItem}
                  onChange={(e) => setSearchItem(e.target.value)}
                  placeholder="Filter stock or bin..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Storeroom Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">Item Code</th>
                  <th className="px-4 py-2.5">Item Name</th>
                  <th className="px-4 py-2.5">Bin Location</th>
                  <th className="px-4 py-2.5 text-right">Quantity In Store</th>
                  <th className="px-4 py-2.5 text-right">Unit Avg Cost (Rp)</th>
                  <th className="px-4 py-2.5 text-right">Store Valuation (Rp)</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {storeroomStockItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 font-mono">
                      No items currently held in this storeroom.
                    </td>
                  </tr>
                ) : (
                  storeroomStockItems.map(({ item, qty, bin, val }) => (
                    <tr key={item.item_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-emerald-400 font-bold">
                        {item.item_code}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-white">{item.item_name}</td>
                      <td className="px-4 py-2.5">
                        <span className="font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60 flex items-center gap-1 w-fit">
                          <MapPin className="w-3 h-3 text-emerald-400" />
                          <span>{bin}</span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-100">
                        {(qty ?? 0).toLocaleString()} {item.uom}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-400">
                        Rp {(item.average_cost ?? 0).toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-medium text-emerald-400">
                        Rp {(val ?? 0).toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => onOpenStockCard(item.item_id)}
                          className="text-xs text-blue-400 hover:text-blue-300 underline font-mono"
                        >
                          Stock Card
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && editingRoom && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-blue-400" />
                <span>Save Storeroom Setup</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {saveModalError && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{saveModalError}</span>
                </div>
              )}

              <div>
                <label className="font-mono text-slate-400 block mb-1">Storeroom Code</label>
                <input
                  type="text"
                  required
                  value={editingRoom.storeroom_id || ''}
                  onChange={(e) => setEditingRoom({ ...editingRoom, storeroom_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="font-mono text-slate-400 block mb-1">Storeroom Name *</label>
                <input
                  type="text"
                  required
                  value={editingRoom.name || editingRoom.storeroom_name || ''}
                  onChange={(e) =>
                    setEditingRoom({
                      ...editingRoom,
                      name: e.target.value,
                      storeroom_name: e.target.value,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  placeholder="e.g. Central Storeroom"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-mono text-slate-400 block mb-1">Linked Department</label>
                  <select
                    value={editingRoom.department_code || ''}
                    onChange={(e) => setEditingRoom({ ...editingRoom, department_code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-white font-mono"
                  >
                    {departments.map((d) => (
                      <option key={d.department_code} value={d.department_code}>
                        {d.department_code} - {d.department_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-mono text-slate-400 block mb-1">Storekeeper / In-Charge</label>
                  <input
                    type="text"
                    value={editingRoom.in_charge || editingRoom.manager_name || ''}
                    onChange={(e) =>
                      setEditingRoom({
                        ...editingRoom,
                        in_charge: e.target.value,
                        manager_name: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    placeholder="e.g. Budi Raharjo"
                  />
                </div>
              </div>

              <div>
                <label className="font-mono text-slate-400 block mb-1">Default Bin Location Prefix</label>
                <input
                  type="text"
                  value={editingRoom.default_bin_prefix || ''}
                  onChange={(e) => setEditingRoom({ ...editingRoom, default_bin_prefix: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  placeholder="e.g. CSR (will form CSR-A1, CSR-B2)"
                />
              </div>

              <div>
                <label className="font-mono text-slate-400 block mb-1">Description / Location Details</label>
                <textarea
                  rows={2}
                  value={editingRoom.description || ''}
                  onChange={(e) => setEditingRoom({ ...editingRoom, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  placeholder="Basement 1, near loading dock..."
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                {storerooms.some((s) => s.storeroom_id === editingRoom.storeroom_id) ? (
                  <button
                    type="button"
                    onClick={() => {
                      const match = storerooms.find((s) => s.storeroom_id === editingRoom.storeroom_id);
                      if (match) promptDeleteStoreroom(match);
                    }}
                    className="px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Storeroom</span>
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold shadow-lg shadow-blue-950 text-xs flex items-center gap-1.5"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{saving ? 'Saving...' : 'Save Storeroom'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal (Bypasses browser iframe dialog restrictions) */}
      {roomToDelete && (() => {
        const targetId = roomToDelete.storeroom_id;
        const targetName = roomToDelete.storeroom_name || roomToDelete.name || targetId;
        const targetItems = items.filter((i) =>
          i.storeroom_stocks?.some((s) => s.storeroom_id === targetId && s.quantity > 0)
        );
        const targetValuation = targetItems.reduce((sum, item) => {
          const loc = item.storeroom_stocks?.find((s) => s.storeroom_id === targetId);
          return sum + (loc ? loc.quantity * (item.average_cost || 0) : 0);
        }, 0);

        return (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget && !isDeleting) setRoomToDelete(null);
            }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in"
          >
            <div className="bg-slate-900 border border-rose-800/70 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl space-y-4 p-6 relative">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setRoomToDelete(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-3 pr-6">
                <div className="p-2.5 rounded-xl bg-rose-950 text-rose-400 border border-rose-800/60 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">Delete Storeroom Location?</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Are you sure you want to delete <span className="font-semibold text-rose-300">{targetName}</span> (<code className="font-mono text-slate-300">{targetId}</code>)? This will permanently remove it from active hotel storerooms.
                  </p>
                </div>
              </div>

              {targetItems.length > 0 && (
                <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs space-y-2">
                  <div className="font-bold text-amber-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>Active Inventory Warning</span>
                    </span>
                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-200">
                      {targetItems.length} SKUs
                    </span>
                  </div>
                  <p className="text-amber-200/90 text-[11px] leading-relaxed">
                    This storeroom currently holds stock valued at <strong className="font-mono">Rp {targetValuation.toLocaleString('id-ID')}</strong>. Deleting this storeroom will unassign these stock records:
                  </p>
                  <ul className="text-[11px] text-amber-300/80 list-disc list-inside space-y-0.5 max-h-24 overflow-y-auto font-mono">
                    {targetItems.slice(0, 5).map((it) => (
                      <li key={it.item_id} className="truncate">
                        {it.item_name} ({it.storeroom_stocks?.find((s) => s.storeroom_id === targetId)?.quantity || 0} {it.unit_of_measure})
                      </li>
                    ))}
                    {targetItems.length > 5 && (
                      <li className="text-amber-400 font-sans italic">...and {targetItems.length - 5} more items</li>
                    )}
                  </ul>
                </div>
              )}

              {deleteModalError && (
                <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-lg text-xs text-rose-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{deleteModalError}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setRoomToDelete(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="confirm-delete-storeroom-btn"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-rose-950 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Permanently Delete Storeroom</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
