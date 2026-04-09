"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  Package,
  ShoppingCart,
  ClipboardList,
  AlertTriangle,
  Clock,
  Check,
  CheckCheck,
  TrendingDown,
  Calendar,
  Truck,
  X,
} from "lucide-react";
import {
  useProducts,
  useInventoryItems,
  usePurchaseOrders,
  useStocktakeSessions,
  useGoodsReceipts,
  useSuppliers,
} from "@/lib/store";
import { PurchaseOrderStatus, StocktakeStatus } from "@/lib/types";

export interface Notification {
  id: string;
  type: "low_stock" | "pending_po" | "stocktake_complete" | "near_expiry" | "supplier_update" | "general";
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  link?: string;
  icon?: React.ReactNode;
}

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const products = useProducts();
  const inventoryItems = useInventoryItems();
  const purchaseOrders = usePurchaseOrders();
  const stocktakeSessions = useStocktakeSessions();
  const suppliers = useSuppliers();

  // Generate notifications from data
  useEffect(() => {
    const newNotifications: Notification[] = [];
    const now = new Date();

    // Low stock notifications
    inventoryItems.slice(0, 5).forEach((item: any) => {
      const product = products.find((p: any) => p.id === item.productId);
      if (product && item.quantityAvailable <= (product.reorderPoint || 0)) {
        newNotifications.push({
          id: `low-stock-${item.id}`,
          type: "low_stock",
          title: "Tồn kho thấp",
          message: `${product.name} (${product.sku}) còn ${item.quantityAvailable} đơn vị`,
          timestamp: new Date(now.getTime() - Math.random() * 3600000),
          isRead: false,
          icon: <TrendingDown className="w-4 h-4 text-amber-400" />,
        });
      }
    });

    // Pending PO notifications
    purchaseOrders
      .filter((po: any) => po.status === PurchaseOrderStatus.PENDING_APPROVAL)
      .slice(0, 3)
      .forEach((po: any) => {
        newNotifications.push({
          id: `pending-po-${po.id}`,
          type: "pending_po",
          title: "PO chờ duyệt",
          message: `${po.orderNumber} - ${formatCurrency(po.totalValue)} từ ${po.supplierName || "NCC"}`,
          timestamp: new Date(now.getTime() - Math.random() * 7200000),
          isRead: false,
          icon: <ShoppingCart className="w-4 h-4 text-sky-400" />,
        });
      });

    // Stocktake complete notifications
    stocktakeSessions
      .filter((s: any) => s.status === StocktakeStatus.PENDING_APPROVAL)
      .slice(0, 2)
      .forEach((s: any) => {
        newNotifications.push({
          id: `stocktake-${s.id}`,
          type: "stocktake_complete",
          title: "Kiểm kê chờ duyệt",
          message: `${s.stocktakeNumber} - ${s.discrepancies?.length || 0} chênh lệch`,
          timestamp: new Date(now.getTime() - Math.random() * 86400000),
          isRead: false,
          icon: <ClipboardList className="w-4 h-4 text-emerald-400" />,
        });
      });

    // Near expiry notifications
    inventoryItems
      .filter((item: any) => item.expiryDate)
      .map((item: any) => {
        const product = products.find((p: any) => p.id === item.productId);
        const expiryDate = new Date(item.expiryDate);
        const daysUntil = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil <= 30 && daysUntil > 0) {
          return {
            id: `expiry-${item.id}`,
            type: "near_expiry" as const,
            title: "Hàng sắp hết hạn",
            message: `${product?.name} - còn ${daysUntil} ngày`,
            timestamp: new Date(now.getTime() - Math.random() * 43200000),
            isRead: false,
            icon: <AlertTriangle className="w-4 h-4 text-red-400" />,
          };
        }
        return null;
      })
      .filter(Boolean)
      .slice(0, 3)
      .forEach((n) => n && newNotifications.push(n));

    // Sort by timestamp
    newNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    setNotifications(newNotifications.slice(0, 15));
  }, [products, inventoryItems, purchaseOrders, stocktakeSessions, suppliers]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    return `${days} ngày trước`;
  };

  const getTypeColor = (type: Notification["type"]) => {
    switch (type) {
      case "low_stock": return "text-amber-400";
      case "pending_po": return "text-sky-400";
      case "stocktake_complete": return "text-emerald-400";
      case "near_expiry": return "text-red-400";
      default: return "text-slate-400";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent text-sm font-medium transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 text-slate-400 hover:text-white bg-transparent hover:bg-muted aria-expanded:bg-muted aria-expanded:text-foreground size-8 gap-1.5 px-2.5 [&_svg:not([class*='size-'])]:size-4"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-96" align="end">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-semibold">Thông báo</h3>
            {unreadCount > 0 && (
              <Badge className="bg-red-500/20 text-red-400 border-0">
                {unreadCount} mới
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-slate-400 hover:text-white h-auto p-1"
              >
                <CheckCheck className="w-4 h-4" />
                <span className="ml-1 text-xs">Đánh dấu đã đọc</span>
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <p className="text-slate-400">Không có thông báo nào</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-slate-700/50 transition-colors ${
                    !notification.isRead ? "bg-slate-800/50" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {notification.icon || <Bell className="w-4 h-4 text-slate-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${notification.isRead ? "text-slate-400" : "text-white"}`}>
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <span className="w-2 h-2 bg-sky-500 rounded-full" />
                        )}
                      </div>
                      <p className="text-slate-400 text-sm mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-slate-500 text-xs mt-1">
                        {formatTime(notification.timestamp)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-white"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-white"
                        onClick={() => removeNotification(notification.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t border-slate-700">
          <Button
            variant="ghost"
            className="w-full text-sky-400 hover:text-sky-300 hover:bg-sky-500/10"
          >
            Xem tất cả thông báo
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}
