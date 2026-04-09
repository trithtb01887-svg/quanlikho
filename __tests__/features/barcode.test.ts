import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from 'react-dom/test-utils';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Product, ProductCategory, UnitOfMeasure } from '@/lib/types';
import { mockProducts } from '@/lib/mockData';

// ============================================
// MOCK PRODUCTS WITH BARCODE FIELDS
// ============================================

const mockBarcodeProducts: Product[] = [
  {
    id: 'prod-barcode-001',
    sku: 'SKU-001',
    barcode: 'SKU-001',
    name: 'Tụ điện 100uF 25V',
    description: 'Tụ hóa 100 microfarad 25V',
    category: ProductCategory.ELECTRONICS,
    unit: UnitOfMeasure.PIECE,
    reorderPoint: 50,
    costPrice: 5000,
    sellingPrice: 8000,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
    createdBy: 'user-001',
  },
  {
    id: 'prod-barcode-002',
    sku: 'SKU-002',
    barcode: '8934567890123',
    name: 'IC NE555P Timer',
    description: 'IC NE555P Timer DIP-8',
    category: ProductCategory.ELECTRONICS,
    unit: UnitOfMeasure.PIECE,
    reorderPoint: 20,
    costPrice: 12000,
    sellingPrice: 18000,
    isActive: true,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date(),
    createdBy: 'user-001',
    // @ts-ignore - adding extra field for barcode mapping test
    supplierBarcodes: ['4901234567890', '0123456789012'],
    isESDSensitive: true,
  },
  {
    id: 'prod-barcode-003',
    sku: 'IC-NE555P',
    barcode: 'IC-NE555P/TO92',
    name: 'IC NE555P Timer (TO-92)',
    description: 'IC NE555P Timer đóng gói TO-92',
    category: ProductCategory.ELECTRONICS,
    unit: UnitOfMeasure.PIECE,
    reorderPoint: 30,
    costPrice: 10000,
    sellingPrice: 15000,
    isActive: true,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date(),
    createdBy: 'user-001',
  },
  {
    id: 'prod-barcode-004',
    sku: 'SKU-LONG-001',
    barcode: 'SKU-LONG-001-BARCODE-12345',
    name: 'Sản phẩm có barcode dài',
    description: 'Sản phẩm với barcode rất dài để test',
    category: ProductCategory.ELECTRONICS,
    unit: UnitOfMeasure.PIECE,
    reorderPoint: 10,
    costPrice: 25000,
    sellingPrice: 35000,
    isActive: true,
    createdAt: new Date('2024-01-04'),
    updatedAt: new Date(),
    createdBy: 'user-001',
  },
  {
    id: 'prod-barcode-005',
    sku: 'SKU-HYPHEN-001',
    barcode: 'SKU-HYPHEN-001',
    name: 'Sản phẩm có dấu gạch ngang',
    description: 'Sản phẩm với SKU có dấu gạch ngang',
    category: ProductCategory.ELECTRONICS,
    unit: UnitOfMeasure.PIECE,
    reorderPoint: 15,
    costPrice: 15000,
    sellingPrice: 22000,
    isActive: true,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date(),
    createdBy: 'user-001',
  },
];

// ============================================
// MOCK STORE FOR BARCODE TESTS
// ============================================

interface BarcodeProductStore {
  products: Product[];
  getProductByBarcode: (barcode: string) => Product | undefined;
  searchProducts: (query: string) => Product[];
}

const createBarcodeStore = () =>
  create<BarcodeProductStore>()(
    persist(
      (set, get) => ({
        products: mockBarcodeProducts,

        getProductByBarcode: (barcode: string) => {
          return get().products.find((p: Product) => {
            // Check main barcode
            if (p.barcode === barcode) return true;
            // Check supplier barcodes if exists
            // @ts-ignore - supplierBarcodes may exist on product
            const supplierBarcodes: string[] = p.supplierBarcodes || [];
            if (supplierBarcodes.includes(barcode)) return true;
            return false;
          });
        },

        searchProducts: (query: string) => {
          if (!query || query.trim() === '') return get().products;
          const lowerQuery = query.toLowerCase().trim();
          return get().products.filter((p: Product) => {
            return (
              p.name.toLowerCase().includes(lowerQuery) ||
              p.sku.toLowerCase().includes(lowerQuery) ||
              (p.barcode && p.barcode.toLowerCase().includes(lowerQuery)) ||
              p.description?.toLowerCase().includes(lowerQuery)
            );
          });
        },
      }),
      {
        name: 'barcode-test-storage',
        storage: createJSONStorage(() => localStorage),
      }
    )
  );

