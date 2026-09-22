/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Warehouse,
  Plus,
  Edit2,
  Building,
  User,
  Package,
  MapPin,
  X,
  RefreshCw,
  Search,
  DollarSign,
} from 'lucide-react';
import { InventoryStoreroom, InventoryItem, Department } from '../../types';
import { api } from '../../services/api';

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

  const loadData = async () => {
    try {
      setLoading(true);
      const [rooms, allItems] = await Promise.all([
        api.getInventoryStorerooms(),
        api.getInventoryItems(),
      ]);
      setStorerooms(rooms);
      setItems(allItems);
      if (!activeStoreroomId && rooms.length > 0) {
        setActiveStoreroomId(rooms[0].storeroom_id);
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

  useEffect(() => {
    if (selectedStoreroomId) {
      setActiveStoreroomId(selectedStoreroomId);
    }
  }, [selectedStoreroomId]);

  const handleOpenCreate = () => {
    setEditingRoom({
      storeroom_id: `STORE-${Date.now().toString().slice(-4)}`,
      storeroom_name: '',
      department_code: departments[0]?.department_code || 'F&B',
      in_charge: '',
      default_bin_prefix: 'LOC',
      is_active: true,
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sr: InventoryStoreroom) => {
    setEditingRoom({ ...sr });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom || !editingRoom.storeroom_name) return;

    setSaving(true);
    try {
      await api.saveInventoryStoreroom(editingRoom);
      await loadData();
      setIsModalOpen(false);
      setEditingRoom(null);
    } catch (err: any) {
      alert(err.message || 'Failed to save storeroom');
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
            Physical hotel storerooms linked to departments and assigned storekeepers.
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEdit(sr);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-white"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
                <h4 className="text-xs font-bold text-white mt-1 line-clamp-1">{sr.storeroom_name}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  <span>{sr.department_code}</span>
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <div className="text-xs font-bold font-mono text-emerald-400">
                  IDR {(storeVal ?? 0).toLocaleString()}
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
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl space-y-4 p-5">
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
                <span className="text-slate-200">{currentStoreroom.in_charge}</span> • Bin Prefix:{' '}
                <span className="font-mono text-emerald-400">{currentStoreroom.default_bin_prefix}-*</span>
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Total Store Value</span>
                <span className="text-base font-bold font-mono text-emerald-400">
                  IDR {(totalStoreValuation ?? 0).toLocaleString()}
                </span>
              </div>

              <div className="relative min-w-[200px]">
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
                  <th className="px-4 py-2.5 text-right">Unit Avg Cost</th>
                  <th className="px-4 py-2.5 text-right">Store Valuation</th>
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
                        IDR {(item.average_cost ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-medium text-emerald-400">
                        IDR {(val ?? 0).toLocaleString()}
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
                  value={editingRoom.storeroom_name || ''}
                  onChange={(e) => setEditingRoom({ ...editingRoom, storeroom_name: e.target.value })}
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
                    value={editingRoom.in_charge || ''}
                    onChange={(e) => setEditingRoom({ ...editingRoom, in_charge: e.target.value })}
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

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold shadow-lg shadow-blue-950"
                >
                  {saving ? 'Saving...' : 'Save Storeroom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
