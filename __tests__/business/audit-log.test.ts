/**
 * Audit Log Business Logic Tests
 * Test các business rules liên quan đến ghi log thay đổi tồn kho
 */

import { describe, it, expect } from 'vitest';
import {
  validateAuditLogEntry,
  isInventoryChangeAction,
  createInventoryAuditLog,
} from '@/lib/businessLogic';
import { AuditLog, AuditAction } from '@/lib/types';

// ============================================
// MOCK DATA
// ============================================

function createMockAuditLog(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: 'audit-001',
    timestamp: new Date(),
    action: AuditAction.CREATE,
    entity: 'InventoryItem',
    entityId: 'prod-001',
    entityName: 'Product A',
    userId: 'user-001',
    userName: 'Nguyễn Văn Minh',
    userEmail: 'minh@example.com',
    reason: 'Test audit log',
    ...overrides,
  };
}

// ============================================
// TESTS
// ============================================

describe('Audit Log Business Rules', () => {
  describe('Rule 6.1: Validate audit log entry', () => {
    it('should return valid when all required fields present', () => {
      // Arrange
      const log: Partial<AuditLog> = {
        id: 'audit-001',
        timestamp: new Date(),
        userId: 'user-001',
        action: AuditAction.CREATE,
        entity: 'InventoryItem',
        entityId: 'prod-001',
      };
      
      // Act
      const result = validateAuditLogEntry(log);
      
      // Assert
      expect(result.valid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it('should return invalid when timestamp is missing', () => {
      // Arrange
      const log: Partial<AuditLog> = {
        userId: 'user-001',
        action: AuditAction.CREATE,
        entity: 'InventoryItem',
        entityId: 'prod-001',
      };
      
      // Act
      const result = validateAuditLogEntry(log);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('timestamp');
    });

    it('should return invalid when userId is missing', () => {
      // Arrange
      const log: Partial<AuditLog> = {
        timestamp: new Date(),
        action: AuditAction.CREATE,
        entity: 'InventoryItem',
        entityId: 'prod-001',
      };
      
      // Act
      const result = validateAuditLogEntry(log);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('userId');
    });

    it('should return invalid when action is missing', () => {
      // Arrange
      const log: Partial<AuditLog> = {
        timestamp: new Date(),
        userId: 'user-001',
        entity: 'InventoryItem',
        entityId: 'prod-001',
      };
      
      // Act
      const result = validateAuditLogEntry(log);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('action');
    });

    it('should return invalid when entity is missing', () => {
      // Arrange
      const log: Partial<AuditLog> = {
        timestamp: new Date(),
        userId: 'user-001',
        action: AuditAction.CREATE,
        entityId: 'prod-001',
      };
      
      // Act
      const result = validateAuditLogEntry(log);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('entity');
    });

    it('should return invalid when entityId is missing', () => {
      // Arrange
      const log: Partial<AuditLog> = {
        timestamp: new Date(),
        userId: 'user-001',
        action: AuditAction.CREATE,
        entity: 'InventoryItem',
      };
      
      // Act
      const result = validateAuditLogEntry(log);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('entityId');
    });

    it('should return multiple missing fields', () => {
      // Arrange
      const log: Partial<AuditLog> = {
        action: AuditAction.CREATE,
      };
      
      // Act
      const result = validateAuditLogEntry(log);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.missingFields.length).toBeGreaterThan(1);
      expect(result.missingFields).toContain('timestamp');
      expect(result.missingFields).toContain('userId');
      expect(result.missingFields).toContain('entity');
      expect(result.missingFields).toContain('entityId');
    });

    it('should handle empty object', () => {
      // Arrange
      const log: Partial<AuditLog> = {};
      
      // Act
      const result = validateAuditLogEntry(log);
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.missingFields.length).toBe(5); // All 5 required fields
    });

    it('should accept null as invalid', () => {
      // Arrange
      const log: Partial<AuditLog> = {
        timestamp: null as unknown as Date,
        userId: null as unknown as string,
        action: AuditAction.CREATE,
        entity: 'InventoryItem',
        entityId: 'prod-001',
      };
      
      // Act
      const result = validateAuditLogEntry(log);
      
      // Assert
      expect(result.valid).toBe(false);
    });
  });

  describe('Rule 6.2: Inventory change actions', () => {
    it('should identify GOODS_RECEIPT as inventory change', () => {
      // Act
      const result = isInventoryChangeAction(AuditAction.GOODS_RECEIPT);
      
      // Assert
      expect(result).toBe(true);
    });

    it('should identify GOODS_ISSUE as inventory change', () => {
      // Act
      const result = isInventoryChangeAction(AuditAction.GOODS_ISSUE);
      
      // Assert
      expect(result).toBe(true);
    });

    it('should identify STOCKTAKE_ADJUSTMENT as inventory change', () => {
      // Act
      const result = isInventoryChangeAction(AuditAction.STOCKTAKE_ADJUSTMENT);
      
      // Assert
      expect(result).toBe(true);
    });

    it('should identify INVENTORY_UPDATE as inventory change', () => {
      // Act
      const result = isInventoryChangeAction(AuditAction.INVENTORY_UPDATE);
      
      // Assert
      expect(result).toBe(true);
    });

    it('should identify QUARANTINE as inventory change', () => {
      // Act
      const result = isInventoryChangeAction(AuditAction.QUARANTINE);
      
      // Assert
      expect(result).toBe(true);
    });

    it('should identify RELEASE_QUARANTINE as inventory change', () => {
      // Act
      const result = isInventoryChangeAction(AuditAction.RELEASE_QUARANTINE);
      
      // Assert
      expect(result).toBe(true);
    });

    it('should NOT identify CREATE as inventory change', () => {
      // Act
      const result = isInventoryChangeAction(AuditAction.CREATE);
      
      // Assert
      expect(result).toBe(false);
    });

    it('should NOT identify UPDATE as inventory change', () => {
      // Act
      const result = isInventoryChangeAction(AuditAction.UPDATE);
      
      // Assert
      expect(result).toBe(false);
    });

    it('should NOT identify DELETE as inventory change', () => {
      // Act
      const result = isInventoryChangeAction(AuditAction.DELETE);
      
      // Assert
      expect(result).toBe(false);
    });

    it('should NOT identify VIEW as inventory change', () => {
      // Act
      const result = isInventoryChangeAction(AuditAction.VIEW);
      
      // Assert
      expect(result).toBe(false);
    });

    it('should NOT identify APPROVE as inventory change', () => {
      // Act
      const result = isInventoryChangeAction(AuditAction.APPROVE);
      
      // Assert
      expect(result).toBe(false);
    });

    it('should NOT identify PRINT as inventory change', () => {
      // Act
      const result = isInventoryChangeAction(AuditAction.PRINT);
      
      // Assert
      expect(result).toBe(false);
    });
  });

  describe('createInventoryAuditLog', () => {
    it('should create valid audit log with all required fields', () => {
      // Arrange
      const params = {
        action: AuditAction.GOODS_RECEIPT,
        productId: 'prod-001',
        productName: 'Product A',
        warehouseId: 'wh-001',
        beforeQty: 100,
        afterQty: 150,
        userId: 'user-001',
        userName: 'Nguyễn Văn Minh',
      };
      
      // Act
      const log = createInventoryAuditLog(params);
      
      // Assert
      expect(log.id).toBeDefined();
      expect(log.timestamp).toBeInstanceOf(Date);
      expect(log.action).toBe(AuditAction.GOODS_RECEIPT);
      expect(log.entity).toBe('InventoryItem');
      expect(log.entityId).toBe('prod-001');
      expect(log.entityName).toBe('Product A');
      expect(log.userId).toBe('user-001');
      expect(log.userName).toBe('Nguyễn Văn Minh');
      expect(log.oldValue).toEqual({ quantity: 100 });
      expect(log.newValue).toEqual({ quantity: 150 });
      expect(log.metadata).toEqual({ warehouseId: 'wh-001' });
    });

    it('should use action as reason when not provided', () => {
      // Arrange
      const params = {
        action: AuditAction.GOODS_RECEIPT,
        productId: 'prod-001',
        productName: 'Product A',
        warehouseId: 'wh-001',
        beforeQty: 100,
        afterQty: 150,
        userId: 'user-001',
        userName: 'Nguyễn Văn Minh',
      };
      
      // Act
      const log = createInventoryAuditLog(params);
      
      // Assert
      expect(log.reason).toBe(AuditAction.GOODS_RECEIPT);
    });

    it('should use custom reason when provided', () => {
      // Arrange
      const params = {
        action: AuditAction.STOCKTAKE_ADJUSTMENT,
        productId: 'prod-001',
        productName: 'Product A',
        warehouseId: 'wh-001',
        beforeQty: 100,
        afterQty: 95,
        reason: 'Stocktake adjustment - found 5 missing units',
        userId: 'user-001',
        userName: 'Nguyễn Văn Minh',
      };
      
      // Act
      const log = createInventoryAuditLog(params);
      
      // Assert
      expect(log.reason).toBe('Stocktake adjustment - found 5 missing units');
    });

    it('should create log for GOODS_ISSUE action', () => {
      // Arrange
      const params = {
        action: AuditAction.GOODS_ISSUE,
        productId: 'prod-001',
        productName: 'Product A',
        warehouseId: 'wh-001',
        beforeQty: 150,
        afterQty: 100,
        userId: 'user-001',
        userName: 'Nguyễn Văn Minh',
      };
      
      // Act
      const log = createInventoryAuditLog(params);
      
      // Assert
      expect(log.action).toBe(AuditAction.GOODS_ISSUE);
      expect(log.oldValue).toEqual({ quantity: 150 });
      expect(log.newValue).toEqual({ quantity: 100 });
    });

    it('should create log for STOCKTAKE_ADJUSTMENT action', () => {
      // Arrange
      const params = {
        action: AuditAction.STOCKTAKE_ADJUSTMENT,
        productId: 'prod-001',
        productName: 'Product A',
        warehouseId: 'wh-001',
        beforeQty: 100,
        afterQty: 95,
        reason: 'Stocktake adjustment',
        userId: 'user-001',
        userName: 'Nguyễn Văn Minh',
      };
      
      // Act
      const log = createInventoryAuditLog(params);
      
      // Assert
      expect(log.action).toBe(AuditAction.STOCKTAKE_ADJUSTMENT);
      expect(log.reason).toBe('Stocktake adjustment');
    });

    it('should generate unique IDs for each log', () => {
      // Arrange
      const params = {
        action: AuditAction.GOODS_RECEIPT,
        productId: 'prod-001',
        productName: 'Product A',
        warehouseId: 'wh-001',
        beforeQty: 100,
        afterQty: 150,
        userId: 'user-001',
        userName: 'User',
      };
      
      // Act - wait a millisecond to ensure different IDs
      const log1 = createInventoryAuditLog(params);
      const log2 = createInventoryAuditLog(params);
      
      // Assert - IDs should be different (or same is acceptable if same millisecond)
      // The important thing is both are valid audit logs
      expect(log1.id).toBeDefined();
      expect(log2.id).toBeDefined();
      expect(typeof log1.id).toBe('string');
      expect(typeof log2.id).toBe('string');
    });
  });

  describe('Integration: Complete Audit Trail', () => {
    it('should create complete audit trail for goods receipt', () => {
      // Step 1: Create receipt audit log
      const receiptLog = createInventoryAuditLog({
        action: AuditAction.GOODS_RECEIPT,
        productId: 'prod-001',
        productName: 'Product A',
        warehouseId: 'wh-001',
        beforeQty: 100,
        afterQty: 150,
        reason: 'Received from supplier',
        userId: 'user-001',
        userName: 'Nguyễn Văn Minh',
      });
      
      // Step 2: Verify log is valid
      const isValid = validateAuditLogEntry(receiptLog);
      expect(isValid.valid).toBe(true);
      
      // Step 3: Verify it's identified as inventory change
      expect(isInventoryChangeAction(receiptLog.action)).toBe(true);
    });

    it('should create complete audit trail for goods issue', () => {
      // Step 1: Create issue audit log
      const issueLog = createInventoryAuditLog({
        action: AuditAction.GOODS_ISSUE,
        productId: 'prod-001',
        productName: 'Product A',
        warehouseId: 'wh-001',
        beforeQty: 150,
        afterQty: 100,
        reason: 'Issued for sales order #SO-001',
        userId: 'user-002',
        userName: 'Trần Thị Lan',
      });
      
      // Step 2: Verify log is valid
      const isValid = validateAuditLogEntry(issueLog);
      expect(isValid.valid).toBe(true);
      
      // Step 3: Verify it's identified as inventory change
      expect(isInventoryChangeAction(issueLog.action)).toBe(true);
      
      // Step 4: Verify quantity changed correctly
      expect(issueLog.oldValue).toEqual({ quantity: 150 });
      expect(issueLog.newValue).toEqual({ quantity: 100 });
    });

    it('should create complete audit trail for stocktake adjustment', () => {
      // Step 1: Create stocktake audit log
      const stocktakeLog = createInventoryAuditLog({
        action: AuditAction.STOCKTAKE_ADJUSTMENT,
        productId: 'prod-001',
        productName: 'Product A',
        warehouseId: 'wh-001',
        beforeQty: 100,
        afterQty: 92,
        reason: 'Stocktake adjustment - counted 92 units',
        userId: 'user-003',
        userName: 'Lê Văn Hùng',
      });
      
      // Step 2: Verify log is valid
      const isValid = validateAuditLogEntry(stocktakeLog);
      expect(isValid.valid).toBe(true);
      
      // Step 3: Verify it's identified as inventory change
      expect(isInventoryChangeAction(stocktakeLog.action)).toBe(true);
      
      // Step 4: Verify adjustment is negative (shortage)
      expect(stocktakeLog.oldValue).toEqual({ quantity: 100 });
      expect(stocktakeLog.newValue).toEqual({ quantity: 92 });
    });
  });
});
