import { 
  PrismaClient, 
  PracticeRole, 
  MembershipStatus, 
  OrderStatus,
  GoodsReceiptStatus,
  StockCountStatus,
  IntegrationType,
  Gs1VerificationStatus
} from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

// ============================================================================
// DATA DEFINITIONS
// ============================================================================

const PRACTICE_DATA = {
  id: 'seed-greenwood-clinic',
  name: 'Greenwood Medical Clinic',
  slug: 'greenwood-clinic',
  street: 'Keizersgracht 123',
  city: 'Amsterdam',
  postalCode: '1015 CJ',
  country: 'Netherlands',
  contactEmail: 'info@greenwood-clinic.nl',
  contactPhone: '+31 20 123 4567',
};

const USERS_DATA = [
  {
    id: 'seed-user-sarah',
    email: 'sarah.mitchell@greenwood-clinic.nl',
    name: 'Dr. Sarah Mitchell',
    role: PracticeRole.ADMIN,
    hasMembership: true,
  },
  {
    id: 'seed-user-emma',
    email: 'emma.johnson@greenwood-clinic.nl',
    name: 'Emma Johnson',
    role: PracticeRole.STAFF,
    hasMembership: true,
  },
  {
    id: 'seed-user-tom',
    email: 'tom.richards@greenwood-clinic.nl',
    name: 'Tom Richards',
    role: PracticeRole.STAFF,
    hasMembership: true,
  },
  {
    id: 'seed-user-existing',
    email: 'existing@remcura.test',
    name: 'Existing User',
    role: PracticeRole.STAFF,
    hasMembership: false,
  },
];

const LOCATIONS_DATA = [
  {
    id: 'seed-loc-main',
    name: 'Main Building',
    code: 'MAIN',
    description: 'Primary clinic building',
    parentCode: null,
  },
  {
    id: 'seed-loc-tr1',
    name: 'Treatment Room 1',
    code: 'TR-01',
    description: 'General consultation and treatment room',
    parentCode: 'MAIN',
  },
  {
    id: 'seed-loc-tr2',
    name: 'Treatment Room 2',
    code: 'TR-02',
    description: 'Minor procedures and examination room',
    parentCode: 'MAIN',
  },
  {
    id: 'seed-loc-pharm',
    name: 'Storage – Pharmacy',
    code: 'PHARM-STOR',
    description: 'Central pharmaceutical and medical supply storage',
    parentCode: 'MAIN',
  },
  {
    id: 'seed-loc-emergency',
    name: 'Emergency Supply Cabinet',
    code: 'EMER-CAB',
    description: 'Critical emergency supplies and medications',
    parentCode: 'MAIN',
  },
];

const PRODUCTS_DATA = [
  // Disposables - Gloves
  {
    id: 'seed-prod-gloves-nitrile-l',
    gtin: '05012345678906',
    brand: 'MediCare',
    name: 'Nitrile Examination Gloves - Large',
    description: 'Powder-free nitrile examination gloves, size L, 100 pcs per box',
    isGs1Product: true,
  },
  {
    id: 'seed-prod-gloves-nitrile-m',
    gtin: '05012345678913',
    brand: 'MediCare',
    name: 'Nitrile Examination Gloves - Medium',
    description: 'Powder-free nitrile examination gloves, size M, 100 pcs per box',
    isGs1Product: true,
  },
  {
    id: 'seed-prod-gloves-latex-l',
    gtin: null,
    brand: 'SafeMed',
    name: 'Latex Examination Gloves - Large',
    description: 'Powdered latex gloves, size L, 100 pcs per box',
    isGs1Product: false,
  },
  // Syringes & Needles
  {
    id: 'seed-prod-syringe-5ml',
    gtin: '05023456789017',
    brand: 'SafeMed',
    name: 'Sterile Syringe 5ml',
    description: 'Single-use sterile syringes with luer lock, 5ml capacity',
    isGs1Product: true,
  },
  {
    id: 'seed-prod-syringe-10ml',
    gtin: '05023456789024',
    brand: 'SafeMed',
    name: 'Sterile Syringe 10ml',
    description: 'Single-use sterile syringes with luer lock, 10ml capacity',
    isGs1Product: true,
  },
  {
    id: 'seed-prod-needles-23g',
    gtin: '05023456789031',
    brand: 'SafeMed',
    name: 'Hypodermic Needles 23G',
    description: 'Sterile hypodermic needles, 23 gauge x 25mm',
    isGs1Product: true,
  },
  // Wound Care
  {
    id: 'seed-prod-gauze-4x4',
    gtin: '05034567890128',
    brand: 'CurePlus',
    name: 'Sterile Gauze Pads 4x4',
    description: 'Sterile gauze pads for wound care, 4x4 inch, 100 pack',
    isGs1Product: true,
  },
  {
    id: 'seed-prod-bandage-elastic',
    gtin: null,
    brand: 'CurePlus',
    name: 'Elastic Bandage 10cm',
    description: 'Elastic medical bandage, 10cm x 4.5m',
    isGs1Product: false,
  },
  {
    id: 'seed-prod-bandage-adhesive',
    gtin: null,
    brand: 'CurePlus',
    name: 'Adhesive Bandages',
    description: 'Assorted adhesive bandages, waterproof, 100 pack',
    isGs1Product: false,
  },
  {
    id: 'seed-prod-wound-dressing',
    gtin: '05034567890135',
    brand: 'CurePlus',
    name: 'Advanced Wound Dressing',
    description: 'Hydrocolloid wound dressing, 10cm x 10cm, sterile',
    isGs1Product: true,
  },
  {
    id: 'seed-prod-medical-tape',
    gtin: null,
    brand: 'MediCare',
    name: 'Medical Adhesive Tape',
    description: 'Non-woven medical tape, hypoallergenic, 2.5cm x 9m',
    isGs1Product: false,
  },
  // PPE
  {
    id: 'seed-prod-masks-surgical',
    gtin: '05045678901239',
    brand: 'HealthShield',
    name: 'Surgical Face Masks',
    description: '3-ply disposable surgical masks, Type II, 50 pack',
    isGs1Product: true,
  },
  {
    id: 'seed-prod-face-shield',
    gtin: '05045678901246',
    brand: 'HealthShield',
    name: 'Protective Face Shield',
    description: 'Reusable face shield with adjustable headband',
    isGs1Product: true,
  },
  {
    id: 'seed-prod-gown-disposable',
    gtin: null,
    brand: 'HealthShield',
    name: 'Disposable Isolation Gown',
    description: 'Level 2 isolation gown, fluid resistant, one size',
    isGs1Product: false,
  },
  // Consumables
  {
    id: 'seed-prod-alcohol-wipes',
    gtin: null,
    brand: 'CleanCare',
    name: 'Alcohol Prep Pads',
    description: '70% isopropyl alcohol prep pads, 100 count',
    isGs1Product: false,
  },
  {
    id: 'seed-prod-cotton-swabs',
    gtin: null,
    brand: 'CleanCare',
    name: 'Sterile Cotton Swabs',
    description: 'Sterile cotton-tipped applicators, 100 pack',
    isGs1Product: false,
  },
  {
    id: 'seed-prod-saline-solution',
    gtin: '05056789012340',
    brand: 'MediCare',
    name: 'Sodium Chloride 0.9% Solution',
    description: 'Sterile normal saline solution, 500ml bottle',
    isGs1Product: true,
  },
  {
    id: 'seed-prod-iodine-prep',
    gtin: '05056789012357',
    brand: 'CleanCare',
    name: 'Povidone Iodine Prep Solution',
    description: '10% povidone iodine antiseptic solution, 250ml',
    isGs1Product: true,
  },
  // Equipment Consumables
  {
    id: 'seed-prod-thermometer-covers',
    gtin: null,
    brand: 'SafeMed',
    name: 'Thermometer Probe Covers',
    description: 'Disposable probe covers for digital thermometers, 100 pack',
    isGs1Product: false,
  },
  {
    id: 'seed-prod-bp-cuff-covers',
    gtin: null,
    brand: 'SafeMed',
    name: 'Blood Pressure Cuff Covers',
    description: 'Disposable BP cuff covers, universal size, 50 pack',
    isGs1Product: false,
  },
  // Dental Products
  {
    id: 'seed-prod-dental-mirror',
    gtin: null,
    brand: 'DentalEx',
    name: 'Dental Mouth Mirror',
    description: 'Front surface mouth mirror, #5 size, 12 pack',
    isGs1Product: false,
  },
  {
    id: 'seed-prod-dental-bibs',
    gtin: null,
    brand: 'DentalEx',
    name: 'Disposable Dental Bibs',
    description: '2-ply dental bibs with adhesive, blue, 500 pack',
    isGs1Product: false,
  },
];

