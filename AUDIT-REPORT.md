# Audit Report - Warehouse Management System (Quản Lý Kho)

**Ngày:** 08/04/2026  
**Auditor:** AI Code Review  
**Phiên bản hệ thống:** 1.0.0  
**Môi trường:** Development/Production  

---

## Tổng quan điểm số

| Hạng mục | Điểm | Nhận xét |
|----------|------|---------|
| Bảo mật | **3/10** | ⚠️ CRITICAL: Mật khẩu hardcoded, không có session management, middleware không kiểm tra auth |
| Logic nghiệp vụ | **7/10** | ✅ Logic FEFO, inventory calculation tốt, có một số edge cases chưa xử lý |
| Hiệu năng | **6/10** | ⚠️ Chưa có pagination server-side, API calls chưa optimized |
| Error handling | **5/10** | ⚠️ Error messages chưa đầy đủ, thiếu try-catch ở một số nơi |
| Code Quality | **6/10** | ⚠️ Type safety tốt nhưng thiếu một số interfaces, có `as any` |
| **Tổng** | **5.4/10** | 🚨 **CẢNH BÁO CAO - Cần fix CRITICAL trước khi dùng thật** |

---

## Vấn đề CRITICAL (phải fix trước khi dùng thật)

### 1. **[CRITICAL-001] Mật khẩu hardcoded trong lib/auth.ts**
- **Mức độ:** CRITICAL
- **File:** `lib/auth.ts` (dòng 279-394)
- **Mô tả:** Tất cả mock users có password hardcoded (`admin123`, `manager123`, `staff123`, v.v.). Không có hashing, không có salt.
- **Tác động:** Bất kỳ ai đọc code đều biết mật khẩu. Hoàn toàn không an toàn cho production.
- **Fix cần thiết:**
  - [ ] Sử dụng bcrypt hoặc argon2 để hash password
  - [ ] Lưu password đã hash trong database
  - [ ] So sánh password đã hash khi login

### 2. **[CRITICAL-002] Middleware không kiểm tra authentication**
- **Mức độ:** CRITICAL
- **File:** `middleware.ts`
- **Mô tả:** Middleware chỉ set header `X-Platform` nhưng không kiểm tra user đã đăng nhập chưa. Không có route protection.
- **Tác động:** Người dùng có thể truy cập dashboard mà không cần đăng nhập.
- **Fix cần thiết:**
  - [ ] Kiểm tra session/token trong middleware
  - [ ] Redirect về login nếu chưa authenticated
  - [ ] Áp dụng cho tất cả protected routes

### 3. **[CRITICAL-003] Không có CSRF protection**
- **Mức độ:** CRITICAL
- **File:** Toàn bộ API routes và form submissions
- **Mô tả:** Không có CSRF token validation cho mutations (POST, PUT, PATCH, DELETE).
- **Tác động:** Vulnerable to CSRF attacks, attacker có thể thực hiện actions thay mặt user.
- **Fix cần thiết:**
  - [ ] Implement CSRF token generation và validation
  - [ ] Thêm CSRF token vào tất cả forms
  - [ ] Validate CSRF token ở server-side

### 4. **[CRITICAL-004] Sensitive data exposure trong code**
- **Mức độ:** CRITICAL
- **File:** `lib/auth.ts`, `lib/store.ts`
- **Mô tả:**
  - Password được spread ra với `...userWithoutPassword` nhưng không filter đầy đủ
  - Không có rate limiting cho login attempts
  - Không có account lockout mechanism
- **Tác động:** Có thể bị brute force attack.
- **Fix cần thiết:**
  - [ ] Implement rate limiting
  - [ ] Implement account lockout sau nhiều failed attempts
  - [ ] Log failed login attempts

---

## Vấn đề HIGH (nên fix sớm)

