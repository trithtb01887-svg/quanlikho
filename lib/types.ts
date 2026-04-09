// ============================================
// ENUMS
// ============================================

export enum ProductCategory {
  ELECTRONICS = "electronics",
  FURNITURE = "furniture",
  OFFICE_SUPPLIES = "office_supplies",
  TOOLS = "tools",
  PACKAGING = "packaging",
  RAW_MATERIALS = "raw_materials",
  OTHER = "other",
}

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  badge?: string | number;
}

export enum UnitOfMeasure {
  PIECE = "piece",
  KG = "kg",
  GRAM = "gram",
  LITER = "liter",
  METER = "meter",
  ROLL = "roll",
  BOX = "box",
  PALLET = "pallet",
  SET = "set",
}

export enum StockStatus {
  IN_STOCK = "in_stock",
  LOW_STOCK = "low_stock",
  OUT_OF_STOCK = "out_of_stock",
  OVERSTOCKED = "overstocked",
}

export enum WarehouseType {
  MAIN = "main",
  SATELLITE = "satellite",
  DISTRIBUTION = "distribution",
  COLD_STORAGE = "cold_storage",
  BONDED = "bonded",
}

export enum SupplierStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  PENDING = "pending",
  BLACKLISTED = "blacklisted",
}

export enum SupplierRating {
  EXCELLENT = 5,
  VERY_GOOD = 4,
  GOOD = 3,
  AVERAGE = 2,
  POOR = 1,
}

export enum PurchaseOrderStatus {
  DRAFT = "draft",
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  SENT = "sent",
  CONFIRMED = "confirmed",
  PARTIALLY_RECEIVED = "partially_received",
  FULLY_RECEIVED = "fully_received",
  CLOSED = "closed",
  CANCELLED = "cancelled",
}

