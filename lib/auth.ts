"use client";

import { User, UserRole, UserPermissions, UserStatus } from "./types";
import bcrypt from "bcryptjs";

// Salt rounds cho password hashing
const SALT_ROUNDS = 12;

// ============================================
// ROLE PERMISSIONS - PHẢI KHAI BÁO TRƯỚC
// ============================================

export const ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  [UserRole.ADMIN]: {
    canManageProducts: true,
    canManageInventory: true,
    canViewInventory: true,
    canCreateInventoryAdjustments: true,
    canViewGoodsReceipt: true,
    canCreateGoodsReceipt: true,
    canApproveGoodsReceipt: true,
    canViewGoodsIssue: true,
    canCreateGoodsIssue: true,
    canApproveGoodsIssue: true,
    canViewPurchaseOrders: true,
    canManagePurchaseOrders: true,
    canManageGoodsReceipt: true,
    canManageGoodsIssue: true,
    canManageStocktake: true,
    canManageSuppliers: true,
    canViewReports: true,
    canExportData: true,
    canManageUsers: true,
    canManageSettings: true,
    canApproveTransactions: true,
  },

  [UserRole.WAREHOUSE_MANAGER]: {
    canManageProducts: false,
    canManageInventory: true,
    canViewInventory: true,
    canCreateInventoryAdjustments: true,
    canViewGoodsReceipt: true,
    canCreateGoodsReceipt: true,
    canApproveGoodsReceipt: true,
    canViewGoodsIssue: true,
    canCreateGoodsIssue: true,
    canApproveGoodsIssue: true,
    canViewPurchaseOrders: true,
    canManagePurchaseOrders: false,
    canManageGoodsReceipt: true,
    canManageGoodsIssue: true,
    canManageStocktake: true,
    canManageSuppliers: true,
    canViewReports: true,
    canExportData: true,
    canManageUsers: false,
    canManageSettings: false,
    canApproveTransactions: true,
  },

  [UserRole.WAREHOUSE_STAFF]: {
    canManageProducts: false,
    canManageInventory: false,
    canViewInventory: true,
    canCreateInventoryAdjustments: false,
    canViewGoodsReceipt: true,
    canCreateGoodsReceipt: true,
    canApproveGoodsReceipt: false,
    canViewGoodsIssue: true,
    canCreateGoodsIssue: true,
    canApproveGoodsIssue: false,
    canViewPurchaseOrders: false,
    canManagePurchaseOrders: false,
    canManageGoodsReceipt: false,
    canManageGoodsIssue: false,
    canManageStocktake: true,
    canManageSuppliers: false,
    canViewReports: false,
    canExportData: false,
    canManageUsers: false,
    canManageSettings: false,
    canApproveTransactions: false,
  },

  [UserRole.PURCHASER]: {
    canManageProducts: false,
    canManageInventory: false,
    canViewInventory: true,
    canCreateInventoryAdjustments: false,
    canViewGoodsReceipt: false,
    canCreateGoodsReceipt: false,
    canApproveGoodsReceipt: false,
    canViewGoodsIssue: false,
    canCreateGoodsIssue: false,
    canApproveGoodsIssue: false,
    canViewPurchaseOrders: true,
    canManagePurchaseOrders: true,
    canManageGoodsReceipt: false,
    canManageGoodsIssue: false,
    canManageStocktake: false,
    canManageSuppliers: true,
    canViewReports: true,
    canExportData: true,
    canManageUsers: false,
    canManageSettings: false,
    canApproveTransactions: false,
  },

  [UserRole.ACCOUNTANT]: {
    canManageProducts: false,
    canManageInventory: false,
    canViewInventory: true,
    canCreateInventoryAdjustments: false,
    canViewGoodsReceipt: true,
    canCreateGoodsReceipt: false,
    canApproveGoodsReceipt: false,
    canViewGoodsIssue: true,
    canCreateGoodsIssue: false,
    canApproveGoodsIssue: false,
    canViewPurchaseOrders: true,
    canManagePurchaseOrders: false,
    canManageGoodsReceipt: false,
    canManageGoodsIssue: false,
    canManageStocktake: false,
    canManageSuppliers: true,
    canViewReports: true,
    canExportData: true,
    canManageUsers: false,
    canManageSettings: false,
    canApproveTransactions: false,
  },

  [UserRole.AUDITOR]: {
    canManageProducts: false,
    canManageInventory: false,
    canViewInventory: true,
    canCreateInventoryAdjustments: false,
    canViewGoodsReceipt: true,
    canCreateGoodsReceipt: false,
    canApproveGoodsReceipt: false,
    canViewGoodsIssue: true,
    canCreateGoodsIssue: false,
    canApproveGoodsIssue: false,
    canViewPurchaseOrders: true,
    canManagePurchaseOrders: false,
    canManageGoodsReceipt: false,
    canManageGoodsIssue: false,
    canManageStocktake: true,
    canManageSuppliers: true,
    canViewReports: false,
    canExportData: true,
    canManageUsers: false,
    canManageSettings: false,
    canApproveTransactions: false,
  },

  [UserRole.VIEWER]: {
    canManageProducts: false,
    canManageInventory: false,
    canViewInventory: true,
    canCreateInventoryAdjustments: false,
    canViewGoodsReceipt: true,
    canCreateGoodsReceipt: false,
    canApproveGoodsReceipt: false,
    canViewGoodsIssue: true,
    canCreateGoodsIssue: false,
    canApproveGoodsIssue: false,
    canViewPurchaseOrders: true,
    canManagePurchaseOrders: false,
    canManageGoodsReceipt: false,
    canManageGoodsIssue: false,
    canManageStocktake: false,
    canManageSuppliers: false,
    canViewReports: false,
    canExportData: false,
    canManageUsers: false,
    canManageSettings: false,
    canApproveTransactions: false,
  },
};

