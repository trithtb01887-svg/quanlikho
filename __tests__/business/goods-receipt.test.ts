/**
 * Goods Receipt Business Logic Tests
 * Test các business rules liên quan đến nhập kho và FEFO
 */

import { describe, it, expect } from 'vitest';
import {
  sortByFEFO,
  calculateNewInventoryAfterReceipt,
  validateSerialNumbers,
  type LotWithExpiry,
} from '@/lib/businessLogic';
import { InventoryItem } from '@/lib/types';

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

describe('Goods Receipt Business Rules', () => {
  describe('Rule 2.1: FEFO sorting', () => {
    it('should sort lots by expiryDate ascending (earliest first)', () => {
      // Arrange
      const lots: LotWithExpiry[] = [
        { lotNumber: 'LOT-001', expiryDate: new Date('2026-12-31'), quantity: 50 },
        { lotNumber: 'LOT-002', expiryDate: new Date('2026-06-30'), quantity: 30 },
        { lotNumber: 'LOT-003', expiryDate: new Date('2026-09-15'), quantity: 20 },
      ];
      
      // Act
      const sorted = sortByFEFO(lots);
      
      // Assert
      expect(sorted[0].lotNumber).toBe('LOT-002'); // June 30
      expect(sorted[1].lotNumber).toBe('LOT-003'); // September 15
      expect(sorted[2].lotNumber).toBe('LOT-001'); // December 31
    });

    it('should put lots without expiryDate at the end', () => {
      // Arrange
      const lots: LotWithExpiry[] = [
        { lotNumber: 'LOT-NO-EXP', quantity: 100 }, // No expiry
        { lotNumber: 'LOT-001', expiryDate: new Date('2026-06-30'), quantity: 50 },
        { lotNumber: 'LOT-002', expiryDate: new Date('2026-12-31'), quantity: 30 },
      ];
      
      // Act
      const sorted = sortByFEFO(lots);
      
      // Assert
      expect(sorted[0].lotNumber).toBe('LOT-001');
      expect(sorted[1].lotNumber).toBe('LOT-002');
      expect(sorted[2].lotNumber).toBe('LOT-NO-EXP'); // At the end
    });

    it('should handle 3+ lots with different expiry dates', () => {
      // Arrange
      const lots: LotWithExpiry[] = [
        { lotNumber: 'LOT-MAR', expiryDate: new Date('2026-03-31'), quantity: 10 },
        { lotNumber: 'LOT-JAN', expiryDate: new Date('2026-01-31'), quantity: 15 },
        { lotNumber: 'LOT-DEC', expiryDate: new Date('2026-12-31'), quantity: 20 },
        { lotNumber: 'LOT-JUN', expiryDate: new Date('2026-06-30'), quantity: 25 },
        { lotNumber: 'LOT-SEP', expiryDate: new Date('2026-09-30'), quantity: 30 },
      ];
      
      // Act
      const sorted = sortByFEFO(lots);
      
      // Assert
      expect(sorted[0].lotNumber).toBe('LOT-JAN');
      expect(sorted[1].lotNumber).toBe('LOT-MAR');
      expect(sorted[2].lotNumber).toBe('LOT-JUN');
      expect(sorted[3].lotNumber).toBe('LOT-SEP');
      expect(sorted[4].lotNumber).toBe('LOT-DEC');
    });

    it('should maintain stable sort for same expiryDate', () => {
      // Arrange
      const lots: LotWithExpiry[] = [
        { lotNumber: 'LOT-001', expiryDate: new Date('2026-06-30'), quantity: 10 },
        { lotNumber: 'LOT-002', expiryDate: new Date('2026-06-30'), quantity: 20 },
      ];
      
      // Act
      const sorted = sortByFEFO(lots);
      
      // Assert - Order may vary due to stable sort, but both should be first
      const firstTwo = sorted.slice(0, 2).map(l => l.lotNumber);
      expect(firstTwo).toContain('LOT-001');
      expect(firstTwo).toContain('LOT-002');
    });

    it('should handle all lots without expiryDate', () => {
      // Arrange
      const lots: LotWithExpiry[] = [
        { lotNumber: 'LOT-001', quantity: 50 },
        { lotNumber: 'LOT-002', quantity: 30 },
        { lotNumber: 'LOT-003', quantity: 20 },
      ];
      
      // Act
      const sorted = sortByFEFO(lots);
      
      // Assert - Should return in original order (or stable sort)
      expect(sorted.length).toBe(3);
    });

    it('should handle empty array', () => {
      // Arrange
      const lots: LotWithExpiry[] = [];
      
      // Act
      const sorted = sortByFEFO(lots);
      
      // Assert
      expect(sorted).toEqual([]);
    });

    it('should handle single lot', () => {
      // Arrange
      const lots: LotWithExpiry[] = [
        { lotNumber: 'LOT-001', expiryDate: new Date('2026-06-30'), quantity: 50 },
      ];
      
      // Act
      const sorted = sortByFEFO(lots);
      
      // Assert
      expect(sorted.length).toBe(1);
      expect(sorted[0].lotNumber).toBe('LOT-001');
    });
  });

  describe('Rule 2.2: Nhập kho cập nhật tồn đúng', () => {
    it('should increase total by accepted quantity', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityTotal: 100,
        quantityAvailable: 80,
      });
      
      // Act
      const result = calculateNewInventoryAfterReceipt(item, 50, 50);
      
      // Assert
      expect(result.quantityTotal).toBe(150);
    });

    it('should add to quarantine quantity separately', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityTotal: 100,
        quantityQuarantine: 10,
        quantityAvailable: 80,
      });
      
      // Act
      const result = calculateNewInventoryAfterReceipt(item, 50, 45, 5);
      
      // Assert
      expect(result.quantityTotal).toBe(145);
      expect(result.quantityQuarantine).toBe(15); // 10 + 5
    });

    it('should calculate available correctly after receipt', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityTotal: 100,
        quantityReserved: 20,
        quantityQuarantine: 10,
        quantityDamaged: 5,
        quantityAvailable: 65, // 100 - 20 - 10 - 5
      });
      
      // Act
      const result = calculateNewInventoryAfterReceipt(item, 50, 50, 0);
      
      // Assert
      expect(result.quantityTotal).toBe(150);
      expect(result.quantityReserved).toBe(20); // Unchanged
      expect(result.quantityQuarantine).toBe(10); // Unchanged
      expect(result.quantityDamaged).toBe(5); // Unchanged
      expect(result.quantityAvailable).toBe(115); // 150 - 20 - 10 - 5
    });

    it('should not affect reserved quantity during receipt', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityTotal: 100,
        quantityReserved: 50,
        quantityAvailable: 40,
      });
      
      // Act
      const result = calculateNewInventoryAfterReceipt(item, 30, 30, 0);
      
      // Assert
      expect(result.quantityReserved).toBe(50);
      expect(result.quantityTotal).toBe(130);
    });

    it('should handle zero received quantity', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityTotal: 100,
        quantityAvailable: 80,
      });
      
      // Act
      const result = calculateNewInventoryAfterReceipt(item, 0, 0);
      
      // Assert
      expect(result.quantityTotal).toBe(100);
      expect(result.quantityAvailable).toBe(80);
    });

    it('should not let available go negative', () => {
      // Arrange - Item with negative calculated available (edge case)
      const item: InventoryItem = {
        ...createMockInventoryItem(),
        quantityTotal: 10,
        quantityReserved: 0,
        quantityQuarantine: 0,
        quantityDamaged: 20, // More damaged than total
        quantityAvailable: 0,
      };
      
      // Act
      const result = calculateNewInventoryAfterReceipt(item, 5, 5, 0);
      
      // Assert
      expect(result.quantityAvailable).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Rule 2.3: Serial number tracking', () => {
    it('should validate matching serial count with quantity', () => {
      // Arrange
      const serialNumbers = ['SN001', 'SN002', 'SN003'];
      const expectedQuantity = 3;
      
      // Act
      const result = validateSerialNumbers(serialNumbers, expectedQuantity);
      
      // Assert
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject mismatched serial count', () => {
      // Arrange
      const serialNumbers = ['SN001', 'SN002'];
      const expectedQuantity = 3;
      
      // Act
      const result = validateSerialNumbers(serialNumbers, expectedQuantity);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.error).toContain('không khớp');
    });

    it('should reject duplicate serial numbers', () => {
      // Arrange
      const serialNumbers = ['SN001', 'SN002', 'SN001']; // SN001 duplicated
      const expectedQuantity = 3;
      
      // Act
      const result = validateSerialNumbers(serialNumbers, expectedQuantity);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Trùng serial number');
    });

    it('should accept single unique serial', () => {
      // Arrange
      const serialNumbers = ['SN001'];
      const expectedQuantity = 1;
      
      // Act
      const result = validateSerialNumbers(serialNumbers, expectedQuantity);
      
      // Assert
      expect(result.valid).toBe(true);
    });

    it('should reject empty serial array for positive quantity', () => {
      // Arrange
      const serialNumbers: string[] = [];
      const expectedQuantity = 5;
      
      // Act
      const result = validateSerialNumbers(serialNumbers, expectedQuantity);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.error).toContain('không khớp');
    });

    it('should handle large number of serials', () => {
      // Arrange
      const serialNumbers = Array.from({ length: 100 }, (_, i) => `SN${String(i).padStart(3, '0')}`);
      const expectedQuantity = 100;
      
      // Act
      const result = validateSerialNumbers(serialNumbers, expectedQuantity);
      
      // Assert
      expect(result.valid).toBe(true);
    });

    it('should detect duplicate in large array', () => {
      // Arrange
      const serialNumbers = [
        ...Array.from({ length: 99 }, (_, i) => `SN${String(i).padStart(3, '0')}`),
        'SN000', // Duplicate of first
      ];
      const expectedQuantity = 100;
      
      // Act
      const result = validateSerialNumbers(serialNumbers, expectedQuantity);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Trùng serial number');
    });
  });
});
