/**
 * Business Logic - Pure Functions for Warehouse Management
 * Tách logic nghiệp vụ thành các pure functions để dễ test
 */

import {
  InventoryItem,
  Product,
  PurchaseOrder,
  StocktakeDiscrepancy,
  AuditLog,
  AuditAction,
  InventoryAlert,
  AlertSeverity,
  PurchaseOrderStatus,
} from './types';

// ============================================
// INVENTORY BUSINESS LOGIC
// ============================================

export interface InventoryCalculation {
  quantityAvailable: number;
  quantityTotal: number;
  quantityReserved: number;
  quantityQuarantine: number;
  quantityDamaged: number;
}

/**
 * Rule 1.1: calculateAvailable
 * available = total - reserved - quarantine - damaged (không được âm)
 */
export function calculateAvailable(item: InventoryItem): number {
  const available = 
    item.quantityTotal - 
    item.quantityReserved - 
    item.quantityQuarantine - 
    item.quantityDamaged;
  
  return Math.max(0, available);
}

/**
 * Rule 1.2: getStockStatus
 * Kiểm tra tồn kho và trả về status
 */
export function getStockStatus(
  availableQuantity: number, 
  reorderPoint: number
): 'OK' | 'WARNING' | 'CRITICAL' {
  if (availableQuantity === 0) return 'CRITICAL';
  if (availableQuantity <= reorderPoint) return 'WARNING';
  return 'OK';
}

/**
 * Rule 1.3: isQuarantineItemIssuable
 * Hàng QUARANTINE không được xuất
 */
export function isQuarantineItemIssuable(
  item: InventoryItem,
  requestedQuantity: number
): { issuable: boolean; reason?: string } {
  // Kiểm tra nếu có hàng đang quarantine
  if (item.quantityQuarantine > 0) {
    // Tính số lượng có thể xuất (không tính quarantine)
    const nonQuarantineQty = 
      item.quantityTotal - 
      item.quantityQuarantine - 
      item.quantityReserved - 
      item.quantityDamaged;
    
    if (requestedQuantity > nonQuarantineQty) {
      return {
        issuable: false,
        reason: `Sản phẩm có ${item.quantityQuarantine} đơn vị đang trong trạng thái QUARANTINE, không thể xuất kho`
      };
    }
  }
  
  return { issuable: true };
}

/**
 * Check if item has QUARANTINE status based on quantity
 */
export function isInQuarantine(item: InventoryItem): boolean {
  return item.quantityQuarantine > 0;
}

// ============================================
// GOODS RECEIPT BUSINESS LOGIC (FEFO)
// ============================================

export interface LotWithExpiry {
  lotNumber: string;
  expiryDate?: Date;
  quantity: number;
  receivedDate?: Date;
}

/**
 * Rule 2.1: sortByFEFO - Sắp xếp lô theo FEFO
 * Lô có expiryDate sớm hơn phải được sắp xếp trước (first in list)
 * Hàng không có expiryDate → xếp cuối
 */
export function sortByFEFO(lots: LotWithExpiry[]): LotWithExpiry[] {
  return [...lots].sort((a, b) => {
    // Không có expiryDate → xếp cuối
    if (!a.expiryDate && !b.expiryDate) return 0;
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    
    // Sắp xếp theo expiryDate tăng dần (hết hạn trước lên đầu)
    return a.expiryDate.getTime() - b.expiryDate.getTime();
  });
}

/**
 * Rule 2.2: Nhập kho cập nhật tồn đúng
 * Sau khi nhập: product.total += qty nhập
 */