const SUPPLIERS_DATA = [
  {
    id: 'seed-supplier-medsupply',
    name: 'MedSupply Europe',
    email: 'orders@medsupply-eu.com',
    phone: '+31 20 555 0100',
    website: 'https://www.medsupply-eu.com',
    notes: 'Primary supplier for general medical supplies. Standard delivery 3-5 business days.',
    integrationType: IntegrationType.MANUAL,
    linkToPractice: true,
    accountNumber: 'GWC-45789',
    isPreferred: true,
  },
  {
    id: 'seed-supplier-fasttrack',
    name: 'FastTrack Medical',
    email: 'sales@fasttrack-medical.com',
    phone: '+31 20 555 0200',
    website: 'https://www.fasttrack-medical.com',
    notes: 'Premium supplier with same-day delivery for urgent orders. API integration available.',
    integrationType: IntegrationType.API,
    linkToPractice: true,
    accountNumber: 'GRWD-23456',
    isPreferred: false,
  },
  {
    id: 'seed-supplier-bulkcare',
    name: 'BulkCare Wholesale',
    email: 'info@bulkcare.nl',
    phone: '+31 20 555 0300',
    website: 'https://www.bulkcare.nl',
    notes: 'Best prices for bulk orders. Higher minimum order quantities. Delivery 7-10 days.',
    integrationType: IntegrationType.MANUAL,
    linkToPractice: true,
    accountNumber: null,
    isPreferred: false,
  },
  {
    id: 'seed-supplier-dentalpro',
    name: 'DentalPro Supplies',
    email: 'support@dentalpro.eu',
    phone: '+31 20 555 0400',
    website: 'https://www.dentalpro.eu',
    notes: 'Specialized dental and orthodontic supplies. Expert support team.',
    integrationType: IntegrationType.MANUAL,
    linkToPractice: false, // Not linked - available for "Add Supplier" demo
    accountNumber: null,
    isPreferred: false,
  },
  {
    id: 'seed-supplier-officepro',
    name: 'OfficePro Medical',
    email: 'sales@officepro.nl',
    phone: '+31 20 555 0600',
    website: 'https://www.officepro.nl',
    notes: 'Office supplies, furniture, and administrative materials for medical practices.',
    integrationType: IntegrationType.MANUAL,
    linkToPractice: false, // Not linked - available for "Add Supplier" demo
    accountNumber: null,
    isPreferred: false,
  },
  {
    id: 'seed-supplier-surgical',
    name: 'SurgicalTech Solutions',
    email: 'contact@surgicaltech.eu',
    phone: '+31 20 555 0700',
    website: 'https://www.surgicaltech.eu',
    notes: 'Specialized surgical instruments and equipment. Premium quality products.',
    integrationType: IntegrationType.API,
    linkToPractice: false, // Not linked - available for "Add Supplier" demo
    accountNumber: null,
    isPreferred: false,
  },
];

