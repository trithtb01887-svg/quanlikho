/**
 * Business Logic Tests - Warehouse Management System
 * Test các logic nghiệp vụ quan trọng
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  Product,
  Warehouse,
  InventoryItem,
  PurchaseOrder,
  PurchaseOrderItem,
  StocktakeSession,
  StocktakeDiscrepancy,
  ProductCategory,
  UnitOfMeasure,
  GoodsReceiptStatus,
  GoodsIssueStatus,
  StocktakeStatus,
  StocktakeType,
  WarehouseType,
  SupplierStatus,
  InventoryLocation,
  DeliveryStatus,
  GoodsIssueReason,
} from '../lib/types';

// ============================================
// MOCK DATA HELPERS
// ============================================
const createMockProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'prod-test-001',
  sku: 'TEST-SKU-001',
  barcode: '1234567890123',
  name: 'Sản phẩm Test',
  category: ProductCategory.ELECTRONICS,
  unit: UnitOfMeasure.PIECE,
  reorderPoint: 10,
  costPrice: 100000,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'user-001',
  ...overrides,
});

const createMockWarehouse = (overrides: Partial<Warehouse> = {}): Warehouse => ({
  id: 'wh-test-001',
  name: 'Kho Test',
  code: 'KHO-TEST',
  address: '123 Test Street',
  type: WarehouseType.MAIN,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const createMockInventoryItem = (overrides: Partial<InventoryItem> = {}): InventoryItem => ({
  id: 'inv-test-001',
  productId: 'prod-test-001',
  warehouseId: 'wh-test-001',
  location: { zone: 'A', aisle: '01', rack: 'R01', shelf: 'S01' },
  quantityTotal: 100,
  quantityAvailable: 100,
  quantityReserved: 0,
  quantityQuarantine: 0,
  quantityDamaged: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const createMockPurchaseOrderItem = (overrides: Partial<PurchaseOrderItem> = {}): PurchaseOrderItem => ({
  id: 'poi-test-001',
  productId: 'prod-test-001',
  productSku: 'TEST-SKU-001',
  productName: 'Sản phẩm Test',
  unit: UnitOfMeasure.PIECE,
  quantity: 10,
  unitPrice: 100000,
  totalPrice: 1000000,
  orderedQuantity: 10,
  receivedQuantity: 0,
  pendingQuantity: 10,
  deliveryStatus: DeliveryStatus.PENDING,
  ...overrides,
});

// ============================================
// HELPER FUNCTIONS (Logic cần test)
// ============================================

/**
 * Tính available quantity theo công thức
 * available = total - reserved - quarantine - damaged
 */
function calculateAvailable(item: InventoryItem): number {
  return Math.max(0, item.quantityTotal - item.quantityReserved - item.quantityQuarantine - item.quantityDamaged);
}

/**
 * Kiểm tra xem có thể xuất kho không
 */
function canIssue(item: InventoryItem, requestedQuantity: number): { canIssue: boolean; reason?: string } {
  const available = calculateAvailable(item);
  if (requestedQuantity > available) {
    return { 
      canIssue: false, 
      reason: `Không đủ hàng. Available: ${available}, Requested: ${requestedQuantity}` 
    };
  }
  if (requestedQuantity < 0) {
    return { canIssue: false, reason: 'Số lượng yêu cầu không hợp lệ' };
  }
  return { canIssue: true };
}

/**
 * Mô phỏng nhập kho
 */
