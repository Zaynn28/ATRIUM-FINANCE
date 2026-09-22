/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Plus,
  CheckCircle2,
  Warehouse,
  FileText,
  DollarSign,
  ExternalLink,
  Trash2,
  RefreshCw,
  Scan,
} from 'lucide-react';
import {
  InventoryItem,
  InventoryStoreroom,
  StockAdjustmentRecord,
} from '../../types';
import { api } from '../../services/api';

interface StockAdjustmentViewProps {
  onViewJournal?: (journalId: string) => void;
  onOpenScanner: () => void;
}

export const StockAdjustmentView: React.FC<StockAdjustmentViewProps> = ({
  onViewJournal,
  onOpenScanner,
}) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [storerooms, setStorerooms] = useState<InventoryStoreroom[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustmentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [adjType, setAdjType] = useState<'ADJUSTMENT_OUT' | 'ADJUSTMENT_IN'>('ADJUSTMENT_OUT');
  const [storeroomId, setStoreroomId] = useState('CSR-01');
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reasonCode, setReasonCode] = useState('EXPIRED');
  const [reasonNotes, setReasonNotes] = useState('Expired items pulled during routine safety inspection.');

  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ text: string; journalId?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemList, roomList, adjList] = await Promise.all([
        api.getInventoryItems(),
        api.getInventoryStorerooms(),
        api.getStockAdjustments(),
      ]);
      setItems(itemList);
      setStorerooms(roomList);
      setAdjustments(adjList);
      if (itemList.length > 0 && !itemId) {
        setItemId(itemList[0].item_id);
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

  const selectedItem = items.find((i) => i.item_id === itemId);
  const storeroomStock =
    selectedItem?.storeroom_stocks?.find((s) => s.storeroom_id === storeroomId)?.quantity || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotification(null);

    if (!itemId) {
      setError('Please select an item.');
      return;
    }

    if (quantity <= 0) {
      setError('Adjustment quantity must be greater than zero.');
      return;
    }

    if (!reasonNotes.trim()) {
      setError('Reason notes / explanation are mandatory for inventory adjustments.');
      return;
    }

    if (adjType === 'ADJUSTMENT_OUT' && quantity > storeroomStock) {
      setError(
        `Cannot write off ${quantity} ${selectedItem?.uom}. Only ${storeroomStock} available in storeroom ${storeroomId}.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createStockAdjustment({
        date,
        type: adjType,
        storeroom_id: storeroomId,
        item_id: itemId,
        quantity,
        reason_code: reasonCode,
        reason_notes: reasonNotes,
      });

      setNotification({
        text: `Stock adjustment #${res.adjustment.adjustment_id} posted successfully. Inventory updated and write-off journal created.`,
        journalId: res.journal_id,
      });

      await loadData();
      setQuantity(1);
    } catch (err: any) {
      setError(err.message || 'Failed to post adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <span>Controlled Stock Adjustments & Spoilage Write-Offs</span>
          </h3>
          <p className="text-xs text-slate-400">
            Log spoiled, damaged, or expired stock with compulsory justifications and automated GL shrinkage entries.
          </p>
        </div>

        <button
          onClick={onOpenScanner}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
        >
          <Scan className="w-3.5 h-3.5 text-emerald-400" />
          <span>Scan Barcode</span>
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
              <span className="text-slate-300">GL Shrinkage Journal:</span>
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
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1">Adjustment Type</label>
            <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setAdjType('ADJUSTMENT_OUT')}
                className={`flex-1 py-1 text-xs font-semibold rounded transition-colors ${
                  adjType === 'ADJUSTMENT_OUT'
                    ? 'bg-rose-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Write-Off (OUT)
              </button>
              <button
                type="button"
                onClick={() => setAdjType('ADJUSTMENT_IN')}
                className={`flex-1 py-1 text-xs font-semibold rounded transition-colors ${
                  adjType === 'ADJUSTMENT_IN'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Surplus (IN)
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1">Adjustment Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1">Storeroom Location</label>
            <select
              value={storeroomId}
              onChange={(e) => setStoreroomId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
            >
              {storerooms.map((s) => (
                <option key={s.storeroom_id} value={s.storeroom_id}>
                  {s.storeroom_id} - {s.storeroom_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1">Reason Code *</label>
            <select
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
            >
              <option value="EXPIRED">EXPIRED - Past Expiry Date</option>
              <option value="DAMAGED">DAMAGED - Broken / Handling Damage</option>
              <option value="SPOILAGE">SPOILAGE - Kitchen / Perishable Spoilage</option>
              <option value="THEFT_LOSS">THEFT_LOSS - Unaccounted Shortage</option>
              <option value="FOUND_STOCK">FOUND_STOCK - Unrecorded Physical Item Found</option>
              <option value="AUDIT_CORRECTION">AUDIT_CORRECTION - Administrative Correction</option>
            </select>
          </div>
        </div>

        {/* Item Selection & Quantity */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
          <div className="sm:col-span-2">
            <label className="text-xs font-mono text-slate-400 block mb-1">Item to Adjust</label>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
            >
              {items.map((it) => (
                <option key={it.item_id} value={it.item_id}>
                  [{it.item_code}] {it.item_name} (Total Stock: {it.current_stock} {it.uom})
                </option>
              ))}
            </select>
            <div className="text-[11px] font-mono text-slate-400 mt-1">
              Held in {storeroomId}:{' '}
              <span className="text-white font-bold">
                {storeroomStock} {selectedItem?.uom || 'PCS'}
              </span>{' '}
              • Unit Avg Cost:{' '}
              <span className="text-emerald-400">IDR {(selectedItem?.average_cost ?? 0).toLocaleString()}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1">
              Quantity ({selectedItem?.uom || 'PCS'})
            </label>
            <input
              type="number"
              step="any"
              min="0.1"
              required
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono text-right"
            />
            <div className="text-[11px] font-mono text-slate-400 mt-1 text-right">
              Total Valuation:{' '}
              <span className="text-emerald-400 font-bold">
                IDR {(((selectedItem?.average_cost || 0) * quantity) || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-mono text-slate-400 block mb-1">
            Mandatory Auditor / Justification Notes *
          </label>
          <textarea
            rows={2}
            required
            value={reasonNotes}
            onChange={(e) => setReasonNotes(e.target.value)}
            placeholder="Document why this write-off or surplus adjustment is occurring..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
          />
        </div>

        <div className="pt-3 border-t border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-950 transition-colors"
          >
            {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
            <span>Post Stock Adjustment & GL Journal</span>
          </button>
        </div>
      </form>

      {/* Adjustments Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-rose-400" />
          <span>Historical Stock Adjustments Audit Trail</span>
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="px-4 py-2.5">Adjustment #</th>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Item</th>
                <th className="px-4 py-2.5">Storeroom</th>
                <th className="px-4 py-2.5 text-right">Quantity</th>
                <th className="px-4 py-2.5 text-right">Valuation (IDR)</th>
                <th className="px-4 py-2.5">Reason Code & Notes</th>
                <th className="px-4 py-2.5">Authorized By</th>
                <th className="px-4 py-2.5 text-right">Journal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {adjustments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500 font-mono">
                    No stock adjustments recorded.
                  </td>
                </tr>
              ) : (
                adjustments.map((adj) => (
                  <tr key={adj.adjustment_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono font-bold text-rose-400">
                      {adj.adjustment_number}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-400">{adj.date}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          adj.type === 'ADJUSTMENT_OUT'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {adj.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-white">{adj.item_name}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-400">{adj.storeroom_id}</td>
                    <td
                      className={`px-4 py-2.5 text-right font-mono font-bold ${
                        adj.type === 'ADJUSTMENT_OUT' ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {adj.type === 'ADJUSTMENT_OUT' ? `-${adj.quantity}` : `+${adj.quantity}`} {adj.uom}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-white">
                      IDR {(adj.total_cost ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-[11px]">
                      <span className="font-mono text-slate-300 font-bold block">{adj.reason_code}</span>
                      <span className="text-slate-400 line-clamp-1">{adj.reason_notes}</span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 text-[11px]">{adj.authorized_by}</td>
                    <td className="px-4 py-2.5 text-right">
                      {adj.journal_id && onViewJournal ? (
                        <button
                          onClick={() => onViewJournal(adj.journal_id!)}
                          className="text-[11px] font-mono text-emerald-400 hover:underline flex items-center gap-1 justify-end"
                        >
                          <span>{adj.journal_id}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-slate-500 font-mono">-</span>
                      )}
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
