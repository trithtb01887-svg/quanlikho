# MASTER CONTEXT — WAREHOUSE MANAGEMENT SYSTEM

## 1. THÔNG TIN DỰ ÁN

### Tổng quan
- **Tên app**: Quản Lý Kho (Warehouse Management System)
- **Mục đích**: Hệ thống quản lý kho hàng chuyên nghiệp cho nhân viên kho
- **Ngành**: Logistics, Electronics Warehouse (linh kiện điện tử, IC chips)
- **Ngôn ngữ UI**: Tiếng Việt

### Stack đầy đủ với version
```json
{
  "next": "16.2.2",
  "react": "19.2.4",
  "react-dom": "19.2.4",
  "typescript": "^5",
  "zustand": "^5.0.12",
  "prisma": "^7.6.0",
  "better-sqlite3": "^12.8.0",
  "@prisma/adapter-better-sqlite3": "^7.6.0",
  "tailwindcss": "^4",
  "@base-ui/react": "^1.3.0",
  "shadcn": "^4.1.2",
  "lucide-react": "^1.7.0",
  "xlsx": "^0.18.5",
  "file-saver": "^2.0.5",
  "jspdf": "^4.2.1",
  "jspdf-autotable": "^5.0.7",
  "recharts": "^3.8.1",
  "@zxing/library": "^0.21.3",
  "react-qr-code": "^2.0.18",
  "vitest": "^4.1.2"
}
```

### Môi trường
- **OS**: Windows 10/11
- **Editor**: Cursor IDE
- **Node version**: 24.13.0 (khuyến nghị 20.19.0+)
- **Database**: SQLite (file: `./prisma/dev.db`)

### Thư mục gốc
```
c:\Users\admin\OneDrive\Desktop\quanlikho
```

### Cách chạy dev server
```bash
npm run dev
# Chạy tại http://localhost:3000
```

### Các lệnh quan trọng
```bash
npm run dev          # Dev server
npm run build        # Build production
npm run db:seed      # Seed database
npm run db:studio    # Mở Prisma Studio
npx vitest run       # Chạy tests
```

---

## 2. CẤU TRÚC THƯ MỤC

```
quanlikho/
├── app/                           # Next.js App Router
│   ├── api/                       # API Routes
│   │   ├── goods-issue/
│   │   ├── goods-receipt/
│   │   ├── inventory/
│   │   ├── products/
│   │   ├── purchase-order/
│   │   ├── reports/
│   │   ├── stocktake/
│   │   ├── suppliers/
│   │   └── warehouses/
│   ├── dashboard/                 # Trang Dashboard chính
│   ├── goods-issue/              # Module xuất kho
│   ├── goods-receipt/            # Module nhập kho
│   ├── inventory/                # Module tồn kho
│   ├── login/                    # Trang đăng nhập
│   ├── mobile/                   # PWA mobile interface
│   │   ├── goods-issue/
│   │   ├── goods-receipt/
│   │   ├── offline/
│   │   ├── scan/                 # Barcode scanner
│   │   └── stocktake/
│   ├── purchase-order/           # Module đơn đặt hàng
│   ├── reports/                  # Module báo cáo
│   ├── settings/                 # Module cài đặt
│   ├── stocktake/                # Module kiểm kê
│   ├── suppliers/               # Module nhà cung cấp
│   └── sw.ts                     # Service Worker cho PWA
├── components/
│   ├── modules/                  # Component theo module
│   │   ├── dashboard/
│   │   ├── goods-issue/
│   │   ├── goods-receipt/
│   │   ├── inventory/
│   │   ├── purchase-order/
│   │   ├── reports/
│   │   ├── stocktake/
│   │   └── suppliers/
│   ├── shared/                   # Shared components (Sidebar, Topbar, AppShell)
│   └── ui/                       # UI components từ shadcn
├── hooks/                        # Custom React hooks
├── lib/                          # Core library
│   ├── types.ts                  # TypeScript interfaces & enums
│   ├── store.ts                  # Zustand store
│   ├── businessLogic.ts          # Pure business logic functions
│   ├── auth.ts                   # Authentication & permissions
│   ├── mockData.ts               # Mock data cho development
│   ├── exportExcel.ts            # Export Excel functions
│   ├── printTemplates.ts         # PDF print templates
│   └── db.ts                     # Prisma client
├── prisma/
│   ├── schema.prisma              # Database schema
│   ├── seed.ts                    # Database seeder
│   └── dev.db                     # SQLite database file
├── public/                        # Static assets
│   └── manifest.json              # PWA manifest
├── styles/                        # Global styles
├── __tests__/                     # Vitest tests
│   ├── setup.ts                   # Test setup & mocks
│   ├── auth/
│   ├── business/
│   ├── features/
│   ├── helpers/
│   └── ui/
├── next.config.ts                 # Next.js configuration
├── package.json
├── tsconfig.json
└── .env                           # Environment variables
```

---

## 3. DATA MODELS — TOÀN BỘ TYPES

### 3.1 ENUMS

