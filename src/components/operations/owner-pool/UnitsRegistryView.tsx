/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { OwnerUnit, OwnerTaxTreatment } from '../../../types';
import { api } from '../../../services/api';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  X,
  Layers,
  Users,
  Maximize2,
  DollarSign,
  Calendar,
} from 'lucide-react';

export const UnitsRegistryView: React.FC = () => {
  const [units, setUnits] = useState<OwnerUnit[]>([]);
  const [summary, setSummary] = useState<{
    totalUnitsCount: number;
    activeUnitsCount: number;
    eligibleUnitsCount: number;
    totalEligibleSqm: number;
    distinctOwnersCount: number;
    averageSqm: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [floorFilter, setFloorFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<OwnerUnit | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    unit_number: '',
    floor_number: 3,
    unit_type: '1-Bedroom',
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    unit_sqm: 48.5,
    purchase_price: 1750000000,
    vat_amount: 175000000,
    contract_start_date: '2024-01-01',
    contract_end_date: '2034-01-01',
    ownership_status: 'Active' as const,
    distribution_status: 'Eligible' as const,
    tax_treatment: 'WHT_FINAL_10_PCT' as OwnerTaxTreatment,
    bank_name: 'BCA',
    bank_account_number: '883-001928',
    bank_account_name: '',
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getOwnerUnits();
      const list = Array.isArray(data?.units) ? data.units : (Array.isArray(data) ? data : []);
      setUnits(list);
      setSummary(data?.summary || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load units data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingUnit(null);
    setFormData({
      unit_number: '',
      floor_number: 3,
      unit_type: '1-Bedroom',
      owner_name: '',
      owner_email: '',
      owner_phone: '',
      unit_sqm: 48.5,
      purchase_price: 1750000000,
      vat_amount: 175000000,
      contract_start_date: '2024-01-01',
      contract_end_date: '2034-01-01',
      ownership_status: 'Active',
      distribution_status: 'Eligible',
      tax_treatment: 'WHT_FINAL_10_PCT',
      bank_name: 'BCA',
      bank_account_number: '883-001928',
      bank_account_name: '',
      notes: '',
    });
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (unit: OwnerUnit) => {
    setEditingUnit(unit);
    setFormData({
      unit_number: unit.unit_number,
      floor_number: unit.floor_number,
      unit_type: unit.unit_type,
      owner_name: unit.owner_name,
      owner_email: unit.owner_email || '',
      owner_phone: unit.owner_phone || '',
      unit_sqm: unit.unit_sqm,
      purchase_price: unit.purchase_price,
      vat_amount: unit.vat_amount,
      contract_start_date: unit.contract_start_date,
      contract_end_date: unit.contract_end_date || '',
      ownership_status: unit.ownership_status,
      distribution_status: unit.distribution_status,
      tax_treatment: unit.tax_treatment,
      bank_name: unit.bank_name || 'BCA',
      bank_account_number: unit.bank_account_number || '',
      bank_account_name: unit.bank_account_name || unit.owner_name,
      notes: unit.notes || '',
    });
    setError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await api.saveOwnerUnit({
        ...(editingUnit ? { unit_id: editingUnit.unit_id } : {}),
        ...formData,
        unit_sqm: Number(formData.unit_sqm),
        purchase_price: Number(formData.purchase_price),
        vat_amount: Number(formData.vat_amount),
        floor_number: Number(formData.floor_number),
        bank_account_name: formData.bank_account_name || formData.owner_name,
      });
      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save apartment unit');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (unitId: string, unitNumber: string) => {
    if (!window.confirm(`Are you sure you want to remove Unit ${unitNumber} from the owner pool registry?`)) {
      return;
    }
    try {
      await api.deleteOwnerUnit(unitId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete unit');
    }
  };

  const filteredUnits = (units || []).filter((u) => {
    const matchSearch =
      (u.unit_number || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.owner_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.unit_type || '').toLowerCase().includes(search.toLowerCase());

    const matchFloor = floorFilter === 'ALL' || u.floor_number?.toString() === floorFilter;
    const matchStatus = statusFilter === 'ALL' || u.distribution_status === statusFilter;

    return matchSearch && matchFloor && matchStatus;
  });

  const formatIDR = (val: number) => `Rp ${Math.round(val).toLocaleString('id-ID')}`;

  const distinctFloors = Array.from(new Set((units || []).map((u) => u.floor_number))).filter((f): f is number => typeof f === 'number').sort((a, b) => Number(a) - Number(b));

  return (
    <div className="space-y-6">
      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Total Units</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {summary?.totalUnitsCount ?? (units || []).length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Floors 3–12 Master Inventory</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Eligible Units</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            {summary?.eligibleUnitsCount || 0}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 font-medium">Active Hotel Pool Contracts</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Total Eligible Area</span>
            <Maximize2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-800">
            {summary?.totalEligibleSqm ? summary.totalEligibleSqm.toLocaleString() : '0'} <span className="text-sm font-normal text-slate-500">m²</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Dynamic Allocation Denominator</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Unique Owners</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-900">
            {summary?.distinctOwnersCount || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Individual & Corporate Investors</div>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Average Unit SQM</span>
            <Layers className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-900">
            {summary?.averageSqm ? summary.averageSqm.toFixed(1) : '0'} <span className="text-sm font-normal text-slate-500">m²</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Mix of Studio, 1-BR, 2-BR, Suite</div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search unit #, owner, or unit type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs"
            >
              <option value="ALL">All Floors</option>
              {distinctFloors.map((f) => (
                <option key={f} value={f.toString()}>
                  Floor {f}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="Eligible">Eligible</option>
              <option value="Suspended">Suspended</option>
              <option value="Ineligible">Ineligible</option>
            </select>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Apartment Unit
        </button>
      </div>

      {/* Units Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-3">Unit</th>
                <th className="py-2.5 px-3">Type & Floor</th>
                <th className="py-2.5 px-3">Owner / Investor</th>
                <th className="py-2.5 px-3 text-right">Floor Area (SQM)</th>
                <th className="py-2.5 px-3 text-right">Purchase Price (Net VAT)</th>
                <th className="py-2.5 px-3">Contract Window</th>
                <th className="py-2.5 px-3">Tax Treatment</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Loading apartment master database...
                  </td>
                </tr>
              ) : (filteredUnits || []).length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No apartment units found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredUnits.map((unit) => {
                  const netBasis = unit.purchase_price - unit.vat_amount;
                  return (
                    <tr key={unit.unit_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {unit.unit_number}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-slate-800">{unit.unit_type}</span>
                        <span className="block text-[11px] text-slate-400">Floor {unit.floor_number}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{unit.owner_name}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                          {unit.owner_email || unit.bank_name}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-900">
                        {unit.unit_sqm.toFixed(2)} m²
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[11px]">
                        <div className="font-semibold text-slate-900">{formatIDR(netBasis)}</div>
                        <div className="text-slate-400">Gross: {formatIDR(unit.purchase_price)}</div>
                      </td>
                      <td className="py-2.5 px-3 text-[11px]">
                        <div className="font-medium text-slate-800">{unit.contract_start_date}</div>
                        <div className="text-slate-400">to {unit.contract_end_date || 'N/A'}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        {unit.tax_treatment === 'WHT_FINAL_10_PCT' ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            PPh Final 10%
                          </span>
                        ) : unit.tax_treatment === 'WHT_PPh23_2_PCT' ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            PPh 23 (2%)
                          </span>
                        ) : unit.tax_treatment === 'TAX_EXEMPT' ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600">
                            Exempt (0%)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Unconfigured
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold inline-block ${
                            unit.distribution_status === 'Eligible'
                              ? 'bg-emerald-100 text-emerald-800'
                              : unit.distribution_status === 'Suspended'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {unit.distribution_status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(unit)}
                            title="Edit Unit"
                            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(unit.unit_id, unit.unit_number)}
                            title="Delete Unit"
                            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add / Edit Unit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingUnit ? `Edit Apartment Unit ${editingUnit.unit_number}` : 'Register New Apartment Unit'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Unit Specifications */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Unit Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 508"
                    value={formData.unit_number}
                    onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Floor Number *</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={formData.floor_number}
                    onChange={(e) => setFormData({ ...formData, floor_number: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Unit Type *</label>
                  <select
                    value={formData.unit_type}
                    onChange={(e) => setFormData({ ...formData, unit_type: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  >
                    <option value="Studio">Studio</option>
                    <option value="1-Bedroom">1-Bedroom</option>
                    <option value="2-Bedroom">2-Bedroom</option>
                    <option value="Penthouse Suite">Penthouse Suite</option>
                  </select>
                </div>
              </div>

              {/* Floor Area & Pricing */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Unit Area (SQM) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={formData.unit_sqm}
                    onChange={(e) => setFormData({ ...formData, unit_sqm: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-blue-900"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Used in dynamic pro-rata share</span>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Purchase Price (IDR) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.purchase_price}
                    onChange={(e) => {
                      const p = parseFloat(e.target.value) || 0;
                      setFormData({ ...formData, purchase_price: p, vat_amount: Math.round(p * 0.1) });
                    }}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">VAT Amount (IDR) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.vat_amount}
                    onChange={(e) => setFormData({ ...formData, vat_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Deducted for return basis</span>
                </div>
              </div>

              {/* Owner Details */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Owner Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Owner Email</label>
                  <input
                    type="email"
                    value={formData.owner_email}
                    onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Owner Phone</label>
                  <input
                    type="text"
                    value={formData.owner_phone}
                    onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Contract Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Contract Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.contract_start_date}
                    onChange={(e) => setFormData({ ...formData, contract_start_date: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Determines 3-year guarantee period</span>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Contract End Date</label>
                  <input
                    type="date"
                    value={formData.contract_end_date}
                    onChange={(e) => setFormData({ ...formData, contract_end_date: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Tax & Eligibility Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tax Treatment *</label>
                  <select
                    value={formData.tax_treatment}
                    onChange={(e) => setFormData({ ...formData, tax_treatment: e.target.value as OwnerTaxTreatment })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  >
                    <option value="WHT_FINAL_10_PCT">PPh Final Pasal 4(2) - 10% (Indonesian Individual/Standard)</option>
                    <option value="WHT_PPh23_2_PCT">PPh 23 Jasa / Badan - 2% (Corporate NPWP)</option>
                    <option value="WHT_PPh23_NON_NPWP_4_PCT">PPh 23 Non-NPWP - 4%</option>
                    <option value="TAX_EXEMPT">Tax Exempt - 0%</option>
                    <option value="NOT_CONFIGURED">Requires Configuration</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Distribution Status *</label>
                  <select
                    value={formData.distribution_status}
                    onChange={(e) => setFormData({ ...formData, distribution_status: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  >
                    <option value="Eligible">Eligible (Active in Monthly Pool)</option>
                    <option value="Suspended">Suspended (Temporary Hold)</option>
                    <option value="Ineligible">Ineligible</option>
                  </select>
                </div>
              </div>

              {/* Settlement Bank */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Bank Account Number</label>
                  <input
                    type="text"
                    value={formData.bank_account_number}
                    onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Account Beneficiary</label>
                  <input
                    type="text"
                    placeholder="Beneficiary name"
                    value={formData.bank_account_name}
                    onChange={(e) => setFormData({ ...formData, bank_account_name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingUnit ? 'Update Unit' : 'Create Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