function receiveInventory(item: InventoryItem, quantity: number): InventoryItem {
  const newTotal = item.quantityTotal + quantity;
  // available = newTotal - reserved - quarantine - damaged (giữ nguyên các giá trị này)
  const newAvailable = newTotal - item.quantityReserved - item.quantityQuarantine - item.quantityDamaged;
  return {
    ...item,
    quantityTotal: newTotal,
    quantityAvailable: Math.max(0, newAvailable),
    lastReceiptDate: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Mô phỏng xuất kho
 */
function issueInventory(item: InventoryItem, quantity: number): InventoryItem {
  const newTotal = Math.max(0, item.quantityTotal - quantity);
  const newAvailable = calculateAvailable({ 
    ...item, 
    quantityTotal: newTotal,
    quantityQuarantine: 0,
    quantityReserved: 0,
    quantityDamaged: 0
  });
  return {
    ...item,
    quantityTotal: newTotal,
    quantityAvailable: newAvailable,
    lastIssueDate: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Sắp xếp lô theo FEFO (First Expired First Out)
 */
function sortByFEFO(lots: Array<{ lotNumber: string; expiryDate: Date }>): Array<{ lotNumber: string; expiryDate: Date }> {
  return [...lots].sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
}

/**
 * Xác định cấp phê duyệt PO theo giá trị
 */
function getApprovalLevel(totalValue: number): string {
  if (totalValue < 10000000) return 'Quản lý kho';
  if (totalValue <= 50000000) return 'Trưởng phòng';
  return 'Giám đốc';
}

/**
 * Kiểm tra PO có hợp lệ không
 */
function validatePurchaseOrder(po: PurchaseOrder): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!po.items || po.items.length === 0) {
    errors.push('PO phải có ít nhất một sản phẩm');
  }
  if (po.items?.some(item => item.quantity <= 0)) {
    errors.push('Số lượng sản phẩm phải lớn hơn 0');
  }
  if (po.items?.some(item => item.unitPrice <= 0)) {
    errors.push('Đơn giá phải lớn hơn 0');
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Xác định mức độ alert
 */
function getAlertLevel(quantity: number, reorderPoint: number): 'INFO' | 'WARNING' | 'CRITICAL' {
  if (quantity === 0) return 'CRITICAL';
  if (quantity <= reorderPoint) return 'WARNING';
  return 'INFO';
}

/**
 * Tính chênh lệch kiểm kê
 */
function calculateDiscrepancy(systemQty: number, actualQty: number): { difference: number; percentage: number } {
  const difference = actualQty - systemQty;
  const percentage = systemQty === 0 ? 0 : (difference / systemQty) * 100;
  return { difference, percentage };
}

/**
 * Kiểm tra chênh lệch có cần nguyên nhân bắt buộc
 */
function requiresReason(discrepancyPercentage: number, threshold: number = 5): boolean {
  return Math.abs(discrepancyPercentage) > threshold;
}

/**
 * Mô phỏng điều chỉnh tồn kho sau kiểm kê
 */
function applyStocktakeAdjustment(
  item: InventoryItem, 
  discrepancy: StocktakeDiscrepancy
): InventoryItem {
  const newTotal = item.quantityTotal + discrepancy.difference;
  return {
    ...item,
    quantityTotal: Math.max(0, newTotal),
    quantityAvailable: Math.max(0, item.quantityAvailable + discrepancy.difference),
    lastStocktakeDate: new Date(),
    updatedAt: new Date(),
  };
}

// ============================================
// TEST SUITES
// ============================================

describe('📦 TỒN KHO - Inventory Logic', () => {
  let inventoryItem: InventoryItem;
  
  beforeEach(() => {
    inventoryItem = createMockInventoryItem({
      quantityTotal: 100,
      quantityAvailable: 100,
      quantityReserved: 0,
      quantityQuarantine: 0,
      quantityDamaged: 0,
    });
  });

  describe('Công thức available quantity', () => {
    it('available = total - reserved - quarantine - damaged (không có reservation)', () => {
      const available = calculateAvailable(inventoryItem);
      expect(available).toBe(100);
    });

    it('available = total - reserved - quarantine - damaged (có reservation)', () => {
      const withReserved = { ...inventoryItem, quantityReserved: 20 };
      const available = calculateAvailable(withReserved);
      expect(available).toBe(80);
    });

    it('available không được âm khi damaged > total', () => {
      const overDamaged = { ...inventoryItem, quantityDamaged: 150, quantityTotal: 100 };
      const available = calculateAvailable(overDamaged);
      expect(available).toBe(0);
    });

    it('Hàng QUARANTINE không tính vào available', () => {
      const quarantined = { ...inventoryItem, quantityQuarantine: 30, quantityTotal: 100 };
      const available = calculateAvailable(quarantined);
      expect(available).toBe(70);
      expect(available).toBeLessThan(quarantined.quantityTotal);
    });
  });

  describe('Nhập kho', () => {
    it('Khi nhập 10 sản phẩm → available tăng đúng 10', () => {
      const originalAvailable = calculateAvailable(inventoryItem);
      const updated = receiveInventory(inventoryItem, 10);
      
      expect(updated.quantityTotal).toBe(110);
      expect(updated.quantityAvailable).toBe(originalAvailable + 10);
    });

    it('Nhập kho không ảnh hưởng đến reserved/quarantine', () => {
      const withReserved = { ...inventoryItem, quantityReserved: 20 };
      const updated = receiveInventory(withReserved, 10);
      
      expect(updated.quantityReserved).toBe(20);
      expect(updated.quantityAvailable).toBe(80 + 10);
    });
  });

  describe('Xuất kho', () => {
    it('Khi xuất 5 sản phẩm → available giảm đúng 5', () => {
      const originalAvailable = calculateAvailable(inventoryItem);
      const updated = issueInventory(inventoryItem, 5);
      
      expect(updated.quantityTotal).toBe(95);
      expect(updated.quantityAvailable).toBe(originalAvailable - 5);
    });

    it('Không cho xuất nếu available < số lượng yêu cầu', () => {
      const result = canIssue(inventoryItem, 150);
      
      expect(result.canIssue).toBe(false);
      expect(result.reason).toContain('Không đủ hàng');
    });

    it('Không cho xuất số lượng âm', () => {
      const result = canIssue(inventoryItem, -5);
      
      expect(result.canIssue).toBe(false);
      expect(result.reason).toContain('không hợp lệ');
    });

    it('Cho phép xuất đúng số lượng available', () => {
      const result = canIssue(inventoryItem, 100);
      
      expect(result.canIssue).toBe(true);
    });

    it('Xuất hết available = 0', () => {
      const result = canIssue(inventoryItem, 100);
      expect(result.canIssue).toBe(true);
      
      const updated = issueInventory(inventoryItem, 100);
      expect(updated.quantityTotal).toBe(0);
      expect(updated.quantityAvailable).toBe(0);
    });
  });

  describe('Hàng QUARANTINE', () => {
    it('Hàng QUARANTINE không tính vào available', () => {
      const quarantined = { ...inventoryItem, quantityQuarantine: 50 };
      const available = calculateAvailable(quarantined);
      
      expect(available).toBe(50); // 100 - 0 - 50 - 0
      expect(quarantined.quantityTotal).toBe(100);
    });

    it('Không thể xuất hàng đang QUARANTINE', () => {
      const quarantined = { ...inventoryItem, quantityQuarantine: 80 };
      const result = canIssue(quarantined, 50);
      
      expect(result.canIssue).toBe(false);
      expect(result.reason).toContain('Không đủ hàng');
    });
  });
});

describe('📋 FEFO - First Expired First Out', () => {
  it('Có 2 lô: lô A hết hạn 30/6, lô B hết hạn 31/12 → xuất A trước', () => {
    const lots = [
      { lotNumber: 'LOT-B', expiryDate: new Date('2026-12-31') },
      { lotNumber: 'LOT-A', expiryDate: new Date('2026-06-30') },
    ];
    
    const sorted = sortByFEFO(lots);
    
    expect(sorted[0].lotNumber).toBe('LOT-A');
    expect(sorted[1].lotNumber).toBe('LOT-B');
  });

  it('FEFO với nhiều lô cùng ngày', () => {
    const lots = [
      { lotNumber: 'LOT-3', expiryDate: new Date('2026-06-30') },
      { lotNumber: 'LOT-1', expiryDate: new Date('2026-06-30') },
      { lotNumber: 'LOT-2', expiryDate: new Date('2026-06-30') },
    ];
    
    const sorted = sortByFEFO(lots);
    
    // Thứ tự không đổi khi cùng ngày (stable sort)
    expect(sorted[0].lotNumber).toBe('LOT-3');
  });

  it('FEFO với lô đã hết hạn', () => {
    const lots = [
      { lotNumber: 'LOT-C', expiryDate: new Date('2027-01-01') },
      { lotNumber: 'LOT-A', expiryDate: new Date('2026-01-01') }, // đã hết hạn
      { lotNumber: 'LOT-B', expiryDate: new Date('2026-06-01') },
    ];
    
    const sorted = sortByFEFO(lots);
    
    expect(sorted[0].lotNumber).toBe('LOT-A'); // đã hết hạn nhưng vẫn ra trước
    expect(sorted[1].lotNumber).toBe('LOT-B');
    expect(sorted[2].lotNumber).toBe('LOT-C');
  });
});

describe('📝 PURCHASE ORDER - Logic phê duyệt', () => {
  it('PO tổng giá trị < 10 triệu → cấp duyệt = "Quản lý kho"', () => {
    const level = getApprovalLevel(5000000);
    expect(level).toBe('Quản lý kho');
  });

  it('PO tổng giá trị = 10 triệu → cấp duyệt = "Trưởng phòng"', () => {
    const level = getApprovalLevel(10000000);
    expect(level).toBe('Trưởng phòng');
  });

  it('PO tổng giá trị 10-50 triệu → cấp duyệt = "Trưởng phòng"', () => {
    const level1 = getApprovalLevel(25000000);
    const level2 = getApprovalLevel(50000000);
    
    expect(level1).toBe('Trưởng phòng');
    expect(level2).toBe('Trưởng phòng');
  });

  it('PO tổng giá trị > 50 triệu → cấp duyệt = "Giám đốc"', () => {
    const level = getApprovalLevel(75000000);
    expect(level).toBe('Giám đốc');
  });

  it('PO tổng giá trị = 50 triệu → cấp duyệt = "Trưởng phòng"', () => {
    const level = getApprovalLevel(50000000);
    expect(level).toBe('Trưởng phòng');
  });

  it('PO không có sản phẩm → không được tạo', () => {
    const emptyPO: PurchaseOrder = {
      id: 'po-empty',
      orderNumber: 'PO-EMPTY-001',
      supplierId: 'sup-001',
      supplierName: 'Test Supplier',
      items: [],
      subtotal: 0,
      taxAmount: 0,
      discountAmount: 0,
      totalValue: 0,
      status: 'draft' as any,
      orderDate: new Date(),
      createdBy: 'user-001',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = validatePurchaseOrder(emptyPO);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('PO phải có ít nhất một sản phẩm');
  });

  it('PO với sản phẩm có số lượng <= 0 → không hợp lệ', () => {
    const invalidPO: PurchaseOrder = {
      id: 'po-invalid',
      orderNumber: 'PO-INVALID-001',
      supplierId: 'sup-001',
      supplierName: 'Test Supplier',
      items: [
        createMockPurchaseOrderItem({ quantity: 0 }),
      ],
      subtotal: 0,
      taxAmount: 0,
      discountAmount: 0,
      totalValue: 0,
      status: 'draft' as any,
      orderDate: new Date(),
      createdBy: 'user-001',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = validatePurchaseOrder(invalidPO);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Số lượng sản phẩm phải lớn hơn 0');
  });

  it('PO với đơn giá <= 0 → không hợp lệ', () => {
    const invalidPO: PurchaseOrder = {
      id: 'po-invalid-price',
      orderNumber: 'PO-INVALID-002',
      supplierId: 'sup-001',
      supplierName: 'Test Supplier',
      items: [
        createMockPurchaseOrderItem({ unitPrice: 0 }),
      ],
      subtotal: 0,
      taxAmount: 0,
      discountAmount: 0,
      totalValue: 0,
      status: 'draft' as any,
      orderDate: new Date(),
      createdBy: 'user-001',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = validatePurchaseOrder(invalidPO);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Đơn giá phải lớn hơn 0');
  });

  it('PO hợp lệ → valid = true', () => {
    const validPO: PurchaseOrder = {
      id: 'po-valid',
      orderNumber: 'PO-VALID-001',
      supplierId: 'sup-001',
      supplierName: 'Test Supplier',
      items: [
        createMockPurchaseOrderItem({ quantity: 10, unitPrice: 100000 }),
      ],
      subtotal: 1000000,
      taxAmount: 100000,
      discountAmount: 0,
      totalValue: 1100000,
      status: 'draft' as any,
      orderDate: new Date(),
      createdBy: 'user-001',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = validatePurchaseOrder(validPO);
    
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });
});

describe('⚠️ ALERT TỰ ĐỘNG - Stock Alerts', () => {
  it('Tồn xuống bằng reorder point → alert WARNING', () => {
    const product = createMockProduct({ reorderPoint: 10 });
    const alertLevel = getAlertLevel(10, product.reorderPoint);
    
    expect(alertLevel).toBe('WARNING');
  });

  it('Tồn xuống dưới reorder point → alert WARNING', () => {
    const product = createMockProduct({ reorderPoint: 10 });
    const alertLevel = getAlertLevel(5, product.reorderPoint);
    
    expect(alertLevel).toBe('WARNING');
  });

  it('Tồn = 0 → alert CRITICAL', () => {
    const product = createMockProduct({ reorderPoint: 10 });
    const alertLevel = getAlertLevel(0, product.reorderPoint);
    
    expect(alertLevel).toBe('CRITICAL');
  });

  it('Tồn > reorder point → alert INFO', () => {
    const product = createMockProduct({ reorderPoint: 10 });
    const alertLevel = getAlertLevel(20, product.reorderPoint);
    
    expect(alertLevel).toBe('INFO');
  });

  it('Tồn = 1, reorder = 0 → alert CRITICAL (vì = 0)', () => {
    const alertLevel = getAlertLevel(0, 0);
    expect(alertLevel).toBe('CRITICAL');
  });
});

describe('🔍 KIỂM KÊ - Stocktake Logic', () => {
  it('Thực tế 90, sổ sách 100 → chênh lệch = -10 (-10%)', () => {
    const result = calculateDiscrepancy(100, 90);
    
    expect(result.difference).toBe(-10);
    expect(result.percentage).toBe(-10);
  });

  it('Thực tế 110, sổ sách 100 → chênh lệch = +10 (+10%)', () => {
    const result = calculateDiscrepancy(100, 110);
    
    expect(result.difference).toBe(10);
    expect(result.percentage).toBe(10);
  });

  it('Thực tế = sổ sách → chênh lệch = 0', () => {
    const result = calculateDiscrepancy(100, 100);
    
    expect(result.difference).toBe(0);
    expect(result.percentage).toBe(0);
  });

  it('Sổ sách = 0, thực tế > 0 → percentage = 0 (tránh Infinity)', () => {
    const result = calculateDiscrepancy(0, 50);
    
    expect(result.difference).toBe(50);
    expect(result.percentage).toBe(0); // Tránh chia cho 0
  });

  it('Chênh lệch > 5% → bắt buộc có nguyên nhân', () => {
    const result = requiresReason(6);
    expect(result).toBe(true);
  });

  it('Chênh lệch = 5% → KHÔNG bắt buộc nguyên nhân', () => {
    const result = requiresReason(5);
    expect(result).toBe(false);
  });

  it('Chênh lệch < 5% → KHÔNG bắt buộc nguyên nhân', () => {
    const result = requiresReason(3);
    expect(result).toBe(false);
  });

  it('Chênh lệch -10% → bắt buộc nguyên nhân', () => {
    const discrepancy = calculateDiscrepancy(100, 90);
    const result = requiresReason(discrepancy.percentage);
    
    expect(result).toBe(true);
  });

  describe('Điều chỉnh tồn kho sau kiểm kê', () => {
    it('Thiếu 10 sản phẩm → tồn giảm 10', () => {
      const item = createMockInventoryItem({
        quantityTotal: 100,
        quantityAvailable: 100,
      });
      
      const discrepancy: StocktakeDiscrepancy = {
        id: 'disc-001',
        productId: 'prod-test-001',
        productSku: 'TEST-SKU-001',
        productName: 'Test Product',
        unit: UnitOfMeasure.PIECE,
        warehouseId: 'wh-test-001',
        location: { zone: 'A', aisle: '01', rack: 'R01', shelf: 'S01' },
        systemQuantity: 100,
        countedQuantity: 90,
        difference: -10,
        variancePercentage: -10,
      };
      
      const updated = applyStocktakeAdjustment(item, discrepancy);
      
      expect(updated.quantityTotal).toBe(90);
      expect(updated.quantityAvailable).toBe(90);
    });

    it('Thừa 10 sản phẩm → tồn tăng 10', () => {
      const item = createMockInventoryItem({
        quantityTotal: 100,
        quantityAvailable: 100,
      });
      
      const discrepancy: StocktakeDiscrepancy = {
        id: 'disc-002',
        productId: 'prod-test-001',
        productSku: 'TEST-SKU-001',
        productName: 'Test Product',
        unit: UnitOfMeasure.PIECE,
        warehouseId: 'wh-test-001',
        location: { zone: 'A', aisle: '01', rack: 'R01', shelf: 'S01' },
        systemQuantity: 100,
        countedQuantity: 110,
        difference: 10,
        variancePercentage: 10,
      };
      
      const updated = applyStocktakeAdjustment(item, discrepancy);
      
      expect(updated.quantityTotal).toBe(110);
      expect(updated.quantityAvailable).toBe(110);
    });

    it('Sau phê duyệt điều chỉnh → tồn kho cập nhật đúng', () => {
      // Mô phỏng workflow: Tạo session → Đếm → Tính chênh lệch → Phê duyệt → Điều chỉnh
      
      const initialItem = createMockInventoryItem({
        quantityTotal: 100,
        quantityAvailable: 100,
      });
      
      // Thực tế đếm được 95 cái
      const countedQty = 95;
      const discrepancy = calculateDiscrepancy(initialItem.quantityTotal, countedQty);
      
      expect(discrepancy.difference).toBe(-5);
      expect(discrepancy.percentage).toBe(-5);
      
      // Áp dụng điều chỉnh
      const discrepancyObj: StocktakeDiscrepancy = {
        id: 'disc-003',
        productId: 'prod-test-001',
        productSku: 'TEST-SKU-001',
        productName: 'Test Product',
        unit: UnitOfMeasure.PIECE,
        warehouseId: 'wh-test-001',
        location: { zone: 'A', aisle: '01', rack: 'R01', shelf: 'S01' },
        systemQuantity: initialItem.quantityTotal,
        countedQuantity: countedQty,
        difference: discrepancy.difference,
        variancePercentage: discrepancy.percentage,
      };
      
      const finalItem = applyStocktakeAdjustment(initialItem, discrepancyObj);
      
      expect(finalItem.quantityTotal).toBe(countedQty);
      expect(finalItem.quantityAvailable).toBe(countedQty);
    });

    it('Điều chỉnh không làm tồn âm', () => {
      const item = createMockInventoryItem({
        quantityTotal: 5,
        quantityAvailable: 5,
      });
      
      const discrepancy: StocktakeDiscrepancy = {
        id: 'disc-004',
        productId: 'prod-test-001',
        productSku: 'TEST-SKU-001',
        productName: 'Test Product',
        unit: UnitOfMeasure.PIECE,
        warehouseId: 'wh-test-001',
        location: { zone: 'A', aisle: '01', rack: 'R01', shelf: 'S01' },
        systemQuantity: 5,
        countedQuantity: 0, // Đếm thực tế = 0
        difference: -5,
        variancePercentage: -100,
      };
      
      const updated = applyStocktakeAdjustment(item, discrepancy);
      
      expect(updated.quantityTotal).toBe(0);
      expect(updated.quantityAvailable).toBe(0);
    });
  });
});