// Items with inventory distribution (quantity per location)
// Format: { productId, sku, name, unit, description, defaultSupplier, reorderPoint, reorderQty, inventory: { locationCode: qty } }
const ITEMS_DATA = [
  {
    id: 'seed-item-gloves-nitrile-l',
    productId: 'seed-prod-gloves-nitrile-l',
    sku: 'GLV-NIT-L-001',
    name: 'Nitrile Gloves - Large',
    unit: 'box',
    description: 'Powder-free nitrile gloves, size L (100 pcs/box)',
    defaultSupplier: 'medsupply',
    reorderPoint: 20,
    reorderQuantity: 100,
    inventory: {
      'PHARM-STOR': 6,
      'TR-01': 2,
      'EMER-CAB': 0,
    },
  },
  {
    id: 'seed-item-gloves-nitrile-m',
    productId: 'seed-prod-gloves-nitrile-m',
    sku: 'GLV-NIT-M-002',
    name: 'Nitrile Gloves - Medium',
    unit: 'box',
    description: 'Powder-free nitrile gloves, size M (100 pcs/box)',
    defaultSupplier: 'medsupply',
    reorderPoint: 25,
    reorderQuantity: 100,
    inventory: {
      'PHARM-STOR': 8,
      'TR-01': 4,
      'TR-02': 3,
      'EMER-CAB': 1,
    },
  },
  {
    id: 'seed-item-gloves-latex-l',
    productId: 'seed-prod-gloves-latex-l',
    sku: 'GLV-LAT-L-003',
    name: 'Latex Gloves - Large',
    unit: 'box',
    description: 'Powdered latex gloves, size L (100 pcs/box)',
    defaultSupplier: 'bulkcare',
    reorderPoint: 15,
    reorderQuantity: 50,
    inventory: {
      'PHARM-STOR': 28,
      'TR-01': 3,
    },
  },
  {
    id: 'seed-item-syringe-5ml',
    productId: 'seed-prod-syringe-5ml',
    sku: 'SYR-5ML-004',
    name: 'Syringes 5ml',
    unit: 'pack',
    description: 'Sterile single-use syringes, 5ml (50 pcs/pack)',
    defaultSupplier: 'medsupply',
    reorderPoint: 25,
    reorderQuantity: 50,
    inventory: {
      'PHARM-STOR': 8,
      'TR-01': 4,
      'EMER-CAB': 2,
    },
  },
  {
    id: 'seed-item-syringe-10ml',
    productId: 'seed-prod-syringe-10ml',
    sku: 'SYR-10ML-005',
    name: 'Syringes 10ml',
    unit: 'pack',
    description: 'Sterile single-use syringes, 10ml (50 pcs/pack)',
    defaultSupplier: 'medsupply',
    reorderPoint: 15,
    reorderQuantity: 30,
    inventory: {
      'PHARM-STOR': 22,
      'TR-02': 3,
      'EMER-CAB': 2,
    },
  },
  {
    id: 'seed-item-needles-23g',
    productId: 'seed-prod-needles-23g',
    sku: 'NDL-23G-006',
    name: 'Needles 23G',
    unit: 'pack',
    description: 'Hypodermic needles 23G x 25mm (100 pcs/pack)',
    defaultSupplier: 'medsupply',
    reorderPoint: 20,
    reorderQuantity: 40,
    inventory: {
      'PHARM-STOR': 35,
      'TR-01': 5,
      'TR-02': 4,
    },
  },
  {
    id: 'seed-item-gauze-4x4',
    productId: 'seed-prod-gauze-4x4',
    sku: 'GAU-4X4-007',
    name: 'Sterile Gauze 4x4',
    unit: 'pack',
    description: 'Sterile gauze pads, 4x4 inch (100 pcs/pack)',
    defaultSupplier: 'fasttrack',
    reorderPoint: 15,
    reorderQuantity: 30,
    inventory: {
      'PHARM-STOR': 3,
      'TR-01': 2,
      'EMER-CAB': 1,
    },
  },
  {
    id: 'seed-item-bandage-elastic',
    productId: 'seed-prod-bandage-elastic',
    sku: 'BND-EL-008',
    name: 'Elastic Bandage 10cm',
    unit: 'roll',
    description: 'Elastic medical bandage, 10cm x 4.5m',
    defaultSupplier: 'bulkcare',
    reorderPoint: 20,
    reorderQuantity: 50,
    inventory: {
      'PHARM-STOR': 48,
      'TR-01': 6,
      'TR-02': 5,
      'EMER-CAB': 2,
    },
  },
  {
    id: 'seed-item-bandage-adhesive',
    productId: 'seed-prod-bandage-adhesive',
    sku: 'BND-ADH-009',
    name: 'Adhesive Bandages',
    unit: 'box',
    description: 'Assorted adhesive bandages (100 pcs/box)',
    defaultSupplier: 'medsupply',
    reorderPoint: 20,
    reorderQuantity: 50,
    inventory: {
      'PHARM-STOR': 4,
      'TR-01': 2,
      'TR-02': 1,
    },
  },
  {
    id: 'seed-item-wound-dressing',
    productId: 'seed-prod-wound-dressing',
    sku: 'WND-DRS-010',
    name: 'Advanced Wound Dressing',
    unit: 'each',
    description: 'Hydrocolloid wound dressing, 10x10cm',
    defaultSupplier: 'fasttrack',
    reorderPoint: 10,
    reorderQuantity: 25,
    inventory: {
      'PHARM-STOR': 18,
      'TR-01': 3,
      'TR-02': 2,
    },
  },
  {
    id: 'seed-item-medical-tape',
    productId: 'seed-prod-medical-tape',
    sku: 'TAPE-MED-011',
    name: 'Medical Tape',
    unit: 'roll',
    description: 'Non-woven adhesive tape, 2.5cm x 9m',
    defaultSupplier: 'medsupply',
    reorderPoint: 15,
    reorderQuantity: 40,
    inventory: {
      'PHARM-STOR': 32,
      'TR-01': 4,
      'TR-02': 3,
    },
  },
  {
    id: 'seed-item-masks-surgical',
    productId: 'seed-prod-masks-surgical',
    sku: 'MSK-SUR-012',
    name: 'Surgical Masks',
    unit: 'box',
    description: '3-ply surgical masks, Type II (50 pcs/box)',
    defaultSupplier: 'fasttrack',
    reorderPoint: 30,
    reorderQuantity: 100,
    inventory: {
      'PHARM-STOR': 10,
      'TR-01': 4,
      'TR-02': 4,
      'EMER-CAB': 2,
    },
  },
  {
    id: 'seed-item-face-shield',
    productId: 'seed-prod-face-shield',
    sku: 'PPE-SHIELD-013',
    name: 'Face Shield',
    unit: 'each',
    description: 'Reusable protective face shield',
    defaultSupplier: 'fasttrack',
    reorderPoint: 5,
    reorderQuantity: 15,
    inventory: {
      'PHARM-STOR': 8,
      'TR-01': 2,
      'TR-02': 2,
    },
  },
  {
    id: 'seed-item-gown-disposable',
    productId: 'seed-prod-gown-disposable',
    sku: 'PPE-GOWN-014',
    name: 'Isolation Gown',
    unit: 'each',
    description: 'Level 2 disposable isolation gown',
    defaultSupplier: 'medsupply',
    reorderPoint: 10,
    reorderQuantity: 30,
    inventory: {
      'PHARM-STOR': 25,
      'TR-01': 3,
      'EMER-CAB': 4,
    },
  },
  {
    id: 'seed-item-alcohol-wipes',
    productId: 'seed-prod-alcohol-wipes',
    sku: 'ALC-WIPE-015',
    name: 'Alcohol Wipes',
    unit: 'box',
    description: '70% isopropyl alcohol pads (100 count/box)',
    defaultSupplier: 'medsupply',
    reorderPoint: 20,
    reorderQuantity: 50,
    inventory: {
      'PHARM-STOR': 42,
      'TR-01': 8,
      'TR-02': 6,
      'EMER-CAB': 3,
    },
  },
  {
    id: 'seed-item-cotton-swabs',
    productId: 'seed-prod-cotton-swabs',
    sku: 'COT-SWB-016',
    name: 'Cotton Swabs',
    unit: 'pack',
    description: 'Sterile cotton-tipped applicators (100 pcs/pack)',
    defaultSupplier: 'bulkcare',
    reorderPoint: 15,
    reorderQuantity: 30,
    inventory: {
      'PHARM-STOR': 28,
      'TR-01': 4,
      'TR-02': 3,
    },
  },
  {
    id: 'seed-item-saline-solution',
    productId: 'seed-prod-saline-solution',
    sku: 'SAL-SOL-017',
    name: 'Saline Solution 0.9%',
    unit: 'bottle',
    description: 'Sterile normal saline, 500ml',
    defaultSupplier: 'medsupply',
    reorderPoint: 10,
    reorderQuantity: 24,
    inventory: {
      'PHARM-STOR': 18,
      'TR-01': 2,
      'TR-02': 2,
      'EMER-CAB': 2,
    },
  },
  {
    id: 'seed-item-iodine-prep',
    productId: 'seed-prod-iodine-prep',
    sku: 'IOD-PREP-018',
    name: 'Iodine Prep Solution',
    unit: 'bottle',
    description: '10% povidone iodine solution, 250ml',
    defaultSupplier: 'fasttrack',
    reorderPoint: 8,
    reorderQuantity: 20,
    inventory: {
      'PHARM-STOR': 12,
      'TR-02': 2,
      'EMER-CAB': 1,
    },
  },
  {
    id: 'seed-item-thermometer-covers',
    productId: 'seed-prod-thermometer-covers',
    sku: 'THERM-CVR-019',
    name: 'Thermometer Covers',
    unit: 'pack',
    description: 'Disposable probe covers (100 pcs/pack)',
    defaultSupplier: 'medsupply',
    reorderPoint: 10,
    reorderQuantity: 25,
    inventory: {
      'PHARM-STOR': 22,
      'TR-01': 3,
      'TR-02': 2,
    },
  },
  {
    id: 'seed-item-bp-cuff-covers',
    productId: 'seed-prod-bp-cuff-covers',
    sku: 'BP-CVR-020',
    name: 'BP Cuff Covers',
    unit: 'pack',
    description: 'Disposable BP cuff covers (50 pcs/pack)',
    defaultSupplier: 'bulkcare',
    reorderPoint: 8,
    reorderQuantity: 20,
    inventory: {
      'PHARM-STOR': 16,
      'TR-01': 2,
      'TR-02': 2,
    },
  },
];