export function calculateNewInventoryAfterReceipt(
  item: InventoryItem,
  receivedQuantity: number,
  acceptedQuantity: number,
  quarantineQuantity: number = 0
): InventoryCalculation {
  const newQuantityTotal = item.quantityTotal + acceptedQuantity;
  const newQuantityQuarantine = item.quantityQuarantine + quarantineQuantity;
  
  // Available không tính quarantine
  const newQuantityAvailable = 
    Math.max(0, newQuantityTotal - newQuantityQuarantine) - 
    item.quantityReserved - 
    item.quantityDamaged;
  
  return {
    quantityTotal: newQuantityTotal,
    quantityAvailable: Math.max(0, newQuantityAvailable),
    quantityReserved: item.quantityReserved,
    quantityQuarantine: newQuantityQuarantine,
    quantityDamaged: item.quantityDamaged,
  };
}

/**
 * Rule 2.3: Serial number validation
 * Kiểm tra serial numbers không trùng lặp
 */
export function validateSerialNumbers(
  serialNumbers: string[],
  expectedQuantity: number
): { valid: boolean; error?: string } {
  if (serialNumbers.length !== expectedQuantity) {
    return {
      valid: false,
      error: `Số lượng serial numbers (${serialNumbers.length}) không khớp với số lượng sản phẩm (${expectedQuantity})`
    };
  }
  
  // Kiểm tra trùng lặp
  const uniqueSerials = new Set(serialNumbers);
  if (uniqueSerials.size !== serialNumbers.length) {
    const duplicates = serialNumbers.filter(
      (serial, index) => serialNumbers.indexOf(serial) !== index
    );
    return {
      valid: false,
      error: `Trùng serial number: ${[...new Set(duplicates)].join(', ')}`
    };
  }
  
  return { valid: true };
}

// ============================================
// GOODS ISSUE BUSINESS LOGIC
// ============================================

export interface PickingListValidation {
  valid: boolean;
  errors: string[];
  insufficientItems: Array<{
    productId: string;
    productName: string;
    requested: number;
    available: number;
  }>;
}

/**
 * Rule 3.1: getFEFOIssueOrder - Lấy danh sách lô cần xuất theo FEFO
 * Phải xuất lô gần hết hạn nhất trước
 */
export function getFEFOIssueOrder(
  lots: LotWithExpiry[],
  requiredQuantity: number
): { lots: LotWithExpiry[]; fulfilled: boolean } {
  const sortedLots = sortByFEFO(lots);
  const result: LotWithExpiry[] = [];
  let remaining = requiredQuantity;
  
  for (const lot of sortedLots) {
    if (remaining <= 0) break;
    
    const toIssue = Math.min(lot.quantity, remaining);
    result.push({
      ...lot,
      quantity: toIssue,
    });
    remaining -= toIssue;
  }
  
  return {
    lots: result,
    fulfilled: remaining === 0,
  };
}

/**
 * Rule 3.2: Kiểm tra có thể xuất kho không
 * Không xuất quá available
 */
export function canIssue(
  item: InventoryItem,
  requestedQuantity: number
): { canIssue: boolean; reason?: string } {
  const available = calculateAvailable(item);
  
  if (requestedQuantity <= 0) {
    return {
      canIssue: false,
      reason: 'Số lượng yêu cầu phải lớn hơn 0'
    };
  }
  
  if (requestedQuantity > available) {
    return {
      canIssue: false,
      reason: `Không đủ hàng trong kho. Available: ${available}, Yêu cầu: ${requestedQuantity}`
    };
  }
  
  // Kiểm tra quarantine
  const quarantineCheck = isQuarantineItemIssuable(item, requestedQuantity);
  if (!quarantineCheck.issuable) {
    return {
      canIssue: false,
      reason: quarantineCheck.reason
    };
  }
  
  return { canIssue: true };
}

/**
 * Rule 3.3: Picking list validation
 * Kiểm tra picking list có thể fulfilled không dựa trên tồn kho thực tế
 * QUY TẮC: Hàng đang QUARANTINE không được xuất kho
 */