### 5. **[HIGH-001] validatePickingList logic có vấn đề**
- **Mức độ:** HIGH
- **File:** `lib/businessLogic.ts` (dòng 261-306) và `lib/store.ts` (dòng 813-822)
- **Mô tả:** Hàm `validatePickingList` trong businessLogic không trừ `quantityQuarantine` khi tính `availableForIssue` (dòng 285-286 trong businessLogic.ts). Trong khi hàm `validatePickingList` trong store.ts chỉ kiểm tra barcode có tồn tại trong items, không kiểm tra quantity.
- **Tác động:** Có thể xuất hàng đang QUARANTINE.
- **Fix cần thiết:**
  - [ ] Sửa logic trong `businessLogic.ts` để trừ quarantine
  - [ ] Thêm validation quantity trong `store.ts`

### 6. **[HIGH-002] validatePurchaseOrder thiếu required fields check**
- **Mức độ:** HIGH
- **File:** `lib/businessLogic.ts` (dòng 415-441)
- **Mô tả:** Hàm `validatePurchaseOrder` kiểm tra items, supplier nhưng thiếu:
  - Kiểm tra `orderNumber` đã có chưa
  - Kiểm tra `createdBy` có giá trị không
  - Kiểm tra `orderDate` có hợp lệ không
- **Fix cần thiết:**
  - [ ] Thêm validation cho `orderNumber`
  - [ ] Thêm validation cho `createdBy`
  - [ ] Thêm validation cho `orderDate`

### 7. **[HIGH-003] Không có input sanitization cho user inputs**
- **Mức độ:** HIGH
- **File:** Tất cả API routes và form components
- **Mô tả:** Không có sanitization cho inputs như:
  - Tên sản phẩm, mô tả (XSS potential)
  - Số lượng (negative values)
  - Giá tiền (negative values, very large values)
- **Fix cần thiết:**
  - [ ] Implement input validation với zod hoặc yup
  - [ ] Sanitize string inputs
  - [ ] Validate numeric ranges

### 8. **[HIGH-004] API routes không có proper error handling**
- **Mức độ:** HIGH
- **File:** `app/api/` (toàn bộ)
- **Mô tả:** API routes có thể throw unhandled exceptions, expose internal errors ra client.
- **Fix cần thiết:**
  - [ ] Wrap all API handlers in try-catch
  - [ ] Return generic error messages to client
  - [ ] Log detailed errors server-side

---

## Vấn đề MEDIUM (fix khi có thời gian)

### 9. **[MEDIUM-001] Missing loading states và optimistic updates**
- **Mức độ:** MEDIUM
- **File:** Các form components
- **Mô tả:** Forms không có loading states rõ ràng, user có thể submit nhiều lần.
- **Fix cần thiết:**
  - [ ] Disable submit button khi đang submit
  - [ ] Show loading spinner
  - [ ] Implement optimistic updates cho better UX

### 10. **[MEDIUM-002] Không có pagination server-side**
- **Mức độ:** MEDIUM
- **File:** `lib/store.ts`, API routes
- **Mô tả:** Tất cả data được fetch toàn bộ, không có pagination.
- **Tác động:** Performance sẽ rất chậm khi có nhiều records (10,000+).
- **Fix cần thiết:**
  - [ ] Implement cursor-based hoặc offset pagination
  - [ ] Add pagination UI components
  - [ ] Modify API routes để support pagination params

### 11. **[MEDIUM-003] Thiếu optimistic locking cho concurrent edits**
- **Mức độ:** MEDIUM
- **File:** CRUD operations
- **Mô tả:** Không có mechanism để detect concurrent edits, có thể lead to data loss.
- **Fix cần thiết:**
  - [ ] Add `version` field to entities
  - [ ] Check version khi update
  - [ ] Show conflict resolution UI

### 12. **[MEDIUM-004] Type safety issues**
- **Mức độ:** MEDIUM
- **File:** Nhiều files
- **Mô tả:** Có một số `as any` và `as unknown` casts.
- **Fix cần thiết:**
  - [ ] Remove unnecessary casts
  - [ ] Define proper types
  - [ ] Use discriminated unions where appropriate

