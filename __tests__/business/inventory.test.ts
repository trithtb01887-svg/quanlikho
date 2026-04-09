/**
 * Inventory Business Logic Tests
 * Test các business rules liên quan đến tồn kho
 */

import { describe, it, expect } from 'vitest';
import {
  calculateAvailable,
  getStockStatus,
  isQuarantineItemIssuable,
  isInQuarantine,
  type InventoryCalculation,
} from '@/lib/businessLogic';
import { InventoryItem, ProductCategory, UnitOfMeasure } from '@/lib/types';

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

describe('Inventory Business Rules', () => {
  describe('Rule 1.1: available = total - reserved - quarantine - damaged (không được âm)', () => {
    it('should calculate available correctly with all quantities', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityTotal: 100,
        quantityReserved: 20,
        quantityQuarantine: 10,
        quantityDamaged: 5,
      });
      
      // Act
      const result = calculateAvailable(item);
      
      // Assert
      expect(result).toBe(65); // 100 - 20 - 10 - 5 = 65
    });

    it('should return correct available with no reservations', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityTotal: 100,
        quantityReserved: 0,
        quantityQuarantine: 0,
        quantityDamaged: 0,
      });
      
      // Act
      const result = calculateAvailable(item);
      
      // Assert
      expect(result).toBe(100);
    });

    it('should never return negative available when damage exceeds total', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityTotal: 10,
        quantityReserved: 0,
        quantityQuarantine: 0,
        quantityDamaged: 15, // More damaged than total
      });
      
      // Act
      const result = calculateAvailable(item);
      
      // Assert
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBe(0); // Math.max(0, 10 - 0 - 0 - 15) = 0
    });

    it('should return 0 when reserved + quarantine + damaged = total', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityTotal: 50,
        quantityReserved: 20,
        quantityQuarantine: 20,
        quantityDamaged: 10,
      });
      
      // Act
      const result = calculateAvailable(item);
      
      // Assert
      expect(result).toBe(0);
    });

    it('should handle large numbers correctly', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityTotal: 1000000,
        quantityReserved: 100000,
        quantityQuarantine: 50000,
        quantityDamaged: 25000,
      });
      
      // Act
      const result = calculateAvailable(item);
      
      // Assert
      expect(result).toBe(825000); // 1000000 - 100000 - 50000 - 25000
    });
  });

  describe('Rule 1.2: Cảnh báo tồn thấp', () => {
    it('should return CRITICAL when available = 0', () => {
      // Arrange
      const availableQty = 0;
      const reorderPoint = 10;
      
      // Act
      const status = getStockStatus(availableQty, reorderPoint);
      
      // Assert
      expect(status).toBe('CRITICAL');
    });

    it('should return WARNING when available <= reorderPoint and > 0', () => {
      // Arrange
      const availableQty = 10;
      const reorderPoint = 10;
      
      // Act
      const status = getStockStatus(availableQty, reorderPoint);
      
      // Assert
      expect(status).toBe('WARNING');
    });

    it('should return WARNING when available < reorderPoint', () => {
      // Arrange
      const availableQty = 5;
      const reorderPoint = 10;
      
      // Act
      const status = getStockStatus(availableQty, reorderPoint);
      
      // Assert
      expect(status).toBe('WARNING');
    });

    it('should return OK when available > reorderPoint', () => {
      // Arrange
      const availableQty = 20;
      const reorderPoint = 10;
      
      // Act
      const status = getStockStatus(availableQty, reorderPoint);
      
      // Assert
      expect(status).toBe('OK');
    });

    it('should return OK when available = reorderPoint + 1', () => {
      // Arrange
      const availableQty = 11;
      const reorderPoint = 10;
      
      // Act
      const status = getStockStatus(availableQty, reorderPoint);
      
      // Assert
      expect(status).toBe('OK');
    });

    it('should handle reorderPoint = 0 correctly', () => {
      // Arrange - critical khi tồn = 0, ngay cả khi reorderPoint = 0
      const availableQty = 0;
      const reorderPoint = 0;
      
      // Act
      const status = getStockStatus(availableQty, reorderPoint);
      
      // Assert
      expect(status).toBe('CRITICAL');
    });
  });

  describe('Rule 1.3: Hàng QUARANTINE không được xuất', () => {
    it('should detect quarantine status when quantityQuarantine > 0', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityQuarantine: 20,
        quantityTotal: 100,
      });
      
      // Act
      const result = isInQuarantine(item);
      
      // Assert
      expect(result).toBe(true);
    });

    it('should return false for quarantine when quantityQuarantine = 0', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityQuarantine: 0,
      });
      
      // Act
      const result = isInQuarantine(item);
      
      // Assert
      expect(result).toBe(false);
    });

    it('should not allow issue if requested > non-quarantine available', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityTotal: 100,
        quantityReserved: 0,
        quantityQuarantine: 80, // 80 units in quarantine
        quantityDamaged: 0,
        quantityAvailable: 20, // Only 20 available
      });
      
      // Act
      const result = isQuarantineItemIssuable(item, 30); // Request 30 but only 20 available
      
      // Assert
      expect(result.issuable).toBe(false);
      expect(result.reason).toContain('QUARANTINE');
    });

    it('should allow issue if requested <= non-quarantine available', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityTotal: 100,
        quantityReserved: 0,
        quantityQuarantine: 50,
        quantityDamaged: 0,
        quantityAvailable: 50, // 50 available outside quarantine
      });
      
      // Act
      const result = isQuarantineItemIssuable(item, 30);
      
      // Assert
      expect(result.issuable).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow issue when no quarantine items', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityTotal: 100,
        quantityReserved: 0,
        quantityQuarantine: 0,
        quantityDamaged: 0,
        quantityAvailable: 100,
      });
      
      // Act
      const result = isQuarantineItemIssuable(item, 50);
      
      // Assert
      expect(result.issuable).toBe(true);
    });

    it('should correctly calculate non-quarantine available quantity', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityTotal: 100,
        quantityReserved: 10,
        quantityQuarantine: 30,
        quantityDamaged: 5,
        quantityAvailable: 55,
      });
      
      // Act
      const result = isQuarantineItemIssuable(item, 60);
      
      // Assert
      // nonQuarantine = 100 - 30 - 10 - 5 = 55
      expect(result.issuable).toBe(false);
      expect(result.reason).toContain('QUARANTINE');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero total quantity', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityTotal: 0,
        quantityReserved: 0,
        quantityQuarantine: 0,
        quantityDamaged: 0,
      });
      
      // Act
      const available = calculateAvailable(item);
      const status = getStockStatus(available, 10);
      
      // Assert
      expect(available).toBe(0);
      expect(status).toBe('CRITICAL');
    });

    it('should handle all reserved quantities', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityTotal: 100,
        quantityReserved: 100,
        quantityQuarantine: 0,
        quantityDamaged: 0,
      });
      
      // Act
      const available = calculateAvailable(item);
      
      // Assert
      expect(available).toBe(0);
    });
  });
});
