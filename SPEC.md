# Quản Lý Kho (Warehouse Management System)

## 1. 概念与愿景

Một hệ thống quản lý kho hiện đại, mạnh mẽ với giao diện tối giản nhưng giàu tính năng. Thiết kế mang phong cách công nghiệp với các yếu tố grid-based, accent màu xanh cyan cho các thao tác chính, tạo cảm giác chuyên nghiệp và hiệu quả cho nhân viên kho.

## 2. 设计语言

### 调色板 (Dark Theme)
- **Primary**: `#0ea5e9` (Sky blue - hành động chính)
- **Secondary**: `#1e293b` (Slate dark - sidebar, card)
- **Accent**: `#22d3ee` (Cyan - highlight, hover)
- **Background**: `#0f172a` (Slate 900 - nền chính)
- **Surface**: `#1e293b` (Slate 800 - cards, panels)
- **Border**: `#334155` (Slate 700 - đường viền)
- **Text Primary**: `#f8fafc` (Slate 50)
- **Text Secondary**: `#94a3b8` (Slate 400)
- **Success**: `#10b981` (Emerald)
- **Warning**: `#f59e0b` (Amber)
- **Danger**: `#ef4444` (Red)

### 字体
- **Display**: Inter (tiêu đề, số liệu lớn)
- **Body**: Inter (nội dung, labels)
- **Mono**: JetBrains Mono (mã kho, SKU)

### 间距系统
- Base unit: 4px
- Container padding: 24px
- Card padding: 20px
- Gap: 16px (default), 24px (sections)

### 动效
- Hover transitions: 150ms ease
- Page transitions: 200ms ease-out
- Sidebar collapse: 300ms cubic-bezier

## 3. 布局与结构

### 应用 Shell
```
┌─────────────────────────────────────────────────────────┐
│ [Sidebar 280px]  │  [Topbar 64px]                       │
│                  ├─────────────────────────────────────│
│  Logo            │  Breadcrumb | Search | User Menu    │
│  ───────────     ├─────────────────────────────────────│
│  Dashboard       │                                      │
│  Inventory       │         [Main Content Area]          │
│  Goods Receipt   │                                      │
│  Goods Issue     │         Padding: 24px                 │
│  Purchase Order  │         Scrollable                   │
│  Stocktake       │                                      │
│  Suppliers       │                                      │
│  Reports         │                                      │
│  ───────────     │                                      │
│  Settings        │                                      │
└─────────────────────────────────────────────────────────┘
```

### 响应式断点
- Desktop: ≥1024px (full sidebar)
- Tablet: 768-1023px (collapsed sidebar, icons only)
- Mobile: <768px (drawer sidebar)

## 4. 功能与页面

### 4.1 Dashboard (Tổng quan KPI)
- Thẻ tổng quan: Tổng SL tồn kho, Đơn nhập/xuất tháng, Alerts
- Biểu đồ: Tồn kho theo danh mục (bar chart)
- Bảng: Top 5 sản phẩm sắp hết hàng

### 4.2 Inventory (Quản lý tồn kho)
- Bảng danh sách sản phẩm với phân trang
- Tìm kiếm theo tên, SKU, danh mục
- Thêm/Sửa/Xóa sản phẩm (Dialog form)

### 4.3 Goods Receipt (Nhập kho)
- Form tạo phiếu nhập
- Chọn sản phẩm, số lượng, đơn giá
- Danh sách phiếu nhập

### 4.4 Goods Issue (Xuất kho)
- Form tạo phiếu xuất
- Lý do xuất kho (bán hàng, thanh lý, điều chuyển)
- Danh sách phiếu xuất

### 4.5 Purchase Order (Đặt hàng)
- Tạo đơn đặt hàng với nhà cung cấp
- Trạng thái: Draft → Confirmed → Received

### 4.6 Stocktake (Kiểm kê)
- Tạo phiếu kiểm kê
- Đối chiếu số lượng thực tế vs hệ thống

### 4.7 Suppliers (Nhà cung cấp)
- Danh sách nhà cung cấp
- Thông tin liên hệ, lịch sử giao dịch

### 4.8 Reports (Báo cáo)
- Báo cáo tồn kho
- Báo cáo nhập/xuất theo thời gian
- Export PDF/Excel

### 4.9 Settings (Cấu hình)
- Cài đặt người dùng
- Cấu hình hệ thống

## 5. 组件清单

### Sidebar Navigation
- Logo + App name ở đỉnh
- Navigation items với icon + label
- Active state: background highlight + border left accent
- Collapse toggle button

### Topbar
- Breadcrumb (path hiện tại)
- Search input (global search)
- User avatar + dropdown menu
- Notifications bell

### Cards
- Background: Surface color
- Border radius: 8px
- Padding: 20px
- Shadow: subtle dark shadow

### Tables
- Header: sticky, uppercase labels
- Rows: hover highlight
- Pagination controls

### Forms
- Input fields với labels
- Validation messages
- Submit button primary style

### Status Badges
- Success (green), Warning (amber), Error (red)
- Pill shape, subtle background

## 6. 技术方案

### 框架
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Shadcn/ui (Radix primitives)

### 目录结构
```
/app
  /dashboard
  /inventory
  /goods-receipt
  /goods-issue
  /purchase-order
  /stocktake
  /suppliers
  /reports
  /settings
  layout.tsx
  page.tsx

/components
  /ui (shadcn components)
  /shared (layout components)
  /modules (feature components)

/lib
  types.ts
  constants.ts
  utils.ts

/hooks
  use-sidebar.ts
  use-local-storage.ts
```

### 数据模型
- Product: id, sku, name, category, quantity, unit, price, reorderLevel
- Supplier: id, name, contact, email, phone, address
- GoodsReceipt: id, date, supplierId, items[], total, status
- GoodsIssue: id, date, items[], reason, status
- PurchaseOrder: id, supplierId, items[], date, status
- Stocktake: id, date, items[], status