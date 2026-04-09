"use client";

import { useSidebar } from "@/hooks/use-sidebar";
import { Sidebar, MobileSidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Mobile Sidebar Drawer - visible only on mobile */}
      <MobileSidebar />
      
      {/* Desktop Sidebar - hidden on mobile, shown on lg+ */}
      <Sidebar />
      
      {/* Main content area */}
      <div
        className={cn(
          "min-h-screen transition-all duration-300",
          // Mobile: no margin
          // Tablet & Desktop: margin based on sidebar state
          isCollapsed ? "lg:ml-[80px]" : "lg:ml-[280px]"
        )}
      >
        <Topbar />
        <main className="p-4 md:p-6 pb-20 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Bottom Navigation - only visible on mobile */}
      <BottomNav />
    </div>
  );
}

export function AppShell({ children }: AppLayoutProps) {
  return <AppLayout>{children}</AppLayout>;
}