// Supplier pricing for items (multiple suppliers can offer same product)
const SUPPLIER_CATALOG_DATA = [
  // MedSupply Europe pricing
  { supplierId: 'medsupply', productId: 'seed-prod-gloves-nitrile-l', sku: 'MSE-GLV-NIT-L', price: 12.50, minQty: 10 },
  { supplierId: 'medsupply', productId: 'seed-prod-gloves-nitrile-m', sku: 'MSE-GLV-NIT-M', price: 12.50, minQty: 10 },
  { supplierId: 'medsupply', productId: 'seed-prod-syringe-5ml', sku: 'MSE-SYR-5ML', price: 18.00, minQty: 5 },
  { supplierId: 'medsupply', productId: 'seed-prod-syringe-10ml', sku: 'MSE-SYR-10ML', price: 22.50, minQty: 5 },
  { supplierId: 'medsupply', productId: 'seed-prod-needles-23g', sku: 'MSE-NDL-23G', price: 15.75, minQty: 5 },
  { supplierId: 'medsupply', productId: 'seed-prod-bandage-adhesive', sku: 'MSE-BND-ADH', price: 8.25, minQty: 10 },
  { supplierId: 'medsupply', productId: 'seed-prod-medical-tape', sku: 'MSE-TAPE', price: 2.80, minQty: 10 },
  { supplierId: 'medsupply', productId: 'seed-prod-gown-disposable', sku: 'MSE-GOWN', price: 3.50, minQty: 20 },
  { supplierId: 'medsupply', productId: 'seed-prod-alcohol-wipes', sku: 'MSE-ALC', price: 6.50, minQty: 10 },
  { supplierId: 'medsupply', productId: 'seed-prod-saline-solution', sku: 'MSE-SAL', price: 4.25, minQty: 12 },
  { supplierId: 'medsupply', productId: 'seed-prod-thermometer-covers', sku: 'MSE-THERM', price: 12.00, minQty: 5 },
  
  // FastTrack Medical pricing (premium, some overlap)
  { supplierId: 'fasttrack', productId: 'seed-prod-gloves-nitrile-l', sku: 'FTM-GLVL', price: 14.25, minQty: 5 },
  { supplierId: 'fasttrack', productId: 'seed-prod-gloves-nitrile-m', sku: 'FTM-GLVM', price: 14.25, minQty: 5 },
  { supplierId: 'fasttrack', productId: 'seed-prod-gauze-4x4', sku: 'FTM-GAUZE', price: 8.99, minQty: 10 },
  { supplierId: 'fasttrack', productId: 'seed-prod-wound-dressing', sku: 'FTM-WNDDR', price: 4.50, minQty: 10 },
  { supplierId: 'fasttrack', productId: 'seed-prod-masks-surgical', sku: 'FTM-MASK', price: 9.75, minQty: 20 },
  { supplierId: 'fasttrack', productId: 'seed-prod-face-shield', sku: 'FTM-SHIELD', price: 8.50, minQty: 10 },
  { supplierId: 'fasttrack', productId: 'seed-prod-iodine-prep', sku: 'FTM-IOD', price: 7.80, minQty: 6 },
  
  // BulkCare Wholesale pricing (budget, higher minimums)
  { supplierId: 'bulkcare', productId: 'seed-prod-gloves-nitrile-l', sku: 'BCW-GLVL', price: 11.00, minQty: 50 },
  { supplierId: 'bulkcare', productId: 'seed-prod-gloves-nitrile-m', sku: 'BCW-GLVM', price: 11.00, minQty: 50 },
  { supplierId: 'bulkcare', productId: 'seed-prod-gloves-latex-l', sku: 'BCW-LATL', price: 9.50, minQty: 30 },
  { supplierId: 'bulkcare', productId: 'seed-prod-bandage-elastic', sku: 'BCW-BNDEL', price: 3.25, minQty: 30 },
  { supplierId: 'bulkcare', productId: 'seed-prod-cotton-swabs', sku: 'BCW-COTTON', price: 5.20, minQty: 20 },
  { supplierId: 'bulkcare', productId: 'seed-prod-bp-cuff-covers', sku: 'BCW-BPCUFF', price: 14.50, minQty: 15 },
  
  // DentalPro Supplies pricing (unlinked supplier - for demo purposes)
  { supplierId: 'dentalpro', productId: 'seed-prod-dental-mirror', sku: 'DPS-MIR-5', price: 18.50, minQty: 5 },
  { supplierId: 'dentalpro', productId: 'seed-prod-dental-bibs', sku: 'DPS-BIB-500', price: 22.00, minQty: 10 },
  { supplierId: 'dentalpro', productId: 'seed-prod-gloves-nitrile-m', sku: 'DPS-GLVM', price: 13.50, minQty: 10 },
  { supplierId: 'dentalpro', productId: 'seed-prod-masks-surgical', sku: 'DPS-MASK', price: 10.25, minQty: 20 },
  
  // SurgicalTech Solutions pricing (unlinked supplier, premium products)
  { supplierId: 'surgical', productId: 'seed-prod-gloves-nitrile-l', sku: 'STS-GLVL-PREM', price: 15.99, minQty: 5 },
  { supplierId: 'surgical', productId: 'seed-prod-gloves-nitrile-m', sku: 'STS-GLVM-PREM', price: 15.99, minQty: 5 },
  { supplierId: 'surgical', productId: 'seed-prod-wound-dressing', sku: 'STS-WNDDR-ADV', price: 5.25, minQty: 5 },
  { supplierId: 'surgical', productId: 'seed-prod-gauze-4x4', sku: 'STS-GAUZE-STER', price: 9.50, minQty: 10 },
  { supplierId: 'surgical', productId: 'seed-prod-syringe-5ml', sku: 'STS-SYR5', price: 19.50, minQty: 5 },
  { supplierId: 'surgical', productId: 'seed-prod-syringe-10ml', sku: 'STS-SYR10', price: 24.00, minQty: 5 },
  
  // OfficePro Medical pricing (unlinked supplier, office/admin supplies)
  { supplierId: 'officepro', productId: 'seed-prod-masks-surgical', sku: 'OPM-MASK-50', price: 8.50, minQty: 50 },
  { supplierId: 'officepro', productId: 'seed-prod-gloves-nitrile-l', sku: 'OPM-GLVL', price: 11.75, minQty: 20 },
  { supplierId: 'officepro', productId: 'seed-prod-gloves-nitrile-m', sku: 'OPM-GLVM', price: 11.75, minQty: 20 },
  { supplierId: 'officepro', productId: 'seed-prod-medical-tape', sku: 'OPM-TAPE', price: 2.50, minQty: 20 },
  { supplierId: 'officepro', productId: 'seed-prod-thermometer-covers', sku: 'OPM-THERM', price: 11.00, minQty: 10 },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function createPracticeAndUsers(passwordHash: string) {
  console.log('\n📋 Creating practice and users...');
  
  const practice = await prisma.practice.upsert({
    where: { slug: PRACTICE_DATA.slug },
    update: {},
    create: PRACTICE_DATA,
  });

  const createdUsers = [];
  for (const userData of USERS_DATA) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        name: userData.name,
        passwordHash,
      },
      create: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        passwordHash,
      },
    });

    if (userData.hasMembership) {
      await prisma.practiceUser.upsert({
        where: {
          practiceId_userId: {
            practiceId: practice.id,
            userId: user.id,
          },
        },
        update: {
          role: userData.role,
          status: MembershipStatus.ACTIVE,
          acceptedAt: new Date(),
        },
        create: {
          practiceId: practice.id,
          userId: user.id,
          role: userData.role,
          status: MembershipStatus.ACTIVE,
          invitedAt: new Date(),
          acceptedAt: new Date(),
        },
      });
    }

    createdUsers.push(user);
  }

  console.log(`  ✓ Practice: ${practice.name}`);
  console.log(`  ✓ Users: ${createdUsers.length} (${USERS_DATA.filter(u => u.hasMembership).length} with membership)`);

  return { practice, users: createdUsers };
}