export enum GoodsReceiptStatus {
  DRAFT = "draft",
  PENDING = "pending",
  CONFIRMED = "confirmed",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum GoodsIssueStatus {
  DRAFT = "draft",
  PENDING = "pending",
  CONFIRMED = "confirmed",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum GoodsIssueReason {
  SALES = "sales",
  PRODUCTION = "production",
  TRANSFER = "transfer",
  SAMPLE = "sample",
  DAMAGE = "damage",
  EXPIRY = "expiry",
  ADJUSTMENT = "adjustment",
  RETURN = "return",
}

export enum StocktakeType {
  FULL = "full",
  CYCLE = "cycle",
  SPOT = "spot",
}

export enum StocktakeStatus {
  DRAFT = "draft",
  IN_PROGRESS = "in_progress",
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum AuditAction {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  VIEW = "view",
  APPROVE = "approve",
  REJECT = "reject",
  COMPLETE = "complete",
  SEND = "send",
  IMPORT = "import",
  EXPORT = "export",
  PRINT = "print",
  ADJUST = "adjust",
  // Inventory specific actions
  GOODS_RECEIPT = "goods_receipt",
  GOODS_ISSUE = "goods_issue",
  STOCKTAKE_ADJUSTMENT = "stocktake_adjustment",
  INVENTORY_UPDATE = "inventory_update",
  QUARANTINE = "quarantine",
  RELEASE_QUARANTINE = "release_quarantine",
}

export enum UserRole {
  ADMIN = "admin",
  WAREHOUSE_MANAGER = "warehouse_manager",
  WAREHOUSE_STAFF = "warehouse_staff",
  PURCHASER = "purchaser",
  ACCOUNTANT = "accountant",
  AUDITOR = "auditor",
  VIEWER = "viewer",
}

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
}

// ============================================
// PRODUCT
// ============================================

export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  category: ProductCategory;
  unit: UnitOfMeasure;
  reorderPoint: number;
  maxStock?: number;
  costPrice: number;
  sellingPrice?: number;
  imageUrl?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// ============================================
// WAREHOUSE
// ============================================

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string;
  city?: string;
  district?: string;
  phone?: string;
  email?: string;
  type: WarehouseType;
  capacity?: number;
  isActive: boolean;
  managerId?: string;
  managerName?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// INVENTORY ITEM
// ============================================

export interface InventoryLocation {
  zone?: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  bin?: string;
}

export interface InventoryItem {
  id: string;
  productId: string;
  product?: Product;
  warehouseId: string;
  warehouse?: Warehouse;
  location: InventoryLocation;
  lotNumber?: string;
  expiryDate?: Date;
  manufacturingDate?: Date;
  quantityTotal: number;
  quantityAvailable: number;
  quantityReserved: number;
  quantityQuarantine: number;
  quantityDamaged: number;
  lastStocktakeDate?: Date;
  lastReceiptDate?: Date;
  lastIssueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// SUPPLIER
// ============================================

export interface SupplierContact {
  name: string;
  position?: string;
  phone?: string;
  email?: string;
  isPrimary: boolean;
}

export interface SupplierBankAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
  branch?: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  shortName?: string;
  address: string;
  city?: string;
  district?: string;
  phone?: string;
  email?: string;
  website?: string;
  taxCode?: string;
  contacts: SupplierContact[];
  bankAccounts?: SupplierBankAccount[];
  rating?: SupplierRating;
  paymentTerms?: string;
  leadTimeDays?: number;
  minimumOrderValue?: number;
  status: SupplierStatus;
  notes?: string;
  totalOrders?: number;
  totalValue?: number;
  lastOrderDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// PURCHASE ORDER
// ============================================

export enum DeliveryStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  COMPLETE = 'complete',
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export interface InventoryAlert {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  warehouseId: string;
  alertType: 'low_stock' | 'expiry' | 'damaged' | 'quarantine';
  severity: AlertSeverity;
  currentQuantity: number;
  reorderPoint: number;
  isRead: boolean;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface PurchaseOrderItem {
  id: string;
  productId: string;
  product?: Product;
  productSku: string;
  productName: string;
  unit: UnitOfMeasure;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  orderedQuantity: number;
  receivedQuantity: number;
  pendingQuantity: number;
  deliveryStatus?: DeliveryStatus;
  expectedDeliveryDate?: Date;
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplier?: Supplier;
  supplierName: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalValue: number;
  currency?: string;
  status: PurchaseOrderStatus;
  orderDate: Date;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  shippingAddress?: string;
  notes?: string;
  internalNotes?: string;
  attachmentUrls?: string[];
  createdBy: string;
  createdByName?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: Date;
  cancelledBy?: string;
  cancelledReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// GOODS RECEIPT
// ============================================

export interface GoodsReceiptItem {
  id: string;
  productId: string;
  product?: Product;
  productSku: string;
  productName: string;
  unit: UnitOfMeasure;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  poItemId?: string;
  lotNumber?: string;
  expiryDate?: Date;
  manufacturingDate?: Date;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  quarantineQuantity: number;
  serialNumbers?: string[];
  warehouseId: string;
  warehouse?: Warehouse;
  location: InventoryLocation;
  notes?: string;
}

export interface GoodsReceipt {
  id: string;
  receiptNumber: string;
  grnNumber?: string;
  referenceType?: "po" | "return" | "transfer" | "adjustment";
  referenceId?: string;
  referenceNumber?: string;
  supplierId?: string;
  supplier?: Supplier;
  supplierName?: string;
  items: GoodsReceiptItem[];
  subtotal: number;
  taxAmount: number;
  totalValue: number;
  status: GoodsReceiptStatus;
  receiptDate: Date;
  receivedBy: string;
  receivedByName?: string;
  inspectedBy?: string;
  inspectedByName?: string;
  inspectedAt?: Date;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: Date;
  warehouseId: string;
  warehouse?: Warehouse;
  notes?: string;
  attachmentUrls?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// GOODS ISSUE
// ============================================

export interface GoodsIssueItem {
  id: string;
  productId: string;
  product?: Product;
  productSku: string;
  productName: string;
  unit: UnitOfMeasure;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  serialNumbers?: string[];
  warehouseId: string;
  warehouse?: Warehouse;
  location: InventoryLocation;
  lotNumber?: string;
  notes?: string;
}

export interface GoodsIssue {
  id: string;
  issueNumber: string;
  ginNumber?: string;
  reason: GoodsIssueReason;
  referenceType?: "sales" | "production" | "transfer" | "sample" | "other";
  referenceId?: string;
  referenceNumber?: string;
  customerName?: string;
  customerCode?: string;
  items: GoodsIssueItem[];
  subtotal: number;
  totalValue: number;
  status: GoodsIssueStatus;
  issueDate: Date;
  requiredDate?: Date;
  issuedBy: string;
  issuedByName?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: Date;
  warehouseId: string;
  warehouse?: Warehouse;
  destinationWarehouseId?: string;
  destinationWarehouse?: Warehouse;
  notes?: string;
  attachmentUrls?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// STOCKTAKE SESSION
// ============================================

export interface StocktakeDiscrepancy {
  id: string;
  productId: string;
  product?: Product;
  productSku: string;
  productName: string;
  unit: UnitOfMeasure;
  warehouseId: string;
  warehouse?: Warehouse;
  location: InventoryLocation;
  systemQuantity: number;
  countedQuantity: number;
  difference: number;
  variancePercentage: number;
  lotNumber?: string;
  expiryDate?: Date;
  reason?: string;
  adjustmentStatus?: "pending" | "approved" | "rejected";
  adjustedBy?: string;
  adjustedAt?: Date;
  notes?: string;
}

export interface StocktakeSession {
  id: string;
  stocktakeNumber: string;
  sessionNumber?: string; // Alias for stocktakeNumber for backward compatibility
  type: StocktakeType;
  name?: string;
  description?: string;
  warehouseId: string;
  warehouse?: Warehouse;
  area?: string;
  zones?: string[];
  status: StocktakeStatus;
  scheduledDate: Date;
  startedDate?: Date;
  completedDate?: Date;
  assignedTo: string;
  assignedToName?: string;
  counters?: { userId: string; userName: string }[];
  discrepancies: StocktakeDiscrepancy[];
  totalProducts: number;
  countedProducts: number;
  totalDiscrepancies: number;
  positiveVariance: number;
  negativeVariance: number;
  netVariance: number;
  adjustmentValue?: number;
  notes?: string;
  createdBy: string;
  createdByName?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// AUDIT LOG
// ============================================

export interface AuditLog {
  id: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  entityName?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userRole?: UserRole;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  changes?: { field: string; oldValue: unknown; newValue: unknown }[];
  reason?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// USER
// ============================================

export interface UserPermissions {
  canManageProducts: boolean;
  canManageInventory: boolean;
  canViewInventory: boolean;
  canCreateInventoryAdjustments: boolean;
  canManagePurchaseOrders: boolean;
  canViewPurchaseOrders: boolean;
  canManageGoodsReceipt: boolean;
  canViewGoodsReceipt: boolean;
  canCreateGoodsReceipt: boolean;
  canApproveGoodsReceipt: boolean;
  canManageGoodsIssue: boolean;
  canViewGoodsIssue: boolean;
  canCreateGoodsIssue: boolean;
  canApproveGoodsIssue: boolean;
  canManageStocktake: boolean;
  canManageSuppliers: boolean;
  canViewReports: boolean;
  canExportData: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canApproveTransactions: boolean;
}

export interface User {
  id: string;
  employeeId?: string;
  username: string;
  email: string;
  passwordHash?: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
  role: UserRole;
  permissions?: UserPermissions;
  warehouseIds?: string[];
  defaultWarehouseId?: string;
  isActive: boolean;
  status: UserStatus;
  lastLoginDate?: Date;
  lastLoginIp?: string;
  failedLoginAttempts?: number;
  lockedUntil?: Date;
  passwordChangedAt?: Date;
  mustChangePassword?: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

// ============================================
// ADDITIONAL TYPES
// ============================================

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface FilterParams {
  search?: string;
  category?: ProductCategory;
  status?: string;
  warehouseId?: string;
  supplierId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface DashboardKPI {
  totalProducts: number;
  totalProductValue: number;
  totalInventoryItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  pendingReceipts: number;
  pendingIssues: number;
  pendingOrders: number;
  todayReceipts: number;
  todayIssues: number;
  weekReceipts: number;
  weekIssues: number;
  monthReceiptValue: number;
  monthIssueValue: number;
}

export interface InventoryReport {
  productId: string;
  productSku: string;
  productName: string;
  category: ProductCategory;
  warehouseId: string;
  warehouseName: string;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  quarantineQuantity: number;
  unitValue: number;
  totalValue: number;
  lastReceiptDate?: Date;
  lastIssueDate?: Date;
  daysInStock?: number;
}

export interface StockMovement {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  type: "receipt" | "issue" | "adjustment" | "transfer";
  referenceType: string;
  referenceId: string;
  referenceNumber: string;
  quantity: number;
  balanceAfter: number;
  unitPrice: number;
  totalValue: number;
  reason?: string;
  performedBy: string;
  performedByName?: string;
  timestamp: Date;
}