```typescript
// ProductCategory
enum ProductCategory {
  ELECTRONICS = "electronics"
  FURNITURE = "furniture"
  OFFICE_SUPPLIES = "office_supplies"
  TOOLS = "tools"
  PACKAGING = "packaging"
  RAW_MATERIALS = "raw_materials"
  OTHER = "other"
}

// UnitOfMeasure
enum UnitOfMeasure {
  PIECE = "piece"
  KG = "kg"
  GRAM = "gram"
  LITER = "liter"
  METER = "meter"
  ROLL = "roll"
  BOX = "box"
  PALLET = "pallet"
  SET = "set"
}

// StockStatus
enum StockStatus {
  IN_STOCK = "in_stock"
  LOW_STOCK = "low_stock"
  OUT_OF_STOCK = "out_of_stock"
  OVERSTOCKED = "overstocked"
}

// WarehouseType
enum WarehouseType {
  MAIN = "main"
  SATELLITE = "satellite"
  DISTRIBUTION = "distribution"
  COLD_STORAGE = "cold_storage"
  BONDED = "bonded"
}

// SupplierStatus
enum SupplierStatus {
  ACTIVE = "active"
  INACTIVE = "inactive"
  PENDING = "pending"
  BLACKLISTED = "blacklisted"
}

// SupplierRating
enum SupplierRating {
  EXCELLENT = 5
  VERY_GOOD = 4
  GOOD = 3
  AVERAGE = 2
  POOR = 1
}

// PurchaseOrderStatus
enum PurchaseOrderStatus {
  DRAFT = "draft"
  PENDING_APPROVAL = "pending_approval"
  APPROVED = "approved"
  SENT = "sent"
  CONFIRMED = "confirmed"
  PARTIALLY_RECEIVED = "partially_received"
  FULLY_RECEIVED = "fully_received"
  CLOSED = "closed"
  CANCELLED = "cancelled"
}

// GoodsReceiptStatus
enum GoodsReceiptStatus {
  DRAFT = "draft"
  PENDING = "pending"
  CONFIRMED = "confirmed"
  COMPLETED = "completed"
  CANCELLED = "cancelled"
}

// GoodsIssueStatus
enum GoodsIssueStatus {
  DRAFT = "draft"
  PENDING = "pending"
  CONFIRMED = "confirmed"
  COMPLETED = "completed"
  CANCELLED = "cancelled"
}

// GoodsIssueReason
enum GoodsIssueReason {
  SALES = "sales"
  PRODUCTION = "production"
  TRANSFER = "transfer"
  SAMPLE = "sample"
  DAMAGE = "damage"
  EXPIRY = "expiry"
  ADJUSTMENT = "adjustment"
  RETURN = "return"
}

// StocktakeType
enum StocktakeType {
  FULL = "full"
  CYCLE = "cycle"
  SPOT = "spot"
}

// StocktakeStatus
enum StocktakeStatus {
  DRAFT = "draft"
  IN_PROGRESS = "in_progress"
  PENDING_APPROVAL = "pending_approval"
  APPROVED = "approved"
  COMPLETED = "completed"
  CANCELLED = "cancelled"
}

// AuditAction
enum AuditAction {
  CREATE = "create"
  UPDATE = "update"
  DELETE = "delete"
  VIEW = "view"
  APPROVE = "approve"
  REJECT = "reject"
  COMPLETE = "complete"
  SEND = "send"
  IMPORT = "import"
  EXPORT = "export"
  PRINT = "print"
  ADJUST = "adjust"
  GOODS_RECEIPT = "goods_receipt"
  GOODS_ISSUE = "goods_issue"
  STOCKTAKE_ADJUSTMENT = "stocktake_adjustment"
  INVENTORY_UPDATE = "inventory_update"
  QUARANTINE = "quarantine"
  RELEASE_QUARANTINE = "release_quarantine"
}

// UserRole
enum UserRole {
  ADMIN = "admin"
  WAREHOUSE_MANAGER = "warehouse_manager"
  WAREHOUSE_STAFF = "warehouse_staff"
  PURCHASER = "purchaser"
  ACCOUNTANT = "accountant"
  AUDITOR = "auditor"
  VIEWER = "viewer"
}

// UserStatus
enum UserStatus {
  ACTIVE = "active"
  INACTIVE = "inactive"
  SUSPENDED = "suspended"
}

// DeliveryStatus
enum DeliveryStatus {
  PENDING = "pending"
  PARTIAL = "partial"
  COMPLETE = "complete"
}

// AlertSeverity
enum AlertSeverity {
  INFO = "info"
  WARNING = "warning"
  CRITICAL = "critical"
}
```

### 3.2 MAIN INTERFACES

```typescript
// Product
interface Product {
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
  dimensions?: { length: number; width: number; height: number };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// Warehouse
interface Warehouse {
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

// InventoryLocation
interface InventoryLocation {
  zone?: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  bin?: string;
}

// InventoryItem
interface InventoryItem {
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

// Supplier
interface Supplier {
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

// PurchaseOrderItem
interface PurchaseOrderItem {
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

// PurchaseOrder
interface PurchaseOrder {
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

// GoodsReceiptItem
interface GoodsReceiptItem {
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

// GoodsReceipt
interface GoodsReceipt {
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

// GoodsIssueItem
interface GoodsIssueItem {
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

// GoodsIssue
interface GoodsIssue {
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

// StocktakeDiscrepancy
interface StocktakeDiscrepancy {
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

// StocktakeSession
interface StocktakeSession {
  id: string;
  stocktakeNumber: string;
  sessionNumber?: string;
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

// AuditLog
interface AuditLog {
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

// UserPermissions
interface UserPermissions {
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

// User
interface User {
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

// Alert (Store type)
interface Alert {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'expiry' | 'quarantine';
  productId: string;
  productName: string;
  productSku: string;
  warehouseId: string;
  warehouseName: string;
  message: string;
  quantity: number;
  reorderPoint?: number;
  createdAt: Date;
  isRead: boolean;
}

// DashboardStats
interface DashboardStats {
  totalProducts: number;
  totalWarehouses: number;
  totalSuppliers: number;
  totalInventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  pendingReceipts: number;
  pendingIssues: number;
  pendingOrders: number;
  activeStocktakes: number;
}
```

---

## 4. ZUSTAND STORE — TOÀN BỘ SLICES

### 4.1 Store Interface (lib/store.ts)

