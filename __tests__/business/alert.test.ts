/**
 * Alert Business Logic Tests
 * Test các business rules liên quan đến cảnh báo tồn thấp
 */

import { describe, it, expect } from 'vitest';
import {
  generateAlerts,
  deduplicateAlerts,
} from '@/lib/businessLogic';
import { InventoryAlert, AlertSeverity } from '@/lib/types';

// ============================================
// MOCK DATA
// ============================================

function createMockProducts(): Array<{
  id: string;
  name: string;
  sku: string;
  reorderPoint: number;
}> {
  return [
    { id: 'prod-001', name: 'Product A', sku: 'SKU-001', reorderPoint: 10 },
    { id: 'prod-002', name: 'Product B', sku: 'SKU-002', reorderPoint: 20 },
    { id: 'prod-003', name: 'Product C', sku: 'SKU-003', reorderPoint: 5 },
    { id: 'prod-004', name: 'Product D', sku: 'SKU-004', reorderPoint: 15 },
  ];
}

// ============================================
// TESTS
// ============================================

describe('Alert Business Rules', () => {
  describe('Rule 7.1: generateAlerts trả về đúng danh sách', () => {
    it('should generate alert for product with available <= reorderPoint', () => {
      // Arrange
      const products = createMockProducts();
      const quantities = new Map<string, number>([
        ['prod-001', 10], // Equal to reorderPoint
      ]);
      
      // Act
      const alerts = generateAlerts(products, quantities);
      
      // Assert
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(a => a.productId === 'prod-001')).toBe(true);
    });

    it('should generate alert for product with available < reorderPoint', () => {
      // Arrange
      const products = createMockProducts();
      const quantities = new Map<string, number>([
        ['prod-001', 5], // Less than reorderPoint (10)
      ]);
      
      // Act
      const alerts = generateAlerts(products, quantities);
      
      // Assert
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(a => a.productId === 'prod-001')).toBe(true);
    });

    it('should generate CRITICAL alert for product with available = 0', () => {
      // Arrange
      const products = createMockProducts();
      const quantities = new Map<string, number>([
        ['prod-001', 0], // Zero stock
      ]);
      
      // Act
      const alerts = generateAlerts(products, quantities);
      
      // Assert
      const alert = alerts.find(a => a.productId === 'prod-001');
      expect(alert).toBeDefined();
      expect(alert?.severity).toBe(AlertSeverity.CRITICAL);
    });

    it('should generate WARNING alert for product with available <= reorderPoint (non-zero)', () => {
      // Arrange
      const products = createMockProducts();
      const quantities = new Map<string, number>([
        ['prod-001', 5], // Less than reorderPoint (10)
      ]);
      
      // Act
      const alerts = generateAlerts(products, quantities);
      
      // Assert
      const alert = alerts.find(a => a.productId === 'prod-001');
      expect(alert?.severity).toBe(AlertSeverity.WARNING);
    });

    it('should NOT generate alert for product with available > reorderPoint', () => {
      // Arrange
      const products = createMockProducts();
      const quantities = new Map<string, number>([
        ['prod-001', 20], // Greater than reorderPoint (10)
      ]);
      
      // Act
      const alerts = generateAlerts(products, quantities);
      
      // Assert
      expect(alerts.some(a => a.productId === 'prod-001')).toBe(false);
    });

    it('should generate alert for multiple low-stock products', () => {
      // Arrange
      const products = createMockProducts();
      const quantities = new Map<string, number>([
        ['prod-001', 5], // Low
        ['prod-002', 10], // Low (reorderPoint: 20)
        ['prod-003', 100], // OK
        ['prod-004', 3], // Low (reorderPoint: 15)
      ]);
      
      // Act
      const alerts = generateAlerts(products, quantities);
      
      // Assert
      expect(alerts.length).toBe(3);
      expect(alerts.some(a => a.productId === 'prod-001')).toBe(true);
      expect(alerts.some(a => a.productId === 'prod-002')).toBe(true);
      expect(alerts.some(a => a.productId === 'prod-004')).toBe(true);
      expect(alerts.some(a => a.productId === 'prod-003')).toBe(false);
    });

    it('should handle product not in inventory map', () => {
      // Arrange
      const products = createMockProducts();
      const quantities = new Map<string, number>(); // Empty map
      
      // Act
      const alerts = generateAlerts(products, quantities);
      
      // Assert - All products should be treated as 0 quantity (undefined → 0)
      expect(alerts.length).toBe(4);
    });

    it('should return empty array when all products have sufficient stock', () => {
      // Arrange
      const products = createMockProducts();
      const quantities = new Map<string, number>([
        ['prod-001', 100],
        ['prod-002', 200],
        ['prod-003', 50],
        ['prod-004', 150],
      ]);
      
      // Act
      const alerts = generateAlerts(products, quantities);
      
      // Assert
      expect(alerts.length).toBe(0);
    });

    it('should include correct alert properties', () => {
      // Arrange
      const products = [{
        id: 'prod-001',
        name: 'Test Product',
        sku: 'TEST-SKU',
        reorderPoint: 10,
      }];
      const quantities = new Map<string, number>([
        ['prod-001', 5],
      ]);
      
      // Act
      const alerts = generateAlerts(products, quantities);
      
      // Assert
      expect(alerts.length).toBe(1);
      const alert = alerts[0];
      expect(alert.productId).toBe('prod-001');
      expect(alert.productName).toBe('Test Product');
      expect(alert.productSku).toBe('TEST-SKU');
      expect(alert.alertType).toBe('low_stock');
      expect(alert.currentQuantity).toBe(5);
      expect(alert.reorderPoint).toBe(10);
      expect(alert.isRead).toBe(false);
      expect(alert.createdAt).toBeInstanceOf(Date);
      expect(alert.resolvedAt).toBeUndefined();
    });

    it('should handle products with zero reorderPoint', () => {
      // Arrange
      const products = [{
        id: 'prod-001',
        name: 'Product',
        sku: 'SKU',
        reorderPoint: 0,
      }];
      const quantities = new Map<string, number>([
        ['prod-001', 0],
      ]);
      
      // Act
      const alerts = generateAlerts(products, quantities);
      
      // Assert
      expect(alerts.length).toBe(1);
      expect(alerts[0].severity).toBe(AlertSeverity.CRITICAL);
    });
  });

  describe('Rule 7.2: Alert không trùng lặp', () => {
    it('should deduplicate alerts keeping highest severity', () => {
      // Arrange
      const alerts: InventoryAlert[] = [
        {
          id: 'alert-1',
          productId: 'prod-001',
          productName: 'Product A',
          productSku: 'SKU-001',
          warehouseId: 'wh-001',
          alertType: 'low_stock',
          severity: AlertSeverity.WARNING,
          currentQuantity: 5,
          reorderPoint: 10,
          isRead: false,
          createdAt: new Date(),
        },
        {
          id: 'alert-2',
          productId: 'prod-001',
          productName: 'Product A',
          productSku: 'SKU-001',
          warehouseId: 'wh-001',
          alertType: 'low_stock',
          severity: AlertSeverity.CRITICAL,
          currentQuantity: 0,
          reorderPoint: 10,
          isRead: false,
          createdAt: new Date(),
        },
      ];
      
      // Act
      const result = deduplicateAlerts(alerts);
      
      // Assert
      expect(result.length).toBe(1);
      expect(result[0].productId).toBe('prod-001');
      expect(result[0].severity).toBe(AlertSeverity.CRITICAL);
      expect(result[0].currentQuantity).toBe(0);
    });

    it('should keep first alert when same severity', () => {
      // Arrange
      const alerts: InventoryAlert[] = [
        {
          id: 'alert-1',
          productId: 'prod-001',
          productName: 'Product A',
          productSku: 'SKU-001',
          warehouseId: 'wh-001',
          alertType: 'low_stock',
          severity: AlertSeverity.WARNING,
          currentQuantity: 5,
          reorderPoint: 10,
          isRead: false,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'alert-2',
          productId: 'prod-001',
          productName: 'Product A',
          productSku: 'SKU-001',
          warehouseId: 'wh-001',
          alertType: 'low_stock',
          severity: AlertSeverity.WARNING,
          currentQuantity: 3,
          reorderPoint: 10,
          isRead: false,
          createdAt: new Date('2024-01-02'),
        },
      ];
      
      // Act
      const result = deduplicateAlerts(alerts);
      
      // Assert
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('alert-1'); // First one kept
    });

    it('should handle multiple products correctly', () => {
      // Arrange
      const alerts: InventoryAlert[] = [
        {
          id: 'alert-1',
          productId: 'prod-001',
          productName: 'Product A',
          productSku: 'SKU-001',
          warehouseId: 'wh-001',
          alertType: 'low_stock',
          severity: AlertSeverity.WARNING,
          currentQuantity: 5,
          reorderPoint: 10,
          isRead: false,
          createdAt: new Date(),
        },
        {
          id: 'alert-2',
          productId: 'prod-002',
          productName: 'Product B',
          productSku: 'SKU-002',
          warehouseId: 'wh-001',
          alertType: 'low_stock',
          severity: AlertSeverity.WARNING,
          currentQuantity: 10,
          reorderPoint: 20,
          isRead: false,
          createdAt: new Date(),
        },
        {
          id: 'alert-3',
          productId: 'prod-001',
          productName: 'Product A',
          productSku: 'SKU-001',
          warehouseId: 'wh-001',
          alertType: 'low_stock',
          severity: AlertSeverity.CRITICAL,
          currentQuantity: 0,
          reorderPoint: 10,
          isRead: false,
          createdAt: new Date(),
        },
      ];
      
      // Act
      const result = deduplicateAlerts(alerts);
      
      // Assert
      expect(result.length).toBe(2);
      const prod1Alert = result.find(a => a.productId === 'prod-001');
      expect(prod1Alert?.severity).toBe(AlertSeverity.CRITICAL);
    });

    it('should return same alerts when no duplicates', () => {
      // Arrange
      const alerts: InventoryAlert[] = [
        {
          id: 'alert-1',
          productId: 'prod-001',
          productName: 'Product A',
          productSku: 'SKU-001',
          warehouseId: 'wh-001',
          alertType: 'low_stock',
          severity: AlertSeverity.WARNING,
          currentQuantity: 5,
          reorderPoint: 10,
          isRead: false,
          createdAt: new Date(),
        },
        {
          id: 'alert-2',
          productId: 'prod-002',
          productName: 'Product B',
          productSku: 'SKU-002',
          warehouseId: 'wh-001',
          alertType: 'low_stock',
          severity: AlertSeverity.WARNING,
          currentQuantity: 10,
          reorderPoint: 20,
          isRead: false,
          createdAt: new Date(),
        },
      ];
      
      // Act
      const result = deduplicateAlerts(alerts);
      
      // Assert
      expect(result.length).toBe(2);
    });

    it('should return empty array for empty input', () => {
      // Arrange
      const alerts: InventoryAlert[] = [];
      
      // Act
      const result = deduplicateAlerts(alerts);
      
      // Assert
      expect(result.length).toBe(0);
    });

    it('should handle INFO severity correctly (lowest priority)', () => {
      // Arrange
      const alerts: InventoryAlert[] = [
        {
          id: 'alert-1',
          productId: 'prod-001',
          productName: 'Product A',
          productSku: 'SKU-001',
          warehouseId: 'wh-001',
          alertType: 'low_stock',
          severity: AlertSeverity.INFO,
          currentQuantity: 8,
          reorderPoint: 10,
          isRead: false,
          createdAt: new Date(),
        },
        {
          id: 'alert-2',
          productId: 'prod-001',
          productName: 'Product A',
          productSku: 'SKU-001',
          warehouseId: 'wh-001',
          alertType: 'low_stock',
          severity: AlertSeverity.WARNING,
          currentQuantity: 5,
          reorderPoint: 10,
          isRead: false,
          createdAt: new Date(),
        },
      ];
      
      // Act
      const result = deduplicateAlerts(alerts);
      
      // Assert
      expect(result.length).toBe(1);
      expect(result[0].severity).toBe(AlertSeverity.WARNING);
    });
  });

  describe('Integration: Complete Alert Workflow', () => {
    it('should generate and deduplicate alerts in workflow', () => {
      // Step 1: Generate alerts
      const products = createMockProducts();
      const quantities = new Map<string, number>([
        ['prod-001', 5], // Low
        ['prod-002', 0], // Critical
        ['prod-003', 100], // OK
        ['prod-004', 10], // Low (reorderPoint: 15)
      ]);
      
      const generatedAlerts = generateAlerts(products, quantities);
      expect(generatedAlerts.length).toBe(3);
      
      // Step 2: Verify correct severities
      const criticalAlert = generatedAlerts.find(a => a.productId === 'prod-002');
      expect(criticalAlert?.severity).toBe(AlertSeverity.CRITICAL);
      
      const warningAlerts = generatedAlerts.filter(
        a => a.severity === AlertSeverity.WARNING
      );
      expect(warningAlerts.length).toBe(2);
      
      // Step 3: Simulate multiple alerts for same product (e.g., from different warehouses)
      const duplicateAlerts: InventoryAlert[] = [
        ...generatedAlerts,
        {
          id: 'alert-extra',
          productId: 'prod-001',
          productName: 'Product A',
          productSku: 'SKU-001',
          warehouseId: 'wh-002', // Different warehouse
          alertType: 'low_stock',
          severity: AlertSeverity.WARNING,
          currentQuantity: 5,
          reorderPoint: 10,
          isRead: false,
          createdAt: new Date(),
        },
      ];
      
      // Step 4: Deduplicate
      const uniqueAlerts = deduplicateAlerts(duplicateAlerts);
      
      // Assert - Should have 3 unique alerts (prod-001 deduplicated)
      expect(uniqueAlerts.length).toBe(3);
    });

    it('should prioritize CRITICAL over WARNING alerts', () => {
      // Arrange
      const products = [{
        id: 'prod-001',
        name: 'Product A',
        sku: 'SKU-001',
        reorderPoint: 10,
      }];
      const quantities = new Map<string, number>([
        ['prod-001', 0],
      ]);
      
      // Act
      const alerts = generateAlerts(products, quantities);
      const result = deduplicateAlerts(alerts);
      
      // Assert
      expect(result.length).toBe(1);
      expect(result[0].severity).toBe(AlertSeverity.CRITICAL);
      expect(result[0].currentQuantity).toBe(0);
    });
  });
});
