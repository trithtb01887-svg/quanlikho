/**
 * Goods Issue Business Logic Tests
 * Test các business rules liên quan đến xuất kho và picking
 */

import { describe, it, expect } from 'vitest';
import {
  canIssue,
  getFEFOIssueOrder,
  validatePickingList,
  calculateNewInventoryAfterIssue,
  sortByFEFO,
  type LotWithExpiry,
} from '@/lib/businessLogic';
import { InventoryItem, GoodsIssueReason } from '@/lib/types';

// ============================================
// MOCK DATA
// ============================================

function createMockInventoryItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'inv-001',
    productId: 'prod-001',
    warehouseId: 'wh-001',
    location: { zone: 'A', aisle: '01', rack: 'R01', shelf: 'S01' },
    quantityTotal: 100,
    quantityAvailable: 80,
    quantityReserved: 10,
    quantityQuarantine: 5,
    quantityDamaged: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============================================
// TESTS
// ============================================

describe('Goods Issue Business Rules', () => {
  describe('Rule 3.1: FEFO bắt buộc khi xuất hàng có hạn sử dụng', () => {
    it('should issue from earliest expiry lot first', () => {
      // Arrange
      const lots: LotWithExpiry[] = [
        { lotNumber: 'LOT-NEW', expiryDate: new Date('2027-01-01'), quantity: 100 },
        { lotNumber: 'LOT-OLD', expiryDate: new Date('2026-06-30'), quantity: 50 },
        { lotNumber: 'LOT-MED', expiryDate: new Date('2026-12-31'), quantity: 30 },
      ];
      
      // Act - Need 20 units
      const result = getFEFOIssueOrder(lots, 20);
      
      // Assert - Should take from LOT-OLD first
      expect(result.lots[0].lotNumber).toBe('LOT-OLD');
      expect(result.lots[0].quantity).toBe(20);
      expect(result.fulfilled).toBe(true);
    });

    it('should take from multiple lots when single lot insufficient', () => {
      // Arrange
      const lots: LotWithExpiry[] = [
        { lotNumber: 'LOT-NEW', expiryDate: new Date('2027-01-01'), quantity: 10 },
        { lotNumber: 'LOT-OLD', expiryDate: new Date('2026-06-30'), quantity: 15 },
        { lotNumber: 'LOT-MED', expiryDate: new Date('2026-12-31'), quantity: 30 },
      ];
      
      // Act - Need 40 units
      const result = getFEFOIssueOrder(lots, 40);
      
      // Assert
      expect(result.fulfilled).toBe(true);
      expect(result.lots[0].lotNumber).toBe('LOT-OLD');
      expect(result.lots[0].quantity).toBe(15); // All from LOT-OLD
      expect(result.lots[1].lotNumber).toBe('LOT-MED');
      expect(result.lots[1].quantity).toBe(25); // Remainder from LOT-MED
      expect(result.lots.length).toBe(2);
    });

    it('should not skip near-expiry lot to issue newer lot', () => {
      // Arrange - Try to issue from newer lot first (should NOT happen)
      const lots: LotWithExpiry[] = [
        { lotNumber: 'LOT-NEW', expiryDate: new Date('2027-01-01'), quantity: 100 },
        { lotNumber: 'LOT-OLD', expiryDate: new Date('2026-06-30'), quantity: 50 },
      ];
      
      // Act
      const result = getFEFOIssueOrder(lots, 10);
      
      // Assert - MUST take from LOT-OLD, not LOT-NEW
      expect(result.lots[0].lotNumber).toBe('LOT-OLD');
      expect(result.lots[0].lotNumber).not.toBe('LOT-NEW');
    });

    it('should return fulfilled=false when insufficient stock', () => {
      // Arrange
      const lots: LotWithExpiry[] = [
        { lotNumber: 'LOT-001', expiryDate: new Date('2026-06-30'), quantity: 20 },
      ];
      
      // Act - Need 50 but only 20 available
      const result = getFEFOIssueOrder(lots, 50);
      
      // Assert
      expect(result.fulfilled).toBe(false);
      expect(result.lots.length).toBe(1);
      expect(result.lots[0].quantity).toBe(20);
    });

    it('should handle lots without expiryDate', () => {
      // Arrange
      const lots: LotWithExpiry[] = [
        { lotNumber: 'LOT-NO-EXP', quantity: 50 }, // No expiry
        { lotNumber: 'LOT-001', expiryDate: new Date('2026-06-30'), quantity: 30 },
      ];
      
      // Act
      const result = getFEFOIssueOrder(lots, 20);
      
      // Assert - Should take from LOT-001 first (has expiry)
      expect(result.lots[0].lotNumber).toBe('LOT-001');
    });
  });

  describe('Rule 3.2: Không xuất quá available', () => {
    it('should allow issue when qty <= available', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityTotal: 100,
        quantityAvailable: 80,
      });
      
      // Act
      const result = canIssue(item, 80);
      
      // Assert
      expect(result.canIssue).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject issue when qty > available', () => {
      // Arrange - Set available to 50 (calculated from total - reserved - quarantine - damaged)
      const item = createMockInventoryItem({
        quantityTotal: 50,
        quantityReserved: 0,
        quantityQuarantine: 0,
        quantityDamaged: 0,
        quantityAvailable: 50,
      });
      
      // Act
      const result = canIssue(item, 60);
      
      // Assert
      expect(result.canIssue).toBe(false);
      expect(result.reason).toContain('Không đủ hàng');
      expect(result.reason).toContain('50');
      expect(result.reason).toContain('60');
    });

    it('should reject zero quantity request', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityTotal: 100,
        quantityAvailable: 80,
      });
      
      // Act
      const result = canIssue(item, 0);
      
      // Assert
      expect(result.canIssue).toBe(false);
      expect(result.reason).toContain('lớn hơn 0');
    });

    it('should reject negative quantity request', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityTotal: 100,
        quantityAvailable: 80,
      });
      
      // Act
      const result = canIssue(item, -10);
      
      // Assert
      expect(result.canIssue).toBe(false);
    });

    it('should not allow using reserved stock', () => {
      // Arrange - Item with high reserved quantity
      const item = createMockInventoryItem({
        quantityTotal: 100,
        quantityReserved: 80, // 80 units reserved
        quantityAvailable: 15, // Only 15 available
      });
      
      // Act - Try to issue 50
      const result = canIssue(item, 50);
      
      // Assert
      expect(result.canIssue).toBe(false);
      expect(result.reason).toContain('Không đủ hàng');
    });

    it('should not allow using quarantine stock', () => {
      // Arrange - In the implementation, canIssue checks available first (which already excludes quarantine)
      // Then checks quarantine separately. Since quantityAvailable=10 already excludes quarantine,
      // requesting 10 when available=10 would pass the available check.
      // To test quarantine blocking, we need to request more than what's available outside quarantine
      const item = createMockInventoryItem({
        quantityTotal: 100,
        quantityReserved: 0,
        quantityQuarantine: 90,
        quantityDamaged: 0,
        quantityAvailable: 10, // 100 - 90 = 10 (already calculated)
      });
      
      // Act - Request 15 when only 10 is available (outside quarantine)
      const result = canIssue(item, 15);
      
      // Assert - Should fail because requested > available
      expect(result.canIssue).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should allow issue when exactly at available', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityTotal: 100,
        quantityAvailable: 50,
      });
      
      // Act
      const result = canIssue(item, 50);
      
      // Assert
      expect(result.canIssue).toBe(true);
    });
  });

  describe('Rule 3.3: Picking list validation', () => {
    it('should return valid for picking list with sufficient stock', () => {
      // Arrange
      const pickingItems = [
        { productId: 'prod-001', productName: 'Product A', quantity: 50 },
        { productId: 'prod-002', productName: 'Product B', quantity: 30 },
      ];
      const inventoryItems = [
        { productId: 'prod-001', quantityAvailable: 100, quantityQuarantine: 0, quantityTotal: 100 },
        { productId: 'prod-002', quantityAvailable: 50, quantityQuarantine: 0, quantityTotal: 50 },
      ];
      
      // Act
      const result = validatePickingList(pickingItems, inventoryItems);
      
      // Assert
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.insufficientItems).toHaveLength(0);
    });

    it('should return invalid with errors for insufficient stock', () => {
      // Arrange
      const pickingItems = [
        { productId: 'prod-001', productName: 'Product A', quantity: 150 },
      ];
      const inventoryItems = [
        { productId: 'prod-001', quantityAvailable: 100, quantityQuarantine: 0, quantityTotal: 100 },
      ];
      
      // Act
      const result = validatePickingList(pickingItems, inventoryItems);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.insufficientItems.length).toBe(1);
      expect(result.insufficientItems[0].requested).toBe(150);
      expect(result.insufficientItems[0].available).toBe(100);
    });

    it('should include product name in error message', () => {
      // Arrange
      const pickingItems = [
        { productId: 'prod-001', productName: 'Laptop Dell XPS', quantity: 100 },
      ];
      const inventoryItems = [
        { productId: 'prod-001', quantityAvailable: 50, quantityQuarantine: 0, quantityTotal: 50 },
      ];
      
      // Act
      const result = validatePickingList(pickingItems, inventoryItems);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Laptop Dell XPS');
    });

    it('should reject picking product not in inventory', () => {
      // Arrange
      const pickingItems = [
        { productId: 'prod-001', productName: 'Product A', quantity: 10 },
        { productId: 'prod-NEW', productName: 'New Product', quantity: 5 },
      ];
      const inventoryItems = [
        { productId: 'prod-001', quantityAvailable: 100, quantityQuarantine: 0, quantityTotal: 100 },
      ];
      
      // Act
      const result = validatePickingList(pickingItems, inventoryItems);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('New Product'))).toBe(true);
    });

    it('should consider quarantine in available calculation', () => {
      // Arrange
      const pickingItems = [
        { productId: 'prod-001', productName: 'Product A', quantity: 60 },
      ];
      const inventoryItems = [
        { productId: 'prod-001', quantityAvailable: 100, quantityQuarantine: 50, quantityTotal: 150 }, // 50 in quarantine
      ];
      
      // Act
      const result = validatePickingList(pickingItems, inventoryItems);
      
      // Assert
      expect(result.valid).toBe(true); // Cảnh báo không làm invalid
      // Quarantine warning should be present
      expect(result.errors.some(e => e.includes('QUARANTINE'))).toBe(true);
    });

    it('should return empty errors array when valid', () => {
      // Arrange
      const pickingItems: Array<{ productId: string; productName: string; quantity: number }> = [];
      const inventoryItems: Array<{ productId: string; quantityAvailable: number; quantityQuarantine: number; quantityTotal: number }> = [];
      
      // Act
      const result = validatePickingList(pickingItems, inventoryItems);
      
      // Assert
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should track multiple insufficient items', () => {
      // Arrange
      const pickingItems = [
        { productId: 'prod-001', productName: 'Product A', quantity: 200 },
        { productId: 'prod-002', productName: 'Product B', quantity: 100 },
      ];
      const inventoryItems = [
        { productId: 'prod-001', quantityAvailable: 50, quantityQuarantine: 0, quantityTotal: 50 },
        { productId: 'prod-002', quantityAvailable: 30, quantityQuarantine: 0, quantityTotal: 30 },
      ];
      
      // Act
      const result = validatePickingList(pickingItems, inventoryItems);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.insufficientItems.length).toBe(2);
    });
  });

  describe('Inventory Calculation After Issue', () => {
    it('should decrease total by issued quantity', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityTotal: 100,
        quantityAvailable: 80,
      });
      
      // Act
      const result = calculateNewInventoryAfterIssue(item, 30);
      
      // Assert
      expect(result.quantityTotal).toBe(70);
    });

    it('should decrease available by issued quantity', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityTotal: 100,
        quantityAvailable: 80,
        quantityReserved: 10,
        quantityQuarantine: 5,
        quantityDamaged: 5,
      });
      
      // Act
      const result = calculateNewInventoryAfterIssue(item, 30);
      
      // Assert
      expect(result.quantityAvailable).toBe(50); // 80 - 30
    });

    it('should not affect reserved, quarantine, or damaged', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityTotal: 100,
        quantityReserved: 20,
        quantityQuarantine: 10,
        quantityDamaged: 5,
        quantityAvailable: 65,
      });
      
      // Act
      const result = calculateNewInventoryAfterIssue(item, 30);
      
      // Assert
      expect(result.quantityReserved).toBe(20);
      expect(result.quantityQuarantine).toBe(10);
      expect(result.quantityDamaged).toBe(5);
    });

    it('should not let total go negative', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityTotal: 20,
        quantityAvailable: 20,
      });
      
      // Act - Issue more than available
      const result = calculateNewInventoryAfterIssue(item, 30);
      
      // Assert
      expect(result.quantityTotal).toBeGreaterThanOrEqual(0);
    });
  });
});