```typescript
interface WarehouseStore extends LoadingState {
  // State
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Data arrays
  products: Product[];
  warehouses: Warehouse[];
  inventoryItems: InventoryItem[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceipt[];
  goodsIssues: GoodsIssue[];
  stocktakeSessions: StocktakeSession[];
  auditLogs: AuditLog[];
  alerts: Alert[];
  stats: DashboardStats;
  
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  
  // === PRODUCT ACTIONS ===
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  getProductById: (id: string) => Product | undefined;
  getProductByBarcode: (barcode: string) => Product | undefined;
  searchProducts: (query: string) => Product[];
  getLowStockProductList: () => Product[];
  fetchProducts: () => Promise<void>;
  
  // === WAREHOUSE ACTIONS ===
  setWarehouses: (warehouses: Warehouse[]) => void;
  addWarehouse: (warehouse: Warehouse) => void;
  updateWarehouse: (id: string, updates: Partial<Warehouse>) => void;
  deleteWarehouse: (id: string) => void;
  getWarehouseById: (id: string) => Warehouse | undefined;
  fetchWarehouses: () => Promise<void>;
  
  // === INVENTORY ACTIONS ===
  setInventoryItems: (items: InventoryItem[]) => void;
  addInventoryItem: (item: InventoryItem) => void;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  adjustInventoryQuantity: (productId: string, warehouseId: string, quantityChange: number, type: 'add' | 'subtract') => void;
  checkLowStockAlerts: () => void;
  markAlertAsRead: (alertId: string) => void;
  clearAlerts: () => void;
  getInventoryByProduct: (productId: string) => InventoryItem[];
  getInventoryByWarehouse: (warehouseId: string) => InventoryItem[];
  getTotalProductQuantity: (productId: string) => number;
  fetchInventory: (params?: { warehouseId?: string; search?: string }) => Promise<void>;
  
  // === SUPPLIER ACTIONS ===
  setSuppliers: (suppliers: Supplier[]) => void;
  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  getSupplierById: (id: string) => Supplier | undefined;
  fetchSuppliers: () => Promise<void>;
  
  // === PURCHASE ORDER ACTIONS ===
  setPurchaseOrders: (orders: PurchaseOrder[]) => void;
  addPurchaseOrder: (order: PurchaseOrder) => void;
  updatePurchaseOrder: (id: string, updates: Partial<PurchaseOrder>) => void;
  deletePurchaseOrder: (id: string) => void;
  approvePurchaseOrder: (id: string, approvedBy: string) => void;
  cancelPurchaseOrder: (id: string, reason: string) => void;
  sendPurchaseOrder: (id: string) => void;
  getPurchaseOrderById: (id: string) => PurchaseOrder | undefined;
  fetchPurchaseOrders: (params?: { status?: string; supplierId?: string }) => Promise<void>;
  createPurchaseOrder: (data: Partial<PurchaseOrder>) => Promise<PurchaseOrder>;
  updatePurchaseOrderStatus: (id: string, status: PurchaseOrderStatus) => Promise<PurchaseOrder>;
  
  // === GOODS RECEIPT ACTIONS ===
  setGoodsReceipts: (receipts: GoodsReceipt[]) => void;
  addGoodsReceipt: (receipt: GoodsReceipt) => void;
  updateGoodsReceipt: (id: string, updates: Partial<GoodsReceipt>) => void;
  deleteGoodsReceipt: (id: string) => void;
  completeGoodsReceipt: (id: string, completedBy: string) => void;
  getGoodsReceiptById: (id: string) => GoodsReceipt | undefined;
  fetchGoodsReceipts: (params?: { status?: string; supplierId?: string; warehouseId?: string }) => Promise<void>;
  createGoodsReceipt: (data: Partial<GoodsReceipt>) => Promise<GoodsReceipt>;
  
  // === GOODS ISSUE ACTIONS ===
  setGoodsIssues: (issues: GoodsIssue[]) => void;
  addGoodsIssue: (issue: GoodsIssue) => void;
  updateGoodsIssue: (id: string, updates: Partial<GoodsIssue>) => void;
  deleteGoodsIssue: (id: string) => void;
  completeGoodsIssue: (id: string, completedBy: string) => void;
  validatePickingList: (issueId: string, scannedBarcode: string) => boolean;
  getGoodsIssueById: (id: string) => GoodsIssue | undefined;
  fetchGoodsIssues: (params?: { status?: string; reason?: string; warehouseId?: string }) => Promise<void>;
  createGoodsIssue: (data: Partial<GoodsIssue>) => Promise<GoodsIssue>;
  
  // === STOCKTAKE ACTIONS ===
  setStocktakeSessions: (sessions: StocktakeSession[]) => void;
  addStocktakeSession: (session: StocktakeSession) => void;
  updateStocktakeSession: (id: string, updates: Partial<StocktakeSession>) => void;
  deleteStocktakeSession: (id: string) => void;
  startStocktake: (id: string, startedBy: string) => void;
  completeStocktake: (id: string) => void;
  approveStocktake: (id: string, approvedBy: string) => void;
  getStocktakeById: (id: string) => StocktakeSession | undefined;
  fetchStocktakes: (params?: { status?: string; warehouseId?: string }) => Promise<void>;
  createStocktake: (data: Partial<StocktakeSession>) => Promise<StocktakeSession>;
  updateStocktakeStatus: (id: string, updates: Partial<StocktakeSession>) => Promise<StocktakeSession>;
  
  // === AUDIT LOG ACTIONS ===
  setAuditLogs: (logs: AuditLog[]) => void;
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => void;
  getAuditLogsByEntity: (entity: string, entityId: string) => AuditLog[];
  getRecentAuditLogs: (limit?: number) => AuditLog[];
  
  // === DASHBOARD ACTIONS ===
  refreshStats: () => void;
  fetchDashboardStats: () => Promise<void>;
  getLowStockProducts: () => { product: Product; totalQuantity: number }[];
  getTopProductsByValue: () => { product: Product; totalValue: number }[];
  
  // === AUTH ACTIONS ===
  login: (user: User) => void;
  logout: () => void;
  
  // === STORE ACTIONS ===
  initializeStore: () => Promise<void>;
  resetStore: () => void;
}
```

### 4.2 Selector Hooks

```typescript
export const useProducts = () => useWarehouseStore((state) => state.products);
export const useWarehouses = () => useWarehouseStore((state) => state.warehouses);
export const useInventoryItems = () => useWarehouseStore((state) => state.inventoryItems);
export const useSuppliers = () => useWarehouseStore((state) => state.suppliers);
export const usePurchaseOrders = () => useWarehouseStore((state) => state.purchaseOrders);
export const useGoodsReceipts = () => useWarehouseStore((state) => state.goodsReceipts);
export const useGoodsIssues = () => useWarehouseStore((state) => state.goodsIssues);
export const useStocktakeSessions = () => useWarehouseStore((state) => state.stocktakeSessions);
export const useAuditLogs = () => useWarehouseStore((state) => state.auditLogs);
export const useAlerts = () => useWarehouseStore((state) => state.alerts);
export const useDashboardStats = () => useWarehouseStore((state) => state.stats);
export const useIsLoading = () => useWarehouseStore((state) => state.isLoading);
export const useStoreError = () => useWarehouseStore((state) => state.error);
export const useIsInitialized = () => useWarehouseStore((state) => state.isInitialized);
```