async function createLocations(practiceId: string) {
  console.log('\n📍 Creating location hierarchy...');
  
  const locationMap = new Map();

  // Create locations in order (parent first)
  for (const locData of LOCATIONS_DATA) {
    const parentId = locData.parentCode 
      ? locationMap.get(locData.parentCode)?.id 
      : null;

    const location = await prisma.location.upsert({
      where: { id: locData.id },
      update: {
        name: locData.name,
        practiceId,
      },
      create: {
        id: locData.id,
        practiceId,
        name: locData.name,
        code: locData.code,
        description: locData.description,
        parentId,
      },
    });

    locationMap.set(locData.code, location);
  }

  console.log(`  ✓ Locations: ${LOCATIONS_DATA.length} created`);
  return locationMap;
}

async function createItems(practiceId: string, locationMap: Map<string, any>, supplierMap: Map<string, any>) {
  console.log('\n📦 Creating items and inventory...');
  
  const itemMap = new Map();
  let lowStockCount = 0;

  // Create items and inventory
  for (const itemData of ITEMS_DATA) {
    const defaultSupplierId = supplierMap.get(itemData.defaultSupplier)?.id;

    const item = await prisma.item.upsert({
      where: { id: itemData.id },
      update: {
        name: itemData.name,
        sku: itemData.sku,
      },
      create: {
        id: itemData.id,
        practiceId,
        productId: itemData.productId,
        name: itemData.name,
        sku: itemData.sku,
        unit: itemData.unit,
        description: itemData.description,
        defaultSupplierId,
      },
    });

    itemMap.set(itemData.id, item);

    // Create inventory at each location
    let totalQty = 0;
    for (const [locationCode, quantity] of Object.entries(itemData.inventory)) {
      const location = locationMap.get(locationCode);
      if (location) {
        await prisma.locationInventory.upsert({
          where: {
            locationId_itemId: {
              locationId: location.id,
              itemId: item.id,
            },
          },
          update: {
            quantity,
            reorderPoint: itemData.reorderPoint,
            reorderQuantity: itemData.reorderQuantity,
          },
          create: {
            locationId: location.id,
            itemId: item.id,
            quantity,
            reorderPoint: itemData.reorderPoint,
            reorderQuantity: itemData.reorderQuantity,
          },
        });
        totalQty += quantity;
      }
    }

    if (totalQty < itemData.reorderPoint) {
      lowStockCount++;
    }
  }

  console.log(`  ✓ Items: ${ITEMS_DATA.length} (${lowStockCount} below reorder point)`);

  return itemMap;
}

async function createSuppliersAndCatalog(practiceId: string) {
  console.log('\n🚚 Creating suppliers and catalog...');
  
  const supplierMap = new Map();
  const globalSupplierMap = new Map();

  for (const suppData of SUPPLIERS_DATA) {
    // Map by short name for easy reference
    const shortName = suppData.id.replace('seed-supplier-', '');
    
    // Create GlobalSupplier (new architecture) - always create all global suppliers
    const globalSupplier = await prisma.globalSupplier.upsert({
      where: { id: `global-${suppData.id}` },
      update: {
        name: suppData.name,
      },
      create: {
        id: `global-${suppData.id}`,
        name: suppData.name,
        email: suppData.email,
        phone: suppData.phone,
        website: suppData.website,
        notes: suppData.notes,
      },
    });

    globalSupplierMap.set(shortName, globalSupplier);

    // Only create legacy Supplier if linked to practice (for backward compatibility)
    if (suppData.linkToPractice) {
      const supplier = await prisma.supplier.upsert({
        where: { id: suppData.id },
        update: {
          name: suppData.name,
        },
        create: {
          id: suppData.id,
          practiceId,
          name: suppData.name,
          email: suppData.email,
          phone: suppData.phone,
          website: suppData.website,
          notes: suppData.notes,
        },
      });

      supplierMap.set(shortName, supplier);

      // Create PracticeSupplier link for linked suppliers
      await prisma.practiceSupplier.upsert({
        where: {
          practiceId_globalSupplierId: {
            practiceId,
            globalSupplierId: globalSupplier.id,
          },
        },
        update: {},
        create: {
          practiceId,
          globalSupplierId: globalSupplier.id,
          migratedFromSupplierId: supplier.id,
          accountNumber: suppData.accountNumber || null,
          customLabel: suppData.customLabel || null,
          isPreferred: suppData.isPreferred || false,
          isBlocked: false,
        },
      });
    }
  }

  // Create supplier catalog entries
  for (const catalogData of SUPPLIER_CATALOG_DATA) {
    const supplier = supplierMap.get(catalogData.supplierId);
    if (supplier) {
      const integrationConfig = catalogData.supplierId === 'fasttrack' 
        ? {
            apiEndpoint: 'https://api.fasttrack-medical.com/v1/catalog',
            apiKey: 'demo_key_12345',
            syncFrequency: 'hourly',
          }
        : null;

      const integrationType = catalogData.supplierId === 'fasttrack'
        ? IntegrationType.API
        : IntegrationType.MANUAL;

      await prisma.supplierCatalog.upsert({
        where: {
          supplierId_productId: {
            supplierId: supplier.id,
            productId: catalogData.productId,
          },
        },
        update: {
          unitPrice: catalogData.price,
          minOrderQty: catalogData.minQty,
        },
        create: {
          supplierId: supplier.id,
          productId: catalogData.productId,
          supplierSku: catalogData.sku,
          unitPrice: catalogData.price,
          currency: 'EUR',
          minOrderQty: catalogData.minQty,
          integrationType,
          ...(integrationConfig ? { integrationConfig } : {}),
          isActive: true,
        },
      });
    }
  }

  const linkedCount = SUPPLIERS_DATA.filter(s => s.linkToPractice).length;
  const unlinkedCount = SUPPLIERS_DATA.filter(s => !s.linkToPractice).length;
  
  console.log(`  ✓ GlobalSuppliers: ${SUPPLIERS_DATA.length} (platform-wide)`);
  console.log(`  ✓ Linked to practice: ${linkedCount} suppliers`);
  console.log(`  ✓ Available to link: ${unlinkedCount} suppliers (for "Add Supplier" demo)`);
  console.log(`  ✓ Legacy Suppliers: ${linkedCount} (backward compatibility)`);
  console.log(`  ✓ Catalog entries: ${SUPPLIER_CATALOG_DATA.length}`);
  
  return supplierMap;
}