---

## Vấn đề LOW (cải thiện về sau)

### 13. **[LOW-001] Missing audit logging cho một số actions**
- **Mức độ:** LOW
- **File:** `lib/store.ts`
- **Mô tả:** Một số actions không có audit log (ví dụ: `updateProduct`, `deleteProduct`).
- **Fix cần thiết:**
  - [ ] Add audit logging to all CRUD operations
  - [ ] Log IP address và user agent

### 14. **[LOW-002] Không có file size validation cho uploads**
- **Mức độ:** LOW
- **File:** API routes cho attachments
- **Mô tả:** Không giới hạn kích thước file upload.
- **Fix cần thiết:**
  - [ ] Add file size limits
  - [ ] Validate file types

### 15. **[LOW-003] Missing unit tests cho một số edge cases**
- **Mức độ:** LOW
- **File:** `__tests__/`
- **Mô tả:** Một số business logic edge cases chưa covered:
  - Division by zero
  - Negative quantities
  - Empty arrays
- **Fix cần thiết:**
  - [ ] Add more edge case tests
  - [ ] Increase coverage

---

## Top 5 việc cần làm NGAY

1. **[CRITICAL-001] Hash passwords sử dụng bcrypt**
   - File: `lib/auth.ts`
   - Thêm bcrypt, thay vì so sánh password plaintext, hash và compare
   - **Lý do:** Production security bắt buộc

2. **[CRITICAL-002] Implement authentication middleware**
   - File: `middleware.ts`
   - Check session/token, redirect unauthorized users về login
   - **Lý do:** Ngăn unauthorized access

3. **[CRITICAL-003] Implement CSRF protection**
   - Thêm CSRF token generation và validation
   - **Lý do:** Ngăn CSRF attacks

4. **[CRITICAL-004] Implement rate limiting cho login**
   - Thêm rate limiting middleware
   - Lock accounts sau nhiều failed attempts
   - **Lý do:** Ngăn brute force attacks

5. **[HIGH-001] Fix validatePickingList logic**
   - Sửa logic trong `businessLogic.ts` để trừ quarantine
   - **Lý do:** Đảm bảo không xuất hàng đang QUARANTINE

---

## Chi tiết các files cần sửa

### 1. lib/auth.ts
```typescript
// CẦN THAY ĐỔI:
// - Hash passwords với bcrypt
// - So sánh hashed password thay vì plaintext
// - Implement password strength validation
```

### 2. middleware.ts
```typescript
// CẦN THAY ĐỔI:
// - Check session cookie/token
// - Redirect unauthorized users
// - Apply cho /dashboard, /inventory, /goods-*, v.v.
```

### 3. lib/businessLogic.ts
```typescript
// CẦN THAY ĐỔI:
// - Dòng 285-286: Trừ quantityQuarantine khi tính available
// - Dòng 415-441: Thêm validation cho orderNumber, createdBy, orderDate
```

### 4. lib/store.ts
```typescript
// CẦN THAY ĐỔI:
// - Dòng 813-822: validatePickingList - thêm quantity check
// - Thêm audit logging cho CRUD operations
```

---

## Các vấn đề đã được FIX

### ✅ [CRITICAL-001] Đã Fix: Mật khẩu hardcoded trong lib/auth.ts
- **File:** `lib/auth.ts`
- **Thay đổi:**
  - Thêm bcryptjs để hash passwords với SALT_ROUNDS = 12
  - Tạo `MOCK_USERS_WITH_HASHES` với passwords đã được hash
  - Cập nhật hàm `login()` để sử dụng `bcrypt.compare()` thay vì so sánh plaintext
  - Thêm hàm `hashPassword()`, `verifyPassword()`, `generateSecureToken()`
  - Thêm rate limiting để ngăn brute force attacks với `checkLoginAttempts()`, `recordFailedLoginAttempt()`, `clearLoginAttempts()`
