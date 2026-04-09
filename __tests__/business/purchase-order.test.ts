/**
 * Purchase Order Business Logic Tests
 * Test các business rules liên quan đến PO approval workflow
 */

import { describe, it, expect } from 'vitest';
import {
  getRequiredApprover,
  isValidStatusTransition,
  canCancelPurchaseOrder,
  validatePurchaseOrder,
  ApprovalLevel,
} from '@/lib/businessLogic';
import { PurchaseOrder, PurchaseOrderStatus, UnitOfMeasure } from '@/lib/types';

// ============================================
// MOCK DATA
// ============================================

function createMockPurchaseOrder(overrides: Partial<PurchaseOrder> = {}): PurchaseOrder {
  return {
    id: 'po-001',
    orderNumber: 'PO-2024-001',
    supplierId: 'sup-001',
    supplierName: 'Test Supplier',
    items: [
      {
        id: 'item-001',
        productId: 'prod-001',
        productSku: 'SKU-001',
        productName: 'Product A',
        unit: UnitOfMeasure.PIECE,
        quantity: 10,
        unitPrice: 100000,
        totalPrice: 1000000,
        orderedQuantity: 10,
        receivedQuantity: 0,
        pendingQuantity: 10,
      },
    ],
    subtotal: 1000000,
    taxAmount: 100000,
    discountAmount: 0,
    totalValue: 1100000,
    status: PurchaseOrderStatus.DRAFT,
    orderDate: new Date(),
    expectedDeliveryDate: new Date(),
    createdBy: 'user-001',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============================================
// TESTS
// ============================================

describe('Purchase Order Business Rules', () => {
  describe('Rule 4.1: Approval theo giá trị PO', () => {
    it('should require WAREHOUSE_MANAGER for amount < 10,000,000 VND', () => {
      // Arrange
      const amounts = [100000, 1000000, 5000000, 9999999];
      
      // Act & Assert
      for (const amount of amounts) {
        expect(getRequiredApprover(amount)).toBe(ApprovalLevel.WAREHOUSE_MANAGER);
      }
    });

    it('should require WAREHOUSE_MANAGER for amount = 0', () => {
      // Arrange
      const amount = 0;
      
      // Act
      const result = getRequiredApprover(amount);
      
      // Assert
      expect(result).toBe(ApprovalLevel.WAREHOUSE_MANAGER);
    });

    it('should require DEPARTMENT_HEAD for amount = 10,000,000 VND', () => {
      // Arrange
      const amount = 10000000;
      
      // Act
      const result = getRequiredApprover(amount);
      
      // Assert
      expect(result).toBe(ApprovalLevel.DEPARTMENT_HEAD);
    });

    it('should require DEPARTMENT_HEAD for amount between 10-50 million', () => {
      // Arrange
      const amounts = [10000000, 20000000, 30000000, 40000000, 50000000];
      
      // Act & Assert
      for (const amount of amounts) {
        expect(getRequiredApprover(amount)).toBe(ApprovalLevel.DEPARTMENT_HEAD);
      }
    });

    it('should require DIRECTOR for amount > 50,000,000 VND', () => {
      // Arrange
      const amounts = [50000001, 75000000, 100000000, 500000000];
      
      // Act & Assert
      for (const amount of amounts) {
        expect(getRequiredApprover(amount)).toBe(ApprovalLevel.DIRECTOR);
      }
    });

    it('should have correct string values for approval levels', () => {
      // Assert
      expect(ApprovalLevel.WAREHOUSE_MANAGER).toBe('Quản lý kho');
      expect(ApprovalLevel.DEPARTMENT_HEAD).toBe('Trưởng phòng');
      expect(ApprovalLevel.DIRECTOR).toBe('Giám đốc');
    });
  });

  describe('Rule 4.2: PO status flow', () => {
    it('should allow DRAFT → PENDING_APPROVAL', () => {
      // Act
      const result = isValidStatusTransition(
        PurchaseOrderStatus.DRAFT,
        PurchaseOrderStatus.PENDING_APPROVAL
      );
      
      // Assert
      expect(result).toBe(true);
    });

    it('should allow PENDING_APPROVAL → APPROVED', () => {
      // Act
      const result = isValidStatusTransition(
        PurchaseOrderStatus.PENDING_APPROVAL,
        PurchaseOrderStatus.APPROVED
      );
      
      // Assert
      expect(result).toBe(true);
    });

    it('should allow APPROVED → SENT', () => {
      // Act
      const result = isValidStatusTransition(
        PurchaseOrderStatus.APPROVED,
        PurchaseOrderStatus.SENT
      );
      
      // Assert
      expect(result).toBe(true);
    });

    it('should allow APPROVED → CANCELLED', () => {
      // Act
      const result = isValidStatusTransition(
        PurchaseOrderStatus.APPROVED,
        PurchaseOrderStatus.CANCELLED
      );
      
      // Assert
      expect(result).toBe(true);
    });

    it('should NOT allow DRAFT → RECEIVED (skip steps)', () => {
      // Act
      const result = isValidStatusTransition(
        PurchaseOrderStatus.DRAFT,
        PurchaseOrderStatus.FULLY_RECEIVED
      );
      
      // Assert
      expect(result).toBe(false);
    });

    it('should NOT allow any transition from CLOSED', () => {
      // Act
      const result = isValidStatusTransition(
        PurchaseOrderStatus.CLOSED,
        PurchaseOrderStatus.DRAFT
      );
      
      // Assert
      expect(result).toBe(false);
    });

    it('should NOT allow any transition from CANCELLED', () => {
      // Act
      const result = isValidStatusTransition(
        PurchaseOrderStatus.CANCELLED,
        PurchaseOrderStatus.DRAFT
      );
      
      // Assert
      expect(result).toBe(false);
    });

    it('should allow CONFIRMED → PARTIALLY_RECEIVED', () => {
      // Act
      const result = isValidStatusTransition(
        PurchaseOrderStatus.CONFIRMED,
        PurchaseOrderStatus.PARTIALLY_RECEIVED
      );
      
      // Assert
      expect(result).toBe(true);
    });

    it('should allow PARTIALLY_RECEIVED → FULLY_RECEIVED', () => {
      // Act
      const result = isValidStatusTransition(
        PurchaseOrderStatus.PARTIALLY_RECEIVED,
        PurchaseOrderStatus.FULLY_RECEIVED
      );
      
      // Assert
      expect(result).toBe(true);
    });

    it('should allow FULLY_RECEIVED → CLOSED', () => {
      // Act
      const result = isValidStatusTransition(
        PurchaseOrderStatus.FULLY_RECEIVED,
        PurchaseOrderStatus.CLOSED
      );
      
      // Assert
      expect(result).toBe(true);
    });

    it('should allow DRAFT → CANCELLED', () => {
      // Act
      const result = isValidStatusTransition(
        PurchaseOrderStatus.DRAFT,
        PurchaseOrderStatus.CANCELLED
      );
      
      // Assert
      expect(result).toBe(true);
    });

    it('should allow PENDING_APPROVAL → CANCELLED', () => {
      // Act
      const result = isValidStatusTransition(
        PurchaseOrderStatus.PENDING_APPROVAL,
        PurchaseOrderStatus.CANCELLED
      );
      
      // Assert
      expect(result).toBe(true);
    });
  });

  describe('Rule 4.3: Cancel PO', () => {
    it('should allow cancel when status = DRAFT', () => {
      // Arrange
      const po = createMockPurchaseOrder({ status: PurchaseOrderStatus.DRAFT });
      
      // Act
      const result = canCancelPurchaseOrder(po.status);
      
      // Assert
      expect(result.canCancel).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow cancel when status = PENDING_APPROVAL', () => {
      // Arrange
      const po = createMockPurchaseOrder({ status: PurchaseOrderStatus.PENDING_APPROVAL });
      
      // Act
      const result = canCancelPurchaseOrder(po.status);
      
      // Assert
      expect(result.canCancel).toBe(true);
    });

    it('should NOT allow cancel when status = APPROVED', () => {
      // Arrange
      const po = createMockPurchaseOrder({ status: PurchaseOrderStatus.APPROVED });
      
      // Act
      const result = canCancelPurchaseOrder(po.status);
      
      // Assert
      expect(result.canCancel).toBe(false);
      expect(result.reason).toContain('approved');
    });

    it('should NOT allow cancel when status = ORDERED', () => {
      // Arrange
      const po = createMockPurchaseOrder({ status: PurchaseOrderStatus.SENT });
      
      // Act
      const result = canCancelPurchaseOrder(po.status);
      
      // Assert
      expect(result.canCancel).toBe(false);
    });

    it('should NOT allow cancel when status = CONFIRMED', () => {
      // Arrange
      const po = createMockPurchaseOrder({ status: PurchaseOrderStatus.CONFIRMED });
      
      // Act
      const result = canCancelPurchaseOrder(po.status);
      
      // Assert
      expect(result.canCancel).toBe(false);
    });

    it('should NOT allow cancel when status = PARTIALLY_RECEIVED', () => {
      // Arrange
      const po = createMockPurchaseOrder({ status: PurchaseOrderStatus.PARTIALLY_RECEIVED });
      
      // Act
      const result = canCancelPurchaseOrder(po.status);
      
      // Assert
      expect(result.canCancel).toBe(false);
    });

    it('should NOT allow cancel when status = FULLY_RECEIVED', () => {
      // Arrange
      const po = createMockPurchaseOrder({ status: PurchaseOrderStatus.FULLY_RECEIVED });
      
      // Act
      const result = canCancelPurchaseOrder(po.status);
      
      // Assert
      expect(result.canCancel).toBe(false);
    });

    it('should NOT allow cancel when status = CLOSED', () => {
      // Arrange
      const po = createMockPurchaseOrder({ status: PurchaseOrderStatus.CLOSED });
      
      // Act
      const result = canCancelPurchaseOrder(po.status);
      
      // Assert
      expect(result.canCancel).toBe(false);
    });
  });

  describe('PO Validation', () => {
    it('should be valid when all requirements met', () => {
      // Arrange
      const po = createMockPurchaseOrder();
      
      // Act
      const result = validatePurchaseOrder(po);
      
      // Assert
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should be invalid when no items', () => {
      // Arrange
      const po = createMockPurchaseOrder({ items: [] });
      
      // Act
      const result = validatePurchaseOrder(po);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('PO phải có ít nhất một sản phẩm');
    });

    it('should be invalid when item quantity <= 0', () => {
      // Arrange
      const po = createMockPurchaseOrder({
        items: [
          {
            id: 'item-001',
            productId: 'prod-001',
            productSku: 'SKU-001',
            productName: 'Product A',
            unit: UnitOfMeasure.PIECE,
            quantity: 0,
            unitPrice: 100000,
            totalPrice: 0,
            orderedQuantity: 0,
            receivedQuantity: 0,
            pendingQuantity: 0,
          },
        ],
      });
      
      // Act
      const result = validatePurchaseOrder(po);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Số lượng sản phẩm phải lớn hơn 0');
    });

    it('should be invalid when item unitPrice <= 0', () => {
      // Arrange
      const po = createMockPurchaseOrder({
        items: [
          {
            id: 'item-001',
            productId: 'prod-001',
            productSku: 'SKU-001',
            productName: 'Product A',
            unit: UnitOfMeasure.PIECE,
            quantity: 10,
            unitPrice: 0,
            totalPrice: 0,
            orderedQuantity: 10,
            receivedQuantity: 0,
            pendingQuantity: 10,
          },
        ],
      });
      
      // Act
      const result = validatePurchaseOrder(po);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Đơn giá phải lớn hơn 0');
    });

    it('should be invalid when no supplier', () => {
      // Arrange
      const po = createMockPurchaseOrder({ supplierId: '' });
      
      // Act
      const result = validatePurchaseOrder(po);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('PO phải có nhà cung cấp');
    });

    it('should return multiple errors for multiple issues', () => {
      // Arrange
      const po = createMockPurchaseOrder({
        supplierId: '',
        items: [
          {
            id: 'item-001',
            productId: 'prod-001',
            productSku: 'SKU-001',
            productName: 'Product A',
            unit: UnitOfMeasure.PIECE,
            quantity: -5,
            unitPrice: 0,
            totalPrice: 0,
            orderedQuantity: -5,
            receivedQuantity: 0,
            pendingQuantity: -5,
          },
        ],
      });
      
      // Act
      const result = validatePurchaseOrder(po);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});
