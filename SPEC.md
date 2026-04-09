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
- **Scan barcode để tìm nhanh** - Scan → nhảy đến dòng sản phẩm + popup chi tiết (tồn kho, vị trí, hạn SD)
- **In nhãn barcode/QR** cho từng sản phẩm hoặc in hàng loạt
- Thêm/Sửa/Xóa sản phẩm (Dialog form)

### 4.3 Goods Receipt (Nhập kho)
- Form tạo phiếu nhập
- Chọn sản phẩm, số lượng, đơn giá
- **Scan barcode sản phẩm** → tự tìm SKU trong database
  - Nếu tìm thấy → tự điền tên hàng, đơn vị, giá vốn
  - Nếu không tìm thấy → hỏi "Tạo sản phẩm mới?"
- Danh sách phiếu nhập

### 4.4 Goods Issue (Xuất kho)
- Form tạo phiếu xuất với picking list
- Lý do xuất kho (bán hàng, thanh lý, điều chuyển)
- **Scan thêm hàng vào picking list**
- **Scan xác nhận đã pick** từng dòng (check ✅)
- **Cảnh báo nếu scan sai** sản phẩm so với picking list
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

### Barcode Components

#### BarcodeScanner
- Sử dụng camera (webcam/điện thoại) để scan real-time
- Thư viện: @zxing/library
- Hỗ trợ định dạng: CODE_128, CODE_39, EAN_13, EAN_8, QR_CODE, DATA_MATRIX, UPC_A, UPC_E, ITF, CODABAR
- UI: khung scan với animation viền xanh, scanning line
- Toggle camera trước/sau (cho mobile)
- Flashlight toggle
- Error handling: không có camera, từ chối quyền, không nhận diện được

#### BarcodeGenerator
- Generate QR code cho sản phẩm (react-qr-code)
- QR chứa: SKU, tên, barcode gốc (JSON format)
- In nhãn đơn hoặc hàng loạt
- Kích thước nhãn chuẩn: 50x30mm (phù hợp Xprinter/TSC/Zebra)
- Preview QR code trước khi in
- Download QR code as PNG

### Export & Print

#### Excel Export (lib/exportExcel.ts)
- **exportInventoryReport**: 
  - Sheet 1: Tồn kho tổng hợp (SKU, tên, kho, tồn, giá trị)
  - Sheet 2: Chi tiết theo lô (lot number, hạn SD, vị trí)
  - Sheet 3: Hàng cần đặt thêm (dưới reorder point)
  - Sheet 4: Tổng hợp theo kho
  - Format: header xanh đậm, freeze row, auto filter, số #,##0

- **exportGoodsReceipts**: Danh sách GRN theo kỳ
- **exportGoodsIssues**: Danh sách phiếu xuất theo kỳ
- **exportPurchaseOrders**: Danh sách PO + Pivot theo NCC + tổng theo trạng thái

#### PDF Print Templates (lib/printTemplates.ts)
- **printGoodsReceipt**: Phiếu Nhập Kho A4
  - Header: logo, tên phiếu, số GRN, ngày
  - Thông tin: NCC, người giao, người nhận, kho
  - Bảng hàng: STT, SKU, tên, SL, đơn giá, thành tiền
  - Footer: Tổng bằng chữ, ô ký tên

- **printGoodsIssue**: Phiếu Xuất Kho A4
  - Thêm lý do xuất, bộ phận nhận
  - Cột serial number cho ngành điện tử

- **printPickingList**: Picking List A5
  - Sắp xếp theo vị trí (tối ưu đường đi)
  - Font lớn 14px dễ đọc
  - Checkbox đã lấy

- **printPurchaseOrder**: Đơn Đặt Hàng A4
- **printBarcodeLabels**: Nhãn 50x30mm hàng loạt

### Electronics/Component Features (Ngành điện tử)
- Hỗ trợ scan serial number (dài, có ký tự đặc biệt)
- Một sản phẩm có thể có nhiều barcode (barcode NCC khác barcode nội bộ)
- Mapping: barcode NCC → SKU nội bộ (tự động resolve khi scan)

## 6. 技术方案

### 框架
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Shadcn/ui (Radix primitives)
- Zustand (state management)
- @zxing/library (barcode scanning)
- react-qr-code (QR code generation)
- recharts (charts)
- xlsx + file-saver (Excel export)
- jspdf + jspdf-autotable (PDF generation)

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
  /mobile (PWA Mobile-first)
    /scan
    /goods-receipt
    /goods-issue
    /stocktake
    /offline
    layout.tsx
    page.tsx
  layout.tsx
  page.tsx
  sw.ts (Service Worker)
  middleware.ts (Mobile redirect)

