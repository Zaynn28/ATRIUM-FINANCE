/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Printer,
  X,
  Edit3,
  Save,
  Building,
  CheckCircle2,
  Calendar,
  Truck,
  FileText,
  DollarSign,
  Layers,
  Coins,
  ExternalLink,
  ShieldCheck,
  Plus,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { PurchaseOrder, InventoryItem, InventoryStoreroom, Department } from '../../types';
import { api } from '../../services/api';

interface PurchaseOrderDocumentModalProps {
  po: PurchaseOrder;
  departments: Department[];
  storerooms: InventoryStoreroom[];
  inventoryItems: InventoryItem[];
  onClose: () => void;
  onUpdated: (updatedPo: PurchaseOrder) => void;
  onViewJournal?: (journalId: string) => void;
  onNavigateToReceiving?: (poNumber: string) => void;
  onGenerateJournal?: (po: PurchaseOrder) => void;
}

export const PurchaseOrderDocumentModal: React.FC<PurchaseOrderDocumentModalProps> = ({
  po,
  departments,
  storerooms,
  inventoryItems,
  onClose,
  onUpdated,
  onViewJournal,
  onNavigateToReceiving,
  onGenerateJournal,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Hotel / Issuer Letterhead state
  const [hotelName, setHotelName] = useState(po.hotel_name || 'THE ATRIUM HOTEL & RESORT');
  const [hotelDivision, setHotelDivision] = useState(
    po.hotel_division || 'Hospitality Operations & Procurement Directorate'
  );
  const [hotelAddress, setHotelAddress] = useState(
    po.hotel_address || 'Jl. Malioboro No. 45, D.I. Yogyakarta 55271, Indonesia'
  );
  const [hotelTaxId, setHotelTaxId] = useState(po.hotel_tax_id || '01.345.678.9-541.000');
  const [hotelPhone, setHotelPhone] = useState(po.hotel_phone || '+62 274 555-8888');
  const [hotelEmail, setHotelEmail] = useState(po.hotel_email || 'procurement@atriumhotel.com');

  // 2. Order Metadata & Terms
  const [orderDate, setOrderDate] = useState(po.order_date);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(po.expected_delivery_date || '');
  const [paymentTerms, setPaymentTerms] = useState(po.payment_terms || 'Net 30 Days');
  const [taxRatePct, setTaxRatePct] = useState(po.tax_rate_pct ?? 11);
  const [notes, setNotes] = useState(po.notes || '');

  // 3. Vendor / Supplier Info
  const [supplierName, setSupplierName] = useState(po.supplier_name);
  const [supplierContact, setSupplierContact] = useState(po.supplier_contact || '');
  const [supplierEmail, setSupplierEmail] = useState(po.supplier_email || '');
  const [supplierAddress, setSupplierAddress] = useState(po.supplier_address || '');

  // 4. Ship To / Destination Coordinates
  const [storeroomId, setStoreroomId] = useState(po.storeroom_id);
  const [departmentCode, setDepartmentCode] = useState(po.department_code);
  const [receivingDockInstructions, setReceivingDockInstructions] = useState(
    po.receiving_dock_instructions || 'Receiving Dock: Loading Bay #1 (08:00 - 15:00 WIB)'
  );

  // 5. Terms & Signature Blocks
  const [termsConditions, setTermsConditions] = useState(
    po.terms_conditions ||
      '1. Please quote PO Number on all delivery orders, packing slips, and commercial tax invoices.\n2. All goods are subject to physical temperature inspection, count verification, and quality approval by the hotel receiving officer before acceptance.'
  );
  const [preparedByTitle, setPreparedByTitle] = useState(
    po.prepared_by_title || 'Purchasing Specialist'
  );
  const [authorizedByTitle, setAuthorizedByTitle] = useState(
    po.authorized_by_title || 'Financial Controller'
  );
  const [createdBy, setCreatedBy] = useState(po.created_by || 'Purchasing Specialist');
  const [approvedBy, setApprovedBy] = useState(po.approved_by || 'Financial Controller');

  // 6. Line Items State
  const [items, setItems] = useState(
    po.items.map((it) => ({
      item_id: it.item_id,
      item_name: it.item_name,
      item_code: it.item_code,
      uom: it.uom,
      ordered_quantity: it.ordered_quantity,
      unit_cost: it.unit_cost,
      requisition_id: it.requisition_id,
      notes: it.notes || '',
    }))
  );

  // Calculations
  const calcSubtotal = items.reduce(
    (sum, it) => sum + (Number(it.ordered_quantity) || 0) * (Number(it.unit_cost) || 0),
    0
  );
  const calcTax = Math.round(calcSubtotal * (Number(taxRatePct) / 100) * 100) / 100;
  const calcTotal = Math.round((calcSubtotal + calcTax) * 100) / 100;

  // Print function: Reliable fallback using clean popup window with high-definition styling
  const handlePrint = () => {
    const printContent = document.getElementById('po-printable-document');
    if (!printContent) {
      window.print();
      return;
    }

    // Open dedicated print window to guarantee 100% clean formatting and remove any UI modal chrome
    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Purchase Order - ${po.po_number}</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 12mm 15mm 12mm 15mm;
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                color: #0f172a;
                background: #ffffff;
                margin: 0;
                padding: 24px;
                font-size: 10.5pt;
                line-height: 1.4;
              }
              * {
                box-sizing: border-box;
              }
              .no-print-in-preview {
                display: none !important;
              }
              table {
                width: 100%;
                border-collapse: collapse;
              }
              th {
                background: #f1f5f9;
                color: #334155;
                font-size: 8.5pt;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                padding: 8px 10px;
                border-top: 1px solid #cbd5e1;
                border-bottom: 1px solid #cbd5e1;
                text-align: left;
              }
              td {
                padding: 8px 10px;
                border-bottom: 1px solid #e2e8f0;
                font-size: 9.5pt;
              }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              @media print {
                body { padding: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      window.print();
    }
  };

  // Line changes in Edit mode
  const handleItemChange = (index: number, itemId: string) => {
    const found = inventoryItems.find((i) => i.item_id === itemId);
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      item_id: itemId,
      item_name: found?.item_name || 'Item',
      item_code: found?.item_code || '',
      uom: found?.uom || 'UNIT',
      unit_cost: found?.last_purchase_cost || found?.average_cost || 0,
    };
    setItems(newItems);
  };

  const handleQtyChange = (index: number, val: number) => {
    const newItems = [...items];
    newItems[index].ordered_quantity = val;
    setItems(newItems);
  };

  const handleCostChange = (index: number, val: number) => {
    const newItems = [...items];
    newItems[index].unit_cost = val;
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    const first = inventoryItems[0];
    setItems([
      ...items,
      {
        item_id: first?.item_id || '',
        item_name: first?.item_name || '',
        item_code: first?.item_code || '',
        uom: first?.uom || 'UNIT',
        ordered_quantity: 1,
        unit_cost: first?.average_cost || 0,
        notes: '',
      },
    ]);
  };

  // Save changes to backend
  const handleSaveDetails = async () => {
    if (!supplierName.trim()) {
      setErrorMessage('Supplier / Vendor name cannot be empty.');
      return;
    }
    if (items.some((it) => !it.item_id || it.ordered_quantity <= 0)) {
      setErrorMessage('Each line item must have a valid SKU and quantity > 0.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    try {
      const updated = await api.updatePurchaseOrder(po.po_id, {
        supplier_name: supplierName,
        supplier_contact: supplierContact,
        supplier_email: supplierEmail,
        supplier_address: supplierAddress,
        order_date: orderDate,
        expected_delivery_date: expectedDeliveryDate,
        payment_terms: paymentTerms,
        storeroom_id: storeroomId,
        department_code: departmentCode,
        tax_rate_pct: Number(taxRatePct),
        notes,
        hotel_name: hotelName,
        hotel_division: hotelDivision,
        hotel_address: hotelAddress,
        hotel_tax_id: hotelTaxId,
        hotel_phone: hotelPhone,
        hotel_email: hotelEmail,
        receiving_dock_instructions: receivingDockInstructions,
        terms_conditions: termsConditions,
        prepared_by_title: preparedByTitle,
        authorized_by_title: authorizedByTitle,
        created_by: createdBy,
        approved_by: approvedBy,
        items: items.map((it) => ({
          item_id: it.item_id,
          ordered_quantity: Number(it.ordered_quantity),
          unit_cost: Number(it.unit_cost),
          requisition_id: it.requisition_id,
          notes: it.notes,
        })),
      });

      setSuccessMessage('Purchase Order document format and details updated successfully!');
      setIsEditing(false);
      onUpdated(updated);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to update Purchase Order details.');
    } finally {
      setSaving(false);
    }
  };

  // Reset to original saved state
  const handleResetToCurrent = () => {
    setIsEditing(false);
    setHotelName(po.hotel_name || 'THE ATRIUM HOTEL & RESORT');
    setHotelDivision(po.hotel_division || 'Hospitality Operations & Procurement Directorate');
    setHotelAddress(po.hotel_address || 'Jl. Malioboro No. 45, D.I. Yogyakarta 55271, Indonesia');
    setHotelTaxId(po.hotel_tax_id || '01.345.678.9-541.000');
    setHotelPhone(po.hotel_phone || '+62 274 555-8888');
    setHotelEmail(po.hotel_email || 'procurement@atriumhotel.com');
    setSupplierName(po.supplier_name);
    setSupplierContact(po.supplier_contact || '');
    setSupplierEmail(po.supplier_email || '');
    setSupplierAddress(po.supplier_address || '');
    setOrderDate(po.order_date);
    setExpectedDeliveryDate(po.expected_delivery_date || '');
    setPaymentTerms(po.payment_terms || 'Net 30 Days');
    setStoreroomId(po.storeroom_id);
    setDepartmentCode(po.department_code);
    setTaxRatePct(po.tax_rate_pct ?? 11);
    setNotes(po.notes || '');
    setReceivingDockInstructions(
      po.receiving_dock_instructions || 'Receiving Dock: Loading Bay #1 (08:00 - 15:00 WIB)'
    );
    setTermsConditions(
      po.terms_conditions ||
        '1. Please quote PO Number on all delivery orders, packing slips, and commercial tax invoices.\n2. All goods are subject to physical temperature inspection, count verification, and quality approval by the hotel receiving officer before acceptance.'
    );
    setPreparedByTitle(po.prepared_by_title || 'Purchasing Specialist');
    setAuthorizedByTitle(po.authorized_by_title || 'Financial Controller');
    setCreatedBy(po.created_by || 'Purchasing Specialist');
    setApprovedBy(po.approved_by || 'Financial Controller');
    setItems(
      po.items.map((it) => ({
        item_id: it.item_id,
        item_name: it.item_name,
        item_code: it.item_code,
        uom: it.uom,
        ordered_quantity: it.ordered_quantity,
        unit_cost: it.unit_cost,
        requisition_id: it.requisition_id,
        notes: it.notes || '',
      }))
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[95vh]">
        {/* Top Header Bar */}
        <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white font-mono">{po.po_number}</h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    po.status === 'APPROVED'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : po.status === 'FULFILLED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {po.status}
                </span>
                {isEditing ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse flex items-center gap-1">
                    <Edit3 className="w-3 h-3" />
                    DOCUMENT FORMAT EDIT MODE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20">
                    DOCUMENT VIEW
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {isEditing
                  ? 'Edit directly inside the PO document sheet below (hotel letterhead, vendor coords, line items, terms & signatures)'
                  : 'Official PO document format with direct printable sheet and configurable details'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-blue-500/40 transition-colors shadow-sm"
                  title="Edit directly inside document sheet"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Edit Document Details</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-950 transition-colors"
                  title="Print Official PO Document / Export PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print PO Document</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleResetToCurrent}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveDetails}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Document Changes'}</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alerts */}
        {successMessage && (
          <div className="bg-emerald-950/60 border-b border-emerald-500/30 px-5 py-2 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="bg-rose-950/60 border-b border-rose-800/40 px-5 py-2 text-xs text-rose-200 flex items-center gap-2">
            <X className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Scrollable Document Area: WYSWYG Printable Document Sheet */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-950/70">
          {/* Visual Document Sheet (White Paper Preview) */}
          <div
            id="po-printable-document"
            className="bg-white text-slate-900 rounded-xl p-6 sm:p-10 shadow-2xl border border-slate-200 max-w-4xl mx-auto transition-all"
          >
            {/* Header / Letterhead */}
            <div className="header flex flex-col sm:flex-row justify-between items-start border-b-2 border-slate-900 pb-5 mb-6 gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded bg-slate-900 text-white font-bold flex items-center justify-center font-mono text-sm shrink-0">
                    AH
                  </div>
                  <div className="w-full">
                    {!isEditing ? (
                      <>
                        <h1 className="text-xl font-black tracking-tight text-slate-900">
                          {hotelName}
                        </h1>
                        <div className="text-[11px] text-slate-600 font-medium">
                          {hotelDivision}
                        </div>
                      </>
                    ) : (
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={hotelName}
                          onChange={(e) => setHotelName(e.target.value)}
                          className="w-full font-black text-slate-900 text-lg border-b border-blue-400 bg-blue-50/50 px-1 py-0.5 rounded"
                          placeholder="Hotel Name"
                          title="Click to edit Hotel Name on PO Document"
                        />
                        <input
                          type="text"
                          value={hotelDivision}
                          onChange={(e) => setHotelDivision(e.target.value)}
                          className="w-full text-xs text-slate-600 border-b border-blue-300 bg-blue-50/30 px-1 py-0.5 rounded"
                          placeholder="Division / Department"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {!isEditing ? (
                  <div className="text-[11px] text-slate-500 mt-2 space-y-0.5">
                    <div>{hotelAddress}</div>
                    <div>
                      NPWP: {hotelTaxId} • Ph: {hotelPhone}
                    </div>
                    <div>Email: {hotelEmail}</div>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-600 mt-2 space-y-1 bg-slate-50 p-2 rounded border border-blue-200">
                    <div className="flex items-center gap-2">
                      <span className="w-20 text-[10px] font-mono text-slate-500">Address:</span>
                      <input
                        type="text"
                        value={hotelAddress}
                        onChange={(e) => setHotelAddress(e.target.value)}
                        className="flex-1 bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-800"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-20 text-[10px] font-mono text-slate-500">NPWP Tax ID:</span>
                      <input
                        type="text"
                        value={hotelTaxId}
                        onChange={(e) => setHotelTaxId(e.target.value)}
                        className="flex-1 bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-800 font-mono"
                      />
                      <span className="text-[10px] font-mono text-slate-500">Phone:</span>
                      <input
                        type="text"
                        value={hotelPhone}
                        onChange={(e) => setHotelPhone(e.target.value)}
                        className="w-36 bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-800"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-20 text-[10px] font-mono text-slate-500">Email:</span>
                      <input
                        type="email"
                        value={hotelEmail}
                        onChange={(e) => setHotelEmail(e.target.value)}
                        className="flex-1 bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-800 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side Metadata */}
              <div className="text-right sm:w-72 shrink-0">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                  PURCHASE ORDER
                </div>
                <div className="text-xl font-extrabold font-mono text-blue-700 tracking-tight mt-0.5">
                  {po.po_number}
                </div>

                {!isEditing ? (
                  <div className="text-[11px] text-slate-600 mt-2 space-y-0.5 font-mono">
                    <div>
                      PO Date: <span className="font-bold text-slate-900">{orderDate}</span>
                    </div>
                    <div>
                      Delivery Due:{' '}
                      <span className="font-bold text-slate-900">
                        {expectedDeliveryDate || 'Standard Delivery'}
                      </span>
                    </div>
                    <div>
                      Terms: <span className="font-bold text-slate-900">{paymentTerms}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-left text-[11px] mt-2 space-y-1.5 bg-blue-50/60 p-2 rounded border border-blue-200">
                    <div>
                      <label className="text-[10px] font-mono text-slate-500 block">PO Date:</label>
                      <input
                        type="date"
                        value={orderDate}
                        onChange={(e) => setOrderDate(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-slate-500 block">Delivery Due Date:</label>
                      <input
                        type="date"
                        value={expectedDeliveryDate}
                        onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-slate-500 block">Payment Terms:</label>
                      <input
                        type="text"
                        value={paymentTerms}
                        onChange={(e) => setPaymentTerms(e.target.value)}
                        placeholder="e.g. Net 30 Days"
                        className="w-full bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-900 font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Coordinates Grid: Supplier & Ship To Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Vendor Box */}
              <div className="border border-slate-300 rounded-lg p-3.5 bg-slate-50">
                <div className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider mb-1 flex items-center justify-between">
                  <span>VENDOR / SUPPLIER:</span>
                  {isEditing && <span className="text-blue-600 font-normal">Editable</span>}
                </div>
                {!isEditing ? (
                  <>
                    <div className="text-sm font-bold text-slate-900">{supplierName}</div>
                    {supplierContact && (
                      <div className="text-xs text-slate-700 font-medium mt-0.5">
                        Attn: {supplierContact}
                      </div>
                    )}
                    {supplierEmail && (
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {supplierEmail}
                      </div>
                    )}
                    {supplierAddress && (
                      <div className="text-[11px] text-slate-600 mt-1">{supplierAddress}</div>
                    )}
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <div>
                      <label className="text-[10px] text-slate-500 font-mono block">Supplier Name *</label>
                      <input
                        type="text"
                        required
                        value={supplierName}
                        onChange={(e) => setSupplierName(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-mono block">Contact Person / Attn</label>
                      <input
                        type="text"
                        value={supplierContact}
                        onChange={(e) => setSupplierContact(e.target.value)}
                        placeholder="e.g. Budi Sales"
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-mono block">Supplier Email</label>
                      <input
                        type="email"
                        value={supplierEmail}
                        onChange={(e) => setSupplierEmail(e.target.value)}
                        placeholder="orders@vendor.com"
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-mono block">Supplier Address</label>
                      <input
                        type="text"
                        value={supplierAddress}
                        onChange={(e) => setSupplierAddress(e.target.value)}
                        placeholder="Vendor street address"
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Ship To Box */}
              <div className="border border-slate-300 rounded-lg p-3.5 bg-slate-50">
                <div className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider mb-1 flex items-center justify-between">
                  <span>SHIP TO / DESTINATION:</span>
                  {isEditing && <span className="text-blue-600 font-normal">Editable</span>}
                </div>
                {!isEditing ? (
                  <>
                    <div className="text-sm font-bold text-slate-900">
                      {storerooms.find((s) => s.storeroom_id === storeroomId)?.name || po.storeroom_name}
                    </div>
                    <div className="text-xs text-slate-700 font-medium mt-0.5">
                      Cost Center:{' '}
                      {departments.find((d) => d.department_code === departmentCode)?.department_name ||
                        po.department_name}{' '}
                      ({departmentCode})
                    </div>
                    <div className="text-[11px] text-slate-600 font-mono mt-1">
                      Ref Requisitions:{' '}
                      {po.requisition_ids && po.requisition_ids.length > 0
                        ? po.requisition_ids.join(', ')
                        : 'Direct Store Replenishment'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {receivingDockInstructions}
                    </div>
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <div>
                      <label className="text-[10px] text-slate-500 font-mono block">Receiving Storeroom</label>
                      <select
                        value={storeroomId}
                        onChange={(e) => setStoreroomId(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 font-bold"
                      >
                        {storerooms.map((s) => (
                          <option key={s.storeroom_id} value={s.storeroom_id}>
                            {s.storeroom_id} - {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-mono block">Department Cost Center</label>
                      <select
                        value={departmentCode}
                        onChange={(e) => setDepartmentCode(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 font-mono"
                      >
                        {departments.map((d) => (
                          <option key={d.department_code} value={d.department_code}>
                            {d.department_code} - {d.department_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-mono block">Dock &amp; Delivery Instructions</label>
                      <input
                        type="text"
                        value={receivingDockInstructions}
                        onChange={(e) => setReceivingDockInstructions(e.target.value)}
                        placeholder="e.g. Loading Bay #1 (08:00 - 15:00 WIB)"
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Document Lines Table */}
            <div className="border border-slate-300 rounded-lg overflow-hidden mb-6">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-mono text-[10px] uppercase">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Item Description / SKU</th>
                    <th className="py-2.5 px-3 text-center w-20">UOM</th>
                    <th className="py-2.5 px-3 text-right w-24">Qty</th>
                    <th className="py-2.5 px-3 text-right w-32">Unit Price (IDR)</th>
                    <th className="py-2.5 px-3 text-right w-36">Total (IDR)</th>
                    {isEditing && <th className="py-2.5 px-2 w-10 text-center no-print-in-preview">Del</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono text-center text-slate-400">
                        {idx + 1}
                      </td>

                      <td className="py-2.5 px-3">
                        {!isEditing ? (
                          <>
                            <div className="font-bold text-slate-900">{line.item_name}</div>
                            <div className="text-[10px] font-mono text-slate-500">
                              SKU: {line.item_code}
                              {line.notes ? ` • Note: ${line.notes}` : ''}
                            </div>
                          </>
                        ) : (
                          <div className="space-y-1">
                            <select
                              value={line.item_id}
                              onChange={(e) => handleItemChange(idx, e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-xs text-slate-900 font-medium"
                            >
                              {inventoryItems.map((it) => (
                                <option key={it.item_id} value={it.item_id}>
                                  [{it.item_code}] {it.item_name}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={line.notes || ''}
                              onChange={(e) => {
                                const newItems = [...items];
                                newItems[idx].notes = e.target.value;
                                setItems(newItems);
                              }}
                              placeholder="Line note or item specification..."
                              className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-600"
                            />
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                        {line.uom}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {!isEditing ? (
                          line.ordered_quantity
                        ) : (
                          <input
                            type="number"
                            min={1}
                            value={line.ordered_quantity}
                            onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
                            className="w-20 bg-white border border-blue-400 rounded px-1 py-1 text-xs text-right text-slate-900 font-mono font-bold"
                          />
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                        {!isEditing ? (
                          line.unit_cost.toLocaleString('id-ID')
                        ) : (
                          <input
                            type="number"
                            min={0}
                            value={line.unit_cost}
                            onChange={(e) => handleCostChange(idx, Number(e.target.value))}
                            className="w-28 bg-white border border-blue-400 rounded px-1 py-1 text-xs text-right text-slate-900 font-mono"
                          />
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {((Number(line.ordered_quantity) || 0) * (Number(line.unit_cost) || 0)).toLocaleString('id-ID')}
                      </td>

                      {isEditing && (
                        <td className="py-2.5 px-2 text-center no-print-in-preview">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                            title="Remove line"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {isEditing && (
                <div className="p-2 bg-slate-50 border-t border-slate-200 flex justify-start no-print-in-preview">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-3 py-1 bg-white hover:bg-slate-100 text-blue-700 border border-blue-300 rounded text-xs font-semibold flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Line Item to Document</span>
                  </button>
                </div>
              )}
            </div>

            {/* Financial Summary Calculation */}
            <div className="flex justify-end mb-6">
              <div className="w-80 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Amount:</span>
                  <span>IDR {calcSubtotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-slate-600 items-center">
                  <span>
                    VAT / PPN{' '}
                    {isEditing ? (
                      <span className="inline-flex items-center gap-1 font-bold">
                        (
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={taxRatePct}
                          onChange={(e) => setTaxRatePct(Number(e.target.value))}
                          className="w-12 bg-white border border-slate-300 rounded px-1 py-0.5 text-xs text-center text-slate-900 font-mono"
                        />
                        %)
                      </span>
                    ) : (
                      `(${taxRatePct}%):`
                    )}
                  </span>
                  <span>IDR {calcTax.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t-2 border-slate-900">
                  <span>TOTAL ORDER COMMITMENT:</span>
                  <span className="text-blue-800">
                    IDR {calcTotal.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>

            {/* Terms, Conditions & Special Instructions Box */}
            <div className="border border-dashed border-slate-300 rounded-lg p-3 bg-slate-50 text-[11px] text-slate-600 space-y-1 mb-8">
              <div className="font-bold text-slate-800 uppercase tracking-wider font-mono text-[10px] flex items-center justify-between">
                <span>Procurement &amp; Receiving Instructions:</span>
                {isEditing && <span className="text-blue-600 font-normal">Editable Terms</span>}
              </div>
              {!isEditing ? (
                <div className="whitespace-pre-line">{termsConditions}</div>
              ) : (
                <textarea
                  rows={3}
                  value={termsConditions}
                  onChange={(e) => setTermsConditions(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded p-2 text-xs text-slate-800 font-mono"
                  placeholder="Enter purchase order clauses, receiving requirements, and terms..."
                />
              )}
              {notes && !isEditing && (
                <div className="font-medium text-slate-800 pt-1 border-t border-slate-200 mt-1">
                  Special Notes: {notes}
                </div>
              )}
              {isEditing && (
                <div className="pt-1">
                  <label className="text-[10px] font-mono text-slate-500 block">Special Order Notes:</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Urgent room delivery before weekend banquet"
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                  />
                </div>
              )}
            </div>

            {/* Authorizations & Signatures */}
            <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-200 text-center">
              <div>
                <div className="h-14 border-b border-slate-400 mb-1.5 flex items-end justify-center pb-1">
                  <span className="text-[10px] font-mono text-slate-400">
                    Prepared • {createdBy}
                  </span>
                </div>
                {!isEditing ? (
                  <>
                    <div className="text-xs font-bold text-slate-900">{preparedByTitle}</div>
                    <div className="text-[10px] text-slate-500">Prepared By</div>
                  </>
                ) : (
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={preparedByTitle}
                      onChange={(e) => setPreparedByTitle(e.target.value)}
                      placeholder="Title"
                      className="w-full text-center text-xs font-bold text-slate-900 border border-slate-300 rounded px-1 py-0.5"
                    />
                    <input
                      type="text"
                      value={createdBy}
                      onChange={(e) => setCreatedBy(e.target.value)}
                      placeholder="Officer Name"
                      className="w-full text-center text-[10px] text-slate-600 border border-slate-300 rounded px-1 py-0.5 font-mono"
                    />
                  </div>
                )}
              </div>

              <div>
                <div className="h-14 border-b border-slate-400 mb-1.5 flex items-end justify-center pb-1">
                  <span className="text-[10px] font-mono text-blue-600 font-bold">
                    APPROVED • {approvedBy}
                  </span>
                </div>
                {!isEditing ? (
                  <>
                    <div className="text-xs font-bold text-slate-900">{authorizedByTitle}</div>
                    <div className="text-[10px] text-slate-500">Authorized Signatory</div>
                  </>
                ) : (
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={authorizedByTitle}
                      onChange={(e) => setAuthorizedByTitle(e.target.value)}
                      placeholder="Title"
                      className="w-full text-center text-xs font-bold text-slate-900 border border-slate-300 rounded px-1 py-0.5"
                    />
                    <input
                      type="text"
                      value={approvedBy}
                      onChange={(e) => setApprovedBy(e.target.value)}
                      placeholder="Manager Name"
                      className="w-full text-center text-[10px] text-slate-600 border border-slate-300 rounded px-1 py-0.5 font-mono"
                    />
                  </div>
                )}
              </div>

              <div>
                <div className="h-14 border-b border-slate-400 mb-1.5 flex items-end justify-center pb-1">
                  <span className="text-[10px] font-mono text-slate-400">Company Stamp</span>
                </div>
                <div className="text-xs font-bold text-slate-900">Supplier Acknowledgement</div>
                <div className="text-[10px] text-slate-500">Signature &amp; Company Stamp</div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer with Workflow Links */}
        <div className="bg-slate-950 px-6 py-3.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 text-xs">
            {po.journal_id ? (
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300">GL Accounting Journal:</span>
                {onViewJournal && (
                  <button
                    onClick={() => {
                      onClose();
                      onViewJournal(po.journal_id!);
                    }}
                    className="px-2 py-0.5 bg-emerald-600/30 text-emerald-300 rounded font-mono font-bold flex items-center gap-1 hover:bg-emerald-600/50"
                  >
                    <span>{po.journal_id}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            ) : onGenerateJournal ? (
              <button
                onClick={() => onGenerateJournal(po)}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Journalize this PO</span>
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {isEditing && (
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveDetails}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Document Changes'}</span>
              </button>
            )}

            {onNavigateToReceiving && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToReceiving(po.po_number);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors"
              >
                <Truck className="w-4 h-4" />
                <span>Receive Delivery (GRN)</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