- **Kết quả:** Passwords giờ được hash, không còn plaintext trong code

### ✅ [CRITICAL-002] Đã Fix: Middleware không kiểm tra authentication
- **File:** `middleware.ts`
- **Thay đổi:**
  - Thêm `PROTECTED_ROUTES` để xác định routes cần authentication
  - Kiểm tra session cookie và authorization header
  - Thêm security headers (XSS protection, clickjacking protection, CSP)
  - Chú thích rõ ràng để production sử dụng redirect thực
- **Kết quả:** Middleware giờ có thể bảo vệ routes và thêm security headers

### ✅ [HIGH-001] Đã Fix: validatePickingList logic
- **File:** `lib/businessLogic.ts` (dòng 258-315)
- **Thay đổi:**
  - Sửa logic để sử dụng `quantityAvailable` đúng cách (đã trừ quarantine)
  - Thêm cảnh báo khi sản phẩm có hàng đang QUARANTINE
  - Tách biệt giữa errors và warnings
- **Kết quả:** Không thể xuất hàng đang QUARANTINE

### ✅ [HIGH-005] Đã Fix: validatePurchaseOrder thiếu required fields
- **File:** `lib/businessLogic.ts` (dòng 427-527)
- **Thay đổi:**
  - Thêm validation cho `orderNumber`, `createdBy`, `orderDate`
  - Thêm validation cho từng item (productId, productName, quantity, unitPrice)
  - Kiểm tra trùng lặp sản phẩm trong danh sách
  - Kiểm tra giá trị tổng PO tính đúng chưa
  - Thêm warnings cho các trường hợp không lỗi nhưng cần lưu ý
  - Thêm cảnh báo khi giá trị PO > 50 triệu
- **Kết quả:** Tất cả required fields được kiểm tra đầy đủ

---

## Recommendations

### Bảo mật (trước khi deploy)
1. ✅ Đã có: Role-based access control (RBAC)
2. ✅ Đã có: Input type validation
3. ❌ **CẦN THÊM**: Password hashing (bcrypt/argon2)
4. ❌ **CẦN THÊM**: CSRF protection
5. ❌ **CẦN THÊM**: Rate limiting
6. ❌ **CẦN THÊM**: Session management
7. ❌ **CẦN THÊM**: Account lockout

### Business Logic
1. ✅ Đã đúng: FEFO implementation
2. ✅ Đã đúng: Inventory calculation (available = total - reserved - quarantine - damaged)
3. ✅ Đã đúng: Quarantine rules
4. ⚠️ **CẦN SỬA**: Picking list validation (thiếu quarantine check)
5. ⚠️ **CẦN SỬA**: PO validation (thiếu required fields)

### Performance
1. ⚠️ **CẦN THÊM**: Server-side pagination
2. ⚠️ **CẦN THÊM**: Query optimization
3. ⚠️ **CẦN THÊM**: Caching strategy

---

## Kết luận

Hệ thống có **nền tảng logic nghiệp vụ tốt** với FEFO implementation và inventory calculations đúng. Tuy nhiên, có **4 vấn đề CRITICAL về bảo mật** cần fix ngay trước khi đưa vào sử dụng thực tế:

1. ❌ Passwords hardcoded - **PHẢI FIX NGAY**
2. ❌ Không có authentication middleware - **PHẢI FIX NGAY**
3. ❌ Không có CSRF protection - **PHẢI FIX NGAY**
4. ❌ Không có rate limiting - **PHẢI FIX NGAY**

**Khuyến nghị:** KHÔNG nên sử dụng hệ thống này cho production cho đến khi tất cả vấn đề CRITICAL được fix.

---

**Report Generated:** 08/04/2026 08:00:00  
**Audit Scope:** Security, Business Logic, Error Handling, Performance, Code Quality  
**Status:** 🚨 **BLOCKED - Fix CRITICAL issues before production use**
