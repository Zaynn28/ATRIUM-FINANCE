/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  CheckCircle2,
  DollarSign,
  Tag,
  X,
  RefreshCw,
  FolderTree,
} from 'lucide-react';
import { InventoryCategory, Account } from '../../types';
import { api } from '../../services/api';

interface CategoriesViewProps {
  accounts?: Account[];
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({ accounts: propAccounts = [] }) => {
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [accounts, setAccounts] = useState<Account[]>(propAccounts);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<InventoryCategory> | null>(null);
  const [subcatInput, setSubcatInput] = useState('');
  const [saving, setSaving] = useState(false);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await api.getInventoryCategories();
      setCategories(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    if (!propAccounts || propAccounts.length === 0) {
      api.getAccounts().then(setAccounts).catch(console.error);
    } else {
      setAccounts(propAccounts);
    }
  }, [propAccounts]);

  const handleOpenCreate = () => {
    setEditingCategory({
      category_id: `CAT-HOTEL-${Date.now().toString().slice(-4)}`,
      category_name: '',
      subcategories: ['General'],
      default_inventory_gl_account: '1080',
      default_expense_gl_account: '5110',
      valuation_method: 'MOVING_AVERAGE',
      description: '',
    });
    setSubcatInput('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: InventoryCategory) => {
    setEditingCategory({ ...cat });
    setSubcatInput('');
    setIsModalOpen(true);
  };

  const handleAddSubcat = () => {
    if (!subcatInput.trim() || !editingCategory) return;
    const current = editingCategory.subcategories || [];
    if (!current.includes(subcatInput.trim())) {
      setEditingCategory({
        ...editingCategory,
        subcategories: [...current, subcatInput.trim()],
      });
    }
    setSubcatInput('');
  };

  const handleRemoveSubcat = (sub: string) => {
    if (!editingCategory) return;
    setEditingCategory({
      ...editingCategory,
      subcategories: (editingCategory.subcategories || []).filter((s) => s !== sub),
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.category_name) return;

    setSaving(true);
    try {
      await api.saveInventoryCategory(editingCategory);
      await loadCategories();
      setIsModalOpen(false);
      setEditingCategory(null);
    } catch (err: any) {
      alert(err.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <span>Inventory Categories & Accounting Mappings</span>
          </h3>
          <p className="text-xs text-slate-400">
            Define classification taxonomies and default double-entry GL accounts (Asset vs Expense/COS).
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Category</span>
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => {
          const invAccount = (accounts || []).find((a) => a.account_code === cat.default_inventory_gl_account);
          const expAccount = (accounts || []).find((a) => a.account_code === cat.default_expense_gl_account);

          return (
            <div
              key={cat.category_id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all space-y-4 shadow-lg"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {cat.category_id}
                    </span>
                    <h4 className="text-base font-bold text-white mt-1.5">{cat.category_name}</h4>
                  </div>
                  <button
                    onClick={() => handleOpenEdit(cat)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs text-slate-400 mt-2">{cat.description || 'No description provided.'}</p>

                {/* Subcategories Tags */}
                <div className="mt-3">
                  <span className="text-[11px] font-mono text-slate-400 block mb-1.5">Subcategories:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.subcategories.map((sub) => (
                      <span
                        key={sub}
                        className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700/60 text-slate-300 text-[11px]"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* GL Mappings */}
              <div className="pt-3 border-t border-slate-800 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-mono">Asset (Stock):</span>
                  <span className="font-mono font-semibold text-emerald-400">
                    {cat.default_inventory_gl_account} ({invAccount?.account_name || 'Inventory'})
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-mono">Expense/COS:</span>
                  <span className="font-mono font-semibold text-amber-400">
                    {cat.default_expense_gl_account} ({expAccount?.account_name || 'Operating Cost'})
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-mono">Valuation:</span>
                  <span className="font-mono text-slate-300">{cat.valuation_method}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {isModalOpen && editingCategory && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                <span>Save Category Definition</span>
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
                <label className="font-mono text-slate-400 block mb-1">Category Code</label>
                <input
                  type="text"
                  required
                  value={editingCategory.category_id || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, category_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm"
                />
              </div>

              <div>
                <label className="font-mono text-slate-400 block mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={editingCategory.category_name || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, category_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="e.g. Food & Beverage"
                />
              </div>

              <div>
                <label className="font-mono text-slate-400 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingCategory.description || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs"
                />
              </div>

              {/* Subcategories Editor */}
              <div>
                <label className="font-mono text-slate-400 block mb-1">Subcategories</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={subcatInput}
                    onChange={(e) => setSubcatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubcat();
                      }
                    }}
                    placeholder="Type subcategory and press Add..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubcat}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {editingCategory.subcategories?.map((sub) => (
                    <span
                      key={sub}
                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 flex items-center gap-1 border border-slate-700"
                    >
                      <span>{sub}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubcat(sub)}
                        className="text-slate-400 hover:text-rose-400"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* GL Accounts */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-mono text-slate-400 block mb-1">Default Inventory Asset GL</label>
                  <select
                    value={editingCategory.default_inventory_gl_account || '1080'}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, default_inventory_gl_account: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200 font-mono"
                  >
                    {(accounts || [])
                      .filter((a) => a.account_type === 'ASSET')
                      .map((a) => (
                        <option key={a.account_code} value={a.account_code}>
                          {a.account_code} - {a.account_name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="font-mono text-slate-400 block mb-1">Default Expense GL</label>
                  <select
                    value={editingCategory.default_expense_gl_account || '5110'}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, default_expense_gl_account: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200 font-mono"
                  >
                    {(accounts || [])
                      .filter((a) => a.account_type === 'EXPENSE' || a.account_type === 'COST_OF_SALES')
                      .map((a) => (
                        <option key={a.account_code} value={a.account_code}>
                          {a.account_code} - {a.account_name}
                        </option>
                      ))}
                  </select>
                </div>
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow-lg shadow-emerald-950"
                >
                  {saving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