### 4.3 Action Hooks

```typescript
export const useProductActions = (): ProductActions
export const useWarehouseActions = (): WarehouseActions
export const useInventoryActions = (): InventoryActions
export const useSupplierActions = (): SupplierActions
export const usePurchaseOrderActions = (): PurchaseOrderActions
export const useGoodsReceiptActions = (): GoodsReceiptActions
export const useGoodsIssueActions = (): GoodsIssueActions
export const useStocktakeActions = (): StocktakeActions
export const useAuditLogActions = (): AuditLogActions
export const useAlertActions = (): AlertActions
export const useDashboardActions = (): DashboardActions
```

---

## 5. BUSINESS LOGIC FUNCTIONS (lib/businessLogic.ts)

### 5.1 Inventory Business Logic

```typescript
// Rule 1.1: calculateAvailable
// available = total - reserved - quarantine - damaged (không được âm)
function calculateAvailable(item: InventoryItem): number {
  const available = 
    item.quantityTotal - 
    item.quantityReserved - 
    item.quantityQuarantine - 
    item.quantityDamaged;
  return Math.max(0, available);
}

// Rule 1.2: getStockStatus
// Kiểm tra tồn kho và trả về status
function getStockStatus(
  availableQuantity: number, 
  reorderPoint: number
): 'OK' | 'WARNING' | 'CRITICAL' {
  if (availableQuantity === 0) return 'CRITICAL';
  if (availableQuantity <= reorderPoint) return 'WARNING';
  return 'OK';
}

// Rule 1.3: isQuarantineItemIssuable
// Hàng QUARANTINE không được xuất
function isQuarantineItemIssuable(
  item: InventoryItem,
  requestedQuantity: number
): { issuable: boolean; reason?: string }

// Check if item has QUARANTINE status
function isInQuarantine(item: InventoryItem): boolean {
  return item.quantityQuarantine > 0;
}
```

### 5.2 Goods Receipt (FEFO) Business Logic

```typescript
// Rule 2.1: sortByFEFO - Sắp xếp lô theo FEFO
// Lô có expiryDate sớm hơn phải được sắp xếp trước (first in list)
// Hàng không có expiryDate → xếp cuối
function sortByFEFO(lots: LotWithExpiry[]): LotWithExpiry[] {
  return [...lots].sort((a, b) => {
    if (!a.expiryDate && !b.expiryDate) return 0;
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    return a.expiryDate.getTime() - b.expiryDate.getTime();
  });
}

// Rule 2.2: Nhập kho cập nhật tồn đúng
function calculateNewInventoryAfterReceipt(
  item: InventoryItem,
  receivedQuantity: number,
  acceptedQuantity: number,
  quarantineQuantity: number = 0
): InventoryCalculation

// Rule 2.3: Serial number validation
function validateSerialNumbers(
  serialNumbers: string[],
  expectedQuantity: number
): { valid: boolean; error?: string }
```

### 5.3 Goods Issue Business Logic

```typescript
// Rule 3.1: getFEFOIssueOrder - Lấy danh sách lô cần xuất theo FEFO
// Phải xuất lô gần hết hạn nhất trước
function getFEFOIssueOrder(
  lots: LotWithExpiry[],
  requiredQuantity: number
): { lots: LotWithExpiry[]; fulfilled: boolean }

// Rule 3.2: Kiểm tra có thể xuất kho không
function canIssue(
  item: InventoryItem,
  requestedQuantity: number
): { canIssue: boolean; reason?: string }

// Rule 3.3: Picking list validation
function validatePickingList(
  pickingItems: Array<{...}>,
  inventoryItems: Array<{...}>
): PickingListValidation

// Tính tồn kho sau khi xuất
function calculateNewInventoryAfterIssue(
  item: InventoryItem,
  issuedQuantity: number
): InventoryCalculation
```

### 5.4 Purchase Order Business Logic

```typescript
// Rule 4.1: Xác định cấp phê duyệt theo giá trị PO
// totalAmount < 10,000,000 → WAREHOUSE_MANAGER
// totalAmount >= 10,000,000 && <= 50,000,000 → DEPARTMENT_HEAD
// totalAmount > 50,000,000 → DIRECTOR
function getRequiredApprover(totalAmount: number): ApprovalLevel

// Rule 4.2: Kiểm tra PO status flow có hợp lệ không
function isValidStatusTransition(
  currentStatus: PurchaseOrderStatus,
  newStatus: PurchaseOrderStatus
): boolean

// Rule 4.3: Kiểm tra PO có thể cancel không
function canCancelPurchaseOrder(
  currentStatus: PurchaseOrderStatus
): { canCancel: boolean; reason?: string }

// Validate PO
function validatePurchaseOrder(po: PurchaseOrder): { valid: boolean; errors: string[] }
```

### 5.5 Stocktake Business Logic

```typescript
// Rule 5.1: Tính deviation (chênh lệch)
function calculateDeviation(
  systemQty: number,
  actualQty: number
): DeviationCalculation

// Rule 5.2: Kiểm tra deviation có cần phê duyệt không
// Ngưỡng mặc định: 5%
function needsApproval(deviationPercent: number, threshold: number = 5): boolean

// Rule 5.3: Áp dụng điều chỉnh sau kiểm kê
function applyStocktakeAdjustment(
  item: InventoryItem,
  discrepancy: StocktakeDiscrepancy
): InventoryCalculation
```

### 5.6 Audit Log Business Logic

```typescript
// Rule 6.1: Validate audit log entry
function validateAuditLogEntry(log: Partial<AuditLog>): {
  valid: boolean;
  missingFields: string[];
}

// Kiểm tra action có phải là thay đổi tồn kho không
function isInventoryChangeAction(action: AuditAction): boolean

// Tạo audit log entry cho thay đổi tồn kho
function createInventoryAuditLog(params: {...}): AuditLog
```

### 5.7 Alert Business Logic

```typescript
// Rule 7.1 & 7.2: Generate alerts từ inventory
function generateAlerts(
  products: Array<{...}>,
  inventoryQuantities: Map<string, number>
): InventoryAlert[]

// Deduplicate alerts
function deduplicateAlerts(alerts: InventoryAlert[]): InventoryAlert[]
```