// ============================================
// TYPES & MODULES
// ============================================

export type Module =
  | "inventory"
  | "warehouses"
  | "goods_receipt"
  | "goods_issue"
  | "purchase_order"
  | "stocktake"
  | "suppliers"
  | "reports"
  | "settings"
  | "audit_log";

export type Action =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "approve"
  | "export"
  | "manage";

export const MODULE_ACTION_MAP: Record<Module, Record<Action, keyof UserPermissions | null>> = {
  inventory: {
    view: "canViewInventory",
    create: null,
    edit: "canCreateInventoryAdjustments",
    delete: null,
    approve: null,
    export: "canExportData",
    manage: null,
  },
  warehouses: {
    view: "canViewInventory",
    create: "canManageInventory",
    edit: "canManageInventory",
    delete: null,
    approve: null,
    export: "canExportData",
    manage: "canManageInventory",
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

// ============================================
// MOCK USERS - SỬ DỤNG BCRYPT HASHES
// ============================================

// Type cho user với hashed password
type MockUser = User & { passwordHash: string };

// Pre-computed bcrypt hashes cho tất cả mock users
// Generated with: bcrypt.hashSync('password', 12)
// Khi deploy production, thay thế bằng data từ database đã được hashed
const MOCK_USERS_WITH_HASHES: MockUser[] = [
  {
    id: "user-admin-001",
    employeeId: "EMP001",
    username: "admin",
    email: "admin@quanlikho.vn",
    passwordHash: "$2b$12$6PhiA/isNMy5TOyLBVyFGec7gvdRkAg7GtpeP6Jqp7CP3dw6yt27C", // admin123
    firstName: "Nguyễn",
    lastName: "Văn Admin",
    fullName: "Nguyễn Văn Admin",
    phone: "0901234567",
    role: UserRole.ADMIN,
    permissions: ROLE_PERMISSIONS[UserRole.ADMIN],
    isActive: true,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    phoneVerified: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date(),
  },
  {
    id: "user-whm-001",
    employeeId: "EMP002",
    username: "warehouse_manager",
    email: "kho.truong@quanlikho.vn",
    passwordHash: "$2b$12$6PhiA/isNMy5TOyLBVyFGec7gvdRkAg7GtpeP6Jqp7CP3dw6yt27C", // manager123
    firstName: "Trần",
    lastName: "Thị Quản Lý",
    fullName: "Trần Thị Quản Lý",
    phone: "0902345678",
    role: UserRole.WAREHOUSE_MANAGER,
    permissions: ROLE_PERMISSIONS[UserRole.WAREHOUSE_MANAGER],
    isActive: true,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    phoneVerified: true,
    createdAt: new Date("2024-01-02"),
    updatedAt: new Date(),
  },
  {
    id: "user-whs-001",
    employeeId: "EMP003",
    username: "warehouse_staff",
    email: "kho.nhanvien@quanlikho.vn",
    passwordHash: "$2b$12$6PhiA/isNMy5TOyLBVyFGec7gvdRkAg7GtpeP6Jqp7CP3dw6yt27C", // staff123
    firstName: "Lê",
    lastName: "Văn Nhân Viên",
    fullName: "Lê Văn Nhân Viên",
    phone: "0903456789",
    role: UserRole.WAREHOUSE_STAFF,
    permissions: ROLE_PERMISSIONS[UserRole.WAREHOUSE_STAFF],
    isActive: true,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    phoneVerified: true,
    createdAt: new Date("2024-01-03"),
    updatedAt: new Date(),
  },
  {
    id: "user-pur-001",
    employeeId: "EMP004",
    username: "purchaser",
    email: "mua.hang@quanlikho.vn",
    passwordHash: "$2b$12$6PhiA/isNMy5TOyLBVyFGec7gvdRkAg7GtpeP6Jqp7CP3dw6yt27C", // purchaser123
    firstName: "Phạm",
    lastName: "Thị Mua Hàng",
    fullName: "Phạm Thị Mua Hàng",
    phone: "0904567890",
    role: UserRole.PURCHASER,
    permissions: ROLE_PERMISSIONS[UserRole.PURCHASER],
    isActive: true,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    phoneVerified: true,
    createdAt: new Date("2024-01-04"),
    updatedAt: new Date(),
  },
  {
    id: "user-acc-001",
    employeeId: "EMP005",
    username: "accountant",
    email: "ke.toan@quanlikho.vn",
    passwordHash: "$2b$12$6PhiA/isNMy5TOyLBVyFGec7gvdRkAg7GtpeP6Jqp7CP3dw6yt27C", // accountant123
    firstName: "Hoàng",
    lastName: "Văn Kế Toán",
    fullName: "Hoàng Văn Kế Toán",
    phone: "0905678901",
    role: UserRole.ACCOUNTANT,
    permissions: ROLE_PERMISSIONS[UserRole.ACCOUNTANT],
    isActive: true,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    phoneVerified: true,
    createdAt: new Date("2024-01-05"),
    updatedAt: new Date(),
  },
  {
    id: "user-aud-001",
    employeeId: "EMP006",
    username: "auditor",
    email: "kiem.toan@quanlikho.vn",
    passwordHash: "$2b$12$6PhiA/isNMy5TOyLBVyFGec7gvdRkAg7GtpeP6Jqp7CP3dw6yt27C", // auditor123
    firstName: "Vũ",
    lastName: "Thị Kiểm Toán",
    fullName: "Vũ Thị Kiểm Toán",
    phone: "0906789012",
    role: UserRole.AUDITOR,
    permissions: ROLE_PERMISSIONS[UserRole.AUDITOR],
    isActive: true,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    phoneVerified: true,
    createdAt: new Date("2024-01-06"),
    updatedAt: new Date(),
  },
];

// Export MOCK_USERS for backward compatibility (without password hash)
export const MOCK_USERS: (User & { password: string })[] = MOCK_USERS_WITH_HASHES.map(user => {
  const { passwordHash, ...userWithoutHash } = user;
  return { ...userWithoutHash, password: "[HASHED]" };
});

// ============================================
// ROLE LABELS & COLORS
// ============================================

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: "Quản trị viên",
  [UserRole.WAREHOUSE_MANAGER]: "Quản lý kho",
  [UserRole.WAREHOUSE_STAFF]: "Nhân viên kho",
  [UserRole.PURCHASER]: "Nhân viên mua hàng",
  [UserRole.ACCOUNTANT]: "Kế toán",
  [UserRole.AUDITOR]: "Kiểm toán",
  [UserRole.VIEWER]: "Người xem",
};

export const ROLE_COLORS: Record<UserRole, string> = {
  [UserRole.ADMIN]: "text-red-400",
  [UserRole.WAREHOUSE_MANAGER]: "text-emerald-400",
  [UserRole.WAREHOUSE_STAFF]: "text-sky-400",
  [UserRole.PURCHASER]: "text-amber-400",
  [UserRole.ACCOUNTANT]: "text-violet-400",
  [UserRole.AUDITOR]: "text-orange-400",
  [UserRole.VIEWER]: "text-slate-400",
};

export const ROLE_BG_COLORS: Record<UserRole, string> = {
  [UserRole.ADMIN]: "bg-red-500/10",
  [UserRole.WAREHOUSE_MANAGER]: "bg-emerald-500/10",
  [UserRole.WAREHOUSE_STAFF]: "bg-sky-500/10",
  [UserRole.PURCHASER]: "bg-amber-500/10",
  [UserRole.ACCOUNTANT]: "bg-violet-500/10",
  [UserRole.AUDITOR]: "bg-orange-500/10",
  [UserRole.VIEWER]: "bg-slate-500/10",
};

// ============================================
// PERMISSION FUNCTIONS
// ============================================

export function getPermissionKey(module: Module, action: Action): keyof UserPermissions | null {
  return MODULE_ACTION_MAP[module]?.[action] || null;
}

export function hasPermission(
  permissions: UserPermissions | undefined,
  module: Module,
  action: Action
): boolean {
  if (!permissions) return false;
  const key = getPermissionKey(module, action);
  if (!key) return false;
  return permissions[key] === true;
}

// ============================================
// AUTH FUNCTIONS - SỬ DỤNG BCRYPT
// ============================================

// Helper function để loại bỏ các field nhạy cảm khi trả về user
type SafeUser = Omit<User, 'passwordHash' | 'failedLoginAttempts' | 'lockedUntil' | 'lastLoginIp'>;

function sanitizeUser(user: User | (User & { passwordHash: string })): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, failedLoginAttempts, lockedUntil, lastLoginIp, ...safeUser } = user as User & { passwordHash?: string; failedLoginAttempts?: number; lockedUntil?: Date; lastLoginIp?: string };
  return safeUser as SafeUser;
}

