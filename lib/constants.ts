import { 
  ProductCategory, 
  UnitOfMeasure, 
  GoodsReceiptStatus, 
  GoodsIssueStatus, 
  GoodsIssueReason, 
  PurchaseOrderStatus, 
  StocktakeStatus
} from "./types";

export const APP_NAME = "Quản Lý Kho";
export const APP_VERSION = "1.0.0";

export const CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: ProductCategory.ELECTRONICS, label: "Điện tử" },
  { value: ProductCategory.FURNITURE, label: "Nội thất" },
  { value: ProductCategory.OFFICE_SUPPLIES, label: "Văn phòng phẩm" },
  { value: ProductCategory.TOOLS, label: "Dụng cụ" },
  { value: ProductCategory.PACKAGING, label: "Đóng gói" },
  { value: ProductCategory.RAW_MATERIALS, label: "Nguyên vật liệu" },
  { value: ProductCategory.OTHER, label: "Khác" },
];

export const UNITS: { value: UnitOfMeasure; label: string }[] = [
  { value: UnitOfMeasure.PIECE, label: "Cái" },
  { value: UnitOfMeasure.KG, label: "Kg" },
  { value: UnitOfMeasure.GRAM, label: "Gam" },
  { value: UnitOfMeasure.LITER, label: "Lít" },
  { value: UnitOfMeasure.METER, label: "Mét" },
  { value: UnitOfMeasure.ROLL, label: "Cuộn" },
  { value: UnitOfMeasure.BOX, label: "Hộp" },
  { value: UnitOfMeasure.PALLET, label: "Pallet" },
];

export const RECEIPT_STATUS: { value: GoodsReceiptStatus; label: string; color: string }[] = [
  { value: GoodsReceiptStatus.DRAFT, label: "Nháp", color: "secondary" },
  { value: GoodsReceiptStatus.PENDING, label: "Chờ duyệt", color: "warning" },
  { value: GoodsReceiptStatus.CONFIRMED, label: "Đã xác nhận", color: "info" },
  { value: GoodsReceiptStatus.COMPLETED, label: "Hoàn thành", color: "success" },
  { value: GoodsReceiptStatus.CANCELLED, label: "Đã hủy", color: "destructive" },
];

export const ISSUE_STATUS: { value: GoodsIssueStatus; label: string; color: string }[] = [
  { value: GoodsIssueStatus.DRAFT, label: "Nháp", color: "secondary" },
  { value: GoodsIssueStatus.PENDING, label: "Chờ duyệt", color: "warning" },
  { value: GoodsIssueStatus.CONFIRMED, label: "Đã xác nhận", color: "info" },
  { value: GoodsIssueStatus.COMPLETED, label: "Hoàn thành", color: "success" },
  { value: GoodsIssueStatus.CANCELLED, label: "Đã hủy", color: "destructive" },
];

export const ISSUE_REASONS: { value: GoodsIssueReason; label: string }[] = [
  { value: GoodsIssueReason.SALES, label: "Bán hàng" },
  { value: GoodsIssueReason.PRODUCTION, label: "Sản xuất" },
  { value: GoodsIssueReason.TRANSFER, label: "Điều chuyển" },
  { value: GoodsIssueReason.SAMPLE, label: "Mẫu" },
  { value: GoodsIssueReason.DAMAGE, label: "Hư hỏng" },
  { value: GoodsIssueReason.EXPIRY, label: "Hết hạn" },
  { value: GoodsIssueReason.RETURN, label: "Trả hàng" },
];

export const ORDER_STATUS: { value: PurchaseOrderStatus; label: string; color: string }[] = [
  { value: PurchaseOrderStatus.DRAFT, label: "Nháp", color: "secondary" },
  { value: PurchaseOrderStatus.PENDING_APPROVAL, label: "Chờ duyệt", color: "warning" },
  { value: PurchaseOrderStatus.APPROVED, label: "Đã duyệt", color: "info" },
  { value: PurchaseOrderStatus.SENT, label: "Đã gửi", color: "info" },
  { value: PurchaseOrderStatus.CONFIRMED, label: "Đã xác nhận", color: "info" },
  { value: PurchaseOrderStatus.PARTIALLY_RECEIVED, label: "Nhận một phần", color: "warning" },
  { value: PurchaseOrderStatus.FULLY_RECEIVED, label: "Đã nhận đủ", color: "success" },
  { value: PurchaseOrderStatus.CLOSED, label: "Đã đóng", color: "secondary" },
  { value: PurchaseOrderStatus.CANCELLED, label: "Đã hủy", color: "destructive" },
];

export const STOCKTAKE_STATUS: { value: StocktakeStatus; label: string; color: string }[] = [
  { value: StocktakeStatus.DRAFT, label: "Nháp", color: "secondary" },
  { value: StocktakeStatus.IN_PROGRESS, label: "Đang kiểm kê", color: "warning" },
  { value: StocktakeStatus.PENDING_APPROVAL, label: "Chờ duyệt", color: "warning" },
  { value: StocktakeStatus.APPROVED, label: "Đã duyệt", color: "info" },
  { value: StocktakeStatus.COMPLETED, label: "Hoàn thành", color: "success" },
  { value: StocktakeStatus.CANCELLED, label: "Đã hủy", color: "destructive" },
];

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  badge?: string | number;
  module?: "inventory" | "goods_receipt" | "goods_issue" | "purchase_order" | "stocktake" | "suppliers" | "reports" | "settings" | "audit_log" | "warehouses";
}