### 5.8 Utility Functions

```typescript
function formatCurrencyVND(amount: number): string
function parseNumber(value: string | number, defaultValue: number = 0): number
```

---

## 6. BUSINESS RULES (không được sai)

### 6.1 Inventory Available Calculation
```
available = total - reserved - quarantine - damaged
available KHÔNG được âm (dùng Math.max(0, ...))
```

### 6.2 FEFO (First Expired, First Out)
```typescript
// Thuật toán sort:
1. Lọc các lô có expiryDate
2. Sắp xếp theo expiryDate tăng dần (hết hạn trước lên đầu)
3. Lô không có expiryDate → xếp cuối danh sách
4. Khi xuất: lấy từ đầu danh sách đã sort
```

### 6.3 Alert Thresholds
```
CRITICAL: quantityAvailable === 0
WARNING: quantityAvailable <= reorderPoint && quantityAvailable > 0
INFO: (không sử dụng trong code hiện tại)
```

### 6.4 PO Approval Matrix
| Giá trị PO | Cấp phê duyệt |
|------------|----------------|
| < 10,000,000 VND | WAREHOUSE_MANAGER |
| 10,000,000 - 50,000,000 VND | DEPARTMENT_HEAD |
| > 50,000,000 VND | DIRECTOR |

### 6.5 Stocktake Deviation
```
Threshold: 5%
- deviation > 5% → Cần approval
- deviation <= 5% → Tự động duyệt
- systemQty = 0 → deviation = 100%
```

### 6.6 Quarantine Rules
```
- quantityQuarantine > 0 → Hàng đang QUARANTINE
- Hàng QUARANTINE KHÔNG được xuất kho
- Hàng QUARANTINE không tính vào available
```

### 6.7 Audit Log Triggers
```
BẮT BUỘC ghi log khi:
- CREATE: Tạo mới entity
- UPDATE: Cập nhật entity  
- DELETE: Xóa entity
- APPROVE: Phê duyệt
- GOODS_RECEIPT: Nhập kho
- GOODS_ISSUE: Xuất kho
- STOCKTAKE_ADJUSTMENT: Điều chỉnh sau kiểm kê

Fields bắt buộc:
- timestamp
- userId
- action
- entity
- entityId
```

---

## 7. PHÂN QUYỀN 6 ROLES

### 7.1 ROLE_PERMISSIONS (lib/auth.ts)

```typescript
const ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  ADMIN: {
    // Tất cả quyền đều true
    canManageProducts: true,
    canManageInventory: true,
    canViewInventory: true,
    canCreateInventoryAdjustments: true,
    canManagePurchaseOrders: true,
    canViewPurchaseOrders: true,
    canManageGoodsReceipt: true,
    canViewGoodsReceipt: true,
    canCreateGoodsReceipt: true,
    canApproveGoodsReceipt: true,
    canManageGoodsIssue: true,
    canViewGoodsIssue: true,
    canCreateGoodsIssue: true,
    canApproveGoodsIssue: true,
    canManageStocktake: true,
    canManageSuppliers: true,
    canViewReports: true,
    canExportData: true,
    canManageUsers: true,
    canManageSettings: true,
    canApproveTransactions: true,
  },
  
  WAREHOUSE_MANAGER: {
    canManageProducts: false,
    canManageInventory: true,
    canViewInventory: true,
    canCreateInventoryAdjustments: true,
    canManagePurchaseOrders: false,
    canViewPurchaseOrders: true,
    canManageGoodsReceipt: true,
    canViewGoodsReceipt: true,
    canCreateGoodsReceipt: true,
    canApproveGoodsReceipt: true,
    canManageGoodsIssue: true,
    canViewGoodsIssue: true,
    canCreateGoodsIssue: true,
    canApproveGoodsIssue: true,
    canManageStocktake: true,
    canManageSuppliers: true,
    canViewReports: true,
    canExportData: true,
    canManageUsers: false,
    canManageSettings: false,
    canApproveTransactions: true,
  },
  
  WAREHOUSE_STAFF: {
    canManageProducts: false,
    canManageInventory: false,
    canViewInventory: true,
    canCreateInventoryAdjustments: false,
    canManagePurchaseOrders: false,
    canViewPurchaseOrders: false,
    canManageGoodsReceipt: false,
    canViewGoodsReceipt: true,
    canCreateGoodsReceipt: true,
    canApproveGoodsReceipt: false,
    canManageGoodsIssue: false,
    canViewGoodsIssue: true,
    canCreateGoodsIssue: true,
    canApproveGoodsIssue: false,
    canManageStocktake: true,
    canManageSuppliers: false,
    canViewReports: false,
    canExportData: false,
    canManageUsers: false,
    canManageSettings: false,
    canApproveTransactions: false,
  },
  
  PURCHASER: {
    canManageProducts: false,
    canManageInventory: false,
    canViewInventory: true,
    canCreateInventoryAdjustments: false,
    canManagePurchaseOrders: true,
    canViewPurchaseOrders: true,
    canManageGoodsReceipt: false,
    canViewGoodsReceipt: false,
    canCreateGoodsReceipt: false,
    canApproveGoodsReceipt: false,
    canManageGoodsIssue: false,
    canViewGoodsIssue: false,
    canCreateGoodsIssue: false,
    canApproveGoodsIssue: false,
    canManageStocktake: false,
    canManageSuppliers: true,
    canViewReports: true,
    canExportData: true,
    canManageUsers: false,
    canManageSettings: false,
    canApproveTransactions: false,
  },
  
  ACCOUNTANT: {
    canManageProducts: false,
    canManageInventory: false,
    canViewInventory: true,
    canCreateInventoryAdjustments: false,
    canManagePurchaseOrders: false,
    canViewPurchaseOrders: true,
    canManageGoodsReceipt: false,
    canViewGoodsReceipt: true,
    canCreateGoodsReceipt: false,
    canApproveGoodsReceipt: false,
    canManageGoodsIssue: false,
    canViewGoodsIssue: true,
    canCreateGoodsIssue: false,
    canApproveGoodsIssue: false,
    canManageStocktake: false,
    canManageSuppliers: true,
    canViewReports: true,
    canExportData: true,
    canManageUsers: false,
    canManageSettings: false,
    canApproveTransactions: false,
  },
  
  AUDITOR: {
    canManageProducts: false,
    canManageInventory: false,
    canViewInventory: true,
    canCreateInventoryAdjustments: false,
    canManagePurchaseOrders: false,
    canViewPurchaseOrders: true,
    canManageGoodsReceipt: false,
    canViewGoodsReceipt: true,
    canCreateGoodsReceipt: false,
    canApproveGoodsReceipt: false,
    canManageGoodsIssue: false,
    canViewGoodsIssue: true,
    canCreateGoodsIssue: false,
    canApproveGoodsIssue: false,
    canManageStocktake: true,
    canManageSuppliers: true,
    canViewReports: false,
    canExportData: true,
    canManageUsers: false,
    canManageSettings: false,
    canApproveTransactions: false,
  },
  
  VIEWER: {
    canManageProducts: false,
    canManageInventory: false,
    canViewInventory: true,
    canCreateInventoryAdjustments: false,
    canManagePurchaseOrders: false,
    canViewPurchaseOrders: true,
    canManageGoodsReceipt: false,
    canViewGoodsReceipt: true,
    canCreateGoodsReceipt: false,
    canApproveGoodsReceipt: false,
    canManageGoodsIssue: false,
    canViewGoodsIssue: true,
    canCreateGoodsIssue: false,
    canApproveGoodsIssue: false,
    canManageStocktake: false,
    canManageSuppliers: false,
    canViewReports: false,
    canExportData: false,
    canManageUsers: false,
    canManageSettings: false,
    canApproveTransactions: false,
  },
};
```