async function createOrders(practiceId: string, userId: string, supplierMap: Map<string, any>, itemMap: Map<string, any>) {
  console.log('\n📦 Creating orders...');
  
  const now = new Date();
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const ordersData = [
    {
      id: 'seed-order-001-draft',
      status: OrderStatus.DRAFT,
      supplier: 'medsupply',
      reference: 'PO-2024-101',
      notes: 'Restocking low inventory items - urgent',
      createdAt: daysAgo(2),
      sentAt: null,
      expectedAt: null,
      receivedAt: null,
      items: [
        { itemId: 'seed-item-gloves-nitrile-l', quantity: 100, unitPrice: 12.50 },
        { itemId: 'seed-item-syringe-5ml', quantity: 50, unitPrice: 18.00 },
        { itemId: 'seed-item-bandage-adhesive', quantity: 50, unitPrice: 8.25 },
      ],
    },
    {
      id: 'seed-order-002-sent',
      status: OrderStatus.SENT,
      supplier: 'fasttrack',
      reference: 'PO-2024-102',
      notes: 'Emergency order - gauze and masks needed',
      createdAt: daysAgo(7),
      sentAt: daysAgo(7),
      expectedAt: daysAgo(1),
      receivedAt: null,
      items: [
        { itemId: 'seed-item-gauze-4x4', quantity: 30, unitPrice: 8.99 },
        { itemId: 'seed-item-masks-surgical', quantity: 100, unitPrice: 9.75 },
      ],
    },
    {
      id: 'seed-order-003-sent',
      status: OrderStatus.SENT,
      supplier: 'bulkcare',
      reference: 'PO-2024-103',
      notes: 'Monthly bulk order',
      createdAt: daysAgo(5),
      sentAt: daysAgo(5),
      expectedAt: now,
      receivedAt: null,
      items: [
        { itemId: 'seed-item-gloves-latex-l', quantity: 50, unitPrice: 9.50 },
        { itemId: 'seed-item-bandage-elastic', quantity: 50, unitPrice: 3.25 },
        { itemId: 'seed-item-cotton-swabs', quantity: 30, unitPrice: 5.20 },
      ],
    },
    {
      id: 'seed-order-004-partial',
      status: OrderStatus.PARTIALLY_RECEIVED,
      supplier: 'medsupply',
      reference: 'PO-2024-104',
      notes: 'Regular restock - partially delivered',
      createdAt: daysAgo(14),
      sentAt: daysAgo(14),
      expectedAt: daysAgo(10),
      receivedAt: daysAgo(9),
      items: [
        { itemId: 'seed-item-syringe-10ml', quantity: 30, unitPrice: 22.50 },
        { itemId: 'seed-item-needles-23g', quantity: 40, unitPrice: 15.75 },
        { itemId: 'seed-item-alcohol-wipes', quantity: 50, unitPrice: 6.50 },
      ],
    },
    {
      id: 'seed-order-005-received',
      status: OrderStatus.RECEIVED,
      supplier: 'medsupply',
      reference: 'PO-2024-105',
      notes: 'Weekly consumables restock',
      createdAt: daysAgo(21),
      sentAt: daysAgo(21),
      expectedAt: daysAgo(18),
      receivedAt: daysAgo(17),
      items: [
        { itemId: 'seed-item-gloves-nitrile-m', quantity: 100, unitPrice: 12.50 },
        { itemId: 'seed-item-alcohol-wipes', quantity: 50, unitPrice: 6.50 },
        { itemId: 'seed-item-medical-tape', quantity: 40, unitPrice: 2.80 },
      ],
    },
    {
      id: 'seed-order-006-received',
      status: OrderStatus.RECEIVED,
      supplier: 'fasttrack',
      reference: 'PO-2024-106',
      notes: 'PPE supplies',
      createdAt: daysAgo(18),
      sentAt: daysAgo(18),
      expectedAt: daysAgo(16),
      receivedAt: daysAgo(15),
      items: [
        { itemId: 'seed-item-face-shield', quantity: 15, unitPrice: 8.50 },
        { itemId: 'seed-item-wound-dressing', quantity: 25, unitPrice: 4.50 },
      ],
    },
    {
      id: 'seed-order-007-received',
      status: OrderStatus.RECEIVED,
      supplier: 'medsupply',
      reference: 'PO-2024-107',
      notes: 'General supplies',
      createdAt: daysAgo(28),
      sentAt: daysAgo(28),
      expectedAt: daysAgo(25),
      receivedAt: daysAgo(24),
      items: [
        { itemId: 'seed-item-saline-solution', quantity: 24, unitPrice: 4.25 },
        { itemId: 'seed-item-thermometer-covers', quantity: 25, unitPrice: 12.00 },
        { itemId: 'seed-item-gown-disposable', quantity: 30, unitPrice: 3.50 },
      ],
    },
    {
      id: 'seed-order-008-cancelled',
      status: OrderStatus.CANCELLED,
      supplier: 'bulkcare',
      reference: 'PO-2024-108',
      notes: 'Cancelled - found better pricing elsewhere',
      createdAt: daysAgo(12),
      sentAt: null,
      expectedAt: null,
      receivedAt: null,
      items: [
        { itemId: 'seed-item-gloves-latex-l', quantity: 100, unitPrice: 9.50 },
      ],
    },
  ];

  for (const orderData of ordersData) {
    const supplier = supplierMap.get(orderData.supplier);
    if (!supplier) continue;

    const order = await prisma.order.upsert({
      where: { id: orderData.id },
      update: {
        status: orderData.status,
      },
      create: {
        id: orderData.id,
        practiceId,
        supplierId: supplier.id,
        status: orderData.status,
        createdById: userId,
        reference: orderData.reference,
        notes: orderData.notes,
        sentAt: orderData.sentAt,
        expectedAt: orderData.expectedAt,
        receivedAt: orderData.receivedAt,
        createdAt: orderData.createdAt,
      },
    });

    // Create order items
    for (const itemData of orderData.items) {
      const item = itemMap.get(itemData.itemId);
      if (item) {
        await prisma.orderItem.upsert({
          where: {
            orderId_itemId: {
              orderId: order.id,
              itemId: item.id,
            },
          },
          update: {
            quantity: itemData.quantity,
            unitPrice: itemData.unitPrice,
          },
          create: {
            orderId: order.id,
            itemId: item.id,
            quantity: itemData.quantity,
            unitPrice: itemData.unitPrice,
          },
        });
      }
    }
  }

  console.log(`  ✓ Orders: ${ordersData.length} (1 draft, 2 sent, 1 partial, 3 received, 1 cancelled)`);
}

