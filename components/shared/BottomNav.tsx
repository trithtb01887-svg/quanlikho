"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  PackagePlus,
  PackageMinus,
  ScanLine,
  ClipboardList,
} from "lucide-react";

const BOTTOM_NAV_ITEMS = [
  { title: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
  { title: "Nhập kho", href: "/goods-receipt/new", icon: PackagePlus },
  { title: "Xuất kho", href: "/goods-issue/new", icon: PackageMinus },
  { title: "Scan", href: "/goods-receipt/scan", icon: ScanLine },
  { title: "Kiểm kê", href: "/stocktake", icon: ClipboardList },
];

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-slate-900/95 backdrop-blur-lg border-t border-slate-700/50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full min-w-[56px] py-2 transition-colors duration-150",
                active
                  ? "text-sky-400"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <div
                className={cn(
                  "relative flex items-center justify-center",
                  active && "after:absolute after:-top-1 after:w-8 after:h-1 after:bg-sky-400 after:rounded-full"
                )}
              >
                <Icon className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium mt-1 tracking-tight",
                  active && "font-semibold"
                )}
              >
                {item.title}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
