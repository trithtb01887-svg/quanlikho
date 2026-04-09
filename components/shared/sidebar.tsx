"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/use-sidebar";
import { NAV_ITEMS, SETTINGS_NAV_ITEMS, SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from "@/lib/constants";
import { usePermission } from "@/lib/usePermission";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  Package,
  Building2,
  PackagePlus,
  PackageMinus,
  ShoppingCart,
  ClipboardList,
  Truck,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Package,
  Building2,
  PackagePlus,
  PackageMinus,
  ShoppingCart,
  ClipboardList,
  Truck,
  BarChart3,
  Settings,
};

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggle } = useSidebar();
  const { canView } = usePermission();

  const width = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  // Filter NAV_ITEMS based on permissions
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (!item.module) return true;
    return canView(item.module);
  });

  // Filter SETTINGS_NAV_ITEMS based on permissions
  const visibleSettingsItems = SETTINGS_NAV_ITEMS.filter((item) => {
    if (!item.module) return true;
    return canView(item.module);
  });

  return (
    <aside
      className="fixed left-0 top-0 z-40 h-screen bg-slate-900 border-r border-slate-800 transition-all duration-300 hidden lg:flex flex-col"
      style={{ width: `${width}px` }}
    >
      <div className={cn("h-16 flex items-center border-b border-slate-800", isCollapsed ? "justify-center px-2" : "px-6")}>
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-white">Quản Lý Kho</span>
              <span className="text-xs text-slate-400">Warehouse System</span>
            </div>
          )}
        </Link>
      </div>

      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-3">
          {visibleNavItems.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            if (isCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center justify-center h-12 w-full rounded-lg transition-all duration-150",
                        isActive
                          ? "bg-sky-500/10 text-sky-400 border-l-2 border-sky-400"
                          : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="ml-2">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 h-12 px-4 rounded-lg transition-all duration-150",
                  isActive
                    ? "bg-sky-500/10 text-sky-400 border-l-2 border-sky-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{item.title}</span>
                {item.badge && (
                  <span className="ml-auto bg-sky-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {visibleSettingsItems.length > 0 && (
          <div className="mt-8 px-3">
            <div className="border-t border-slate-800 pt-4">
              {visibleSettingsItems.map((item) => {
                const Icon = iconMap[item.icon];
                const isActive = pathname === item.href;

                if (isCollapsed) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center justify-center h-12 w-full rounded-lg transition-all duration-150",
                            isActive
                              ? "bg-sky-500/10 text-sky-400 border-l-2 border-sky-400"
                              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                          )}
                        >
                          <Icon className="w-5 h-5" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="ml-2">
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 h-12 px-4 rounded-lg transition-all duration-150",
                      isActive
                        ? "bg-sky-500/10 text-sky-400 border-l-2 border-sky-400"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </ScrollArea>

      <div className={cn("p-4 border-t border-slate-800", isCollapsed ? "flex justify-center" : "")}>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="text-slate-400 hover:text-white hover:bg-slate-800"
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </Button>
      </div>
    </aside>
  );
}

export function MobileSidebar() {
  const pathname = usePathname();
  const { isMobileOpen, closeMobile } = useSidebar();
  const { canView } = usePermission();

  // Filter NAV_ITEMS based on permissions
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (!item.module) return true;
    return canView(item.module);
  });

  // Filter SETTINGS_NAV_ITEMS based on permissions
  const visibleSettingsItems = SETTINGS_NAV_ITEMS.filter((item) => {
    if (!item.module) return true;
    return canView(item.module);
  });

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-72 bg-slate-900 border-r border-slate-800 transition-transform duration-300 lg:hidden flex flex-col",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={closeMobile}>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-white">Quản Lý Kho</span>
              <span className="text-xs text-slate-400">Warehouse System</span>
            </div>
          </Link>
        </div>

        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-3">
            {visibleNavItems.map((item) => {
              const Icon = iconMap[item.icon];
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobile}
                  className={cn(
                    "flex items-center gap-3 h-12 px-4 rounded-lg transition-all duration-150",
                    isActive
                      ? "bg-sky-500/10 text-sky-400 border-l-2 border-sky-400"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{item.title}</span>
                  {item.badge && (
                    <span className="ml-auto bg-sky-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {visibleSettingsItems.length > 0 && (
            <div className="mt-8 px-3">
              <div className="border-t border-slate-800 pt-4">
                {visibleSettingsItems.map((item) => {
                  const Icon = iconMap[item.icon];
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMobile}
                      className={cn(
                        "flex items-center gap-3 h-12 px-4 rounded-lg transition-all duration-150",
                        isActive
                          ? "bg-sky-500/10 text-sky-400 border-l-2 border-sky-400"
                          : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                      )}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </ScrollArea>
      </aside>
    </>
  );
}