### 7.2 MODULE_ACTION_MAP

```typescript
const MODULE_ACTION_MAP: Record<Module, Record<Action, keyof UserPermissions | null>> = {
  inventory: {
    view: "canViewInventory",
    create: null,
    edit: "canCreateInventoryAdjustments",
    delete: null,
    approve: null,
    export: "canExportData",
    manage: null,
  },
  goods_receipt: {
    view: "canViewGoodsReceipt",
    create: "canCreateGoodsReceipt",
    edit: null,
    delete: null,
    approve: "canApproveGoodsReceipt",
    export: "canExportData",
    manage: "canManageGoodsReceipt",
  },
  goods_issue: {
    view: "canViewGoodsIssue",
    create: "canCreateGoodsIssue",
    edit: null,
    delete: null,
    approve: "canApproveGoodsIssue",
    export: "canExportData",
    manage: "canManageGoodsIssue",
  },
  purchase_order: {
    view: "canViewPurchaseOrders",
    create: "canManagePurchaseOrders",
    edit: "canManagePurchaseOrders",
    delete: "canManagePurchaseOrders",
    approve: null,
    export: "canExportData",
    manage: "canManagePurchaseOrders",
  },
  stocktake: {
    view: "canManageStocktake",
    create: "canManageStocktake",
    edit: "canManageStocktake",
    delete: null,
    approve: "canApproveTransactions",
    export: "canExportData",
    manage: "canManageStocktake",
  },
  suppliers: {
    view: "canManageSuppliers",
    create: "canManageSuppliers",
    edit: "canManageSuppliers",
    delete: "canManageSuppliers",
    approve: null,
    export: "canExportData",
    manage: "canManageSuppliers",
  },
  reports: {
    view: "canViewReports",
    create: null,
    edit: null,
    delete: null,
    approve: null,
    export: "canExportData",
    manage: null,
  },
  settings: {
    view: "canManageSettings",
    create: "canManageSettings",
    edit: "canManageSettings",
    delete: "canManageSettings",
    approve: null,
    export: null,
    manage: "canManageSettings",
  },
  audit_log: {
    view: "canViewReports",
    create: null,
    edit: null,
    delete: null,
    approve: null,
    export: "canExportData",
    manage: null,
  },
};
```

### 7.3 Permission Check Function

```typescript
function hasPermission(
  permissions: UserPermissions | undefined,
  module: Module,
  action: Action
): boolean {
  if (!permissions) return false;
  const key = getPermissionKey(module, action);
  if (!key) return false;
  return permissions[key] === true;
}
```

---

## 8. CÁC MODULE & PAGES

### 8.1 Dashboard (/dashboard)
- **Component**: `app/dashboard/page.tsx`
- **Features**: Hiển thị KPIs, alerts, recent activities, charts
- **State**: useDashboardStats, useAlerts, usePurchaseOrders, useGoodsReceipts, useGoodsIssues
- **Actions**: refreshStats, checkLowStockAlerts

### 8.2 Inventory (/inventory)
- **Component**: `app/inventory/page.tsx`
- **Features**: Danh sách tồn kho, filter theo kho/sản phẩm, xem chi tiết
- **State**: useInventoryItems, useProducts, useWarehouses
- **Actions**: fetchInventory, adjustInventoryQuantity

### 8.3 Goods Receipt (/goods-receipt)
- **Component**: `app/goods-receipt/page.tsx`
- **Features**: Tạo phiếu nhập, duyệt phiếu, in phiếu
- **State**: useGoodsReceipts, useSuppliers, useWarehouses, useProducts
- **Actions**: createGoodsReceipt, completeGoodsReceipt

### 8.4 Goods Issue (/goods-issue)
- **Component**: `app/goods-issue/page.tsx`
- **Features**: Tạo phiếu xuất, duyệt phiếu, in phiếu
- **State**: useGoodsIssues, useWarehouses, useProducts
- **Actions**: createGoodsIssue, completeGoodsIssue, validatePickingList

### 8.5 Purchase Order (/purchase-order)
- **Component**: `app/purchase-order/page.tsx`
- **Features**: Tạo PO, duyệt PO, theo dõi trạng thái
- **State**: usePurchaseOrders, useSuppliers, useProducts
- **Actions**: createPurchaseOrder, approvePurchaseOrder, cancelPurchaseOrder

### 8.6 Stocktake (/stocktake)
- **Component**: `app/stocktake/page.tsx`
- **Features**: Tạo phiên kiểm kê, nhập số liệu, xem chênh lệch
- **State**: useStocktakeSessions, useWarehouses, useProducts
- **Actions**: createStocktake, startStocktake, completeStocktake, approveStocktake