/components
  /ui (shadcn components)
  /shared (layout + barcode components)
    BarcodeScanner.tsx (camera scanner với @zxing)
    BarcodeGenerator.tsx (QR generator với react-qr-code)
    sidebar.tsx
    topbar.tsx
    app-layout.tsx
  ServiceWorkerProvider.tsx
  /modules (feature components)

/lib
  types.ts
  constants.ts
  utils.ts
  mobile-detect.ts (Device detection)
  store.ts (Zustand state)
  exportExcel.ts (xlsx export functions)
  printTemplates.ts (PDF print templates)

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

---

## 7. Mobile PWA Features

### 7.1 Mobile Layout (/app/mobile/)
- Mobile-first responsive design với bottom navigation bar
- Touch targets tối thiểu 48px cho trải nghiệm mobile
- Auto-redirect từ desktop sang mobile khi màn hình < 768px thông qua middleware
- Font size 18px cho nội dung dễ đọc trên thiết bị di động

### 7.2 Mobile Dashboard (/app/mobile/page.tsx)
- Greeting message với tên nhân viên
- 4 nút chức năng chính: Nhập kho, Xuất kho, Kiểm kê, Scan nhanh
- Danh sách công việc hôm nay với PO cần nhận và đơn cần xuất
- Số lượng cảnh báo cần xử lý

### 7.3 Scan nhanh (/app/mobile/scan/page.tsx)
- Camera integration cho barcode scanning trực tiếp từ thiết bị
- Popup kết quả bao gồm tên hàng, tồn kho, vị trí và hạn sử dụng
- Action buttons cho nhập kho, xuất kho, và xem chi tiết
- Lịch sử scan gần nhất (10 items) để tra cứu nhanh

### 7.4 Nhập kho (/app/mobile/goods-receipt/page.tsx)
- Form mobile-friendly với input lớn và dễ sử dụng
- Barcode scanning integration để thêm hàng nhanh chóng
- Nút +/- lớn cho việc điều chỉnh số lượng
- Nút xác nhận "NHẬP KHO" màu xanh với visual feedback khi hoàn thành

### 7.5 Xuất kho (/app/mobile/goods-issue/page.tsx)
- Picking list hiển thị dạng card từng bước một
- Swipe gestures: vuốt phải đánh dấu đã lấy, vuốt trái báo thiếu hàng
- Progress bar theo dõi X/Y items đã được pick
- Confirmation modal xác nhận hoàn thành đơn hàng

### 7.6 Kiểm kê (/app/mobile/stocktake/page.tsx)
- Danh sách card sản phẩm cần đếm với giao diện rõ ràng
- Barcode scanning hoặc search để nhanh chóng tìm sản phẩm
- Input số lượng thực tế đếm được cho mỗi sản phẩm
- Auto-sync khi có kết nối mạng và auto-save localStorage để dữ liệu không bị mất

### 7.7 PWA Config (/public/manifest.json)
- App name: "Kho [Tên Công Ty]" với standalone display mode
- Icons 192x192 và 512x512 cho các kích thước màn hình khác nhau
- Theme color #0ea5e9 (Sky blue) tương ứng với brand identity
- Shortcuts cho Scan nhanh, Nhập kho, và Xuất kho để truy cập nhanh

### 7.8 Service Worker (/app/sw.ts)
- Cache các trang mobile và static assets khi online
- Offline fallback hiển thị trang offline riêng với thông tin giao dịch chờ
- Queue các giao dịch offline và sync khi có mạng trở lại
- Thông báo "Đã đồng bộ X giao dịch" khi quá trình sync hoàn tất

### 7.9 Middleware (/middleware.ts)
- Tự động detect thiết bị di động và redirect đến /mobile
- Cookie preference cho phép người dùng chọn phiên bản desktop hoặc mobile
- Bypass cho API routes, static files, và các đường dẫn không cần redirect

### 7.10 Electronics/Component Features (Ngành điện tử)
- Serial number scanning cho từng linh kiện khi nhập hoặc xuất kho
- Thông số kỹ thuật hiển thị ngắn gọn trong kết quả scan
- Cảnh báo ESD cho hàng nhạy cảm tĩnh điện khi scan các linh kiện đặc biệt
- Serial number tracking trong goods receipt và goods issue để theo dõi chi tiết từng sản phẩm

### 7.11 Offline Support
- LocalStorage lưu trữ pending stocktake và transactions khi offline
- Sync tự động khi có mạng thông qua service worker
- Visual feedback hiển thị trạng thái online/offline
- Transaction queue trong IndexedDB để quản lý các thao tác chờ đồng bộ