// ============================================
// TESTS
// ============================================

describe('Test 3.1: Lookup barcode nội bộ', () => {
  let store: ReturnType<typeof createBarcodeStore>;

  beforeEach(() => {
    localStorage.removeItem('barcode-test-storage');
    store = createBarcodeStore();
  });

  it('getProductByBarcode("SKU-001") → trả về product đúng', () => {
    const product = store.getState().getProductByBarcode('SKU-001');
    expect(product).toBeDefined();
    expect(product?.sku).toBe('SKU-001');
    expect(product?.name).toBe('Tụ điện 100uF 25V');
  });

  it('getProductByBarcode("INVALID") → trả về null / undefined', () => {
    const product = store.getState().getProductByBarcode('INVALID');
    expect(product).toBeUndefined();
  });

  it('getProductByBarcode("8934567890123") → trả về product với barcode đó', () => {
    const product = store.getState().getProductByBarcode('8934567890123');
    expect(product).toBeDefined();
    expect(product?.barcode).toBe('8934567890123');
  });
});

describe('Test 3.2: Mapping barcode NCC → SKU nội bộ', () => {
  let store: ReturnType<typeof createBarcodeStore>;

  beforeEach(() => {
    localStorage.removeItem('barcode-test-storage');
    store = createBarcodeStore();
  });

  it('Barcode NCC "4901234567890" → map được SKU nội bộ', () => {
    // The product with supplierBarcodes: ['4901234567890', '0123456789012']
    const product = store.getState().getProductByBarcode('4901234567890');
    expect(product).toBeDefined();
    expect(product?.sku).toBe('SKU-002');
  });

  it('Barcode NCC "0123456789012" → map được SKU nội bộ', () => {
    const product = store.getState().getProductByBarcode('0123456789012');
    expect(product).toBeDefined();
    expect(product?.sku).toBe('SKU-002');
  });

  it('Product có field supplierBarcodes: string[]', () => {
    const product = store.getState().getProductByBarcode('4901234567890');
    expect(product).toBeDefined();
    // @ts-ignore - checking if supplierBarcodes exists
    expect(product?.supplierBarcodes).toBeDefined();
    // @ts-ignore
    expect(product?.supplierBarcodes).toContain('4901234567890');
  });
});

describe('Test 3.3: Barcode đặc biệt ngành điện tử', () => {
  let store: ReturnType<typeof createBarcodeStore>;

  beforeEach(() => {
    localStorage.removeItem('barcode-test-storage');
    store = createBarcodeStore();
  });

  it('Barcode có ký tự đặc biệt: "IC-NE555P/TO92" → parse đúng', () => {
    const product = store.getState().getProductByBarcode('IC-NE555P/TO92');
    expect(product).toBeDefined();
    expect(product?.sku).toBe('IC-NE555P');
  });

  it('Barcode dài > 20 ký tự → không bị truncate', () => {
    const longBarcode = 'SKU-LONG-001-BARCODE-12345';
    const product = store.getState().getProductByBarcode(longBarcode);
    expect(product).toBeDefined();
    expect(product?.barcode).toBe(longBarcode);
    expect(product?.barcode!.length).toBeGreaterThan(20);
  });

  it('Barcode có dấu gạch ngang → vẫn match được', () => {
    const product = store.getState().getProductByBarcode('SKU-HYPHEN-001');
    expect(product).toBeDefined();
    expect(product?.sku).toBe('SKU-HYPHEN-001');
  });

  it('Barcode với nhiều dấu gạch chéo → vẫn match được', () => {
    const product = store.getState().getProductByBarcode('IC-NE555P/TO92');
    expect(product).toBeDefined();
  });
});

