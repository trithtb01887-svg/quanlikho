/**
 * Stocktake Business Logic Tests
 * Test các business rules liên quan đến kiểm kê và điều chỉnh
 */

import { describe, it, expect } from 'vitest';
import {
  calculateDeviation,
  needsApproval,
  applyStocktakeAdjustment,
  type DeviationCalculation,
} from '@/lib/businessLogic';
import { InventoryItem, StocktakeDiscrepancy, UnitOfMeasure } from '@/lib/types';

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

function createMockDiscrepancy(overrides: Partial<StocktakeDiscrepancy> = {}): StocktakeDiscrepancy {
  return {
    id: 'disc-001',
    productId: 'prod-001',
    productSku: 'SKU-001',
    productName: 'Product A',
    unit: UnitOfMeasure.PIECE,
    warehouseId: 'wh-001',
    location: { zone: 'A', aisle: '01', rack: 'R01', shelf: 'S01' },
    systemQuantity: 100,
    countedQuantity: 90,
    difference: -10,
    variancePercentage: -10,
    ...overrides,
  };
}

// ============================================
// TESTS
// ============================================

describe('Stocktake Business Rules', () => {
  describe('Rule 5.1: Tính deviation (chênh lệch)', () => {
    it('should calculate positive deviation when actual > system', () => {
      // Arrange
      const systemQty = 100;
      const actualQty = 110;
      
      // Act
      const result = calculateDeviation(systemQty, actualQty);
      
      // Assert
      expect(result.deviation).toBe(10);
      expect(result.deviationPercent).toBe(10);
    });

    it('should calculate negative deviation when actual < system', () => {
      // Arrange
      const systemQty = 100;
      const actualQty = 90;
      
      // Act
      const result = calculateDeviation(systemQty, actualQty);
      
      // Assert
      expect(result.deviation).toBe(-10);
      expect(result.deviationPercent).toBe(-10);
    });

    it('should return zero deviation when actual = system', () => {
      // Arrange
      const systemQty = 100;
      const actualQty = 100;
      
      // Act
      const result = calculateDeviation(systemQty, actualQty);
      
      // Assert
      expect(result.deviation).toBe(0);
      expect(result.deviationPercent).toBe(0);
    });

    it('should handle systemQty = 0 with actualQty > 0', () => {
      // Arrange
      const systemQty = 0;
      const actualQty = 50;
      
      // Act
      const result = calculateDeviation(systemQty, actualQty);
      
      // Assert
      expect(result.deviation).toBe(50);
      expect(result.deviationPercent).toBe(100); // Avoid Infinity
    });

    it('should handle systemQty = 0 with actualQty = 0', () => {
      // Arrange
      const systemQty = 0;
      const actualQty = 0;
      
      // Act
      const result = calculateDeviation(systemQty, actualQty);
      
      // Assert
      expect(result.deviation).toBe(0);
      expect(result.deviationPercent).toBe(0);
    });

    it('should round deviationPercent to 2 decimal places', () => {
      // Arrange - Create scenario that would produce repeating decimal
      const systemQty = 3;
      const actualQty = 1;
      
      // Act
      const result = calculateDeviation(systemQty, actualQty);
      
      // Assert
      expect(result.deviation).toBe(-2);
      expect(result.deviationPercent).toBe(-66.67); // -200/3 rounded
    });

    it('should return correct deviation for large numbers', () => {
      // Arrange
      const systemQty = 1000000;
      const actualQty = 999500;
      
      // Act
      const result = calculateDeviation(systemQty, actualQty);
      
      // Assert
      expect(result.deviation).toBe(-500);
      expect(result.deviationPercent).toBe(-0.05);
    });

    it('should return systemQty and actualQty in result', () => {
      // Arrange
      const systemQty = 100;
      const actualQty = 80;
      
      // Act
      const result = calculateDeviation(systemQty, actualQty);
      
      // Assert
      expect(result.systemQty).toBe(100);
      expect(result.actualQty).toBe(80);
    });
  });

  describe('Rule 5.2: Ngưỡng phê duyệt điều chỉnh', () => {
    it('should need approval when deviationPercent > 5%', () => {
      // Arrange
      const deviationPercent = 6;
      
      // Act
      const result = needsApproval(deviationPercent);
      
      // Assert
      expect(result).toBe(true);
    });

    it('should need approval when deviationPercent < -5%', () => {
      // Arrange
      const deviationPercent = -6;
      
      // Act
      const result = needsApproval(deviationPercent);
      
      // Assert
      expect(result).toBe(true);
    });

    it('should NOT need approval when deviationPercent = 5%', () => {
      // Arrange
      const deviationPercent = 5;
      
      // Act
      const result = needsApproval(deviationPercent);
      
      // Assert
      expect(result).toBe(false);
    });

    it('should NOT need approval when deviationPercent = -5%', () => {
      // Arrange
      const deviationPercent = -5;
      
      // Act
      const result = needsApproval(deviationPercent);
      
      // Assert
      expect(result).toBe(false);
    });

    it('should NOT need approval when deviationPercent between -5% and 5%', () => {
      // Arrange
      const percentages = [-4, -1, 0, 1, 4, 4.99];
      
      // Act & Assert
      for (const percent of percentages) {
        expect(needsApproval(percent)).toBe(false);
      }
    });

    it('should need approval when deviationPercent = 5.01%', () => {
      // Arrange
      const deviationPercent = 5.01;
      
      // Act
      const result = needsApproval(deviationPercent);
      
      // Assert
      expect(result).toBe(true);
    });

    it('should work with custom threshold', () => {
      // Arrange - Use 10% threshold instead of default 5%
      const deviationPercent = 8;
      
      // Act & Assert
      expect(needsApproval(deviationPercent, 10)).toBe(false);
      expect(needsApproval(deviationPercent, 5)).toBe(true);
    });

    it('should work with 0% threshold', () => {
      // Arrange
      const deviationPercent = 0;
      
      // Act
      const result = needsApproval(deviationPercent, 0);
      
      // Assert
      expect(result).toBe(false); // 0 is not > 0
    });

    it('should work with 100% threshold', () => {
      // Arrange
      const deviationPercent = 50;
      
      // Act
      const result = needsApproval(deviationPercent, 100);
      
      // Assert
      expect(result).toBe(false);
    });
  });

  describe('Rule 5.3: Cập nhật tồn sau kiểm kê', () => {
    it('should update total to actual quantity after adjustment', () => {
      // Arrange
      const item = createMockInventoryItem({ quantityTotal: 100 });
      const discrepancy = createMockDiscrepancy({
        systemQuantity: 100,
        countedQuantity: 90,
        difference: -10,
        variancePercentage: -10,
      });
      
      // Act
      const result = applyStocktakeAdjustment(item, discrepancy);
      
      // Assert
      expect(result.quantityTotal).toBe(90);
    });

    it('should decrease available when shortage', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityTotal: 100,
        quantityAvailable: 80,
        quantityReserved: 10,
        quantityQuarantine: 5,
        quantityDamaged: 5,
      });
      const discrepancy = createMockDiscrepancy({
        systemQuantity: 100,
        countedQuantity: 95,
        difference: -5,
      });
      
      // Act
      const result = applyStocktakeAdjustment(item, discrepancy);
      
      // Assert
      expect(result.quantityTotal).toBe(95);
      expect(result.quantityAvailable).toBe(75); // 80 - 5
    });

    it('should increase available when surplus', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityTotal: 100,
        quantityAvailable: 80,
        quantityReserved: 10,
        quantityQuarantine: 5,
        quantityDamaged: 5,
      });
      const discrepancy = createMockDiscrepancy({
        systemQuantity: 100,
        countedQuantity: 110,
        difference: 10,
      });
      
      // Act
      const result = applyStocktakeAdjustment(item, discrepancy);
      
      // Assert
      expect(result.quantityTotal).toBe(110);
      expect(result.quantityAvailable).toBe(90); // 80 + 10
    });

    it('should not affect reserved, quarantine, damaged quantities', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityTotal: 100,
        quantityReserved: 20,
        quantityQuarantine: 10,
        quantityDamaged: 5,
      });
      const discrepancy = createMockDiscrepancy({
        systemQuantity: 100,
        countedQuantity: 110,
        difference: 10,
      });
      
      // Act
      const result = applyStocktakeAdjustment(item, discrepancy);
      
      // Assert
      expect(result.quantityReserved).toBe(20);
      expect(result.quantityQuarantine).toBe(10);
      expect(result.quantityDamaged).toBe(5);
    });

    it('should not let total go below zero', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityTotal: 5,
        quantityAvailable: 5,
      });
      const discrepancy = createMockDiscrepancy({
        systemQuantity: 5,
        countedQuantity: 0,
        difference: -5,
      });
      
      // Act
      const result = applyStocktakeAdjustment(item, discrepancy);
      
      // Assert
      expect(result.quantityTotal).toBeGreaterThanOrEqual(0);
      expect(result.quantityTotal).toBe(0);
    });

    it('should handle large positive adjustment', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityTotal: 100,
        quantityAvailable: 80,
      });
      const discrepancy = createMockDiscrepancy({
        systemQuantity: 100,
        countedQuantity: 1000,
        difference: 900,
      });
      
      // Act
      const result = applyStocktakeAdjustment(item, discrepancy);
      
      // Assert
      expect(result.quantityTotal).toBe(1000);
      expect(result.quantityAvailable).toBe(980);
    });

    it('should handle zero adjustment (perfect count)', () => {
      // Arrange
      const item = createMockInventoryItem({
        quantityTotal: 100,
        quantityAvailable: 80,
      });
      const discrepancy = createMockDiscrepancy({
        systemQuantity: 100,
        countedQuantity: 100,
        difference: 0,
      });
      
      // Act
      const result = applyStocktakeAdjustment(item, discrepancy);
      
      // Assert
      expect(result.quantityTotal).toBe(100);
      expect(result.quantityAvailable).toBe(80);
    });
  });

  describe('Integration: Full Stocktake Workflow', () => {
    it('should complete full stocktake workflow correctly', () => {
      // Step 1: Initial inventory
      const initialItem = createMockInventoryItem({
        quantityTotal: 100,
        quantityAvailable: 85,
        quantityReserved: 5,
        quantityQuarantine: 5,
        quantityDamaged: 5,
      });
      
      // Step 2: Physical count reveals 92 units
      const countedQty = 92;
      const deviation = calculateDeviation(initialItem.quantityTotal, countedQty);
      
      expect(deviation.deviation).toBe(-8);
      expect(deviation.deviationPercent).toBe(-8);
      expect(needsApproval(deviation.deviationPercent)).toBe(true); // -8 < -5
      
      // Step 3: After approval, apply adjustment
      const discrepancy = createMockDiscrepancy({
        systemQuantity: initialItem.quantityTotal,
        countedQuantity: countedQty,
        difference: deviation.deviation,
        variancePercentage: deviation.deviationPercent,
      });
      
      const adjusted = applyStocktakeAdjustment(initialItem, discrepancy);
      
      // Assert final state
      expect(adjusted.quantityTotal).toBe(92);
      expect(adjusted.quantityAvailable).toBe(77); // 85 - 8
    });

    it('should not need approval for minor variance', () => {
      // Initial: 100 units
      const initialItem = createMockInventoryItem({
        quantityTotal: 100,
        quantityAvailable: 90,
      });
      
      // Counted: 97 units (-3%)
      const deviation = calculateDeviation(100, 97);
      
      expect(deviation.deviationPercent).toBe(-3);
      expect(needsApproval(deviation.deviationPercent)).toBe(false);
    });
  });
});
