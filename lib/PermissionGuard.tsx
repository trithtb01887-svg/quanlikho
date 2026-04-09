"use client";

import React from "react";
import { usePermission } from "./usePermission";
import { Module, Action } from "./auth";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PermissionGuardProps {
  module: Module;
  action: Action;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showDisabled?: boolean;
}

export function PermissionGuard({
  module,
  action,
  children,
  fallback = null,
  showDisabled = false,
}: PermissionGuardProps) {
  const { checkPermission } = usePermission();
  const hasAccess = checkPermission(module, action);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (showDisabled && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      disabled: true,
    });
  }

  return <>{fallback}</>;
}

interface PermissionButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  module: Module;
  action: Action;
  children: React.ReactNode;
  tooltipMessage?: string;
  onClick?: () => void;
}

export function PermissionButton({
  module,
  action,
  children,
  tooltipMessage = "Bạn không có quyền thực hiện thao tác này",
  ...props
}: PermissionButtonProps) {
  const { checkPermission } = usePermission();
  const hasAccess = checkPermission(module, action);

  if (hasAccess) {
    return <Button {...props}>{children}</Button>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Button disabled className="opacity-50 cursor-not-allowed" {...props}>
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p>{tooltipMessage}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface PermissionIconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  module: Module;
  action: Action;
  icon: React.ReactNode;
  tooltipMessage?: string;
  onClick?: () => void;
}

export function PermissionIconButton({
  module,
  action,
  icon,
  tooltipMessage = "Bạn không có quyền thực hiện thao tác này",
  ...props
}: PermissionIconButtonProps) {
  const { checkPermission } = usePermission();
  const hasAccess = checkPermission(module, action);

  if (hasAccess) {
    return (
      <Button variant="ghost" size="icon" {...props}>
        {icon}
      </Button>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Button
            variant="ghost"
            size="icon"
            disabled
            className="opacity-50 cursor-not-allowed"
            {...props}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p>{tooltipMessage}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface RequirePermissionProps {
  module: Module;
  action: Action;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RequirePermission({
  module,
  action,
  children,
  fallback = (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-slate-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V9a4 4 0 10-8 0v2m-2 0h12a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-white mb-2">
        Không có quyền truy cập
      </h3>
      <p className="text-slate-400 text-sm max-w-xs">
        Bạn không có quyền thực hiện thao tác này. Vui lòng liên hệ quản trị viên
        để được cấp quyền.
      </p>
    </div>
  ),
}: RequirePermissionProps) {
  const { checkPermission } = usePermission();
  const hasAccess = checkPermission(module, action);

  return <>{hasAccess ? children : fallback}</>;
}

export function withPermission<P extends object>(
  module: Module,
  action: Action
) {
  return function PermissionWrapper<P extends object>(
    WrappedComponent: React.ComponentType<P>
  ) {
    return function PermissionComponent(props: P) {
      const { checkPermission } = usePermission();
      const hasAccess = checkPermission(module, action);

      if (!hasAccess) {
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V9a4 4 0 10-8 0v2m-2 0h12a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              Không có quyền truy cập
            </h3>
            <p className="text-slate-400 text-sm max-w-xs">
              Trang này yêu cầu quyền {action} trên module {module}. Vui lòng liên
              hệ quản trị viên để được cấp quyền.
            </p>
          </div>
        );
      }

      return <WrappedComponent {...props} />;
    };
  };
}