async function createGoodsReceipts(
  practiceId: string,
  userId: string,
  locationMap: Map<string, any>,
  supplierMap: Map<string, any>,
  itemMap: Map<string, any>
) {
  console.log('\n📥 Creating goods receipts...');
  
  const now = new Date();
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const pharmLocation = locationMap.get('PHARM-STOR');

  const receiptsData = [
    {
      id: 'seed-receipt-001',
      orderId: 'seed-order-005-received',
      supplier: 'medsupply',
      status: GoodsReceiptStatus.CONFIRMED,
      receivedAt: daysAgo(17),
      createdAt: daysAgo(17),
      notes: 'Full delivery received and checked',
      lines: [
        { itemId: 'seed-item-gloves-nitrile-m', quantity: 100, batchNumber: 'GLV-M-20241101', expiryDate: new Date('2026-11-01') },
        { itemId: 'seed-item-alcohol-wipes', quantity: 50, batchNumber: 'ALC-20241015', expiryDate: new Date('2027-10-15') },
        { itemId: 'seed-item-medical-tape', quantity: 40, batchNumber: null, expiryDate: null },
      ],
    },
    {
      id: 'seed-receipt-002',
      orderId: 'seed-order-006-received',
      supplier: 'fasttrack',
      status: GoodsReceiptStatus.CONFIRMED,
      receivedAt: daysAgo(15),
      createdAt: daysAgo(15),
      notes: 'PPE items received in good condition',
      lines: [
        { itemId: 'seed-item-face-shield', quantity: 15, batchNumber: null, expiryDate: null },
        { itemId: 'seed-item-wound-dressing', quantity: 25, batchNumber: 'WD-20241020', expiryDate: new Date('2027-10-20') },
      ],
    },
    {
      id: 'seed-receipt-003',
      orderId: 'seed-order-007-received',
      supplier: 'medsupply',
      status: GoodsReceiptStatus.CONFIRMED,
      receivedAt: daysAgo(24),
      createdAt: daysAgo(24),
      notes: 'Complete order received',
      lines: [
        { itemId: 'seed-item-saline-solution', quantity: 24, batchNumber: 'SAL-20241001', expiryDate: new Date('2026-10-01') },
        { itemId: 'seed-item-thermometer-covers', quantity: 25, batchNumber: null, expiryDate: null },
        { itemId: 'seed-item-gown-disposable', quantity: 30, batchNumber: 'GOWN-20241010', expiryDate: new Date('2027-10-10') },
      ],
    },
    {
      id: 'seed-receipt-004',
      orderId: 'seed-order-004-partial',
      supplier: 'medsupply',
      status: GoodsReceiptStatus.CONFIRMED,
      receivedAt: daysAgo(9),
      createdAt: daysAgo(9),
      notes: 'Partial delivery - needles still pending',
      lines: [
        { itemId: 'seed-item-syringe-10ml', quantity: 30, batchNumber: 'SYR10-20241105', expiryDate: new Date('2027-11-05') },
        { itemId: 'seed-item-alcohol-wipes', quantity: 50, batchNumber: 'ALC-20241101', expiryDate: new Date('2027-11-01') },
        // Note: needles from order not received yet (demonstrates partial)
      ],
    },
    {
      id: 'seed-receipt-005',
      orderId: null,
      supplier: 'fasttrack',
      status: GoodsReceiptStatus.CONFIRMED,
      receivedAt: daysAgo(6),
      createdAt: daysAgo(6),
      notes: 'Ad-hoc emergency delivery (no PO)',
      lines: [
        { itemId: 'seed-item-gauze-4x4', quantity: 10, batchNumber: 'GAU-20241108', expiryDate: new Date('2027-11-08') },
        { itemId: 'seed-item-masks-surgical', quantity: 20, batchNumber: 'MSK-20241108', expiryDate: new Date('2026-11-08') },
      ],
    },
    {
      id: 'seed-receipt-006',
      orderId: 'seed-order-002-sent',
      supplier: 'fasttrack',
      status: GoodsReceiptStatus.DRAFT,
      receivedAt: null,
      createdAt: now,
      notes: 'Delivery arrived - verification in progress',
      lines: [
        { itemId: 'seed-item-gauze-4x4', quantity: 30, batchNumber: null, expiryDate: null },
        { itemId: 'seed-item-masks-surgical', quantity: 100, batchNumber: null, expiryDate: null },
      ],
    },
  ];

  for (const receiptData of receiptsData) {
    const supplier = supplierMap.get(receiptData.supplier);
    if (!supplier || !pharmLocation) continue;

    const receipt = await prisma.goodsReceipt.upsert({
      where: { id: receiptData.id },
      update: {
        status: receiptData.status,
      },
      create: {
        id: receiptData.id,
        practiceId,
        locationId: pharmLocation.id,
        orderId: receiptData.orderId,
        supplierId: supplier.id,
        status: receiptData.status,
        createdById: userId,
        receivedAt: receiptData.receivedAt,
        notes: receiptData.notes,
        createdAt: receiptData.createdAt,
      },
    });

    // Create receipt lines
    for (const lineData of receiptData.lines) {
      const item = itemMap.get(lineData.itemId);
      if (item) {
        await prisma.goodsReceiptLine.upsert({
          where: { id: `${receiptData.id}-${lineData.itemId}` },
          update: {
            quantity: lineData.quantity,
          },
          create: {
            id: `${receiptData.id}-${lineData.itemId}`,
            receiptId: receipt.id,
            itemId: item.id,
            quantity: lineData.quantity,
            batchNumber: lineData.batchNumber,
            expiryDate: lineData.expiryDate,
          },
        });
      }
    }
  }

  console.log(`  ✓ Goods receipts: ${receiptsData.length} (4 confirmed, 1 ad-hoc, 1 draft)`);
}

async function createStockCounts(
  practiceId: string,
  userId: string,
  locationMap: Map<string, any>,
  itemMap: Map<string, any>
) {
  console.log('\n📊 Creating stock count sessions...');
  
  const now = new Date();
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  
  const pharmLocation = locationMap.get('PHARM-STOR');
  const tr1Location = locationMap.get('TR-01');
  const emergLocation = locationMap.get('EMER-CAB');

  const stockCountsData = [
    {
      id: 'seed-stockcount-001',
      locationId: pharmLocation?.id,
      status: StockCountStatus.COMPLETED,
      createdAt: daysAgo(10),
      completedAt: daysAgo(10),
      notes: 'Monthly inventory count - Storage',
      lines: [
        { itemId: 'seed-item-gloves-nitrile-l', countedQty: 6, systemQty: 8, variance: -2 },
        { itemId: 'seed-item-gloves-nitrile-m', countedQty: 8, systemQty: 8, variance: 0 },
        { itemId: 'seed-item-syringe-5ml', countedQty: 8, systemQty: 8, variance: 0 },
        { itemId: 'seed-item-gauze-4x4', countedQty: 5, systemQty: 3, variance: 2, notes: 'Found extra box in back' },
        { itemId: 'seed-item-bandage-elastic', countedQty: 48, systemQty: 48, variance: 0 },
        { itemId: 'seed-item-masks-surgical', countedQty: 10, systemQty: 12, variance: -2, notes: 'Missing boxes' },
        { itemId: 'seed-item-alcohol-wipes', countedQty: 42, systemQty: 42, variance: 0 },
        { itemId: 'seed-item-saline-solution', countedQty: 18, systemQty: 18, variance: 0 },
      ],
    },
    {
      id: 'seed-stockcount-002',
      locationId: tr1Location?.id,
      status: StockCountStatus.IN_PROGRESS,
      createdAt: now,
      completedAt: null,
      notes: 'Weekly spot check - Treatment Room 1',
      lines: [
        { itemId: 'seed-item-gloves-nitrile-l', countedQty: 2, systemQty: 2, variance: 0 },
        { itemId: 'seed-item-gloves-nitrile-m', countedQty: 4, systemQty: 4, variance: 0 },
        { itemId: 'seed-item-syringe-5ml', countedQty: 4, systemQty: 4, variance: 0 },
        { itemId: 'seed-item-gauze-4x4', countedQty: 2, systemQty: 2, variance: 0 },
        { itemId: 'seed-item-masks-surgical', countedQty: 4, systemQty: 4, variance: 0 },
        { itemId: 'seed-item-alcohol-wipes', countedQty: 8, systemQty: 8, variance: 0 },
      ],
    },
    {
      id: 'seed-stockcount-003',
      locationId: emergLocation?.id,
      status: StockCountStatus.COMPLETED,
      createdAt: daysAgo(5),
      completedAt: daysAgo(5),
      notes: 'Emergency cabinet audit',
      lines: [
        { itemId: 'seed-item-gloves-nitrile-m', countedQty: 1, systemQty: 1, variance: 0 },
        { itemId: 'seed-item-syringe-5ml', countedQty: 2, systemQty: 2, variance: 0 },
        { itemId: 'seed-item-gauze-4x4', countedQty: 0, systemQty: 1, variance: -1, notes: 'Used in emergency' },
        { itemId: 'seed-item-gown-disposable', countedQty: 4, systemQty: 4, variance: 0 },
      ],
    },
  ];

  for (const countData of stockCountsData) {
    if (!countData.locationId) continue;

    const stockCount = await prisma.stockCountSession.upsert({
      where: { id: countData.id },
      update: {
        status: countData.status,
      },
      create: {
        id: countData.id,
        practiceId,
        locationId: countData.locationId,
        status: countData.status,
        createdById: userId,
        completedAt: countData.completedAt,
        notes: countData.notes,
        createdAt: countData.createdAt,
      },
    });

    // Create count lines
    for (const lineData of countData.lines) {
      const item = itemMap.get(lineData.itemId);
      if (item) {
        await prisma.stockCountLine.upsert({
          where: { id: `${countData.id}-${lineData.itemId}` },
          update: {
            countedQuantity: lineData.countedQty,
          },
          create: {
            id: `${countData.id}-${lineData.itemId}`,
            sessionId: stockCount.id,
            itemId: item.id,
            countedQuantity: lineData.countedQty,
            systemQuantity: lineData.systemQty,
            variance: lineData.variance,
            notes: 'notes' in lineData ? lineData.notes : null,
          },
        });
      }
    }
  }

  console.log(`  ✓ Stock count sessions: ${stockCountsData.length} (2 completed, 1 in-progress)`);
}

