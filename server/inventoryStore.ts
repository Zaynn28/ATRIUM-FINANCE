/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import {
  InventoryCategory,
  InventoryStoreroom,
  InventoryItem,
  ItemStoreroomStock,
  StockMovement,
  DepartmentRequisition,
  RequisitionItem,
  GoodsReceipt,
  StockCountSession,
  StockAdjustmentRecord,
  InventoryDashboardKPIs,
} from '../src/types';
import { store as accountingStore } from './store';

const DATA_FILE = path.join(process.cwd(), 'data', 'inventory.json');

export class InventoryStore {
  public categories: Map<string, InventoryCategory> = new Map();
  public storerooms: Map<string, InventoryStoreroom> = new Map();
  public items: Map<string, InventoryItem> = new Map();
  public movements: StockMovement[] = [];
  public requisitions: Map<string, DepartmentRequisition> = new Map();
  public receipts: Map<string, GoodsReceipt> = new Map();
  public countSessions: Map<string, StockCountSession> = new Map();
  public adjustments: Map<string, StockAdjustmentRecord> = new Map();

  constructor() {
    this.init();
  }

  public init(): void {
    if (fs.existsSync(DATA_FILE)) {
      try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const data = JSON.parse(raw);

        if (Array.isArray(data.categories)) {
          data.categories.forEach((c: InventoryCategory) => this.categories.set(c.category_id, c));
        }
        if (Array.isArray(data.storerooms)) {
          data.storerooms.forEach((s: InventoryStoreroom) => this.storerooms.set(s.storeroom_id, s));
        }
        if (Array.isArray(data.items)) {
          data.items.forEach((i: InventoryItem) => this.items.set(i.item_id, i));
        }
        if (Array.isArray(data.movements)) {
          this.movements = data.movements;
        }
        if (Array.isArray(data.requisitions)) {
          data.requisitions.forEach((r: DepartmentRequisition) => this.requisitions.set(r.requisition_id, r));
        }
        if (Array.isArray(data.receipts)) {
          data.receipts.forEach((rc: GoodsReceipt) => this.receipts.set(rc.receipt_id, rc));
        }
        if (Array.isArray(data.countSessions)) {
          data.countSessions.forEach((cs: StockCountSession) => this.countSessions.set(cs.count_id, cs));
        }
        if (Array.isArray(data.adjustments)) {
          data.adjustments.forEach((adj: StockAdjustmentRecord) => this.adjustments.set(adj.adjustment_id, adj));
        }
      } catch (err) {
        console.error('Failed to load data/inventory.json, reseeding defaults:', err);
        this.seedDefaults();
      }
    } else {
      this.seedDefaults();
    }
  }

  public saveToDisk(): void {
    try {
      const data = {
        categories: Array.from(this.categories.values()),
        storerooms: Array.from(this.storerooms.values()),
        items: Array.from(this.items.values()),
        movements: this.movements,
        requisitions: Array.from(this.requisitions.values()),
        receipts: Array.from(this.receipts.values()),
        countSessions: Array.from(this.countSessions.values()),
        adjustments: Array.from(this.adjustments.values()),
      };

      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist inventory data to disk:', err);
    }
  }

  // Seed default hotel categories, storerooms, and items
  public seedDefaults(): void {
    this.categories.clear();
    this.storerooms.clear();
    this.items.clear();
    this.movements = [];
    this.requisitions.clear();
    this.receipts.clear();
    this.countSessions.clear();
    this.adjustments.clear();

    // 1. Hotel-Specific Categories
    const categories: InventoryCategory[] = [
      {
        category_id: 'CAT-FB-FOOD',
        name: 'F&B Food',
        subcategories: ['Meat & Poultry', 'Seafood', 'Dairy', 'Fresh Produce', 'Dry Goods', 'Oils & Condiments', 'Bakery'],
        default_inventory_account: '1080',
        default_expense_account: '5010', // Cost of Food Sales
        is_fixed_asset: false,
        active: 'Y',
      },
      {
        category_id: 'CAT-FB-BEV',
        name: 'F&B Beverage',
        subcategories: ['Soft Drinks & Water', 'Coffee & Tea', 'Juices & Syrups', 'Wine & Spirits', 'Beer'],
        default_inventory_account: '1080',
        default_expense_account: '5020', // Cost of Beverage Sales
        is_fixed_asset: false,
        active: 'Y',
      },
      {
        category_id: 'CAT-HK-SUP',
        name: 'Housekeeping Supplies',
        subcategories: ['Cleaning Chemicals', 'Disinfectants', 'Mops & Brooms', 'Vacuum Bags & Accessories', 'Trash Bags', 'Gloves & PPE'],
        default_inventory_account: '1080',
        default_expense_account: '7010', // Operating Supplies - Guest Rooms
        is_fixed_asset: false,
        active: 'Y',
      },
      {
        category_id: 'CAT-GST-AMEN',
        name: 'Guest Amenities',
        subcategories: ['Dental Kits', 'Shampoo & Shower Gel', 'Soap Bars', 'Sewing Kits', 'Shower Caps', 'Slippers', 'Sanitary Bags'],
        default_inventory_account: '1080',
        default_expense_account: '7010', // Rooms - Guest Supplies
        is_fixed_asset: false,
        active: 'Y',
      },
      {
        category_id: 'CAT-LINEN',
        name: 'Linen',
        subcategories: ['Bed Sheets King/Twin', 'Duvet Covers', 'Pillowcases', 'Bath Towels', 'Hand Towels', 'Bath Mats', 'Pool Towels'],
        default_inventory_account: '1080',
        default_expense_account: '7020', // Laundry & Linen
        is_fixed_asset: false,
        active: 'Y',
      },
      {
        category_id: 'CAT-UNIFORM',
        name: 'Uniforms',
        subcategories: ['Front Desk Suits', 'Housekeeping Sets', 'Kitchen Chef Coats', 'F&B Service Vests', 'Engineering Overalls'],
        default_inventory_account: '1080',
        default_expense_account: '6010', // Personnel / Uniforms
        is_fixed_asset: false,
        active: 'Y',
      },
      {
        category_id: 'CAT-ENG-PARTS',
        name: 'Engineering Spare Parts',
        subcategories: ['HVAC & Chiller Spares', 'Plumbing Valves & Pipes', 'Electrical Switches & Breakers', 'Lighting & LED Bulbs', 'Door Hardware & Locks'],
        default_inventory_account: '1080',
        default_expense_account: '8510', // Property Operation & Maintenance (POM)
        is_fixed_asset: false,
        active: 'Y',
      },
      {
        category_id: 'CAT-MAINT-CONS',
        name: 'Maintenance Consumables',
        subcategories: ['Paints & Primers', 'Sealants & Silicone', 'Lubricants & Grease', 'Filters', 'Batteries', 'Welding Materials'],
        default_inventory_account: '1080',
        default_expense_account: '8510',
        is_fixed_asset: false,
        active: 'Y',
      },
      {
        category_id: 'CAT-OFFICE',
        name: 'Office Supplies',
        subcategories: ['Copier Paper A4/A3', 'Inks & Toners', 'Pens & Stationery', 'Folders & Binders', 'Accounting Vouchers'],
        default_inventory_account: '1080',
        default_expense_account: '8010', // A&G General Expense
        is_fixed_asset: false,
        active: 'Y',
      },
      {
        category_id: 'CAT-GUEST-SUP',
        name: 'Guest Supplies',
        subcategories: ['Complimentary Mineral Water', 'Tea Bags & Instant Coffee', 'Sugar & Creamer Sachets', 'Notepads & Pencils'],
        default_inventory_account: '1080',
        default_expense_account: '7010',
        is_fixed_asset: false,
        active: 'Y',
      },
      {
        category_id: 'CAT-OPER-SUP',
        name: 'Operating Supplies',
        subcategories: ['Keycards RFID', 'Luggage Tags', 'Laundry Bags', 'POS Thermal Paper Rolls', 'Coasters & Napkins'],
        default_inventory_account: '1080',
        default_expense_account: '7010',
        is_fixed_asset: false,
        active: 'Y',
      },
    ];

    categories.forEach((c) => this.categories.set(c.category_id, c));

    // 2. Hotel Storerooms
    const storerooms: InventoryStoreroom[] = [
      {
        storeroom_id: 'STR-MAIN',
        name: 'Main Central Store',
        department_code: '700',
        manager_name: 'Bambang Soediro (Purchasing Manager)',
        bins: ['A-01', 'A-02', 'B-01', 'B-02', 'RACK-01', 'RACK-02', 'BULK-01'],
        active: 'Y',
      },
      {
        storeroom_id: 'STR-FB',
        name: 'F&B Store & Kitchen Cold Room',
        department_code: '200',
        manager_name: 'Chef Alessandro (Executive Chef)',
        bins: ['DRY-01', 'DRY-02', 'CHILL-01', 'FREEZE-01', 'BEV-01', 'SPICE-01'],
        active: 'Y',
      },
      {
        storeroom_id: 'STR-HK',
        name: 'Housekeeping Supplies Store',
        department_code: '100',
        manager_name: 'Siti Rahma (Executive Housekeeper)',
        bins: ['AMEN-01', 'AMEN-02', 'CHEM-01', 'CHEM-02', 'TOOL-01'],
        active: 'Y',
      },
      {
        storeroom_id: 'STR-ENG',
        name: 'Engineering Workshop Store',
        department_code: '800',
        manager_name: 'Agus Pratama (Chief Engineer)',
        bins: ['ELEC-01', 'ELEC-02', 'PLUMB-01', 'HVAC-01', 'TOOL-ENG', 'PAINT-01'],
        active: 'Y',
      },
      {
        storeroom_id: 'STR-LINEN',
        name: 'Central Linen Room',
        department_code: '100',
        manager_name: 'Nurul Hidayati (Linen Supervisor)',
        bins: ['BED-KING', 'BED-TWIN', 'TOWEL-01', 'TOWEL-POOL', 'UNIFORM-01'],
        active: 'Y',
      },
      {
        storeroom_id: 'STR-GEN',
        name: 'General & Stationery Store',
        department_code: '700',
        manager_name: 'Dewi Sartika (General Accountant)',
        bins: ['OFF-01', 'OFF-02', 'PRNT-01', 'DOC-ARCHIVE'],
        active: 'Y',
      },
    ];

    storerooms.forEach((s) => this.storerooms.set(s.storeroom_id, s));

    // 3. Initial Hotel Item Master
    const initialItems: InventoryItem[] = [
      {
        item_id: 'ITEM-FB-001',
        item_code: 'FB-RICE-01',
        item_name: 'Jasmine Rice 20kg Sack',
        category_id: 'CAT-FB-FOOD',
        subcategory: 'Dry Goods',
        uom: 'KG',
        barcode: '8992753110201',
        supplier: 'PT Pangan Nusantara Prima',
        default_storeroom_id: 'STR-FB',
        default_bin_location: 'DRY-01',
        min_stock: 100,
        reorder_point: 200,
        max_stock: 600,
        current_stock: 320,
        last_purchase_cost: 18500,
        average_cost: 18500,
        status: 'ACTIVE',
        created_at: '2026-09-01T08:00:00Z',
        updated_at: '2026-09-18T10:30:00Z',
        created_by: 'System Seed',
        storeroom_stocks: [
          { item_id: 'ITEM-FB-001', storeroom_id: 'STR-FB', bin_location: 'DRY-01', quantity: 240 },
          { item_id: 'ITEM-FB-001', storeroom_id: 'STR-MAIN', bin_location: 'BULK-01', quantity: 80 },
        ],
      },
      {
        item_id: 'ITEM-FB-002',
        item_code: 'FB-OIL-01',
        item_name: 'Pure Palm Cooking Oil 5L Jerrycan',
        category_id: 'CAT-FB-FOOD',
        subcategory: 'Oils & Condiments',
        uom: 'L',
        barcode: '8998866200115',
        supplier: 'PT Sinar Mas Agribusiness',
        default_storeroom_id: 'STR-FB',
        default_bin_location: 'DRY-02',
        min_stock: 50,
        reorder_point: 100,
        max_stock: 300,
        current_stock: 140,
        last_purchase_cost: 22000,
        average_cost: 21800,
        status: 'ACTIVE',
        created_at: '2026-09-01T08:00:00Z',
        updated_at: '2026-09-17T11:00:00Z',
        created_by: 'System Seed',
        storeroom_stocks: [
          { item_id: 'ITEM-FB-002', storeroom_id: 'STR-FB', bin_location: 'DRY-02', quantity: 90 },
          { item_id: 'ITEM-FB-002', storeroom_id: 'STR-MAIN', bin_location: 'B-01', quantity: 50 },
        ],
      },
      {
        item_id: 'ITEM-FB-003',
        item_code: 'FB-CHICK-01',
        item_name: 'Fresh Chicken Breast Fillet Boneless',
        category_id: 'CAT-FB-FOOD',
        subcategory: 'Meat & Poultry',
        uom: 'KG',
        barcode: 'ATR-FB-CHK01',
        supplier: 'CV Unggas Jaya Makmur',
        default_storeroom_id: 'STR-FB',
        default_bin_location: 'CHILL-01',
        min_stock: 30,
        reorder_point: 60,
        max_stock: 150,
        current_stock: 75,
        last_purchase_cost: 48000,
        average_cost: 47500,
        status: 'ACTIVE',
        created_at: '2026-09-01T08:00:00Z',
        updated_at: '2026-09-19T06:00:00Z',
        created_by: 'System Seed',
        storeroom_stocks: [
          { item_id: 'ITEM-FB-003', storeroom_id: 'STR-FB', bin_location: 'CHILL-01', quantity: 75 },
        ],
      },
      {
        item_id: 'ITEM-GST-001',
        item_code: 'GST-WTR-600',
        item_name: 'Natural Spring Mineral Water 600ml Bottle',
        category_id: 'CAT-GUEST-SUP',
        subcategory: 'Complimentary Mineral Water',
        uom: 'BTL',
        barcode: '8991234567890',
        supplier: 'PT Tirta Investama (Aqua Danone)',
        default_storeroom_id: 'STR-MAIN',
        default_bin_location: 'A-01',
        min_stock: 300,
        reorder_point: 600,
        max_stock: 2500,
        current_stock: 840,
        last_purchase_cost: 3200,
        average_cost: 3200,
        status: 'ACTIVE',
        created_at: '2026-09-01T08:00:00Z',
        updated_at: '2026-09-18T14:00:00Z',
        created_by: 'System Seed',
        storeroom_stocks: [
          { item_id: 'ITEM-GST-001', storeroom_id: 'STR-MAIN', bin_location: 'A-01', quantity: 600 },
          { item_id: 'ITEM-GST-001', storeroom_id: 'STR-HK', bin_location: 'AMEN-02', quantity: 240 },
        ],
      },
      {
        item_id: 'ITEM-HK-001',
        item_code: 'HK-DENT-01',
        item_name: 'Hotel Dental Kit (Bamboo Toothbrush + Mint Paste)',
        category_id: 'CAT-GST-AMEN',
        subcategory: 'Dental Kits',
        uom: 'SET',
        barcode: 'ATR-HK-DENT01',
        supplier: 'CV Amenindo Prima Mandiri',
        default_storeroom_id: 'STR-HK',
        default_bin_location: 'AMEN-01',
        min_stock: 600,
        reorder_point: 1200,
        max_stock: 5000,
        current_stock: 1850,
        last_purchase_cost: 2400,
        average_cost: 2400,
        status: 'ACTIVE',
        created_at: '2026-09-01T08:00:00Z',
        updated_at: '2026-09-16T09:00:00Z',
        created_by: 'System Seed',
        storeroom_stocks: [
          { item_id: 'ITEM-HK-001', storeroom_id: 'STR-HK', bin_location: 'AMEN-01', quantity: 1850 },
        ],
      },
      {
        item_id: 'ITEM-HK-002',
        item_code: 'HK-SHMP-30',
        item_name: 'Botanical Hair & Body Wash 30ml Bottle',
        category_id: 'CAT-GST-AMEN',
        subcategory: 'Shampoo & Shower Gel',
        uom: 'BTL',
        barcode: 'ATR-HK-SHMP30',
        supplier: 'CV Amenindo Prima Mandiri',
        default_storeroom_id: 'STR-HK',
        default_bin_location: 'AMEN-01',
        min_stock: 500,
        reorder_point: 1000,
        max_stock: 4500,
        current_stock: 1240,
        last_purchase_cost: 3100,
        average_cost: 3100,
        status: 'ACTIVE',
        created_at: '2026-09-01T08:00:00Z',
        updated_at: '2026-09-16T09:00:00Z',
        created_by: 'System Seed',
        storeroom_stocks: [
          { item_id: 'ITEM-HK-002', storeroom_id: 'STR-HK', bin_location: 'AMEN-01', quantity: 1240 },
        ],
      },
      {
        item_id: 'ITEM-HK-003',
        item_code: 'HK-DISN-05',
        item_name: 'Hospital-Grade Floor Disinfectant Cleaner 5L',
        category_id: 'CAT-HK-SUP',
        subcategory: 'Cleaning Chemicals',
        uom: 'CAN',
        barcode: '8993005120011',
        supplier: 'PT Ecolab Indonesia',
        default_storeroom_id: 'STR-HK',
        default_bin_location: 'CHEM-01',
        min_stock: 15,
        reorder_point: 30,
        max_stock: 100,
        current_stock: 22, // Below reorder point! Flagged as LOW STOCK
        last_purchase_cost: 145000,
        average_cost: 144000,
        status: 'ACTIVE',
        created_at: '2026-09-01T08:00:00Z',
        updated_at: '2026-09-15T15:00:00Z',
        created_by: 'System Seed',
        storeroom_stocks: [
          { item_id: 'ITEM-HK-003', storeroom_id: 'STR-HK', bin_location: 'CHEM-01', quantity: 14 },
          { item_id: 'ITEM-HK-003', storeroom_id: 'STR-MAIN', bin_location: 'B-02', quantity: 8 },
        ],
      },
      {
        item_id: 'ITEM-LIN-001',
        item_code: 'LIN-BTH-01',
        item_name: 'Luxury Bath Towel 70x140cm 600gsm White Cotton',
        category_id: 'CAT-LINEN',
        subcategory: 'Bath Towels',
        uom: 'PCS',
        barcode: 'ATR-LIN-BT01',
        supplier: 'PT Indotextile Hotelier Mandiri',
        default_storeroom_id: 'STR-LINEN',
        default_bin_location: 'TOWEL-01',
        min_stock: 150,
        reorder_point: 300,
        max_stock: 900,
        current_stock: 420,
        last_purchase_cost: 95000,
        average_cost: 95000,
        status: 'ACTIVE',
        created_at: '2026-09-01T08:00:00Z',
        updated_at: '2026-09-17T13:00:00Z',
        created_by: 'System Seed',
        storeroom_stocks: [
          { item_id: 'ITEM-LIN-001', storeroom_id: 'STR-LINEN', bin_location: 'TOWEL-01', quantity: 420 },
        ],
      },
      {
        item_id: 'ITEM-ENG-001',
        item_code: 'ENG-LED-09',
        item_name: 'LED Bulb 9W Warm White 3000K E27',
        category_id: 'CAT-ENG-PARTS',
        subcategory: 'Lighting & LED Bulbs',
        uom: 'PCS',
        barcode: '8718696700123',
        supplier: 'PT Signify Commercial Indonesia (Philips)',
        default_storeroom_id: 'STR-ENG',
        default_bin_location: 'ELEC-01',
        min_stock: 60,
        reorder_point: 120,
        max_stock: 500,
        current_stock: 92, // Below reorder point!
        last_purchase_cost: 28000,
        average_cost: 28000,
        status: 'ACTIVE',
        created_at: '2026-09-01T08:00:00Z',
        updated_at: '2026-09-14T10:00:00Z',
        created_by: 'System Seed',
        storeroom_stocks: [
          { item_id: 'ITEM-ENG-001', storeroom_id: 'STR-ENG', bin_location: 'ELEC-01', quantity: 92 },
        ],
      },
      {
        item_id: 'ITEM-ENG-002',
        item_code: 'ENG-AC-FLTR',
        item_name: 'Split AC Washable Mesh Air Filter 2PK',
        category_id: 'CAT-ENG-PARTS',
        subcategory: 'HVAC & Chiller Spares',
        uom: 'PCS',
        barcode: 'ATR-ENG-FLTR01',
        supplier: 'Daikin Engineering Parts Supply',
        default_storeroom_id: 'STR-ENG',
        default_bin_location: 'HVAC-01',
        min_stock: 20,
        reorder_point: 40,
        max_stock: 120,
        current_stock: 35, // Below reorder point!
        last_purchase_cost: 65000,
        average_cost: 65000,
        status: 'ACTIVE',
        created_at: '2026-09-01T08:00:00Z',
        updated_at: '2026-09-12T11:00:00Z',
        created_by: 'System Seed',
        storeroom_stocks: [
          { item_id: 'ITEM-ENG-002', storeroom_id: 'STR-ENG', bin_location: 'HVAC-01', quantity: 35 },
        ],
      },
      {
        item_id: 'ITEM-OFF-001',
        item_code: 'OFF-A4-70',
        item_name: 'Multipurpose Copier Paper A4 70gsm (Box of 5 Reams)',
        category_id: 'CAT-OFFICE',
        subcategory: 'Copier Paper A4/A3',
        uom: 'BOX',
        barcode: '8992775010022',
        supplier: 'PT PaperOne Indonesia',
        default_storeroom_id: 'STR-GEN',
        default_bin_location: 'OFF-01',
        min_stock: 15,
        reorder_point: 30,
        max_stock: 150,
        current_stock: 45,
        last_purchase_cost: 230000,
        average_cost: 230000,
        status: 'ACTIVE',
        created_at: '2026-09-01T08:00:00Z',
        updated_at: '2026-09-10T16:00:00Z',
        created_by: 'System Seed',
        storeroom_stocks: [
          { item_id: 'ITEM-OFF-001', storeroom_id: 'STR-GEN', bin_location: 'OFF-01', quantity: 45 },
        ],
      },
      {
        item_id: 'ITEM-HK-004',
        item_code: 'HK-SLIP-01',
        item_name: 'Guest Closed-Toe Waffle Slippers (Pair)',
        category_id: 'CAT-GST-AMEN',
        subcategory: 'Slippers',
        uom: 'PAIR',
        barcode: 'ATR-HK-SLIP01',
        supplier: 'CV Amenindo Prima Mandiri',
        default_storeroom_id: 'STR-HK',
        default_bin_location: 'AMEN-01',
        min_stock: 300,
        reorder_point: 600,
        max_stock: 3000,
        current_stock: 650,
        last_purchase_cost: 4200,
        average_cost: 4200,
        status: 'ACTIVE',
        created_at: '2026-09-01T08:00:00Z',
        updated_at: '2026-09-18T10:00:00Z',
        created_by: 'System Seed',
        storeroom_stocks: [
          { item_id: 'ITEM-HK-004', storeroom_id: 'STR-HK', bin_location: 'AMEN-01', quantity: 650 },
        ],
      },
    ];

    initialItems.forEach((i) => this.items.set(i.item_id, i));

    // Seed initial stock ledger movements
    const baseDate = '2026-09-01';
    initialItems.forEach((item, idx) => {
      this.movements.push({
        movement_id: `MOV-INIT-${1000 + idx}`,
        timestamp: `${baseDate}T08:00:00Z`,
        date: baseDate,
        movement_type: 'RECEIPT',
        reference_type: 'INITIAL_BALANCE',
        reference_id: 'OPENING-BALANCE-2026',
        item_id: item.item_id,
        item_code: item.item_code,
        item_name: item.item_name,
        storeroom_id: item.default_storeroom_id,
        storeroom_name: this.storerooms.get(item.default_storeroom_id)?.name || 'Central Store',
        bin_location: item.default_bin_location,
        quantity: item.current_stock,
        before_quantity: 0,
        after_quantity: item.current_stock,
        unit_cost: item.average_cost,
        total_cost: item.current_stock * item.average_cost,
        user_id: 'usr-controller-1',
        user_name: 'Zayen Lalu (Financial Controller)',
        notes: 'Initial fiscal period opening stock verification',
      });
    });

    this.saveToDisk();
  }

  // --- QUERY METHODS ---

  public getCategories(): InventoryCategory[] {
    return Array.from(this.categories.values());
  }

  public getCategory(id: string): InventoryCategory | undefined {
    return this.categories.get(id);
  }

  public saveCategory(cat: InventoryCategory): InventoryCategory {
    if (!cat.category_id) {
      cat.category_id = `CAT-${cat.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`;
    }
    cat.is_fixed_asset = false; // Strictly enforced rule
    this.categories.set(cat.category_id, cat);
    this.saveToDisk();
    return cat;
  }

  public getStorerooms(): InventoryStoreroom[] {
    return Array.from(this.storerooms.values());
  }

  public getStoreroom(id: string): InventoryStoreroom | undefined {
    return this.storerooms.get(id);
  }

  public saveStoreroom(store: InventoryStoreroom): InventoryStoreroom {
    if (!store.storeroom_id) {
      store.storeroom_id = `STR-${store.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)}-${Date.now().toString(36).toUpperCase()}`;
    }
    this.storerooms.set(store.storeroom_id, store);
    this.saveToDisk();
    return store;
  }

  public getItems(): InventoryItem[] {
    return Array.from(this.items.values()).map((i) => this.hydrateItemStock(i));
  }

  public getItem(id: string): InventoryItem | undefined {
    const item = this.items.get(id);
    return item ? this.hydrateItemStock(item) : undefined;
  }

  public getItemByCode(code: string): InventoryItem | undefined {
    const target = code.trim().toLowerCase();
    for (const item of this.items.values()) {
      if (item.item_code.trim().toLowerCase() === target) {
        return this.hydrateItemStock(item);
      }
    }
    return undefined;
  }

  public getItemByBarcode(barcode: string): InventoryItem | undefined {
    const target = barcode.trim().toLowerCase();
    for (const item of this.items.values()) {
      if (item.barcode && item.barcode.trim().toLowerCase() === target) {
        return this.hydrateItemStock(item);
      }
    }
    return undefined;
  }

  private hydrateItemStock(item: InventoryItem): InventoryItem {
    const stocks = item.storeroom_stocks || [];
    const total = stocks.reduce((sum, s) => sum + s.quantity, 0);
    return {
      ...item,
      current_stock: total,
    };
  }

  // Save/Create Item Master with strict uniqueness validation
  public saveItem(itemData: Partial<InventoryItem>, userId: string, userName: string): InventoryItem {
    const code = String(itemData.item_code || '').trim().toUpperCase();
    if (!code) {
      throw new Error('Item Code is mandatory.');
    }

    const barcode = String(itemData.barcode || '').trim();

    // Check uniqueness of item_code
    for (const [existingId, existingItem] of this.items.entries()) {
      if (existingItem.item_code.toUpperCase() === code && existingId !== itemData.item_id) {
        throw new Error(`Duplicate Item Code: "${code}" is already in use by item "${existingItem.item_name}". Item codes must be strictly unique.`);
      }
      if (barcode && existingItem.barcode && existingItem.barcode === barcode && existingId !== itemData.item_id) {
        throw new Error(`Duplicate Barcode: "${barcode}" is already assigned to item "${existingItem.item_name}". Barcodes must be unique.`);
      }
    }

    const now = new Date().toISOString();
    let existing = itemData.item_id ? this.items.get(itemData.item_id) : undefined;

    let item: InventoryItem;
    if (existing) {
      item = {
        ...existing,
        ...itemData,
        item_code: code,
        barcode: barcode || existing.barcode,
        updated_at: now,
      };
    } else {
      const itemId = `ITEM-${code.replace(/[^A-Z0-9]/g, '')}-${Date.now().toString(36).toUpperCase()}`;
      // Generate internal ATRIUM barcode if manufacturer barcode not provided
      const finalBarcode = barcode || `ATR-${code}-${Math.floor(1000 + Math.random() * 9000)}`;

      const defaultStoreId = itemData.default_storeroom_id || 'STR-MAIN';
      const defaultBin = itemData.default_bin_location || 'A-01';
      const initialQty = Number(itemData.current_stock) || 0;

      item = {
        item_id: itemId,
        item_code: code,
        item_name: itemData.item_name || code,
        category_id: itemData.category_id || 'CAT-OPER-SUP',
        subcategory: itemData.subcategory || 'General',
        uom: itemData.uom || 'PCS',
        barcode: finalBarcode,
        supplier: itemData.supplier || 'Standard Supplier',
        default_storeroom_id: defaultStoreId,
        default_bin_location: defaultBin,
        min_stock: Number(itemData.min_stock) || 10,
        reorder_point: Number(itemData.reorder_point) || 20,
        max_stock: Number(itemData.max_stock) || 100,
        current_stock: initialQty,
        last_purchase_cost: Number(itemData.last_purchase_cost) || 0,
        average_cost: Number(itemData.average_cost) || Number(itemData.last_purchase_cost) || 0,
        status: itemData.status || 'ACTIVE',
        created_at: now,
        updated_at: now,
        created_by: userName || 'Admin',
        storeroom_stocks: [
          {
            item_id: itemId,
            storeroom_id: defaultStoreId,
            bin_location: defaultBin,
            quantity: initialQty,
          },
        ],
      };

      if (initialQty > 0) {
        // Record opening movement
        this.movements.unshift({
          movement_id: `MOV-INIT-${Date.now().toString(36).toUpperCase()}`,
          timestamp: now,
          date: now.split('T')[0],
          movement_type: 'RECEIPT',
          reference_type: 'INITIAL_BALANCE',
          reference_id: `INIT-${item.item_code}`,
          item_id: item.item_id,
          item_code: item.item_code,
          item_name: item.item_name,
          storeroom_id: defaultStoreId,
          storeroom_name: this.storerooms.get(defaultStoreId)?.name || 'Main Store',
          bin_location: defaultBin,
          quantity: initialQty,
          before_quantity: 0,
          after_quantity: initialQty,
          unit_cost: item.average_cost,
          total_cost: initialQty * item.average_cost,
          user_id: userId,
          user_name: userName,
          notes: 'Initial inventory creation opening balance',
        });
      }
    }

    this.items.set(item.item_id, item);
    this.saveToDisk();
    return this.hydrateItemStock(item);
  }

  // --- INVENTORY MOVEMENTS & STOCK LEDGER ---

  public getMovements(filters?: {
    item_id?: string;
    storeroom_id?: string;
    movement_type?: string;
    start_date?: string;
    end_date?: string;
  }): StockMovement[] {
    let list = [...this.movements];
    if (filters?.item_id) {
      list = list.filter((m) => m.item_id === filters.item_id);
    }
    if (filters?.storeroom_id) {
      list = list.filter((m) => m.storeroom_id === filters.storeroom_id || m.to_storeroom_id === filters.storeroom_id);
    }
    if (filters?.movement_type) {
      list = list.filter((m) => m.movement_type === filters.movement_type);
    }
    if (filters?.start_date) {
      list = list.filter((m) => m.date >= filters.start_date!);
    }
    if (filters?.end_date) {
      list = list.filter((m) => m.date <= filters.end_date!);
    }
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Get single item Stock Card (complete chronological ledger)
  public getItemStockCard(itemId: string): {
    item: InventoryItem;
    opening_stock: number;
    current_stock: number;
    total_in: number;
    total_out: number;
    movements: StockMovement[];
  } {
    const item = this.getItem(itemId);
    if (!item) {
      throw new Error(`Item ${itemId} not found`);
    }

    const itemMoves = this.movements
      .filter((m) => m.item_id === itemId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let totalIn = 0;
    let totalOut = 0;

    itemMoves.forEach((m) => {
      if (m.movement_type === 'RECEIPT' || m.movement_type === 'TRANSFER_IN' || m.movement_type === 'ADJUSTMENT_IN' || m.movement_type === 'DEPARTMENT_RETURN') {
        totalIn += m.quantity;
      } else {
        totalOut += m.quantity;
      }
    });

    return {
      item,
      opening_stock: itemMoves.length > 0 && itemMoves[0].reference_type === 'INITIAL_BALANCE' ? itemMoves[0].quantity : 0,
      current_stock: item.current_stock,
      total_in: totalIn,
      total_out: totalOut,
      movements: itemMoves.reverse(), // most recent first for table display
    };
  }

  // Helper to adjust stock in a specific storeroom
  private adjustItemStoreroomStock(
    itemId: string,
    storeroomId: string,
    binLocation: string | undefined,
    delta: number
  ): { before: number; after: number } {
    const item = this.items.get(itemId);
    if (!item) {
      throw new Error(`Item ${itemId} not found`);
    }

    if (!item.storeroom_stocks) {
      item.storeroom_stocks = [];
    }

    let record = item.storeroom_stocks.find((s) => s.storeroom_id === storeroomId);
    if (!record) {
      record = {
        item_id: itemId,
        storeroom_id: storeroomId,
        bin_location: binLocation || item.default_bin_location || 'A-01',
        quantity: 0,
      };
      item.storeroom_stocks.push(record);
    }

    const before = record.quantity;
    const after = before + delta;

    // Enforce no negative stock rule
    if (after < 0) {
      const storeName = this.storerooms.get(storeroomId)?.name || storeroomId;
      throw new Error(
        `Insufficient stock for "${item.item_name}" (${item.item_code}) in ${storeName}. Requested deduction of ${Math.abs(delta)} ${item.uom}, but only ${before} ${item.uom} is available.`
      );
    }

    record.quantity = after;
    if (binLocation) record.bin_location = binLocation;

    // Recalculate aggregated stock
    item.current_stock = item.storeroom_stocks.reduce((acc, s) => acc + s.quantity, 0);
    item.updated_at = new Date().toISOString();

    return { before, after };
  }

  // --- 1. RECEIVING / GOODS RECEIPT ---
  public async processGoodsReceipt(
    data: {
      date: string;
      po_reference: string;
      vendor_name: string;
      storeroom_id: string;
      items: {
        item_id: string;
        received_quantity: number;
        unit_cost: number;
        bin_location?: string;
        batch_or_lot?: string;
        expiry_date?: string;
      }[];
      notes?: string;
      autoPostJournal?: boolean;
    },
    userId: string,
    userName: string
  ): Promise<{ receipt: GoodsReceipt; journal_id?: string }> {
    if (!data.items || data.items.length === 0) {
      throw new Error('Goods receipt must contain at least one item.');
    }

    const storeroom = this.storerooms.get(data.storeroom_id);
    if (!storeroom) {
      throw new Error(`Storeroom ${data.storeroom_id} not found.`);
    }

    const now = new Date().toISOString();
    const receiptId = `GR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString(36).toUpperCase()}`;

    let totalReceiptAmount = 0;
    const processedItems: GoodsReceipt['items'] = [];
    const movementRecords: StockMovement[] = [];

    for (const line of data.items) {
      const item = this.items.get(line.item_id);
      if (!item) {
        throw new Error(`Item ${line.item_id} not found.`);
      }

      const qty = Number(line.received_quantity);
      if (qty <= 0) {
        throw new Error(`Received quantity for ${item.item_name} must be greater than zero.`);
      }

      const cost = Number(line.unit_cost);
      if (cost < 0) {
        throw new Error(`Unit cost cannot be negative.`);
      }

      const lineTotal = qty * cost;
      totalReceiptAmount += lineTotal;

      // Update Storeroom stock
      const { before, after } = this.adjustItemStoreroomStock(
        item.item_id,
        data.storeroom_id,
        line.bin_location || item.default_bin_location,
        qty
      );

      // Weighted Average Cost recalculation
      const priorTotalQty = item.current_stock - qty;
      const priorAvgCost = item.average_cost || cost;
      const newAvgCost = priorTotalQty > 0
        ? ((priorTotalQty * priorAvgCost) + (qty * cost)) / item.current_stock
        : cost;

      item.last_purchase_cost = cost;
      item.average_cost = Math.round(newAvgCost * 100) / 100;
      item.supplier = data.vendor_name || item.supplier;

      processedItems.push({
        item_id: item.item_id,
        item_code: item.item_code,
        item_name: item.item_name,
        uom: item.uom,
        received_quantity: qty,
        unit_cost: cost,
        total_cost: lineTotal,
        bin_location: line.bin_location || item.default_bin_location,
        batch_or_lot: line.batch_or_lot,
        expiry_date: line.expiry_date,
      });

      movementRecords.push({
        movement_id: `MOV-GR-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: now,
        date: data.date || now.split('T')[0],
        movement_type: 'RECEIPT',
        reference_type: 'GOODS_RECEIPT',
        reference_id: receiptId,
        item_id: item.item_id,
        item_code: item.item_code,
        item_name: item.item_name,
        storeroom_id: storeroom.storeroom_id,
        storeroom_name: storeroom.name,
        bin_location: line.bin_location || item.default_bin_location,
        quantity: qty,
        before_quantity: before,
        after_quantity: after,
        unit_cost: cost,
        total_cost: lineTotal,
        user_id: userId,
        user_name: userName,
        notes: `Vendor: ${data.vendor_name} • PO Ref: ${data.po_reference || 'Direct'}`,
      });
    }

    // Prepend movements
    movementRecords.forEach((m) => this.movements.unshift(m));

    // --- INTEGRATION: Accounting Journal Generation ---
    let journalId: string | undefined;
    try {
      // Determine default inventory asset and AP liability accounts
      const defaultInvAccount = '1080'; // Operating Supplies & Inventories (Asset)
      const apAccount = accountingStore.mappingConfig.spending_procurement_credit_account || '2010'; // Accounts Payable

      const journalDate = data.date || now.split('T')[0];
      const period = journalDate.slice(0, 7);

      const journalHeader = {
        journal_date: journalDate,
        period: period,
        source_type: 'SPENDING' as const,
        source_reference: receiptId,
        created_by: `Inventory Receiving (${userName})`,
      };

      const journalLines = [
        // Debit: Inventory Asset Account
        {
          account_code: defaultInvAccount,
          department_code: storeroom.department_code || '700',
          debit: totalReceiptAmount,
          credit: 0,
          description: `Goods Receipt: ${data.vendor_name} (${processedItems.length} items to ${storeroom.name})`,
        },
        // Credit: Accounts Payable Trade
        {
          account_code: apAccount,
          department_code: storeroom.department_code || '700',
          debit: 0,
          credit: totalReceiptAmount,
          description: `AP Trade Liability - PO Ref: ${data.po_reference || receiptId}`,
        },
      ];

      const createdJournal = await accountingStore.createJournal(journalHeader, journalLines);
      journalId = createdJournal.journal_id;

      // Link journal to movements
      movementRecords.forEach((m) => (m.journal_id = journalId));
    } catch (journalErr) {
      console.warn('Accounting journal auto-draft notice for goods receipt:', journalErr);
    }

    const receipt: GoodsReceipt = {
      receipt_id: receiptId,
      date: data.date || now.split('T')[0],
      po_reference: data.po_reference || 'N/A',
      vendor_name: data.vendor_name,
      storeroom_id: storeroom.storeroom_id,
      storeroom_name: storeroom.name,
      items: processedItems,
      total_amount: totalReceiptAmount,
      received_by: userName,
      notes: data.notes,
      journal_id: journalId,
      created_at: now,
    };

    this.receipts.set(receipt.receipt_id, receipt);
    this.saveToDisk();

    return { receipt, journal_id: journalId };
  }

  // --- 2. DEPARTMENT REQUISITION WORKFLOW ---

  public createRequisition(data: {
    date: string;
    department_code: string;
    requester_name: string;
    storeroom_id: string;
    items: {
      item_id: string;
      requested_quantity: number;
    }[];
    notes?: string;
  }): DepartmentRequisition {
    if (!data.items || data.items.length === 0) {
      throw new Error('Requisition must specify at least one item.');
    }

    const dept = accountingStore.departments.get(data.department_code);
    const storeroom = this.storerooms.get(data.storeroom_id);
    if (!storeroom) {
      throw new Error(`Storeroom ${data.storeroom_id} not found.`);
    }

    const now = new Date().toISOString();
    const reqId = `REQ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString(36).toUpperCase()}`;

    const items: RequisitionItem[] = [];
    for (const reqItem of data.items) {
      const item = this.items.get(reqItem.item_id);
      if (!item) {
        throw new Error(`Item ${reqItem.item_id} not found.`);
      }
      const qty = Number(reqItem.requested_quantity);
      if (qty <= 0) {
        throw new Error(`Requested quantity for ${item.item_name} must be positive.`);
      }

      items.push({
        item_id: item.item_id,
        item_code: item.item_code,
        item_name: item.item_name,
        uom: item.uom,
        requested_quantity: qty,
        approved_quantity: qty, // default to requested
        issued_quantity: 0,
        unit_cost: item.average_cost,
        total_cost: qty * item.average_cost,
      });
    }

    const requisition: DepartmentRequisition = {
      requisition_id: reqId,
      date: data.date || now.split('T')[0],
      department_code: data.department_code,
      department_name: dept?.department_name || `Dept ${data.department_code}`,
      requester_name: data.requester_name,
      storeroom_id: storeroom.storeroom_id,
      storeroom_name: storeroom.name,
      status: 'PENDING',
      items,
      notes: data.notes,
      created_at: now,
    };

    this.requisitions.set(requisition.requisition_id, requisition);
    this.saveToDisk();
    return requisition;
  }

  public approveRequisition(
    requisitionId: string,
    approverName: string,
    itemApprovals?: { item_id: string; approved_quantity: number }[]
  ): DepartmentRequisition {
    const req = this.requisitions.get(requisitionId);
    if (!req) {
      throw new Error(`Requisition ${requisitionId} not found.`);
    }
    if (req.status !== 'PENDING') {
      throw new Error(`Requisition cannot be approved: current status is ${req.status}.`);
    }

    if (itemApprovals && itemApprovals.length > 0) {
      const map = new Map(itemApprovals.map((i) => [i.item_id, i.approved_quantity]));
      req.items.forEach((item) => {
        if (map.has(item.item_id)) {
          const approved = Number(map.get(item.item_id));
          item.approved_quantity = Math.max(0, approved);
          item.total_cost = item.approved_quantity * item.unit_cost;
        }
      });
    }

    req.status = 'APPROVED';
    req.approver_name = approverName;
    req.approved_at = new Date().toISOString();

    this.saveToDisk();
    return req;
  }

  public async issueRequisition(
    requisitionId: string,
    issuerName: string,
    issuerId: string
  ): Promise<{ requisition: DepartmentRequisition; journal_id?: string }> {
    const req = this.requisitions.get(requisitionId);
    if (!req) {
      throw new Error(`Requisition ${requisitionId} not found.`);
    }
    if (req.status !== 'APPROVED') {
      throw new Error(`Cannot issue requisition: Status must be APPROVED (current: ${req.status}).`);
    }

    const now = new Date().toISOString();
    const movementRecords: StockMovement[] = [];
    let totalIssueCost = 0;

    for (const line of req.items) {
      const issueQty = line.approved_quantity;
      if (issueQty <= 0) continue;

      const item = this.items.get(line.item_id);
      if (!item) {
        throw new Error(`Item ${line.item_id} not found.`);
      }

      // Deduct from storeroom with no-negative-stock validation
      const { before, after } = this.adjustItemStoreroomStock(
        item.item_id,
        req.storeroom_id,
        undefined,
        -issueQty
      );

      const lineTotal = issueQty * item.average_cost;
      totalIssueCost += lineTotal;
      line.issued_quantity = issueQty;
      line.unit_cost = item.average_cost;
      line.total_cost = lineTotal;

      movementRecords.push({
        movement_id: `MOV-ISS-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: now,
        date: now.split('T')[0],
        movement_type: 'DEPARTMENT_ISSUE',
        reference_type: 'DEPARTMENT_REQUISITION',
        reference_id: req.requisition_id,
        item_id: item.item_id,
        item_code: item.item_code,
        item_name: item.item_name,
        storeroom_id: req.storeroom_id,
        storeroom_name: req.storeroom_name,
        quantity: issueQty,
        before_quantity: before,
        after_quantity: after,
        unit_cost: item.average_cost,
        total_cost: lineTotal,
        department_code: req.department_code,
        department_name: req.department_name,
        user_id: issuerId,
        user_name: issuerName,
        notes: `Requisition issue to ${req.department_name} (Requester: ${req.requester_name})`,
      });
    }

    movementRecords.forEach((m) => this.movements.unshift(m));

    // --- INTEGRATION: Accounting Journal Generation (Consumption) ---
    let journalId: string | undefined;
    try {
      const defaultInvAccount = '1080';
      // Mapped expense account based on department or item category
      let expenseAccount = '7010'; // Default Guest Rooms / Operating Supplies
      if (req.department_code === '200') expenseAccount = '5010'; // F&B Cost of Sales
      if (req.department_code === '800') expenseAccount = '8510'; // POM Maintenance
      if (req.department_code === '700') expenseAccount = '8010'; // A&G General

      const journalDate = now.split('T')[0];
      const period = journalDate.slice(0, 7);

      const journalHeader = {
        journal_date: journalDate,
        period: period,
        source_type: 'SPENDING' as const,
        source_reference: req.requisition_id,
        created_by: `Inventory Issue (${issuerName})`,
      };

      const journalLines = [
        // Debit: Department Operating Expense / Cost of Sales
        {
          account_code: expenseAccount,
          department_code: req.department_code,
          debit: totalIssueCost,
          credit: 0,
          description: `Internal Issue Consumption: ${req.department_name} (Req ${req.requisition_id})`,
        },
        // Credit: Inventory Asset (Reduction of On-Hand Inventory)
        {
          account_code: defaultInvAccount,
          department_code: req.department_code,
          debit: 0,
          credit: totalIssueCost,
          description: `Inventory Depletion from ${req.storeroom_name}`,
        },
      ];

      const createdJournal = await accountingStore.createJournal(journalHeader, journalLines);
      journalId = createdJournal.journal_id;
      req.journal_id = journalId;
      movementRecords.forEach((m) => (m.journal_id = journalId));
    } catch (journalErr) {
      console.warn('Accounting journal auto-draft notice for department issue:', journalErr);
    }

    req.status = 'ISSUED';
    req.issuer_name = issuerName;
    req.issued_at = now;

    this.saveToDisk();
    return { requisition: req, journal_id: journalId };
  }

  // --- 3. DIRECT STOCK ISSUE (DEPARTMENT CONSUMPTION) ---
  public async directStockIssue(data: {
    date: string;
    storeroom_id: string;
    department_code: string;
    items: {
      item_id: string;
      quantity: number;
    }[];
    issued_to: string;
    notes?: string;
    userId: string;
    userName: string;
  }): Promise<{ movements: StockMovement[]; journal_id?: string }> {
    const storeroom = this.storerooms.get(data.storeroom_id);
    if (!storeroom) throw new Error(`Storeroom ${data.storeroom_id} not found.`);

    const dept = accountingStore.departments.get(data.department_code);
    const deptName = dept?.department_name || `Dept ${data.department_code}`;
    const now = new Date().toISOString();
    const refId = `DIR-ISS-${Date.now().toString(36).toUpperCase()}`;

    let totalCost = 0;
    const records: StockMovement[] = [];

    for (const itemLine of data.items) {
      const item = this.items.get(itemLine.item_id);
      if (!item) throw new Error(`Item ${itemLine.item_id} not found.`);

      const qty = Number(itemLine.quantity);
      if (qty <= 0) throw new Error(`Quantity must be greater than zero.`);

      const { before, after } = this.adjustItemStoreroomStock(
        item.item_id,
        data.storeroom_id,
        undefined,
        -qty
      );

      const lineCost = qty * item.average_cost;
      totalCost += lineCost;

      const mov: StockMovement = {
        movement_id: `MOV-DIR-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: now,
        date: data.date || now.split('T')[0],
        movement_type: 'DEPARTMENT_ISSUE',
        reference_type: 'DIRECT_ISSUE',
        reference_id: refId,
        item_id: item.item_id,
        item_code: item.item_code,
        item_name: item.item_name,
        storeroom_id: storeroom.storeroom_id,
        storeroom_name: storeroom.name,
        quantity: qty,
        before_quantity: before,
        after_quantity: after,
        unit_cost: item.average_cost,
        total_cost: lineCost,
        department_code: data.department_code,
        department_name: deptName,
        user_id: data.userId,
        user_name: data.userName,
        notes: `Direct issue to ${deptName} (${data.issued_to}): ${data.notes || ''}`,
      };

      records.push(mov);
      this.movements.unshift(mov);
    }

    // Auto Journal
    let journalId: string | undefined;
    try {
      let expenseAccount = '7010';
      if (data.department_code === '200') expenseAccount = '5010';
      if (data.department_code === '800') expenseAccount = '8510';
      if (data.department_code === '700') expenseAccount = '8010';

      const journalDate = data.date || now.split('T')[0];
      const createdJournal = await accountingStore.createJournal(
        {
          journal_date: journalDate,
          period: journalDate.slice(0, 7),
          source_type: 'SPENDING',
          source_reference: refId,
          created_by: `Direct Inventory Issue (${data.userName})`,
        },
        [
          {
            account_code: expenseAccount,
            department_code: data.department_code,
            debit: totalCost,
            credit: 0,
            description: `Stock Issue Consumption: ${deptName} (${data.issued_to})`,
          },
          {
            account_code: '1080',
            department_code: data.department_code,
            debit: 0,
            credit: totalCost,
            description: `Inventory reduction from ${storeroom.name}`,
          },
        ]
      );
      journalId = createdJournal.journal_id;
      records.forEach((r) => (r.journal_id = journalId));
    } catch (e) {
      console.warn('Direct issue journal draft notice:', e);
    }

    this.saveToDisk();
    return { movements: records, journal_id: journalId };
  }

  // --- 4. STOCK TRANSFER (STOREROOM TO STOREROOM) ---
  public processStockTransfer(data: {
    date: string;
    from_storeroom_id: string;
    to_storeroom_id: string;
    to_bin_location?: string;
    items: {
      item_id: string;
      quantity: number;
    }[];
    notes?: string;
    userId: string;
    userName: string;
  }): StockMovement[] {
    if (data.from_storeroom_id === data.to_storeroom_id) {
      throw new Error('Source and destination storerooms cannot be identical.');
    }

    const fromStore = this.storerooms.get(data.from_storeroom_id);
    const toStore = this.storerooms.get(data.to_storeroom_id);
    if (!fromStore || !toStore) {
      throw new Error('Invalid source or destination storeroom specified.');
    }

    const now = new Date().toISOString();
    const transferRef = `TRF-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString(36).toUpperCase()}`;
    const movements: StockMovement[] = [];

    for (const line of data.items) {
      const item = this.items.get(line.item_id);
      if (!item) throw new Error(`Item ${line.item_id} not found.`);

      const qty = Number(line.quantity);
      if (qty <= 0) throw new Error(`Transfer quantity for ${item.item_name} must be greater than zero.`);

      // 1. Deduct from source storeroom (validates sufficient stock)
      const fromResult = this.adjustItemStoreroomStock(
        item.item_id,
        data.from_storeroom_id,
        undefined,
        -qty
      );

      // 2. Add to destination storeroom
      const toResult = this.adjustItemStoreroomStock(
        item.item_id,
        data.to_storeroom_id,
        data.to_bin_location || item.default_bin_location,
        qty
      );

      const lineValue = qty * item.average_cost;

      // Transfer OUT movement record
      const movOut: StockMovement = {
        movement_id: `MOV-TRF-OUT-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: now,
        date: data.date || now.split('T')[0],
        movement_type: 'TRANSFER_OUT',
        reference_type: 'STOCK_TRANSFER',
        reference_id: transferRef,
        item_id: item.item_id,
        item_code: item.item_code,
        item_name: item.item_name,
        storeroom_id: fromStore.storeroom_id,
        storeroom_name: fromStore.name,
        to_storeroom_id: toStore.storeroom_id,
        to_storeroom_name: toStore.name,
        quantity: qty,
        before_quantity: fromResult.before,
        after_quantity: fromResult.after,
        unit_cost: item.average_cost,
        total_cost: lineValue,
        user_id: data.userId,
        user_name: data.userName,
        notes: `Transfer to ${toStore.name}. ${data.notes || ''}`,
      };

      // Transfer IN movement record
      const movIn: StockMovement = {
        movement_id: `MOV-TRF-IN-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: now,
        date: data.date || now.split('T')[0],
        movement_type: 'TRANSFER_IN',
        reference_type: 'STOCK_TRANSFER',
        reference_id: transferRef,
        item_id: item.item_id,
        item_code: item.item_code,
        item_name: item.item_name,
        storeroom_id: toStore.storeroom_id,
        storeroom_name: toStore.name,
        to_storeroom_id: fromStore.storeroom_id,
        to_storeroom_name: fromStore.name,
        bin_location: data.to_bin_location || item.default_bin_location,
        quantity: qty,
        before_quantity: toResult.before,
        after_quantity: toResult.after,
        unit_cost: item.average_cost,
        total_cost: lineValue,
        user_id: data.userId,
        user_name: data.userName,
        notes: `Transfer received from ${fromStore.name}. ${data.notes || ''}`,
      };

      movements.push(movOut, movIn);
      this.movements.unshift(movOut, movIn);
    }

    this.saveToDisk();
    return movements;
  }

  // --- 5. PHYSICAL STOCK COUNT SESSION & BARCODE COUNT ---

  public startStockCount(data: {
    title: string;
    storeroom_id: string;
    counted_by: string;
  }): StockCountSession {
    const storeroom = this.storerooms.get(data.storeroom_id);
    if (!storeroom) throw new Error(`Storeroom ${data.storeroom_id} not found.`);

    const now = new Date().toISOString();
    const countId = `CNT-${now.slice(0, 10).replace(/-/g, '')}-${Date.now().toString(36).toUpperCase()}`;

    // Populate all active items present in this storeroom (or default to it)
    const countItems: StockCountSession['items'] = [];
    let sysVal = 0;

    for (const item of this.items.values()) {
      if (item.status !== 'ACTIVE') continue;

      const storeStock = item.storeroom_stocks?.find((s) => s.storeroom_id === data.storeroom_id);
      const systemQty = storeStock ? storeStock.quantity : 0;
      const bin = storeStock?.bin_location || item.default_bin_location || 'A-01';
      const cost = item.average_cost;

      sysVal += systemQty * cost;

      countItems.push({
        item_id: item.item_id,
        item_code: item.item_code,
        item_name: item.item_name,
        barcode: item.barcode,
        uom: item.uom,
        bin_location: bin,
        system_quantity: systemQty,
        physical_quantity: systemQty, // initial count matches system until updated
        variance_quantity: 0,
        unit_cost: cost,
        variance_value: 0,
        notes: '',
      });
    }

    const session: StockCountSession = {
      count_id: countId,
      title: data.title || `Physical Inventory - ${storeroom.name}`,
      date: now.split('T')[0],
      storeroom_id: storeroom.storeroom_id,
      storeroom_name: storeroom.name,
      counted_by: data.counted_by,
      status: 'IN_PROGRESS',
      items: countItems,
      total_system_value: sysVal,
      total_physical_value: sysVal,
      total_variance_value: 0,
      created_at: now,
    };

    this.countSessions.set(session.count_id, session);
    this.saveToDisk();
    return session;
  }

  // Update physical count inputs (can be called repeatedly during scanning)
  public updateStockCountItems(
    countId: string,
    updates: { item_id: string; physical_quantity: number; notes?: string }[]
  ): StockCountSession {
    const session = this.countSessions.get(countId);
    if (!session) throw new Error(`Stock count session ${countId} not found.`);
    if (session.status !== 'IN_PROGRESS' && session.status !== 'SUBMITTED') {
      throw new Error(`Cannot modify count: session status is ${session.status}.`);
    }

    const updateMap = new Map(updates.map((u) => [u.item_id, u]));

    let totalSys = 0;
    let totalPhys = 0;
    let totalVar = 0;

    session.items.forEach((item) => {
      const up = updateMap.get(item.item_id);
      if (up) {
        item.physical_quantity = Math.max(0, Number(up.physical_quantity));
        item.variance_quantity = item.physical_quantity - item.system_quantity;
        item.variance_value = item.variance_quantity * item.unit_cost;
        if (up.notes !== undefined) item.notes = up.notes;
      }

      totalSys += item.system_quantity * item.unit_cost;
      totalPhys += item.physical_quantity * item.unit_cost;
      totalVar += item.variance_value;
    });

    session.total_system_value = totalSys;
    session.total_physical_value = totalPhys;
    session.total_variance_value = totalVar;

    this.saveToDisk();
    return session;
  }

  // Submit count for Controller approval
  public submitStockCount(countId: string): StockCountSession {
    const session = this.countSessions.get(countId);
    if (!session) throw new Error(`Stock count session ${countId} not found.`);
    session.status = 'SUBMITTED';
    this.saveToDisk();
    return session;
  }

  // Approve stock count & apply adjustments to stock ledger
  public async approveStockCount(
    countId: string,
    approverName: string,
    approverId: string
  ): Promise<{ session: StockCountSession; journal_id?: string }> {
    const session = this.countSessions.get(countId);
    if (!session) throw new Error(`Stock count session ${countId} not found.`);
    if (session.status !== 'SUBMITTED' && session.status !== 'IN_PROGRESS') {
      throw new Error(`Cannot approve count: status is ${session.status}.`);
    }

    const now = new Date().toISOString();
    const date = now.split('T')[0];
    let totalPositiveVariance = 0;
    let totalNegativeVariance = 0;

    for (const itemLine of session.items) {
      const diff = itemLine.variance_quantity;
      if (diff === 0) continue;

      const item = this.items.get(itemLine.item_id);
      if (!item) continue;

      const absDiff = Math.abs(diff);
      const isIncrease = diff > 0;
      const moveType = isIncrease ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
      const lineCost = absDiff * itemLine.unit_cost;

      if (isIncrease) {
        totalPositiveVariance += lineCost;
      } else {
        totalNegativeVariance += lineCost;
      }

      // Update actual stock
      const { before, after } = this.adjustItemStoreroomStock(
        item.item_id,
        session.storeroom_id,
        itemLine.bin_location,
        diff
      );

      // Record adjustment movement
      this.movements.unshift({
        movement_id: `MOV-CNT-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: now,
        date: date,
        movement_type: moveType,
        reference_type: 'PHYSICAL_COUNT_ADJUSTMENT',
        reference_id: session.count_id,
        item_id: item.item_id,
        item_code: item.item_code,
        item_name: item.item_name,
        storeroom_id: session.storeroom_id,
        storeroom_name: session.storeroom_name,
        bin_location: itemLine.bin_location,
        quantity: absDiff,
        before_quantity: before,
        after_quantity: after,
        unit_cost: itemLine.unit_cost,
        total_cost: lineCost,
        user_id: approverId,
        user_name: approverName,
        notes: `Physical count adjustment (${diff > 0 ? '+' : ''}${diff} ${item.uom}): ${itemLine.notes || 'Reconciliation'}`,
      });
    }

    // Accounting Journal for net variance
    let journalId: string | undefined;
    const netVariance = session.total_variance_value;
    if (Math.abs(netVariance) > 0.01) {
      try {
        const period = date.slice(0, 7);
        const invAccount = '1080';
        const varianceExpenseAccount = '7010'; // or inventory shrinkage

        const isGain = netVariance > 0;
        const absNet = Math.abs(netVariance);

        const journalLines = isGain
          ? [
              // Gain: Debit Inventory Asset, Credit Expense/Gain
              {
                account_code: invAccount,
                department_code: '700',
                debit: absNet,
                credit: 0,
                description: `Inventory Physical Count Surplus (${session.storeroom_name})`,
              },
              {
                account_code: varianceExpenseAccount,
                department_code: '700',
                debit: 0,
                credit: absNet,
                description: `Inventory Variance Adjustment Gain - ${session.count_id}`,
              },
            ]
          : [
              // Loss / Shrinkage: Debit Shrinkage Expense, Credit Inventory Asset
              {
                account_code: varianceExpenseAccount,
                department_code: '700',
                debit: absNet,
                credit: 0,
                description: `Inventory Physical Count Shrinkage/Loss (${session.storeroom_name})`,
              },
              {
                account_code: invAccount,
                department_code: '700',
                debit: 0,
                credit: absNet,
                description: `Inventory Asset Write-down - ${session.count_id}`,
              },
            ];

        const createdJournal = await accountingStore.createJournal(
          {
            journal_date: date,
            period: period,
            source_type: 'SPENDING',
            source_reference: session.count_id,
            created_by: `Physical Inventory Reconciliation (${approverName})`,
          },
          journalLines
        );
        journalId = createdJournal.journal_id;
        session.adjustment_journal_id = journalId;
      } catch (err) {
        console.warn('Physical count journal draft notice:', err);
      }
    }

    session.status = 'APPROVED';
    session.approved_by = approverName;
    session.approved_at = now;

    this.saveToDisk();
    return { session, journal_id: journalId };
  }

  // --- 6. MANUAL STOCK ADJUSTMENT ---
  public async createStockAdjustment(data: {
    date: string;
    type: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
    storeroom_id: string;
    item_id: string;
    quantity: number;
    reason_code: StockAdjustmentRecord['reason_code'];
    reason_notes: string;
    userId: string;
    userName: string;
  }): Promise<{ adjustment: StockAdjustmentRecord; journal_id?: string }> {
    const storeroom = this.storerooms.get(data.storeroom_id);
    if (!storeroom) throw new Error(`Storeroom ${data.storeroom_id} not found.`);

    const item = this.items.get(data.item_id);
    if (!item) throw new Error(`Item ${data.item_id} not found.`);

    const qty = Number(data.quantity);
    if (qty <= 0) throw new Error('Quantity must be greater than zero.');

    const delta = data.type === 'ADJUSTMENT_IN' ? qty : -qty;
    const { before, after } = this.adjustItemStoreroomStock(
      item.item_id,
      data.storeroom_id,
      undefined,
      delta
    );

    const now = new Date().toISOString();
    const adjId = `ADJ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString(36).toUpperCase()}`;
    const totalCost = qty * item.average_cost;

    let journalId: string | undefined;
    try {
      const invAccount = '1080';
      const expenseAccount = '7010';
      const journalDate = data.date || now.split('T')[0];

      const journalLines = data.type === 'ADJUSTMENT_IN'
        ? [
            {
              account_code: invAccount,
              department_code: storeroom.department_code || '700',
              debit: totalCost,
              credit: 0,
              description: `Stock Adjustment IN (${data.reason_code}): ${item.item_name}`,
            },
            {
              account_code: expenseAccount,
              department_code: storeroom.department_code || '700',
              debit: 0,
              credit: totalCost,
              description: `Offsetting adjustment - ${adjId}`,
            },
          ]
        : [
            {
              account_code: expenseAccount,
              department_code: storeroom.department_code || '700',
              debit: totalCost,
              credit: 0,
              description: `Inventory Write-off (${data.reason_code}): ${item.item_name}`,
            },
            {
              account_code: invAccount,
              department_code: storeroom.department_code || '700',
              debit: 0,
              credit: totalCost,
              description: `Inventory deduction from ${storeroom.name}`,
            },
          ];

      const createdJournal = await accountingStore.createJournal(
        {
          journal_date: journalDate,
          period: journalDate.slice(0, 7),
          source_type: 'SPENDING',
          source_reference: adjId,
          created_by: `Inventory Adjustment (${data.userName})`,
        },
        journalLines
      );
      journalId = createdJournal.journal_id;
    } catch (e) {
      console.warn('Manual adjustment journal notice:', e);
    }

    const mov: StockMovement = {
      movement_id: `MOV-ADJ-${Date.now().toString(36).toUpperCase()}`,
      timestamp: now,
      date: data.date || now.split('T')[0],
      movement_type: data.type,
      reference_type: 'MANUAL_ADJUSTMENT',
      reference_id: adjId,
      item_id: item.item_id,
      item_code: item.item_code,
      item_name: item.item_name,
      storeroom_id: storeroom.storeroom_id,
      storeroom_name: storeroom.name,
      quantity: qty,
      before_quantity: before,
      after_quantity: after,
      unit_cost: item.average_cost,
      total_cost: totalCost,
      user_id: data.userId,
      user_name: data.userName,
      notes: `Reason: ${data.reason_code} - ${data.reason_notes}`,
      journal_id: journalId,
    };

    this.movements.unshift(mov);

    const record: StockAdjustmentRecord = {
      adjustment_id: adjId,
      date: data.date || now.split('T')[0],
      type: data.type,
      storeroom_id: storeroom.storeroom_id,
      storeroom_name: storeroom.name,
      item_id: item.item_id,
      item_code: item.item_code,
      item_name: item.item_name,
      quantity: qty,
      unit_cost: item.average_cost,
      total_cost: totalCost,
      reason_code: data.reason_code,
      reason_notes: data.reason_notes,
      approved_by: data.userName,
      journal_id: journalId,
      timestamp: now,
    };

    this.adjustments.set(record.adjustment_id, record);
    this.saveToDisk();

    return { adjustment: record, journal_id: journalId };
  }

  // --- 7. DASHBOARD KPIS & REPORTS ---

  public getDashboardKPIs(): InventoryDashboardKPIs {
    const items = this.getItems();
    let totalValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    items.forEach((item) => {
      const val = item.current_stock * item.average_cost;
      totalValuation += val;
      if (item.current_stock <= 0) {
        outOfStockCount++;
      } else if (item.current_stock <= item.reorder_point) {
        lowStockCount++;
      }
    });

    const pendingReqs = Array.from(this.requisitions.values()).filter((r) => r.status === 'PENDING').length;

    // Monthly velocity
    const currentMonth = new Date().toISOString().slice(0, 7);
    let monthlyReceiptsValue = 0;
    let monthlyIssuesValue = 0;

    const consumptionMap = new Map<string, { item_code: string; item_name: string; quantity: number; uom: string; total_cost: number }>();

    this.movements.forEach((m) => {
      if (m.date.startsWith(currentMonth)) {
        if (m.movement_type === 'RECEIPT') {
          monthlyReceiptsValue += m.total_cost;
        } else if (m.movement_type === 'DEPARTMENT_ISSUE') {
          monthlyIssuesValue += m.total_cost;

          const existing = consumptionMap.get(m.item_id) || {
            item_code: m.item_code,
            item_name: m.item_name,
            quantity: 0,
            uom: this.items.get(m.item_id)?.uom || 'PCS',
            total_cost: 0,
          };
          existing.quantity += m.quantity;
          existing.total_cost += m.total_cost;
          consumptionMap.set(m.item_id, existing);
        }
      }
    });

    const topConsumed = Array.from(consumptionMap.values())
      .sort((a, b) => b.total_cost - a.total_cost)
      .slice(0, 5);

    // Category breakdown
    const categories = this.getCategories();
    const categoryMap = new Map<string, { category_id: string; category_name: string; total_value_idr: number; items_count: number }>();
    categories.forEach((c) =>
      categoryMap.set(c.category_id, {
        category_id: c.category_id,
        category_name: c.name,
        total_value_idr: 0,
        items_count: 0,
      })
    );

    items.forEach((item) => {
      const cat = categoryMap.get(item.category_id);
      const val = (item.current_stock || 0) * (item.average_cost || 0);
      if (cat) {
        cat.total_value_idr += val;
        cat.items_count += 1;
      }
    });

    // Storerooms breakdown
    const storerooms = this.getStorerooms();
    const storeroomMap = new Map<string, { storeroom_id: string; storeroom_name: string; total_value_idr: number; items_count: number }>();
    storerooms.forEach((s) =>
      storeroomMap.set(s.storeroom_id, {
        storeroom_id: s.storeroom_id,
        storeroom_name: s.name,
        total_value_idr: 0,
        items_count: 0,
      })
    );

    items.forEach((item) => {
      if (item.storeroom_stocks) {
        item.storeroom_stocks.forEach((st) => {
          const sRecord = storeroomMap.get(st.storeroom_id);
          if (sRecord && st.quantity > 0) {
            sRecord.total_value_idr += st.quantity * (item.average_cost || 0);
            sRecord.items_count += 1;
          }
        });
      }
    });

    const openStockCounts = Array.from(this.countSessions.values()).filter(
      (sc) => sc.status === 'IN_PROGRESS' || sc.status === 'SUBMITTED'
    ).length;

    const usdRate = 16000;

    return {
      total_valuation: totalValuation,
      total_inventory_value_idr: totalValuation,
      total_inventory_value_usd: Math.round((totalValuation / usdRate) * 100) / 100,
      total_skus: items.length,
      total_items_count: items.length,
      low_stock_count: lowStockCount,
      low_stock_items_count: lowStockCount,
      out_of_stock_count: outOfStockCount,
      pending_requisitions_count: pendingReqs,
      open_stock_counts_count: openStockCounts,
      monthly_receipts_value: monthlyReceiptsValue,
      monthly_issues_value: monthlyIssuesValue,
      recent_movements: this.movements.slice(0, 10),
      top_consumed_items: topConsumed,
      category_breakdown: Array.from(categoryMap.values()),
      storeroom_breakdown: Array.from(storeroomMap.values()),
    };
  }

  // Comprehensive Inventory Reports Generation
  public getInventoryReports(params?: { period?: string; storeroom_id?: string; category_id?: string }) {
    const items = this.getItems();
    const categories = this.getCategories();
    const storerooms = this.getStorerooms();

    // 1. Stock on Hand & Valuation
    const stockOnHand = items.map((item) => {
      const cat = categories.find((c) => c.category_id === item.category_id);
      const isLow = item.current_stock > 0 && item.current_stock <= item.reorder_point;
      const isOut = item.current_stock <= 0;
      return {
        item_id: item.item_id,
        item_code: item.item_code,
        item_name: item.item_name,
        category: cat?.name || item.category_id,
        subcategory: item.subcategory,
        uom: item.uom,
        barcode: item.barcode,
        current_stock: item.current_stock,
        min_stock: item.min_stock,
        reorder_point: item.reorder_point,
        max_stock: item.max_stock,
        average_cost: item.average_cost,
        total_valuation: item.current_stock * item.average_cost,
        status: isOut ? 'OUT_OF_STOCK' : isLow ? 'LOW_STOCK' : 'ADEQUATE',
        storeroom_stocks: item.storeroom_stocks || [],
      };
    });

    // 2. Stock by Storeroom
    const stockByStoreroom = storerooms.map((store) => {
      let storeItemsCount = 0;
      let storeTotalUnits = 0;
      let storeValuation = 0;

      const itemsInStore: any[] = [];

      items.forEach((item) => {
        const line = item.storeroom_stocks?.find((s) => s.storeroom_id === store.storeroom_id);
        if (line && line.quantity > 0) {
          storeItemsCount++;
          storeTotalUnits += line.quantity;
          const val = line.quantity * item.average_cost;
          storeValuation += val;
          itemsInStore.push({
            item_code: item.item_code,
            item_name: item.item_name,
            bin: line.bin_location,
            quantity: line.quantity,
            uom: item.uom,
            unit_cost: item.average_cost,
            total_value: val,
          });
        }
      });

      return {
        storeroom_id: store.storeroom_id,
        storeroom_name: store.name,
        manager: store.manager_name,
        items_count: storeItemsCount,
        total_units: storeTotalUnits,
        total_valuation: storeValuation,
        items: itemsInStore,
      };
    });

    // 3. Stock by Department Consumption
    const depts = accountingStore.getDepartments();
    const stockByDepartment = depts.map((d) => {
      let deptIssueQty = 0;
      let deptIssueVal = 0;

      this.movements.forEach((m) => {
        if (m.movement_type === 'DEPARTMENT_ISSUE' && m.department_code === d.department_code) {
          deptIssueQty += m.quantity;
          deptIssueVal += m.total_cost;
        }
      });

      return {
        department_code: d.department_code,
        department_name: d.department_name,
        total_items_consumed: deptIssueQty,
        total_consumption_value: deptIssueVal,
      };
    });

    // 4. Low Stock & Reorder Alerts
    const lowStockReport = stockOnHand.filter((i) => i.status === 'LOW_STOCK' || i.status === 'OUT_OF_STOCK');

    // 5. Inventory-to-GL Reconciliation
    // Physical valuation
    const totalPhysicalValuation = stockOnHand.reduce((acc, i) => acc + i.total_valuation, 0);

    // GL Inventory Balance (Account 1080 Operating Supplies & Inventories)
    let glInventoryDebit = 0;
    let glInventoryCredit = 0;

    accountingStore.journalLines.forEach((jl) => {
      const header = accountingStore.journalHeaders.get(jl.journal_id);
      if (header && header.status === 'POSTED' && jl.account_code === '1080') {
        glInventoryDebit += jl.debit;
        glInventoryCredit += jl.credit;
      }
    });

    const glInventoryBalance = glInventoryDebit - glInventoryCredit;
    const glVariance = totalPhysicalValuation - glInventoryBalance;

    return {
      stock_on_hand: stockOnHand,
      stock_by_storeroom: stockByStoreroom,
      stock_by_department: stockByDepartment,
      low_stock_report: lowStockReport,
      valuation_summary: {
        total_skus: items.length,
        total_physical_valuation: totalPhysicalValuation,
        gl_inventory_account: '1080 - Operating Supplies & Inventories',
        gl_inventory_balance: glInventoryBalance,
        reconciliation_variance: glVariance,
        is_reconciled: Math.abs(glVariance) < 0.01,
      },
    };
  }
}

export const inventoryStore = new InventoryStore();
