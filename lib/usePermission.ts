"use client";

import { useCallback, useMemo } from "react";
import { useWarehouseStore } from "./store";
import {
  hasPermission,
  Module,
  Action,
  ROLE_LABELS,
  ROLE_COLORS,
  ROLE_BG_COLORS,
} from "./auth";
import { UserRole } from "./types";

export function usePermission() {
  const user = useWarehouseStore((state) => state.user);

  const checkPermission = useCallback(
    (module: Module, action: Action): boolean => {
      // Khi chưa login, không cho phép truy cập các module có quyền hạn chế
      if (!user?.permissions) {
        return false;
      }
      return hasPermission(user.permissions, module, action);
    },
    [user]
  );

  const canView = useCallback(
    (module: Module): boolean => {
      // Khi chưa login, cho hiển thị menu (sẽ redirect ở trang)
      if (!user?.permissions) {
        return true;
      }
      return checkPermission(module, "view");
    },
    [user, checkPermission]
  );

  const canCreate = useCallback(
    (module: Module): boolean => checkPermission(module, "create"),
    [checkPermission]
  );

  const canEdit = useCallback(
    (module: Module): boolean => checkPermission(module, "edit"),
    [checkPermission]
  );

  const canDelete = useCallback(
    (module: Module): boolean => checkPermission(module, "delete"),
    [checkPermission]
  );

  const canApprove = useCallback(
    (module: Module): boolean => checkPermission(module, "approve"),
    [checkPermission]
  );

  const canExport = useCallback(
    (module: Module): boolean => checkPermission(module, "export"),
    [checkPermission]
  );

  const canManage = useCallback(
    (module: Module): boolean => checkPermission(module, "manage"),
    [checkPermission]
  );

  const isAdmin = useMemo(() => user?.role === UserRole.ADMIN, [user?.role]);

  const isWarehouseManager = useMemo(
    () => user?.role === UserRole.WAREHOUSE_MANAGER,
    [user?.role]
  );

  const isWarehouseStaff = useMemo(
    () => user?.role === UserRole.WAREHOUSE_STAFF,
    [user?.role]
  );

  const isPurchaser = useMemo(() => user?.role === UserRole.PURCHASER, [user?.role]);

  const isAccountant = useMemo(
    () => user?.role === UserRole.ACCOUNTANT,
    [user?.role]
  );

  const isAuditor = useMemo(() => user?.role === UserRole.AUDITOR, [user?.role]);

  const roleLabel = useMemo(
    () => (user?.role ? ROLE_LABELS[user.role] : ""),
    [user?.role]
  );

  const roleColor = useMemo(
    () => (user?.role ? ROLE_COLORS[user.role] : ""),
    [user?.role]
  );

  const roleBgColor = useMemo(
    () => (user?.role ? ROLE_BG_COLORS[user.role] : ""),
    [user?.role]
  );

  return {
    user,
    checkPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canApprove,
    canExport,
    canManage,
    isAdmin,
    isWarehouseManager,
    isWarehouseStaff,
    isPurchaser,
    isAccountant,
    isAuditor,
    roleLabel,
    roleColor,
    roleBgColor,
  };
}
