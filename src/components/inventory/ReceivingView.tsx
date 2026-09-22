/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowDownLeft,
  Plus,
  Trash2,
  CheckCircle2,
  FileText,
  Warehouse,
  Calendar,
  DollarSign,
  AlertCircle,
  ExternalLink,
  PackageCheck,
  RefreshCw,
} from 'lucide-react';
import {
  InventoryItem,
  InventoryStoreroom,
  GoodsReceipt,
} from '../../types';
import { api } from '../../services/api';

interface ReceivingViewProps {
  onViewJournal?: (journalId: string) => void;
  onOpenScanner: () => void;
}

interface ReceiptLineInput {
  item_id: string;
  received_quantity: number;
  unit_cost: number;
  bin_location?: string;
  batch_or_lot?: string;
  expiry_date?: string;
}

export const ReceivingView: React.FC<ReceivingViewProps> = ({
  onViewJournal,
  onOpenScanner,
}) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [storerooms, setStorerooms] = useState<InventoryStoreroom[]>([]);
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [poReference, setPoReference] = useState('PO-2026-03-042');
  const [vendorName, setVendorName] = useState('PT Sukses Jaya Pangan');
  const [storeroomId, setStoreroomId] = useState('CSR-01');
  const [notes, setNotes] = useState('Delivered via Delivery Order #DO-9921; temperature inspected & verified.');
  const [lines, setLines] = useState<ReceiptLineInput[]>([
    {
      item_id: '',
      received_quantity: 10,
      unit_cost: 0,
      bin_location: 'A-01',
      batch_or_lot: 'LOT-202603',
      expiry_date: '',
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<{
    text: string;
    receiptId: string;
    journalId?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemList, roomList, recList] = await Promise.all([
        api.getInventoryItems(),
        api.getInventoryStorerooms(),
        api.getGoodsReceipts(),
      ]);
      setItems(itemList);
      setStorerooms(roomList);
      setReceipts(recList);
      if (itemList.length > 0 && !lines[0]?.item_id) {
        setLines([
          {
            item_id: itemList[0].item_id,
            received_quantity: 10,
            unit_cost: itemList[0].average_cost || 50000,
            bin_location: 'A-01',
            batch_or_lot: 'LOT-202603',
            expiry_date: '',
          },
        ]);
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

  const handleItemSelect = (index: number, itemId: string) => {
    const selected = items.find((i) => i.item_id === itemId);
    const newLines = [...lines];
    newLines[index] = {
      ...newLines[index],
      item_id: itemId,
      unit_cost: selected?.average_cost || selected?.last_purchase_price || 0,
      bin_location: selected?.storeroom_stocks?.find((s) => s.storeroom_id === storeroomId)?.bin_location || 'A-01',
    };
    setLines(newLines);
  };

  const handleAddLine = () => {
    const firstItem = items[0];
    setLines([
      ...lines,
      {
        item_id: firstItem ? firstItem.item_id : '',
        received_quantity: 1,
        unit_cost: firstItem?.average_cost || 0,
        bin_location: 'A-01',
        batch_or_lot: '',
        expiry_date: '',
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return lines.reduce((sum, l) => sum + l.received_quantity * l.unit_cost, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    if (lines.length === 0) {
      setErrorMessage('Please add at least one item to receive.');
      return;
    }

    for (const line of lines) {
      if (!line.item_id) {
        setErrorMessage('Please select a valid item for all receipt rows.');
        return;
      }
      if (line.received_quantity <= 0) {
        setErrorMessage('Received quantity must be greater than 0.');
        return;
      }
      if (line.unit_cost <= 0) {
        setErrorMessage('Unit cost must be greater than 0.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await api.processGoodsReceipt({
        date,
        po_reference: poReference,
        vendor_name: vendorName,
        storeroom_id: storeroomId,
        items: lines,
        notes,
      });

      setSuccessMessage({
        text: `Goods Receipt #${res.receipt.receipt_id} processed successfully! Stock quantities & moving average costs updated.`,
        receiptId: res.receipt.receipt_id,
        journalId: res.journal_id,
      });

      // Reload inventory items and receipts
      await loadData();

      // Reset lines
      setLines([
        {
          item_id: items[0]?.item_id || '',
          received_quantity: 1,
          unit_cost: items[0]?.average_cost || 0,
          bin_location: 'A-01',
          batch_or_lot: '',
          expiry_date: '',
        },
      ]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process goods receipt');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
            <span>Goods Receiving (PO Ingestion & Stock IN)</span>
          </h3>
          <p className="text-xs text-slate-400">
            Accept physical supplier shipments, recalculate perpetual moving averages, and automatically
            generate Draft AP/Accrual Journals (Dr 1080 Inventory, Cr 2010 AP).
          </p>
        </div>

        <button
          onClick={onOpenScanner}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
        >
          <span>Scan Shipment Barcode</span>
        </button>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-emerald-300">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMessage.text}</span>
          </div>
          {successMessage.journalId && onViewJournal && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-slate-300">Created GL Journal:</span>
              <button
                type="button"
                onClick={() => onViewJournal(successMessage.journalId!)}
                className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 rounded font-mono font-semibold border border-emerald-500/40 flex items-center gap-1"
              >
                <span>{successMessage.journalId}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Goods Receipt Ingestion Form */}
      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1">Receipt Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1">PO / Contract Reference</label>
            <input
              type="text"
              required
              value={poReference}
              onChange={(e) => setPoReference(e.target.value)}
              placeholder="e.g. PO-2026-03-042"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1">Vendor / Supplier Name</label>
            <input
              type="text"
              required
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="e.g. PT Sukses Jaya Pangan"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
            />
          </div>

          <div>
            <label className="text-xs font-mono text-slate-400 block mb-1">Receiving Storeroom</label>
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
        </div>

        {/* Lines Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Shipment Received Line Items
            </span>
            <button
              type="button"
              onClick={handleAddLine}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded flex items-center gap-1 border border-slate-700"
            >
              <Plus className="w-3 h-3 text-emerald-400" />
              <span>Add Item Row</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                <tr>
                  <th className="px-3 py-2.5 min-w-[220px]">Item Description</th>
                  <th className="px-3 py-2.5 w-28 text-right">Received Qty</th>
                  <th className="px-3 py-2.5 w-36 text-right">Unit Cost (IDR)</th>
                  <th className="px-3 py-2.5 w-36 text-right">Line Total (IDR)</th>
                  <th className="px-3 py-2.5 w-24">Bin</th>
                  <th className="px-3 py-2.5 w-28">Batch / Lot</th>
                  <th className="px-3 py-2.5 w-32">Expiry Date</th>
                  <th className="px-3 py-2.5 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {lines.map((line, idx) => {
                  const selectedItem = items.find((i) => i.item_id === line.item_id);
                  const lineTotal = (line.received_quantity || 0) * (line.unit_cost || 0);

                  return (
                    <tr key={idx} className="bg-slate-900/50">
                      <td className="px-3 py-2">
                        <select
                          value={line.item_id}
                          onChange={(e) => handleItemSelect(idx, e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-white"
                        >
                          {items.map((it) => (
                            <option key={it.item_id} value={it.item_id}>
                              [{it.item_code}] {it.item_name} ({it.uom})
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          required
                          value={line.received_quantity}
                          onChange={(e) => {
                            const newLines = [...lines];
                            newLines[idx].received_quantity = Number(e.target.value);
                            setLines(newLines);
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-white font-mono text-right"
                        />
                      </td>

                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="any"
                          min="1"
                          required
                          value={line.unit_cost}
                          onChange={(e) => {
                            const newLines = [...lines];
                            newLines[idx].unit_cost = Number(e.target.value);
                            setLines(newLines);
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-white font-mono text-right"
                        />
                      </td>

                      <td className="px-3 py-2 text-right font-mono font-bold text-emerald-400">
                        {(lineTotal ?? 0).toLocaleString()}
                      </td>

                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={line.bin_location || ''}
                          onChange={(e) => {
                            const newLines = [...lines];
                            newLines[idx].bin_location = e.target.value;
                            setLines(newLines);
                          }}
                          placeholder="Bin"
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-white font-mono"
                        />
                      </td>

                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={line.batch_or_lot || ''}
                          onChange={(e) => {
                            const newLines = [...lines];
                            newLines[idx].batch_or_lot = e.target.value;
                            setLines(newLines);
                          }}
                          placeholder="LOT"
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-white font-mono"
                        />
                      </td>

                      <td className="px-3 py-2">
                        <input
                          type="date"
                          value={line.expiry_date || ''}
                          onChange={(e) => {
                            const newLines = [...lines];
                            newLines[idx].expiry_date = e.target.value;
                            setLines(newLines);
                          }}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-white font-mono"
                        />
                      </td>

                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          disabled={lines.length === 1}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 disabled:opacity-20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer & Total */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-800">
          <div className="flex-1 w-full max-w-md">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Inspection notes or delivery bill reference..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200"
            />
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-[11px] font-mono text-slate-400 block uppercase">Total Receipt Value</span>
              <div className="text-lg font-bold font-mono text-emerald-400">
                IDR {(calculateTotal() ?? 0).toLocaleString()}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950 transition-colors"
            >
              {submitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <PackageCheck className="w-4 h-4" />
              )}
              <span>Post Goods Receipt & Journal</span>
            </button>
          </div>
        </div>
      </form>

      {/* Historical Goods Receipts Stream */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          <span>Goods Receipts History</span>
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] border-b border-slate-800">
              <tr>
                <th className="px-4 py-2.5">GRN #</th>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">PO Ref</th>
                <th className="px-4 py-2.5">Vendor</th>
                <th className="px-4 py-2.5">Storeroom</th>
                <th className="px-4 py-2.5 text-right">Items</th>
                <th className="px-4 py-2.5 text-right">Total Amount</th>
                <th className="px-4 py-2.5 text-center">Status</th>
                <th className="px-4 py-2.5">Received By</th>
                <th className="px-4 py-2.5 text-right">Journal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {receipts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500 font-mono">
                    No goods receipts logged yet.
                  </td>
                </tr>
              ) : (
                receipts.map((rec) => (
                  <tr key={rec.receipt_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-2.5 font-mono font-bold text-emerald-400">
                      {rec.receipt_number}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-400">{rec.date}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-300">{rec.po_reference}</td>
                    <td className="px-4 py-2.5 font-medium text-white">{rec.vendor_name}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-400">{rec.storeroom_id}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{rec.items.length}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-400">
                      IDR {(rec.total_amount ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300">
                        {rec.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400 text-[11px]">{rec.received_by}</td>
                    <td className="px-4 py-2.5 text-right">
                      {rec.journal_id && onViewJournal ? (
                        <button
                          onClick={() => onViewJournal(rec.journal_id!)}
                          className="text-[11px] font-mono text-emerald-400 hover:underline flex items-center gap-1 justify-end"
                        >
                          <span>{rec.journal_id}</span>
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
