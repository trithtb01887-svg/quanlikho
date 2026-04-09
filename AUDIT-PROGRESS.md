# 📋 AUDIT FIX PROGRESS — Quản Lý Kho

> Copy file này vào thư mục gốc dự án: `c:\Users\admin\OneDrive\Desktop\quanlikho\AUDIT-PROGRESS.md`
> Khi chuyển session mới, paste nội dung file này vào chat cùng với MASTER CONTEXT.

---

## ✅ ĐÃ FIX XONG

### 1. Race Condition tồn kho (Audit 2 - 🔴 CAO)
- **File:** `app/api/goods-issue/route.ts` (dòng 121-172)
- **File:** `app/api/goods-receipt/route.ts` (dòng 131-196)
- **File:** `app/api/stocktake/route.ts` (dòng 125-171)
- **Fix:** Bọc toàn bộ update tồn kho trong `prisma.$transaction()`
- **Fix:** Kiểm tra `quantityAvailable >= requestedQuantity` trước khi xuất
- **Fix:** Công thức `quantityAvailable = Math.max(0, total - reserved - quarantine - damaged)`

### 2. FEFO không được gọi trong API (Audit 2 - 🟡 TRUNG)
- **File:** `app/api/goods-issue/route.ts`
- **Fix:** Sort inventory items theo `expiryDate` tăng dần trước khi xuất
- **Fix:** null/undefined expiryDate xếp cuối, allocate từ lô đầu tiên

### 3. API không ghi Audit Log (Audit 2 - 🟡 TRUNG)
- **File:** `app/api/goods-issue/route.ts` → action: `GOODS_ISSUE`
- **File:** `app/api/goods-receipt/route.ts` → action: `GOODS_RECEIPT`
- **File:** `app/api/stocktake/route.ts` → action: `STOCKTAKE_ADJUSTMENT`
- **Fix:** Tạo `prisma.auditLog.create()` bên trong transaction sau mỗi update tồn kho
- **Fix:** Ghi `oldValue`, `newValue`, `userId` từ request headers

### 4. Input Validation thiếu (Audit 1 - 🟠 CAO)
- **File:** `app/api/goods-issue/route.ts`
- **File:** `app/api/goods-receipt/route.ts`
- **File:** `app/api/purchase-order/route.ts`
- **Fix:** Thêm Zod schema validation cho tất cả POST requests
- **Fix:** Chuẩn hóa error response format: `{ error, details }` với status 400/500

### 5. /mobile 404 + Redirect
- **File:** `app/mobile/page.tsx` — đã tạo mới
- **File:** `app/mobile/layout.tsx` — thêm redirect về `/dashboard` khi `window.innerWidth >= 1024`
- **Fix:** Dùng `window.location.href = "/dashboard"` thay vì `router.replace()`

### 6. CSRF Protection (Audit 1 - 🔴 NGUY HIỂM)
- **File:** `middleware.ts` (dòng 1-23)
- **File:** `lib/api.ts` — đã tạo mới
- **File:** `lib/store.ts` — đã cập nhật
- **Fix:** GET → set CSRF cookie (24h expiry), POST/PUT/PATCH/DELETE → validate token header vs cookie
- **Fix:** Tạo `apiFetch()` helper tự động gắn CSRF token vào mọi request
- **Fix:** Skip validation cho `/api/auth/*` endpoints

### 7. Sensitive Data Exposure (Audit 1 - 🔴 NGUY HIỂM)
- **File:** `lib/auth.ts` (dòng 479-495)
- **Fix:** Tạo `sanitizeUser()` function — loại bỏ `passwordHash`, `failedLoginAttempts`, `lockedUntil`, `lastLoginIp`
- **Fix:** Dùng `sanitizeUser()` trong `login()` và `getUserById()`
- **Fix:** Tạo type `SafeUser` để type-safe

### 8. Pagination cho GET List APIs (Audit 3 - 🔴 CRITICAL)
- **File:** `app/api/products/route.ts`
- **File:** `app/api/inventory/route.ts`
- **File:** `app/api/goods-receipt/route.ts`
- **File:** `app/api/goods-issue/route.ts`
- **File:** `app/api/purchase-order/route.ts`
- **File:** `app/api/suppliers/route.ts`
- **File:** `app/api/stocktake/route.ts`
- **Fix:** Thêm params `page`, `pageSize` vào GET handlers
- **Fix:** Response format: `{ data: [], pagination: { page, pageSize, total, totalPages, hasNext, hasPrev } }`
- **Fix:** Mặc định `pageSize = 20`, tối đa `100`

### 9. Database Index (Audit 3 - 🟡 HIGH)
- **File:** `prisma/schema.prisma`
- **Fix:** Thêm indexes cho InventoryItem, GoodsReceipt, GoodsIssue, PurchaseOrder, Product, AuditLog
- **Fix:** Đã chạy `npx prisma db push` thành công