export function validatePickingList(
  pickingItems: Array<{
    productId: string;
    productName: string;
    quantity: number;
  }>,
  inventoryItems: Array<{
    productId: string;
    quantityAvailable: number; // Đã trừ quarantine, reserved, damaged
    quantityQuarantine: number; // Số lượng đang bị quarantine
    quantityTotal: number; // Tổng số lượng trong kho
  }>
): PickingListValidation {
  const errors: string[] = [];
  const insufficientItems: PickingListValidation['insufficientItems'] = [];

  for (const pickItem of pickingItems) {
    const invItem = inventoryItems.find(i => i.productId === pickItem.productId);

    if (!invItem) {
      errors.push(`Sản phẩm "${pickItem.productName}" không có trong kho`);
      continue;
    }

    // FIX: quantityAvailable đã được tính đúng (total - reserved - quarantine - damaged)
    // Không cần trừ quarantine nữa vì đã được tính sẵn trong quantityAvailable
    // Nhưng cần kiểm tra xem có đủ hàng không quarantine để xuất không

    // Số lượng có thể xuất = tổng - quarantine (vì reserved và damaged đã trừ trong available)
    const availableForIssue = Math.max(0, invItem.quantityAvailable);

    // Kiểm tra nếu số lượng yêu cầu lớn hơn số có thể xuất
    if (pickItem.quantity > availableForIssue) {
      insufficientItems.push({
        productId: pickItem.productId,
        productName: pickItem.productName,
        requested: pickItem.quantity,
        available: availableForIssue,
      });
      errors.push(
        `Sản phẩm "${pickItem.productName}": yêu cầu ${pickItem.quantity}, ` +
        `khả dụng ${availableForIssue}`
      );
    }

    // Cảnh báo nếu sản phẩm có hàng đang quarantine
    if (invItem.quantityQuarantine > 0) {
      errors.push(
        `Cảnh báo: "${pickItem.productName}" có ${invItem.quantityQuarantine} đơn vị đang QUARANTINE, không thể xuất`
      );
    }
  }

  return {
    valid: errors.filter(e => !e.includes('Cảnh báo')).length === 0, // Chỉ cảnh báo không làm invalid
    errors,
    insufficientItems,
  };
}

/**
 * Tính tồn kho sau khi xuất
 */
export function calculateNewInventoryAfterIssue(
  item: InventoryItem,
  issuedQuantity: number
): InventoryCalculation {
  const newQuantityTotal = Math.max(0, item.quantityTotal - issuedQuantity);
  
  return {
    quantityTotal: newQuantityTotal,
    quantityAvailable: Math.max(0, calculateAvailable(item) - issuedQuantity),
    quantityReserved: item.quantityReserved,
    quantityQuarantine: item.quantityQuarantine,
    quantityDamaged: item.quantityDamaged,
  };
}

// ============================================
// PURCHASE ORDER BUSINESS LOGIC
// ============================================

export enum ApprovalLevel {
  WAREHOUSE_MANAGER = 'Quản lý kho',
  DEPARTMENT_HEAD = 'Trưởng phòng',
  DIRECTOR = 'Giám đốc',
}

/**
 * Rule 4.1: Xác định cấp phê duyệt theo giá trị PO
 * totalAmount < 10,000,000 → WAREHOUSE_MANAGER
 * totalAmount >= 10,000,000 && <= 50,000,000 → DEPARTMENT_HEAD
 * totalAmount > 50,000,000 → DIRECTOR
 */
export function getRequiredApprover(totalAmount: number): ApprovalLevel {
  if (totalAmount < 10000000) return ApprovalLevel.WAREHOUSE_MANAGER;
  if (totalAmount <= 50000000) return ApprovalLevel.DEPARTMENT_HEAD;
  return ApprovalLevel.DIRECTOR;
}

/**
 * Rule 4.2: Kiểm tra PO status flow có hợp lệ không
 */