### 8.7 Suppliers (/suppliers)
- **Component**: `app/suppliers/page.tsx`
- **Features**: Quản lý nhà cung cấp, thông tin liên hệ, tài khoản ngân hàng
- **State**: useSuppliers
- **Actions**: fetchSuppliers, addSupplier, updateSupplier, deleteSupplier

### 8.8 Reports (/reports)
- **Component**: `app/reports/page.tsx`
- **Features**: Báo cáo tồn kho, báo cáo xuất nhập, xuất Excel
- **State**: useDashboardStats
- **Actions**: exportInventoryReport, exportGoodsReceipt, exportGoodsIssue

### 8.9 Mobile PWA (/mobile)
- **Features**: Giao diện responsive cho mobile, offline support
- **Sub-pages**:
  - `/mobile/scan` - Scan barcode
  - `/mobile/goods-receipt` - Nhập kho nhanh
  - `/mobile/goods-issue` - Xuất kho nhanh
  - `/mobile/stocktake` - Kiểm kê
  - `/mobile/offline` - Xem offline data

---

## 9. TÍNH NĂNG ĐẶC THÙ

### 9.1 Serial Number Tracking
```
Flow:
1. Nhập kho (GoodsReceipt): Nhập serial numbers cho từng sản phẩm
2. Lưu trữ: SerialNumber[] trong GoodsReceiptItem và GoodsIssueItem
3. Xuất kho (GoodsIssue): Validate serial numbers đã nhập
4. Tracking: SerialNumber có status: "available", "reserved", "sold", "damaged"
```

### 9.2 Barcode System
```
- Product có field: barcode (1 barcode chính)
- SupplierBarcode: nhiều barcodes từ nhiều supplier cho 1 product
- Format: Free-text, không có format cố định
- Ký tự đặc biệt: Cho phép tất cả
```

### 9.3 FEFO Implementation
```
Áp dụng: Goods Receipt và Goods Issue
Thuật toán:
1. sortByFEFO(lots): Sắp xếp theo expiryDate tăng dần
2. getFEFOIssueOrder(lots, qty): Lấy lô từ đầu list
3. Non-expiry items: Xếp cuối, xuất sau cùng
```

### 9.4 ESD Warning
```
- Product có field: isESDSensitive (boolean)
- Product có field: esdNote (string) - ESD handling instructions
- Hiển thị warning badge/icon khi sản phẩm là ESD sensitive
- Ghi chú ESD hiển thị ở trang chi tiết sản phẩm và phiếu nhập/xuất
```

---

## 10. EXPORT & PRINT

### 10.1 Excel Export Functions (lib/exportExcel.ts)

```typescript
// Inventory Report - 4 sheets
function exportInventoryReport(
  data: InventoryExportItem[],
  filename: string = "ton_kho"
): void
// Sheet 1: Tổng hợp
// Sheet 2: Chi tiết theo lô
// Sheet 3: Hàng cần đặt thêm
// Sheet 4: Tổng hợp theo kho

// Goods Receipt Excel
function exportGoodsReceipt(
  grn: GoodsReceiptExport,
  filename: string = "phieu_nhap_kho"
): void

// Goods Issue Excel
function exportGoodsIssue(
  gi: GoodsIssueExport,
  filename: string = "phieu_xuat_kho"
): void

// Purchase Orders Excel - 3 sheets
function exportPurchaseOrders(
  data: PurchaseOrderExport[],
  filename: string = "danh_sach_PO"
): void
// Sheet 1: Danh sách PO
// Sheet 2: Pivot theo NCC
// Sheet 3: Tổng hợp theo trạng thái

// Goods Receipts List
function exportGoodsReceipts(
  data: GoodsReceiptExport[],
  filename: string = "danh_sach_nhap_kho"
): void

// Goods Issues List
function exportGoodsIssues(
  data: GoodsIssueExport[],
  filename: string = "danh_sach_xuat_kho"
): void
```

### 10.2 Print Templates (lib/printTemplates.ts)

```typescript
// Phiếu Nhập Kho (A4)
function printGoodsReceipt(data: GRNPrintData, options?: PrintOptions): jsPDF

// Phiếu Xuất Kho (A4)
function printGoodsIssue(data: GIPrintData, options?: PrintOptions): jsPDF

// Picking List (A5)
function printPickingList(data: PickingListPrintData, options?: PrintOptions): jsPDF

// Barcode Labels (A4, 4x8 labels)
function printBarcodeLabels(
  labels: LabelPrintData[],
  options?: PrintOptions
): jsPDF

// Đơn Đặt Hàng (A4)
function printPurchaseOrder(data: PurchaseOrderExport, options?: PrintOptions): jsPDF
```

### 10.3 LabelPrintData Interface

```typescript
interface LabelPrintData {
  sku: string;
  name: string;
  barcode: string;
  lotNumber?: string;
  expiryDate?: Date | string;
  serialNumber?: string;
  voltage?: string;
  model?: string;
  warehouse?: string;
}
```

### 10.4 Dependencies cho Export/Print

```json
{
  "xlsx": "^0.18.5" - Tạo file Excel
  "file-saver": "^2.0.5" - Download file
  "jspdf": "^4.2.1" - Tạo PDF
  "jspdf-autotable": "^5.0.7" - Table trong PDF
}
```

---

## 11. TEST COVERAGE

### 11.1 Test Files Structure

```
__tests__/
├── setup.ts                    # Global mocks
├── auth/
├── business/
├── features/
├── helpers/
└── ui/
```

### 11.2 Test Setup Mocks (__tests__/setup.ts)

```typescript
// Mock localStorage
// Mock next/navigation (useRouter, usePathname, useSearchParams)
// Mock next/image
// Mock recharts (ResizeObserver issues)
// Mock @zxing/library (camera APIs)
// Mock ResizeObserver
// Mock IntersectionObserver
// Mock matchMedia
// Mock window.scrollTo
// Mock crypto.randomUUID
```

### 11.3 Running Tests

```bash
npx vitest run
```

---

## 12. DEPENDENCIES ĐẦY ĐỦ

### 12.1 Production Dependencies

