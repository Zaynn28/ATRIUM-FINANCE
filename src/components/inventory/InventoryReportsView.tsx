/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  AlertTriangle,
  PieChart,
  Warehouse,
  DollarSign,
  Clock,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import {
  InventoryItem,
  InventoryCategory,
  InventoryStoreroom,
  StockAdjustmentRecord,
} from '../../types';
import { api } from '../../services/api';

export const InventoryReportsView: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [storerooms, setStorerooms] = useState<InventoryStoreroom[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustmentRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'VALUATION' | 'REORDER' | 'SPOILAGE' | 'SLOW_MOVING'>('VALUATION');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [itemList, catList, roomList, adjList] = await Promise.all([
          api.getInventoryItems(),
          api.getInventoryCategories(),
          api.getInventoryStorerooms(),
          api.getStockAdjustments(),
        ]);
        setItems(itemList);
        setCategories(catList);
        setStorerooms(roomList);
        setAdjustments(adjList);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const totalValuation = items.reduce((sum, i) => sum + i.current_stock * i.average_cost, 0);

  // Valuation by Category
  const categoryValuation = categories.map((cat) => {
    const catItems = items.filter((i) => i.category_id === cat.category_id);
    const val = catItems.reduce((s, i) => s + i.current_stock * i.average_cost, 0);
    const percent = totalValuation > 0 ? (val / totalValuation) * 100 : 0;
    return {
      category: cat,
      itemsCount: catItems.length,
      valuation: val,
      percentage: percent,
    };
  });

  // Reorder Needed Items
  const reorderItems = items
    .filter((i) => i.current_stock <= i.min_stock)
    .map((i) => {
      const orderQty = Math.max(0, i.max_stock - i.current_stock);
      const estCost = orderQty * i.average_cost;
      return {
        item: i,
        orderQty,
        estCost,
      };
    });

  // Spoilage & Write-offs
  const totalSpoilageLoss = adjustments
    .filter((a) => a.type === 'ADJUSTMENT_OUT')
    .reduce((sum, a) => sum + a.total_cost, 0);

  const spoilageByReason = adjustments
    .filter((a) => a.type === 'ADJUSTMENT_OUT')
    .reduce((acc, a) => {
      acc[a.reason_code] = (acc[a.reason_code] || 0) + a.total_cost;
      return acc;
    }, {} as Record<string, number>);

  const exportCSV = () => {
    let csv = '';
    if (activeTab === 'VALUATION') {
      csv = 'Item Code,Item Name,Category,UOM,Current Stock,Unit Cost,Total Value\n';
      items.forEach((i) => {
        csv += `"${i.item_code}","${i.item_name}","${i.category_id}","${i.uom}",${i.current_stock},${i.average_cost},${i.current_stock * i.average_cost}\n`;
      });
    } else if (activeTab === 'REORDER') {
      csv = 'Item Code,Item Name,Current Stock,Min Stock,Max Stock,Suggested Order,Est Cost\n';
      reorderItems.forEach((r) => {
        csv += `"${r.item.item_code}","${r.item.item_name}",${r.item.current_stock},${r.item.min_stock},${r.item.max_stock},${r.orderQty},${r.estCost}\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_${activeTab.toLowerCase()}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <span>Hotel Cost Control & Inventory Financial Reports</span>
          </h3>
          <p className="text-xs text-slate-400">
            Valuation audits, reorder projections, and shrinkage write-off breakdowns for the Financial Controller.
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('VALUATION')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === 'VALUATION'
              ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Category & Store Valuation</span>
        </button>

        <button
          onClick={() => setActiveTab('REORDER')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === 'REORDER'
              ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Replenishment & Par Levels ({reorderItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SPOILAGE')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === 'SPOILAGE'
              ? 'bg-rose-600/30 text-rose-300 border border-rose-500/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <PieChart className="w-3.5 h-3.5" />
          <span>Shrinkage & Spoilage Analysis</span>
        </button>
      </div>

      {/* Content: Valuation */}
      {activeTab === 'VALUATION' && (
        <div className="space-y-6">
          {/* Summary KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-[11px] font-mono uppercase text-slate-400 block">Total Inventory Asset</span>
              <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                IDR {(totalValuation ?? 0).toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                Reconciled with GL 1080
              </span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-[11px] font-mono uppercase text-slate-400 block">Total Active SKUs</span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">
                {items.length} SKUs
              </span>
              <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                Across {categories.length} item categories
              </span>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-[11px] font-mono uppercase text-slate-400 block">Active Storerooms</span>
              <span className="text-xl font-bold font-mono text-blue-400 mt-1 block">
                {storerooms.length} Locations
              </span>
              <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                Central and satellite bars/kitchens
              </span>
            </div>
          </div>

          {/* Category Breakdown Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Inventory Asset Breakdown by Department Category</span>
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">Category Name</th>
                    <th className="px-4 py-2.5">Asset Account</th>
                    <th className="px-4 py-2.5">Expense / Cost Account</th>
                    <th className="px-4 py-2.5 text-right">Items Count</th>
                    <th className="px-4 py-2.5 text-right">Current Valuation (IDR)</th>
                    <th className="px-4 py-2.5 text-right w-44">% of Total Portfolio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {categoryValuation.map((cv) => (
                    <tr key={cv.category.category_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-2.5 font-bold text-white">{cv.category.category_name}</td>
                      <td className="px-4 py-2.5 font-mono text-emerald-400">
                        {cv.category.inventory_asset_account}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-blue-400">
                        {cv.category.expense_cost_account}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">{cv.itemsCount}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-400">
                        IDR {(cv.valuation ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${cv.percentage}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-slate-400 w-10 text-right">
                            {cv.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Content: Reorder */}
      {activeTab === 'REORDER' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Replenishment Reorder Recommendations</span>
              </h4>
              <p className="text-xs text-slate-400">
                Items currently at or below safety minimum stock. Calculate quantities required to restore par levels.
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">Total Reorder Budget</span>
              <span className="text-base font-bold font-mono text-amber-400">
                IDR {(reorderItems.reduce((s, r) => s + (r.estCost || 0), 0) || 0).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">Item Code</th>
                  <th className="px-4 py-2.5">Item Name</th>
                  <th className="px-4 py-2.5 text-right">Current On-Hand</th>
                  <th className="px-4 py-2.5 text-right">Min Safety Level</th>
                  <th className="px-4 py-2.5 text-right">Target Par Level</th>
                  <th className="px-4 py-2.5 text-right">Suggested Reorder Qty</th>
                  <th className="px-4 py-2.5 text-right">Unit Moving Avg</th>
                  <th className="px-4 py-2.5 text-right">Estimated Procurement Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {reorderItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-emerald-400 font-mono">
                      All inventory items are currently above safety stock thresholds.
                    </td>
                  </tr>
                ) : (
                  reorderItems.map((r) => (
                    <tr key={r.item.item_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-2.5 font-mono font-bold text-amber-400">{r.item.item_code}</td>
                      <td className="px-4 py-2.5 font-medium text-white">{r.item.item_name}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-rose-400">
                        {r.item.current_stock} {r.item.uom}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-400">
                        {r.item.min_stock} {r.item.uom}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-400">
                        {r.item.max_stock} {r.item.uom}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-300">
                        {r.orderQty} {r.item.uom}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-400">
                        IDR {(r.item.average_cost ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-400">
                        IDR {(r.estCost ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content: Spoilage & Shrinkage */}
      {activeTab === 'SPOILAGE' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Total Spoilage Losses</span>
              <span className="text-xl font-bold font-mono text-rose-400 mt-1 block">
                IDR {(totalSpoilageLoss ?? 0).toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                Expensed to GL 5180
              </span>
            </div>

            {Object.entries(spoilageByReason).map(([reason, amount]) => {
              const amtNum = Number(amount) || 0;
              return (
                <div key={reason} className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">{reason}</span>
                  <span className="text-base font-bold font-mono text-white mt-1 block">
                    IDR {(amtNum ?? 0).toLocaleString()}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                    {totalSpoilageLoss > 0 ? ((amtNum / totalSpoilageLoss) * 100).toFixed(1) : 0}% of losses
                  </span>
                </div>
              );
            })}
          </div>

          {/* Adjustments table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-rose-400" />
              <span>Recent Waste / Spoilage Incident Log</span>
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Item Name</th>
                    <th className="px-4 py-2.5">Storeroom</th>
                    <th className="px-4 py-2.5">Reason Code</th>
                    <th className="px-4 py-2.5 text-right">Written-Off Qty</th>
                    <th className="px-4 py-2.5 text-right">Financial Loss (IDR)</th>
                    <th className="px-4 py-2.5">Incident Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {adjustments
                    .filter((a) => a.type === 'ADJUSTMENT_OUT')
                    .map((a) => (
                      <tr key={a.adjustment_id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-slate-400">{a.date}</td>
                        <td className="px-4 py-2.5 font-semibold text-white">{a.item_name}</td>
                        <td className="px-4 py-2.5 font-mono text-slate-400">{a.storeroom_id}</td>
                        <td className="px-4 py-2.5 font-mono text-rose-400 font-bold">{a.reason_code}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-rose-400">
                          -{a.quantity} {a.uom}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-white">
                          IDR {(a.total_cost ?? 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-slate-400 text-[11px]">{a.reason_notes}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