async function createOrderTemplates(
  practiceId: string,
  userId: string,
  supplierMap: Map<string, any>,
  itemMap: Map<string, any>
) {
  console.log('\n📝 Creating order templates...');
  
  const templatesData = [
    {
      id: 'seed-template-001',
      name: 'Weekly Consumables Restock',
      description: 'Standard weekly order for frequently used consumable items',
      items: [
        { itemId: 'seed-item-gloves-nitrile-l', quantity: 50, supplier: 'medsupply' },
        { itemId: 'seed-item-gloves-nitrile-m', quantity: 50, supplier: 'medsupply' },
        { itemId: 'seed-item-syringe-5ml', quantity: 30, supplier: 'medsupply' },
        { itemId: 'seed-item-alcohol-wipes', quantity: 30, supplier: 'medsupply' },
        { itemId: 'seed-item-gauze-4x4', quantity: 20, supplier: 'fasttrack' },
        { itemId: 'seed-item-masks-surgical', quantity: 50, supplier: 'fasttrack' },
        { itemId: 'seed-item-bandage-adhesive', quantity: 30, supplier: 'medsupply' },
        { itemId: 'seed-item-medical-tape', quantity: 20, supplier: 'medsupply' },
      ],
    },
    {
      id: 'seed-template-002',
      name: 'Monthly Bulk Order',
      description: 'Large monthly order for bulk items from wholesale supplier',
      items: [
        { itemId: 'seed-item-gloves-latex-l', quantity: 100, supplier: 'bulkcare' },
        { itemId: 'seed-item-bandage-elastic', quantity: 100, supplier: 'bulkcare' },
        { itemId: 'seed-item-cotton-swabs', quantity: 50, supplier: 'bulkcare' },
        { itemId: 'seed-item-bp-cuff-covers', quantity: 40, supplier: 'bulkcare' },
        { itemId: 'seed-item-gloves-nitrile-l', quantity: 100, supplier: 'bulkcare' },
      ],
    },
  ];

  for (const templateData of templatesData) {
    const template = await prisma.orderTemplate.upsert({
      where: { id: templateData.id },
      update: {
        name: templateData.name,
      },
      create: {
        id: templateData.id,
        practiceId,
        name: templateData.name,
        description: templateData.description,
        createdById: userId,
      },
    });

    // Create template items
    for (const itemData of templateData.items) {
      const item = itemMap.get(itemData.itemId);
      const supplier = supplierMap.get(itemData.supplier);
      if (item) {
        await prisma.orderTemplateItem.upsert({
          where: {
            templateId_itemId: {
              templateId: template.id,
              itemId: item.id,
            },
          },
          update: {
            defaultQuantity: itemData.quantity,
          },
          create: {
            templateId: template.id,
            itemId: item.id,
            defaultQuantity: itemData.quantity,
            supplierId: supplier?.id,
          },
        });
      }
    }
  }

  console.log(`  ✓ Order templates: ${templatesData.length}`);
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function main() {
  console.log('🌱 Starting Greenwood Medical Clinic seed...\n');
  console.log('═'.repeat(60));

  const passwordHash = await hash('Demo1234!', 12);

  // Create practice and users
  const { practice, users } = await createPracticeAndUsers(passwordHash);
  const adminUser = users[0];

  // Create locations
  const locationMap = await createLocations(practice.id);

  // Create products first (needed for supplier catalog)
  console.log('\n🏥 Creating products...');
  for (const prodData of PRODUCTS_DATA) {
    await prisma.product.upsert({
      where: { id: prodData.id },
      update: {
        name: prodData.name,
        brand: prodData.brand,
        description: prodData.description,
      },
      create: {
        id: prodData.id,
        gtin: prodData.gtin,
        brand: prodData.brand,
        name: prodData.name,
        description: prodData.description,
        isGs1Product: prodData.isGs1Product,
        gs1VerificationStatus: Gs1VerificationStatus.UNVERIFIED,
      },
    });
  }
  const gs1Count = PRODUCTS_DATA.filter(p => p.isGs1Product).length;
  console.log(`  ✓ Products: ${PRODUCTS_DATA.length} (${gs1Count} with GTIN)`);

  // Create suppliers and catalog (needs products to exist first)
  const supplierMap = await createSuppliersAndCatalog(practice.id);

  // Create items with inventory
  const itemMap = await createItems(practice.id, locationMap, supplierMap);

  // Create orders
  await createOrders(practice.id, adminUser.id, supplierMap, itemMap);

  // Create goods receipts
  await createGoodsReceipts(practice.id, adminUser.id, locationMap, supplierMap, itemMap);

  // Create stock count sessions
  await createStockCounts(practice.id, adminUser.id, locationMap, itemMap);

  // Create order templates
  await createOrderTemplates(practice.id, adminUser.id, supplierMap, itemMap);

  console.log('\n' + '═'.repeat(60));
  console.log('✅ Seed completed successfully!\n');
  console.log('📋 Summary:');
  console.log(`   • Practice: ${practice.name}`);
  console.log(`   • Users: ${users.length} (login: sarah.mitchell@greenwood-clinic.nl / Demo1234!)`);
  console.log(`   • Locations: ${LOCATIONS_DATA.length} (hierarchical structure)`);
  console.log(`   • Products: ${PRODUCTS_DATA.length} (${PRODUCTS_DATA.filter(p => p.isGs1Product).length} with GTIN)`);
  console.log(`   • Items: ${ITEMS_DATA.length} (distributed across locations)`);
  
  const linkedSuppliersCount = SUPPLIERS_DATA.filter(s => s.linkToPractice).length;
  const unlinkedSuppliersCount = SUPPLIERS_DATA.filter(s => !s.linkToPractice).length;
  console.log(`   • Global Suppliers: ${SUPPLIERS_DATA.length} total (${linkedSuppliersCount} linked, ${unlinkedSuppliersCount} available to add)`);
  console.log(`   • Supplier Catalog: ${SUPPLIER_CATALOG_DATA.length} entries`);
  console.log(`   • Orders: 8 (various statuses)`);
  console.log(`   • Goods Receipts: 6 (with batch/expiry tracking)`);
  console.log(`   • Stock Counts: 3 (2 completed, 1 in-progress)`);
  console.log(`   • Order Templates: 2`);
  console.log('\n💡 Demo Features:');
  console.log(`   • Low-stock items ready for testing order workflows`);
  console.log(`   • ${unlinkedSuppliersCount} unlinked suppliers available to demonstrate "Add Supplier" flow`);
  console.log(`   • Supplier architecture with GlobalSuppliers and PracticeSuppliers ready`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('❌ Seed error:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