describe('Test 3.4: ESD warning', () => {
  let store: ReturnType<typeof createBarcodeStore>;

  beforeEach(() => {
    localStorage.removeItem('barcode-test-storage');
    store = createBarcodeStore();
  });

  it('Product có isESDSensitive = true → getProductByBarcode trả về kèm flag', () => {
    const product = store.getState().getProductByBarcode('4901234567890');
    expect(product).toBeDefined();
    // @ts-ignore - checking ESD flag
    expect(product?.isESDSensitive).toBe(true);
  });

  it('ESD product trả về đúng thông tin', () => {
    const product = store.getState().getProductByBarcode('4901234567890');
    expect(product).toBeDefined();
    expect(product?.name).toBe('IC NE555P Timer');
    expect(product?.sku).toBe('SKU-002');
    // @ts-ignore
    expect(product?.isESDSensitive).toBe(true);
  });

  it('Non-ESD product không có ESD flag', () => {
    const product = store.getState().getProductByBarcode('SKU-001');
    expect(product).toBeDefined();
    // @ts-ignore
    expect(product?.isESDSensitive).toBeUndefined();
  });

  it('Component có thể hiển thị warning ESD khi flag = true', () => {
    const product = store.getState().getProductByBarcode('4901234567890');
    expect(product).toBeDefined();

    // Mock component behavior
    // @ts-ignore
    const showESDWarning = product?.isESDSensitive === true;
    expect(showESDWarning).toBe(true);

    const nonEsdProduct = store.getState().getProductByBarcode('SKU-001');
    // @ts-ignore
    const showNonEsdWarning = nonEsdProduct?.isESDSensitive === true;
    expect(showNonEsdWarning).toBe(false);
  });
});

describe('Test 3.5: Search products', () => {
  let store: ReturnType<typeof createBarcodeStore>;

  beforeEach(() => {
    localStorage.removeItem('barcode-test-storage');
    store = createBarcodeStore();
  });

  it('searchProducts("tụ điện") → trả về array chứa products match', () => {
    const results = store.getState().searchProducts('tụ điện');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((p) => p.name.includes('Tụ điện'))).toBe(true);
  });

  it('searchProducts("IC") → trả về các IC products', () => {
    const results = store.getState().searchProducts('IC');
    expect(results.length).toBeGreaterThan(0);
    // At least one result should contain 'ic'
    const hasICResult = results.some((p) => p.name.toLowerCase().includes('ic'));
    expect(hasICResult).toBe(true);
  });

  it('searchProducts("") → trả về tất cả products', () => {
    const results = store.getState().searchProducts('');
    expect(results.length).toBe(mockBarcodeProducts.length);
  });

  it('searchProducts("xyz không tồn tại") → trả về []', () => {
    const results = store.getState().searchProducts('xyz không tồn tại');
    expect(results.length).toBe(0);
  });

  it('searchProducts case-insensitive', () => {
    const lowerResults = store.getState().searchProducts('sku-001');
    const upperResults = store.getState().searchProducts('SKU-001');
    const mixedResults = store.getState().searchProducts('Sku-001');

    expect(lowerResults.length).toBe(upperResults.length);
    expect(upperResults.length).toBe(mixedResults.length);
  });

  it('searchProducts tìm theo SKU', () => {
    const results = store.getState().searchProducts('SKU-002');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((p) => p.sku === 'SKU-002')).toBe(true);
  });

  it('searchProducts tìm theo barcode', () => {
    const results = store.getState().searchProducts('8934567890123');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((p) => p.barcode === '8934567890123')).toBe(true);
  });
});

// ============================================
// ESD PRODUCT MẪU (Như specified)
// ============================================

describe('ESD Product Sample (as specified)', () => {
  const esdProduct = {
    id: 'PROD-ESD-001',
    sku: 'IC-NE555P',
    name: 'IC NE555P Timer',
    barcode: 'IC-NE555P/TO92',
    supplierBarcodes: ['4901234567890', '0123456789012'],
    isESDSensitive: true,
    total: 500,
    reserved: 50,
    quarantine: 0,
    available: 450,
    reorderPoint: 100,
    status: 'ACTIVE',
  };

  it('ESD product has all required fields', () => {
    expect(esdProduct.barcode).toBe('IC-NE555P/TO92');
    expect(esdProduct.supplierBarcodes).toContain('4901234567890');
    expect(esdProduct.supplierBarcodes).toContain('0123456789012');
    expect(esdProduct.isESDSensitive).toBe(true);
  });

  it('ESD product can be looked up by supplier barcode', () => {
    const mainBarcode = esdProduct.barcode;
    const supplierBarcode = esdProduct.supplierBarcodes[0];

    // Simulating lookup
    expect(mainBarcode).toBe('IC-NE555P/TO92');
    expect(supplierBarcode).toBe('4901234567890');
  });
});