export const NAV_ITEMS: NavItem[] = [
  { title: "Tổng quan", href: "/dashboard", icon: "LayoutDashboard" },
  { title: "Tồn kho", href: "/inventory", icon: "Package", module: "inventory" as const },
  { title: "Kho hàng", href: "/warehouses", icon: "Building2", module: "warehouses" as const },
  { title: "Nhập kho", href: "/goods-receipt", icon: "PackagePlus", module: "goods_receipt" as const },
  { title: "Xuất kho", href: "/goods-issue", icon: "PackageMinus", module: "goods_issue" as const },
  { title: "Đặt hàng (PO)", href: "/purchase-order", icon: "ShoppingCart", module: "purchase_order" as const },
  { title: "Kiểm kê", href: "/stocktake", icon: "ClipboardList", module: "stocktake" as const },
  { title: "Nhà cung cấp", href: "/suppliers", icon: "Truck", module: "suppliers" as const },
  { title: "Báo cáo", href: "/reports", icon: "BarChart3", module: "reports" as const },
];

export const SETTINGS_NAV_ITEMS = [
  { title: "Cài đặt", href: "/settings", icon: "Settings", module: "settings" as const },
];

export const SIDEBAR_WIDTH = 280;
export const SIDEBAR_COLLAPSED_WIDTH = 80;
export const TOPBAR_HEIGHT = 64;

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export const DATE_FORMAT = "DD/MM/YYYY";
export const DATETIME_FORMAT = "DD/MM/YYYY HH:mm";
export const CURRENCY_FORMAT = "vi-VN";

export const CATEGORY_COLORS: Record<ProductCategory, string> = {
  [ProductCategory.ELECTRONICS]: "#0ea5e9",
  [ProductCategory.FURNITURE]: "#8b5cf6",
  [ProductCategory.OFFICE_SUPPLIES]: "#10b981",
  [ProductCategory.TOOLS]: "#f59e0b",
  [ProductCategory.PACKAGING]: "#ec4899",
  [ProductCategory.RAW_MATERIALS]: "#6366f1",
  [ProductCategory.OTHER]: "#64748b",
};

export const MOCK_PRODUCTS = [
  { id: "1", sku: "SKU001", name: "Bàn làm việc", category: ProductCategory.FURNITURE, quantity: 50, unit: UnitOfMeasure.PIECE, price: 2500000, reorderLevel: 10 },
  { id: "2", sku: "SKU002", name: "Ghế ergonomic", category: ProductCategory.FURNITURE, quantity: 30, unit: UnitOfMeasure.PIECE, price: 4500000, reorderLevel: 5 },
  { id: "3", sku: "SKU003", name: "Bút bi Thiên Long", category: ProductCategory.OFFICE_SUPPLIES, quantity: 500, unit: UnitOfMeasure.PIECE, price: 5000, reorderLevel: 100 },
  { id: "4", sku: "SKU004", name: "Giấy A4", category: ProductCategory.OFFICE_SUPPLIES, quantity: 200, unit: UnitOfMeasure.BOX, price: 85000, reorderLevel: 50 },
  { id: "5", sku: "SKU005", name: "Máy tính laptop", category: ProductCategory.ELECTRONICS, quantity: 15, unit: UnitOfMeasure.PIECE, price: 15000000, reorderLevel: 3 },
  { id: "6", sku: "SKU006", name: "Ổ cứng SSD 256GB", category: ProductCategory.ELECTRONICS, quantity: 8, unit: UnitOfMeasure.PIECE, price: 1200000, reorderLevel: 5 },
  { id: "7", sku: "SKU007", name: "Kìm điện", category: ProductCategory.TOOLS, quantity: 25, unit: UnitOfMeasure.PIECE, price: 180000, reorderLevel: 10 },
  { id: "8", sku: "SKU008", name: "Thùng carton", category: ProductCategory.PACKAGING, quantity: 150, unit: UnitOfMeasure.PIECE, price: 25000, reorderLevel: 30 },
  { id: "9", sku: "SKU009", name: "Sắt tấm", category: ProductCategory.RAW_MATERIALS, quantity: 100, unit: UnitOfMeasure.KG, price: 45000, reorderLevel: 20 },
  { id: "10", sku: "SKU010", name: "Máy in laser", category: ProductCategory.ELECTRONICS, quantity: 3, unit: UnitOfMeasure.PIECE, price: 8500000, reorderLevel: 2 },
];

export const MOCK_SUPPLIERS = [
  { id: "1", name: "Công ty TNHH Việt Phát", contact: "Nguyễn Văn A", email: "contact@vietphat.vn", phone: "0901234567", address: "123 Đường ABC, Quận 1, TP.HCM", isActive: true },
  { id: "2", name: "Nhựa Bình Minh", contact: "Trần Thị B", email: "sales@binhminhplastic.com", phone: "0912345678", address: "456 Đường XYZ, Quận Bình Thạnh, TP.HCM", isActive: true },
  { id: "3", name: "Vật liệu Kim Sơn", contact: "Lê Văn C", email: "info@kimson.vn", phone: "0923456789", address: "789 Đường DEF, Quận Gò Vấp, TP.HCM", isActive: true },
];