```json
{
  "next": "16.2.2",
  "react": "19.2.4",
  "react-dom": "19.2.4",
  
  // State Management
  "zustand": "^5.0.12",
  
  // Database
  "@prisma/client": "^7.6.0",
  "@prisma/adapter-better-sqlite3": "^7.6.0",
  "better-sqlite3": "^12.8.0",
  
  // UI Components
  "@base-ui/react": "^1.3.0",
  "shadcn": "^4.1.2",
  "lucide-react": "^1.7.0",
  "tailwind-merge": "^3.5.0",
  "tw-animate-css": "^1.4.0",
  "clsx": "^2.1.1",
  "class-variance-authority": "^0.7.1",
  
  // Export & Print
  "xlsx": "^0.18.5",
  "file-saver": "^2.0.5",
  "jspdf": "^4.2.1",
  "jspdf-autotable": "^5.0.7",
  
  // Charts
  "recharts": "^3.8.1",
  
  // Barcode/QR
  "@zxing/library": "^0.21.3",
  "react-qr-code": "^2.0.18"
}
```

### 12.2 Dev Dependencies

```json
{
  "typescript": "^5",
  "@types/node": "^20",
  "@types/react": "^19",
  "@types/react-dom": "^19",
  
  // Testing
  "vitest": "^4.1.2",
  "@testing-library/react": "^16.3.2",
  "@testing-library/dom": "^10.4.1",
  "@testing-library/jest-dom": "^6.9.1",
  "@testing-library/user-event": "^14.6.1",
  "jsdom": "^29.0.2",
  
  // Linting
  "eslint": "^9",
  "eslint-config-next": "16.2.2",
  
  // CSS
  "tailwindcss": "^4",
  "@tailwindcss/postcss": "^4",
  
  // Database
  "prisma": "^7.6.0",
  "dotenv": "^17.4.1",
  "tsx": "^4.21.0",
  "ts-node": "^10.9.2",
  
  // Build
  "@vitejs/plugin-react": "^6.0.1",
  
  // Types
  "@types/file-saver": "^2.0.7"
}
```

---

## 13. CONVENTIONS & RULES

### 13.1 TypeScript Rules
```
- KHÔNG dùng "as any"
- Sử dụng strict typing
- Define interfaces cho tất cả objects
```

### 13.2 Naming Conventions
```
- Functions: camelCase
- Components: PascalCase
- Files: kebab-case
- Interfaces: PascalCase
- Enums: PascalCase (values: SCREAMING_SNAKE_CASE)
```

### 13.3 UI Conventions
```
- Ngôn ngữ: Tiếng Việt
- Format tiền: toLocaleString('vi-VN')
- Format ngày: dd/MM/yyyy
- Màu sắc: Tailwind CSS utilities
```

### 13.4 Component Structure
```
components/
├── modules/          # Module-specific components
├── shared/           # Shared components (Layout, Sidebar, Topbar)
└── ui/               # Base UI components (shadcn)
```

---

## 14. DATABASE (Prisma + SQLite)

### 14.1 Schema Location
```
prisma/schema.prisma
```

### 14.2 Database File
```
prisma/dev.db (SQLite)
```

### 14.3 Prisma Commands
```bash
npx prisma generate      # Generate client
npx prisma db push       # Push schema
npm run db:seed          # Seed data
npx prisma studio        # Open Studio
```

### 14.4 Database URL (.env)
```
DATABASE_URL="file:./prisma/dev.db"
```

### 14.5 Prisma 7 Configuration (prisma.config.ts)
```typescript
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: "file:./prisma/dev.db",
});

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: "file:./prisma/dev.db" },
  adapter: async () => adapter,
});
```

---

## 15. MOCK USERS (lib/auth.ts)

```typescript
const MOCK_USERS: (User & { password: string })[] = [
  {
    id: "user-admin-001",
    username: "admin",
    email: "admin@quanlikho.vn",
    password: "admin123",
    role: UserRole.ADMIN,
    ...
  },
  {
    id: "user-whm-001",
    username: "warehouse_manager",
    email: "kho.truong@quanlikho.vn",
    password: "manager123",
    role: UserRole.WAREHOUSE_MANAGER,
    ...
  },
  {
    id: "user-whs-001",
    username: "warehouse_staff",
    email: "kho.nhanvien@quanlikho.vn",
    password: "staff123",
    role: UserRole.WAREHOUSE_STAFF,
    ...
  },
  {
    id: "user-pur-001",
    username: "purchaser",
    email: "mua.hang@quanlikho.vn",
    password: "purchaser123",
    role: UserRole.PURCHASER,
    ...
  },
  {
    id: "user-acc-001",
    username: "accountant",
    email: "ke.toan@quanlikho.vn",
    password: "accountant123",
    role: UserRole.ACCOUNTANT,
    ...
  },
  {
    id: "user-aud-001",
    username: "auditor",
    email: "kiem.toan@quanlikho.vn",
    password: "auditor123",
    role: UserRole.AUDITOR,
    ...
  },
];
```

---

## 16. KNOWN ISSUES & NOTES

### 16.1 Hydration Warning
```
- Có warning về button nested trong button (NotificationsDropdown)
- Không ảnh hưởng chức năng, chỉ là UI warning
```

### 16.2 SQLite Limitations
```
- Không support Enum (đã convert sang String)
- Không support String[] (đã convert sang JSON string)
- Không support Json type (đã convert sang String)
```

### 16.3 Prisma 7 Changes
```
- Datasource url phải đặt trong prisma.config.ts
- Cần adapter cho SQLite (PrismaBetterSqlite3)
- PrismaClient cần truyền adapter
```

---

## ⚡ QUICK START FOR NEW AI SESSION

Khi AI mới đọc file này, hãy:

1. **Xác nhận đã hiểu data models** bằng cách liệt kê 5 interfaces chính:
   - Product, Warehouse, InventoryItem, GoodsReceipt, GoodsIssue

2. **Xác nhận đã hiểu business rules** bằng cách giải thích công thức available:
   ```
   available = total - reserved - quarantine - damaged
   ```

3. **Xác nhận đã hiểu phân quyền** bằng cách nêu WAREHOUSE_STAFF được làm gì:
   - Xem: inventory, goods_receipt, goods_issue
   - Tạo: goods_receipt, goods_issue
   - Không duyệt, không quản lý, không xem reports

4. **Sau đó hỏi**: "Bạn cần làm gì tiếp theo?"
