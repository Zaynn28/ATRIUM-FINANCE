/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Search,
  Filter,
  Warehouse,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Package,
  Layers,
} from 'lucide-react';
import {
  InventoryItem,
  InventoryStoreroom,
  StockMovement,
} from '../../types';
import { api } from '../../services/api';

interface StockCardViewProps {
  initialItemId?: string;
}

export const StockCardView: React.FC<StockCardViewProps> = ({ initialItemId }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [storerooms, setStorerooms] = useState<InventoryStoreroom[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>(initialItemId || '');
  const [selectedStoreroom, setSelectedStoreroom] = useState<string>('ALL');
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemList, roomList] = await Promise.all([
        api.getInventoryItems(),
        api.getInventoryStorerooms(),
      ]);
      setItems(itemList);
      setStorerooms(roomList);
      if (itemList.length > 0 && !selectedItemId) {
        setSelectedItemId(itemList[0].item_id);
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
    if (initialItemId) {
      setSelectedItemId(initialItemId);
    }
  }, [initialItemId]);

  useEffect(() => {
    const fetchMovements = async () => {
      try {
        const filters: { item_id?: string; storeroom_id?: string } = {};
        if (selectedItemId) filters.item_id = selectedItemId;
        if (selectedStoreroom && selectedStoreroom !== 'ALL') {
          filters.storeroom_id = selectedStoreroom;
        }
        const data = await api.getStockMovements(filters);
        setMovements(data);
      } catch (err: any) {
        console.error(err);
      }
    };
    fetchMovements();
  }, [selectedItemId, selectedStoreroom]);

  const activeItem = (items || []).find((i) => i.item_id === selectedItemId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-400" />
            <span>Perpetual Stock Card & Bin Movement History</span>
          </h3>
          <p className="text-xs text-slate-400">
            Audit-ready chronological transaction trail for any SKU across receipts, dispatches, transfers, and counts.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Select Item */}
          <div className="min-w-[240px]">
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
            >
              {items.map((it) => (
                <option key={it.item_id} value={it.item_id}>
                  [{it.item_code}] {it.item_name}
                </option>
              ))}
            </select>
          </div>

          {/* Select Storeroom */}
          <div className="min-w-[160px]">
            <select
              value={selectedStoreroom}
              onChange={(e) => setSelectedStoreroom(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
            >
              <option value="ALL">All Storerooms</option>
              {storerooms.map((s) => (
                <option key={s.storeroom_id} value={s.storeroom_id}>
                  {s.storeroom_id} - {s.storeroom_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Item Profile Card */}
      {activeItem && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase block">SKU Code</span>
            <span className="text-sm font-bold font-mono text-emerald-400">{activeItem.item_code}</span>
          </div>

          <div className="col-span-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Description</span>
            <span className="text-sm font-bold text-white line-clamp-1">{activeItem.item_name}</span>
          </div>

          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Total On-Hand</span>
            <span className="text-sm font-bold font-mono text-white">
              {(activeItem.current_stock ?? 0).toLocaleString()} {activeItem.uom}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Moving Avg Cost</span>
            <span className="text-sm font-bold font-mono text-blue-400">
              IDR {(activeItem.average_cost ?? 0).toLocaleString()}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Valuation Total</span>
            <span className="text-sm font-bold font-mono text-emerald-400">
              IDR {(((activeItem.current_stock ?? 0) * (activeItem.average_cost ?? 0)) || 0).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3">Movement Type</th>
                <th className="px-4 py-3">Storeroom</th>
                <th className="px-4 py-3">Document / Ref</th>
                <th className="px-4 py-3 text-right">In (Receipt)</th>
                <th className="px-4 py-3 text-right">Out (Issue)</th>
                <th className="px-4 py-3 text-right">Balance After</th>
                <th className="px-4 py-3 text-right">Unit Cost</th>
                <th className="px-4 py-3 text-right">Total Trans. Value</th>
                <th className="px-4 py-3">User / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-500 font-mono">
                    No recorded movements for this item and storeroom selection.
                  </td>
                </tr>
              ) : (
                movements.map((m) => {
                  const isIn =
                    m.type === 'RECEIVING' ||
                    m.type === 'TRANSFER_IN' ||
                    m.type === 'ADJUSTMENT_IN' ||
                    (m.type === 'COUNT_VARIANCE' && m.quantity > 0);
                  const isOut =
                    m.type === 'ISSUE_DEPARTMENT' ||
                    m.type === 'TRANSFER_OUT' ||
                    m.type === 'ADJUSTMENT_OUT' ||
                    (m.type === 'COUNT_VARIANCE' && m.quantity < 0);

                  const qtyAbsolute = Math.abs(m.quantity);
                  const transValue = qtyAbsolute * m.unit_cost;

                  return (
                    <tr key={m.movement_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-slate-400">{m.date}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold inline-flex items-center gap-1 ${
                            isIn
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {isIn ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          <span>{m.type}</span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-300">{m.storeroom_id}</td>
                      <td className="px-4 py-2.5 font-mono text-blue-400 font-semibold">
                        {m.reference_id}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-400">
                        {isIn ? `+${qtyAbsolute}` : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-rose-400">
                        {isOut ? `-${qtyAbsolute}` : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-white bg-slate-950/40">
                        {m.balance_after}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-400">
                        IDR {(m.unit_cost ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-medium text-slate-200">
                        IDR {(transValue ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-slate-400">
                        <span className="text-slate-300">{m.performed_by}</span>
                        {m.notes ? ` • ${m.notes}` : ''}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