### 10. Dashboard load quá nặng (Audit 3 - 🔴 CRITICAL)
- **File:** `app/api/dashboard/route.ts` — đã tạo mới
- **File:** `lib/store.ts`
- **File:** `app/dashboard/page.tsx`
- **Fix:** Tạo `/api/dashboard` trả về aggregated stats thay vì load toàn bộ inventoryItems
- **Fix:** Store `initializeStore()` chỉ load products, warehouses, và dashboard stats
- **Fix:** Dashboard page sử dụng `dashboardData` từ API thay vì tính toán client-side
- **Fix:** Không load goodsReceipts, goodsIssues, inventoryItems khi init

---

## 🔄 ĐANG LÀM (Session hiện tại đang fix)

*(Tất cả các task đã hoàn thành trong session này)*

---

## ⏳ CHƯA LÀM

### 10. Dashboard load toàn bộ inventory (Audit 3 - 🔴 CRITICAL)
- **File cần sửa:** `app/dashboard/page.tsx` hoặc component dashboard
- **Việc cần làm:**
  - Lazy load charts với `next/dynamic`
  - Không load toàn bộ inventoryItems trong dashboard
  - Chỉ load aggregated stats từ API

### 11. Toast Notification (Audit 4 - 🔴 CAO)
- **File:** `app/layout.tsx`, `lib/store.ts`, `lib/api.ts`
- **Fix:** Đã cài `sonner`, thêm `<Toaster position="top-right" richColors theme="dark" />`
- **Fix:** Đã thêm toast vào các actions: createGoodsReceipt, completeGoodsReceipt, createGoodsIssue, completeGoodsIssue, createPurchaseOrder, approvePurchaseOrder, cancelPurchaseOrder, createStocktake, approveStocktake, adjustInventoryQuantity, checkLowStockAlerts
- **Fix:** Đã thêm global error handling trong apiFetchJSON

### 12. Error Boundary (Audit 4 - 🔴 CAO)
- **File:** `components/shared/ErrorBoundary.tsx`
- **Files:** Đã wrap tất cả module pages với ErrorBoundary
- **Modules:** Dashboard, Tồn kho, Nhập kho, Xuất kho, Đơn đặt hàng, Kiểm kê, Nhà cung cấp, Báo cáo

### 13. Rate Limiting API (Audit 1 - 🟠 CAO)
- **File:** `middleware.ts`, `lib/api.ts`
- **Fix:** Đã thêm in-memory rate limiter
- **Fix:** Giới hạn: Auth endpoints 10/min, Mutations 60/min, GET 100/min
- **Fix:** Trả về 429 khi vượt giới hạn với headers Retry-After
- **Fix:** Đã thêm toast 429 trong api.ts

### 14. TypeScript `as any` (Audit 4 - ⚠️ TRUNG)
- **Files đã fix:** `lib/auth.ts`, `app/goods-issue/page.tsx`, `app/goods-receipt/page.tsx`, `app/api/dashboard/route.ts`, `components/shared/index.ts`
- **Fix:** Thay `status: 1 as any` bằng `UserStatus.ACTIVE`
- **Fix:** Thay `unit: "piece" as any` bằng `UnitOfMeasure.PIECE`
- **Fix:** Thay `category: "electronics" as any` bằng `ProductCategory.ELECTRONICS`
- **Fix:** Thêm explicit type cho `$queryRaw` trong dashboard API

### 15. Audit Logging hoàn chỉnh (Audit 1 - 🟢 THẤP)
- **File:** `lib/store.ts`
- **Fix:** Đã thêm `console.warn("[AUDIT]")` cho các actions chưa có server-side audit:
  - `deleteProduct`
  - `deleteWarehouse`
  - `deleteSupplier`

### 16. File Upload Validation (Audit 1 - 🟢 THẤP)
- **Fix:** Không có file upload trong dự án (input type="file" hoặc FormData không tìm thấy)
- **Trạng thái:** Bỏ qua task này

### 17. Fix TypeScript pre-existing (Audit 4 - 🟢 THẤP)
- **Files đã fix:**
  - `lib/db.ts` — Đã cài `@types/better-sqlite3`, sửa adapter API
  - `prisma.config.ts` — Đã loại bỏ adapter config không hợp lệ

---

## 📊 TỔNG TIẾN TRÌNH

| Nhóm | Tổng | Đã fix | Còn lại |
|------|------|--------|---------|
| 🔴 CRITICAL/NGUY HIỂM | 6 | 7 | 0 |
| 🟠 CAO | 5 | 5 | 0 |
| 🟡 TRUNG | 5 | 5 | 0 |
| 🟢 THẤP | 3 | 3 | 0 |
| **Tổng** | **19** | **19** | **0** |

---

## 🚀 CÁCH DÙNG FILE NÀY

Khi bắt đầu session mới, paste vào chat:
1. Nội dung file `MASTER CONTEXT` (file md lớn của dự án)
2. Nội dung file này (`AUDIT-PROGRESS.md`)
3. Nói: *"Tiếp tục fix từ mục số 6 — CSRF Protection"*