export function isValidStatusTransition(
  currentStatus: PurchaseOrderStatus,
  newStatus: PurchaseOrderStatus
): boolean {
  const validTransitions: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
    [PurchaseOrderStatus.DRAFT]: [
      PurchaseOrderStatus.PENDING_APPROVAL,
      PurchaseOrderStatus.CANCELLED,
    ],
    [PurchaseOrderStatus.PENDING_APPROVAL]: [
      PurchaseOrderStatus.APPROVED,
      PurchaseOrderStatus.CANCELLED,
    ],
    [PurchaseOrderStatus.APPROVED]: [
      PurchaseOrderStatus.SENT,
      PurchaseOrderStatus.CANCELLED,
    ],
    [PurchaseOrderStatus.SENT]: [
      PurchaseOrderStatus.CONFIRMED,
      PurchaseOrderStatus.CANCELLED,
    ],
    [PurchaseOrderStatus.CONFIRMED]: [
      PurchaseOrderStatus.PARTIALLY_RECEIVED,
      PurchaseOrderStatus.FULLY_RECEIVED,
      PurchaseOrderStatus.CLOSED,
    ],
    [PurchaseOrderStatus.PARTIALLY_RECEIVED]: [
      PurchaseOrderStatus.FULLY_RECEIVED,
      PurchaseOrderStatus.CLOSED,
    ],
    [PurchaseOrderStatus.FULLY_RECEIVED]: [
      PurchaseOrderStatus.CLOSED,
    ],
    [PurchaseOrderStatus.CLOSED]: [], // Terminal state
    [PurchaseOrderStatus.CANCELLED]: [], // Terminal state
  };
  
  return validTransitions[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Rule 4.3: Kiểm tra PO có thể cancel không
 */
export function canCancelPurchaseOrder(
  currentStatus: PurchaseOrderStatus
): { canCancel: boolean; reason?: string } {
  const cancelableStatuses: PurchaseOrderStatus[] = [
    PurchaseOrderStatus.DRAFT,
    PurchaseOrderStatus.PENDING_APPROVAL,
  ];
  
  if (!cancelableStatuses.includes(currentStatus)) {
    return {
      canCancel: false,
      reason: `Không thể hủy PO ở trạng thái "${currentStatus}". Chỉ hủy được khi ở trạng thái DRAFT hoặc PENDING_APPROVAL`
    };
  }
  
  return { canCancel: true };
}

/**
 * Validate PO có hợp lệ không
 * Kiểm tra tất cả required fields và business rules
 */
export function validatePurchaseOrder(po: PurchaseOrder): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // === REQUIRED FIELDS VALIDATION ===

  // orderNumber: Bắt buộc, phải có giá trị
  if (!po.orderNumber || po.orderNumber.trim() === '') {
    errors.push('Số PO không được để trống');
  } else if (po.orderNumber.length < 3) {
    errors.push('Số PO phải có ít nhất 3 ký tự');
  }

  // supplierId: Bắt buộc
  if (!po.supplierId) {
    errors.push('PO phải có nhà cung cấp');
  }

  // supplierName: Nên có (warning nếu không có)
  if (!po.supplierName || po.supplierName.trim() === '') {
    warnings.push('Tên nhà cung cấp không được cung cấp');
  }

  // createdBy: Bắt buộc (ai tạo PO)
  if (!po.createdBy || po.createdBy.trim() === '') {
    errors.push('PO phải có người tạo');
  }

  // orderDate: Bắt buộc và phải là ngày hợp lệ
  if (!po.orderDate) {
    errors.push('Ngày đặt hàng không được để trống');
  } else {
    const orderDate = new Date(po.orderDate);
    if (isNaN(orderDate.getTime())) {
      errors.push('Ngày đặt hàng không hợp lệ');
    } else if (orderDate > new Date()) {
      // Cho phép đặt hàng trước ngày hiện tại, nhưng không quá 1 năm
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      if (orderDate < oneYearAgo) {
        warnings.push('Ngày đặt hàng quá cũ (hơn 1 năm)');
      }
    }
  }

  // === ITEMS VALIDATION ===

  if (!po.items || po.items.length === 0) {
    errors.push('PO phải có ít nhất một sản phẩm');
  } else {
    // Kiểm tra từng item
    po.items.forEach((item, index) => {
      if (!item.productId) {
        errors.push(`Item #${index + 1}: Thiếu product ID`);
      }
      if (!item.productName || item.productName.trim() === '') {
        errors.push(`Item #${index + 1}: Tên sản phẩm không được để trống`);
      }
      if (item.quantity <= 0) {
        errors.push(`Item #${index + 1}: Số lượng phải lớn hơn 0`);
      }
      if (item.unitPrice < 0) {
        errors.push(`Item #${index + 1}: Đơn giá không được âm`);
      }
      if (item.unitPrice === 0) {
        warnings.push(`Item #${index + 1}: Đơn giá bằng 0`);
      }
    });

    // Kiểm tra trùng lặp sản phẩm
    const productIds = po.items.map(item => item.productId).filter(Boolean);
    const duplicates = productIds.filter((id, idx) => productIds.indexOf(id) !== idx);
    if (duplicates.length > 0) {
      errors.push(`Có sản phẩm trùng lặp trong danh sách: ${[...new Set(duplicates)].join(', ')}`);
    }
  }

  // === VALUE VALIDATION ===

  if (po.totalValue < 0) {
    errors.push('Giá trị PO không được âm');
  }

  if (po.totalValue === 0 && (po.items?.length ?? 0) > 0) {
    warnings.push('PO có sản phẩm nhưng giá trị bằng 0');
  }

  // Kiểm tra tổng giá trị tính đúng chưa
  const calculatedSubtotal = po.items?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) ?? 0;
  const calculatedTotal = calculatedSubtotal + (po.taxAmount ?? 0) - (po.discountAmount ?? 0);

  if (Math.abs(po.totalValue - calculatedTotal) > 0.01) {
    warnings.push(
      `Tổng giá trị (${po.totalValue}) không khớp với tính toán (${calculatedTotal.toFixed(2)})`
    );
  }

  // === APPROVAL THRESHOLDS ===
  if (po.totalValue > 50000000) {
    warnings.push(`Giá trị PO (${po.totalValue.toLocaleString('vi-VN')}) vượt quá 50 triệu, cần phê duyệt cấp cao hơn`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================
// STOCKTAKE BUSINESS LOGIC
// ============================================

export interface DeviationCalculation {
  deviation: number;
  deviationPercent: number;
  systemQty: number;
  actualQty: number;
}

/**
 * Rule 5.1: Tính deviation (chênh lệch)
 */
export function calculateDeviation(
  systemQty: number,
  actualQty: number
): DeviationCalculation {
  const deviation = actualQty - systemQty;
  
  // Tránh chia cho 0
  let deviationPercent = 0;
  if (systemQty === 0) {
    deviationPercent = actualQty > 0 ? 100 : 0;
  } else {
    deviationPercent = (deviation / systemQty) * 100;
  }
  
  return {
    deviation,
    deviationPercent: Math.round(deviationPercent * 100) / 100, // Round to 2 decimals
    systemQty,
    actualQty,
  };
}

/**
 * Rule 5.2: Kiểm tra deviation có cần phê duyệt không
 */
export function needsApproval(deviationPercent: number, threshold: number = 5): boolean {
  return Math.abs(deviationPercent) > threshold;
}

/**
 * Rule 5.3: Áp dụng điều chỉnh sau kiểm kê
 */
export function applyStocktakeAdjustment(
  item: InventoryItem,
  discrepancy: StocktakeDiscrepancy
): InventoryCalculation {
  const newQuantityTotal = Math.max(0, item.quantityTotal + discrepancy.difference);
  
  return {
    quantityTotal: newQuantityTotal,
    quantityAvailable: Math.max(0, calculateAvailable(item) + discrepancy.difference),
    quantityReserved: item.quantityReserved,
    quantityQuarantine: item.quantityQuarantine,
    quantityDamaged: item.quantityDamaged,
  };
}

// ============================================
// AUDIT LOG BUSINESS LOGIC
// ============================================

/**
 * Rule 6.1: Validate audit log entry
 */
export function validateAuditLogEntry(log: Partial<AuditLog>): {
  valid: boolean;
  missingFields: string[];
} {
  const requiredFields: (keyof AuditLog)[] = [
    'timestamp',
    'userId',
    'action',
    'entity',
    'entityId',
  ];
  
  const missingFields = requiredFields.filter(
    field => log[field] === undefined || log[field] === null
  );
  
  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Kiểm tra action có phải là thay đổi tồn kho không
 */
export function isInventoryChangeAction(action: AuditAction): boolean {
  const inventoryActions: AuditAction[] = [
    AuditAction.GOODS_RECEIPT,
    AuditAction.GOODS_ISSUE,
    AuditAction.STOCKTAKE_ADJUSTMENT,
    AuditAction.INVENTORY_UPDATE,
    AuditAction.QUARANTINE,
    AuditAction.RELEASE_QUARANTINE,
  ];
  
  return inventoryActions.includes(action);
}

/**
 * Tạo audit log entry cho thay đổi tồn kho
 */
export function createInventoryAuditLog(params: {
  action: AuditAction;
  productId: string;
  productName: string;
  warehouseId: string;
  beforeQty: number;
  afterQty: number;
  reason?: string;
  userId: string;
  userName: string;
}): AuditLog {
  return {
    id: `audit-${Date.now()}`,
    timestamp: new Date(),
    action: params.action,
    entity: 'InventoryItem',
    entityId: params.productId,
    entityName: params.productName,
    userId: params.userId,
    userName: params.userName,
    oldValue: { quantity: params.beforeQty },
    newValue: { quantity: params.afterQty },
    reason: params.reason || params.action,
    metadata: {
      warehouseId: params.warehouseId,
    },
  };
}

// ============================================
// ALERT BUSINESS LOGIC
// ============================================

/**
 * Rule 7.1 & 7.2: Generate alerts từ inventory
 */
export function generateAlerts(
  products: Array<{
    id: string;
    name: string;
    sku: string;
    reorderPoint: number;
  }>,
  inventoryQuantities: Map<string, number>
): InventoryAlert[] {
  const alerts: InventoryAlert[] = [];
  
  for (const product of products) {
    const availableQty = inventoryQuantities.get(product.id) ?? 0;
    
    // Rule 7.1: Kiểm tra alert conditions
    if (availableQty <= product.reorderPoint) {
      const severity: AlertSeverity = 
        availableQty === 0 ? AlertSeverity.CRITICAL : AlertSeverity.WARNING;
      
      alerts.push({
        id: `alert-${product.id}-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        warehouseId: '', // Sẽ được điền khi sử dụng thực tế
        alertType: 'low_stock',
        severity,
        currentQuantity: availableQty,
        reorderPoint: product.reorderPoint,
        isRead: false,
        createdAt: new Date(),
        resolvedAt: undefined,
      });
    }
  }
  
  return alerts;
}

/**
 * Deduplicate alerts - lấy severity cao nhất cho mỗi product
 */
export function deduplicateAlerts(alerts: InventoryAlert[]): InventoryAlert[] {
  const alertMap = new Map<string, InventoryAlert>();
  
  for (const alert of alerts) {
    const existing = alertMap.get(alert.productId);
    
    if (!existing) {
      alertMap.set(alert.productId, alert);
    } else {
      // Lấy alert có severity cao hơn
      const severityOrder: Record<AlertSeverity, number> = {
        [AlertSeverity.CRITICAL]: 3,
        [AlertSeverity.WARNING]: 2,
        [AlertSeverity.INFO]: 1,
      };
      
      if (
        severityOrder[alert.severity] > severityOrder[existing.severity]
      ) {
        alertMap.set(alert.productId, alert);
      }
    }
  }
  
  return Array.from(alertMap.values());
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format số tiền VND
 */
export function formatCurrencyVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Parse string thành số, trả về default nếu invalid
 */
export function parseNumber(value: string | number, defaultValue: number = 0): number {
  if (typeof value === 'number') return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}
