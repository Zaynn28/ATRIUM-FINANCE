/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Filter,
  Plus,
  Edit2,
  FileSpreadsheet,
  Scan,
  AlertTriangle,
  CheckCircle2,
  X,
  Building,
  DollarSign,
  Tag,
  Warehouse,
  MapPin,
  RefreshCw,
  QrCode,
} from 'lucide-react';
import {
  InventoryItem,
  InventoryCategory,
  InventoryStoreroom,
  Account,
} from '../../types';
import { api } from '../../services/api';

interface ItemMasterViewProps {
  onOpenStockCard: (itemId: string) => void;
  onOpenScanner: () => void;
  accounts: Account[];
}

export const ItemMasterView: React.FC<ItemMasterViewProps> = ({
  onOpenStockCard,
  onOpenScanner,
  accounts,
}) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [storerooms, setStorerooms] = useState<InventoryStoreroom[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW' | 'OUT' | 'HEALTHY'>('ALL');
  const [loading, setLoading] = useState(true);

  // Edit / Add Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<InventoryItem> | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Barcode Tag Preview Modal
  const [barcodePreviewItem, setBarcodePreviewItem] = useState<InventoryItem | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsRes, catsRes, roomsRes] = await Promise.all([
        api.getInventoryItems(),
        api.getInventoryCategories(),
        api.getInventoryStorerooms(),
      ]);
      setItems(itemsRes);
      setCategories(catsRes);
      setStorerooms(roomsRes);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    const defaultCat = categories[0]?.category_id || 'CAT-FB-BEV';
    const catObj = (categories || []).find((c) => c.category_id === defaultCat);
    setEditingItem({
      item_code: `ITM-${Date.now().toString().slice(-4)}`,
      item_name: '',
      category_id: defaultCat,
      subcategory: catObj?.subcategories?.[0] || 'General',
      uom: 'PCS',
      min_stock: 10,
      max_stock: 100,
      reorder_point: 20,
      average_cost: 0,
      last_purchase_price: 0,
      inventory_gl_account: catObj?.default_inventory_gl_account || '1080',
      expense_gl_account: catObj?.default_expense_gl_account || '5110',
      supplier: '',
      is_active: true,
      barcode: `899${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      storeroom_stocks: storerooms.map((sr) => ({
        storeroom_id: sr.storeroom_id,
        quantity: 0,
        bin_location: `${sr.default_bin_prefix || 'A'}-01`,
      })),
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem({ ...item });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!editingItem.item_code || !editingItem.item_name) {
      setModalError('Item code and item name are required.');
      return;
    }

    setSaving(true);
    setModalError(null);
    try {
      await api.saveInventoryItem(editingItem);
      await loadData();
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (err: any) {
      setModalError(err.message || 'Failed to save inventory item');
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const q = search.toLowerCase();
    const matchQuery =
      item.item_code.toLowerCase().includes(q) ||
      item.item_name.toLowerCase().includes(q) ||
      (item.barcode && item.barcode.toLowerCase().includes(q)) ||
      (item.supplier && item.supplier.toLowerCase().includes(q));

    if (!matchQuery) return false;
    if (selectedCategory !== 'ALL' && item.category_id !== selectedCategory) return false;

    if (stockFilter === 'LOW') return item.current_stock > 0 && item.current_stock <= item.reorder_point;
    if (stockFilter === 'OUT') return item.current_stock === 0;
    if (stockFilter === 'HEALTHY') return item.current_stock > item.reorder_point;

    return true;
  });

  return (
    <div className="space-y-5">
      {/* Integrity Notice */}
      <div className="p-3.5 bg-blue-950/30 border border-blue-800/40 rounded-xl flex items-start gap-3 text-xs text-blue-200">
        <Package className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-white">Perpetual Stock Integrity:</span> Current stock
          quantities cannot be manually keyed in on this screen. Stock levels adjust strictly via Goods
          Receiving (PO), Department Requisitions/Issues, Transfers, Physical Stock Counts, and
          Controlled Adjustments with full double-entry GL journals.
        </div>
      </div>

      {/* Action and Filter Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search bar */}
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code, SKU, name, barcode, supplier..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>
                {c.category_name}
              </option>
            ))}
          </select>

          {/* Stock Level Filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setStockFilter('ALL')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                stockFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setStockFilter('LOW')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                stockFilter === 'LOW' ? 'bg-amber-600 text-white' : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              Low Stock ({items.filter((i) => i.current_stock > 0 && i.current_stock <= i.reorder_point).length})
            </button>
            <button
              onClick={() => setStockFilter('OUT')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                stockFilter === 'OUT' ? 'bg-rose-600 text-white' : 'text-rose-400 hover:text-rose-300'
              }`}
            >
              Out of Stock ({items.filter((i) => i.current_stock === 0).length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenScanner}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
          >
            <Scan className="w-3.5 h-3.5 text-emerald-400" />
            <span>Scan Barcode</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Item Master</span>
          </button>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Code / Barcode</th>
                <th className="px-4 py-3">Item Description</th>
                <th className="px-4 py-3">Category & Sub</th>
                <th className="px-4 py-3">UOM</th>
                <th className="px-4 py-3 text-right">Current Stock</th>
                <th className="px-4 py-3 text-right">Reorder Pt</th>
                <th className="px-4 py-3 text-right">Moving Avg Cost</th>
                <th className="px-4 py-3 text-right">Inventory Value</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 font-mono">
                    No inventory items match the current search or filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isLow = item.current_stock <= item.reorder_point;
                  const isOut = item.current_stock === 0;
                  const totalValuation = item.current_stock * item.average_cost;

                  return (
                    <tr key={item.item_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                          <span>{item.item_code}</span>
                        </div>
                        {item.barcode && (
                          <div
                            onClick={() => setBarcodePreviewItem(item)}
                            className="text-[10px] font-mono text-slate-400 hover:text-emerald-400 cursor-pointer flex items-center gap-1 mt-0.5"
                          >
                            <QrCode className="w-3 h-3" />
                            <span>{item.barcode}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{item.item_name}</div>
                        <div className="text-[11px] text-slate-400">
                          Supplier: {item.supplier || 'Direct'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] font-medium block w-fit mb-0.5">
                          {(categories || []).find((c) => c.category_id === item.category_id)?.category_name || item.category_id}
                        </span>
                        <span className="text-[10px] text-slate-400">{item.subcategory}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-300">{item.uom}</td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-mono font-bold text-sm ${
                            isOut ? 'text-rose-500' : isLow ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        >
                          {(item.current_stock ?? 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Min: {item.min_stock} / Max: {item.max_stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-400">
                        {item.reorder_point} {item.uom}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-300">
                        IDR {(item.average_cost ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-white">
                        IDR {(totalValuation ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            isOut
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : isLow
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {isOut ? 'OUT OF STOCK' : isLow ? 'LOW STOCK' : 'IN STOCK'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenStockCard(item.item_id)}
                            title="View Perpetual Stock Card"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 transition-colors"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Item Master"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Item Modal */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-400" />
                <span>{editingItem.item_id ? 'Edit Item Master Record' : 'Create New Hotel Inventory Item'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-5 overflow-y-auto space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Item Code (SKU) *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.item_code || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, item_code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono"
                    placeholder="e.g. ITM-FB-RICE01"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Barcode / EAN-13</label>
                  <input
                    type="text"
                    value={editingItem.barcode || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, barcode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono"
                    placeholder="e.g. 8992753110201"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-mono text-slate-400 block mb-1">Item Description / Name *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.item_name || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, item_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                    placeholder="e.g. Premium Jasmine Rice 20kg Sack"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Category</label>
                  <select
                    value={editingItem.category_id || ''}
                    onChange={(e) => {
                      const catId = e.target.value;
                      const catObj = (categories || []).find((c) => c.category_id === catId);
                      setEditingItem({
                        ...editingItem,
                        category_id: catId,
                        subcategory: catObj?.subcategories?.[0] || 'General',
                        inventory_gl_account: catObj?.default_inventory_gl_account || editingItem.inventory_gl_account,
                        expense_gl_account: catObj?.default_expense_gl_account || editingItem.expense_gl_account,
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                  >
                    {categories.map((c) => (
                      <option key={c.category_id} value={c.category_id}>
                        {c.category_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Subcategory</label>
                  <input
                    type="text"
                    value={editingItem.subcategory || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, subcategory: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                    placeholder="e.g. Dry Groceries"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Unit of Measure (UOM)</label>
                  <select
                    value={editingItem.uom || 'PCS'}
                    onChange={(e) => setEditingItem({ ...editingItem, uom: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono"
                  >
                    <option value="PCS">PCS (Pieces)</option>
                    <option value="KG">KG (Kilograms)</option>
                    <option value="LTR">LTR (Liters)</option>
                    <option value="CAN">CAN (Cans)</option>
                    <option value="BOTTLE">BOTTLE</option>
                    <option value="BOX">BOX</option>
                    <option value="PACK">PACK</option>
                    <option value="ROLL">ROLL</option>
                    <option value="BAG">BAG</option>
                    <option value="SET">SET</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Supplier / Preferred Vendor</label>
                  <input
                    type="text"
                    value={editingItem.supplier || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, supplier: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                    placeholder="e.g. PT Sukses Jaya Pangan"
                  />
                </div>

                {/* Stock Thresholds */}
                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Min Stock Level</label>
                  <input
                    type="number"
                    min="0"
                    value={editingItem.min_stock || 0}
                    onChange={(e) => setEditingItem({ ...editingItem, min_stock: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Reorder Point</label>
                  <input
                    type="number"
                    min="0"
                    value={editingItem.reorder_point || 0}
                    onChange={(e) => setEditingItem({ ...editingItem, reorder_point: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">Max Stock Level</label>
                  <input
                    type="number"
                    min="0"
                    value={editingItem.max_stock || 0}
                    onChange={(e) => setEditingItem({ ...editingItem, max_stock: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">
                    Moving Avg Cost (IDR) {editingItem.item_id ? '(Auto Calculated)' : ''}
                  </label>
                  <input
                    type="number"
                    min="0"
                    disabled={Boolean(editingItem.item_id)}
                    value={editingItem.average_cost || 0}
                    onChange={(e) => setEditingItem({ ...editingItem, average_cost: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono disabled:opacity-60"
                  />
                </div>

                {/* GL Mappings */}
                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">GL Inventory Asset Account</label>
                  <select
                    value={editingItem.inventory_gl_account || '1080'}
                    onChange={(e) => setEditingItem({ ...editingItem, inventory_gl_account: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
                  >
                    {accounts
                      .filter((a) => a.account_type === 'ASSET')
                      .map((a) => (
                        <option key={a.account_code} value={a.account_code}>
                          {a.account_code} - {a.account_name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 block mb-1">GL Default Expense Account</label>
                  <select
                    value={editingItem.expense_gl_account || '5110'}
                    onChange={(e) => setEditingItem({ ...editingItem, expense_gl_account: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
                  >
                    {accounts
                      .filter((a) => a.account_type === 'EXPENSE' || a.account_type === 'COST_OF_SALES')
                      .map((a) => (
                        <option key={a.account_code} value={a.account_code}>
                          {a.account_code} - {a.account_name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition-colors"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save Item Master'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Tag Preview Modal */}
      {barcodePreviewItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl text-center">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">Barcode Tag</h4>
              <button
                onClick={() => setBarcodePreviewItem(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-white rounded-xl text-black space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                ATRIUM HOTEL & RESORT
              </div>
              <div className="text-sm font-black text-slate-900">{barcodePreviewItem.item_name}</div>
              <div className="text-xs font-mono text-slate-600">SKU: {barcodePreviewItem.item_code}</div>

              {/* Barcode Graphic Simulation */}
              <div className="py-2 flex flex-col items-center">
                <div className="flex items-end justify-center h-12 gap-0.5 w-48">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-black"
                      style={{
                        width: i % 3 === 0 ? '3px' : '1.5px',
                        height: i % 2 === 0 ? '100%' : '85%',
                      }}
                    />
                  ))}
                </div>
                <div className="font-mono text-xs tracking-widest text-slate-800 mt-1">
                  {barcodePreviewItem.barcode}
                </div>
              </div>

              <div className="text-[10px] text-slate-500">
                UOM: {barcodePreviewItem.uom} • Dept: {barcodePreviewItem.subcategory}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setBarcodePreviewItem(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
              >
                Close Tag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
