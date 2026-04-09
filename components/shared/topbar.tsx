"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useSidebar } from "@/hooks/use-sidebar";
import { useWarehouseStore } from "@/lib/store";
import { ROLE_LABELS, ROLE_COLORS, ROLE_BG_COLORS } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Menu, User, Settings, LogOut, ChevronRight } from "lucide-react";
import { NotificationsDropdown } from "@/components/NotificationsDropdown";
import { GlobalSearch } from "@/components/GlobalSearch";
import { cn } from "@/lib/utils";

const pathNames: Record<string, string> = {
  dashboard: "Tổng quan",
  inventory: "Tồn kho",
  "goods-receipt": "Nhập kho",
  "goods-issue": "Xuất kho",
  "purchase-order": "Đặt hàng",
  stocktake: "Kiểm kê",
  suppliers: "Nhà cung cấp",
  reports: "Báo cáo",
  settings: "Cài đặt",
  mobile: "Di động",
};

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: { label: string; href: string }[] = [];

  let currentPath = "";
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = pathNames[segment] || segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    breadcrumbs.push({ label, href: currentPath });
  }

  return breadcrumbs;
}

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toggleMobile } = useSidebar();
  const breadcrumbs = getBreadcrumbs(pathname);

  const user = useWarehouseStore((state) => state.user);
  const logout = useWarehouseStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="h-full flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3 md:gap-4">
          {/* Hamburger Menu - only visible on mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-slate-400 hover:text-white hover:bg-slate-800"
            onClick={toggleMobile}
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Breadcrumbs */}
          <Breadcrumb className="hidden sm:block">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard" className="text-slate-400 hover:text-white text-sm">
                  Trang chủ
                </BreadcrumbLink>
              </BreadcrumbItem>
              {breadcrumbs.map((crumb, index) => (
                <span key={crumb.href} className="contents">
                  <BreadcrumbSeparator>
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    {index === breadcrumbs.length - 1 ? (
                      <span className="text-white font-medium text-sm">{crumb.label}</span>
                    ) : (
                      <BreadcrumbLink href={crumb.href} className="text-slate-400 hover:text-white text-sm">
                        {crumb.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </span>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Global Search - hidden on small mobile */}
          <div className="hidden sm:block">
            <GlobalSearch />
          </div>

          {/* Notifications */}
          <NotificationsDropdown />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent text-sm font-medium transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 text-slate-400 hover:text-white bg-transparent hover:bg-muted aria-expanded:bg-muted aria-expanded:text-foreground size-8 gap-1.5 px-2.5 [&_svg:not([class*='size-'])]:size-4 rounded-full border-2 border-slate-700"
              >
                <Avatar className="h-8 w-8 md:h-9 md:w-9">
                  <AvatarFallback className="bg-gradient-to-br from-sky-500 to-cyan-400 text-white font-semibold text-xs">
                    {user ? getInitials(user.fullName || user.firstName) : "?"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72" align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">
                      {user?.fullName || user?.firstName || "Khách"}
                    </p>
                    {user?.role && (
                      <Badge className={`${ROLE_BG_COLORS[user.role]} ${ROLE_COLORS[user.role]} border-0 text-xs`}>
                        {ROLE_LABELS[user.role]}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{user?.email}</p>
                  <p className="text-xs text-slate-500">{user?.employeeId && `Mã NV: ${user.employeeId}`}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem className="text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Hồ sơ
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/settings" className="flex items-center w-full text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Cài đặt
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-400 hover:bg-red-500/10 hover:text-red-300 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