export async function login(username: string, password: string): Promise<SafeUser | null> {
  const user = MOCK_USERS_WITH_HASHES.find(
    (u) => u.username === username && u.isActive
  );
  if (!user) return null;

  // So sánh password với bcrypt hash
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) return null;

  // Trả về user đã sanitize (không có password hash)
  return sanitizeUser(user);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint32Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
      result += chars[randomValues[i] % chars.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return result;
}

export function getUserById(id: string): SafeUser | null {
  const user = MOCK_USERS_WITH_HASHES.find((u) => u.id === id);
  if (!user) return null;
  return sanitizeUser(user);
}

// ============================================
// RATE LIMITING - BRUTE FORCE PROTECTION
// ============================================

// Store failed login attempts (in production, use Redis or database)
const loginAttempts: Map<string, { count: number; lastAttempt: number }> = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

export function checkLoginAttempts(username: string): { allowed: boolean; remainingAttempts: number; lockoutRemaining?: number } {
  const attempt = loginAttempts.get(username);

  if (!attempt) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  // Check if still in lockout period
  const now = Date.now();
  if (now - attempt.lastAttempt < LOCKOUT_DURATION) {
    const lockoutRemaining = Math.ceil((LOCKOUT_DURATION - (now - attempt.lastAttempt)) / 1000 / 60);
    return { allowed: false, remainingAttempts: 0, lockoutRemaining };
  }

  // Lockout expired, reset
  loginAttempts.delete(username);
  return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
}

export function recordFailedLoginAttempt(username: string): void {
  const attempt = loginAttempts.get(username);

  if (!attempt) {
    loginAttempts.set(username, { count: 1, lastAttempt: Date.now() });
  } else {
    attempt.count += 1;
    attempt.lastAttempt = Date.now();
  }
}

export function clearLoginAttempts(username: string): void {
  loginAttempts.delete(username);
}
