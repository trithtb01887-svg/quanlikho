"use client";

import { useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { AppShell, ErrorBoundary } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  Warehouse,
  AlertTriangle,
  FileText,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowRight,
  PackagePlus,
  PackageMinus,
  ShoppingCart,
  RefreshCw,
  Bell,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  useWarehouseStore,
  useDashboardData,
  useProducts,
  useWarehouses,
  useAlertActions,
} from "@/lib/store";
import { ProductCategory } from "@/lib/types";
import Link from "next/link";

// Lazy load chart component
const ChartSkeleton = () => (
  <div className="h-64 bg-slate-800 animate-pulse rounded-lg" />
);

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  [ProductCategory.ELECTRONICS]: "Điện tử",
  [ProductCategory.FURNITURE]: "Nội thất",
  [ProductCategory.OFFICE_SUPPLIES]: "Văn phòng phẩm",
  [ProductCategory.TOOLS]: "Dụng cụ",
  [ProductCategory.PACKAGING]: "Đóng gói",
  [ProductCategory.RAW_MATERIALS]: "Nguyên vật liệu",
  [ProductCategory.OTHER]: "Khác",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

type AlertSeverity = "critical" | "warning" | "info";

function getAlertSeverity(quantity: number, reorderPoint: number): AlertSeverity {
  if (quantity === 0) return "critical";
  if (quantity <= reorderPoint) return "warning";
  return "info";
}

function getAlertColor(severity: AlertSeverity): string {
  switch (severity) {
    case "critical":
      return "bg-red-500/10 text-red-400 border-red-500/30";
    case "warning":
      return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    case "info":
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
  }
}

function getAlertBadge(severity: AlertSeverity): string {
  switch (severity) {
    case "critical":
      return "bg-red-500 text-white";
    case "warning":
      return "bg-amber-500 text-white";
    case "info":
      return "bg-yellow-500 text-black";
  }
}

interface ChartData {
  date: string;
  nhap: number;
  xuat: number;
}

interface TopProductData {
  name: string;
  quantity: number;
}

interface CategoryData {
  name: string;
  value: number;
}

interface Activity {
  id: string;
  type: "receipt" | "issue";
  title: string;
  description: string;
  time: string;
  timestamp: Date;
}

interface AlertData {
  id: string;
  type: string;
  productId: string;
  productName: string;
  productSku: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  reorderPoint?: number;
  severity: AlertSeverity;
  isRead: boolean;
  createdAt: Date;
}

export default function DashboardPage() {
  const dashboardData = useDashboardData();
  const products = useProducts();
  const warehouses = useWarehouses();
  const { markAlertAsRead } = useAlertActions();

  useEffect(() => {
    const { fetchDashboard } = useWarehouseStore.getState();
    fetchDashboard();
  }, []);

  const stats = dashboardData;
  const alerts = useWarehouseStore.getState().alerts;
  const purchaseOrders = useWarehouseStore.getState().purchaseOrders;
  const recentReceipts = dashboardData?.recentReceipts || [];
  const recentIssues = dashboardData?.recentIssues || [];

  const openPOs = useMemo(() => {
    return purchaseOrders.filter(
      (po: any) =>
        po.status !== "completed" &&
        po.status !== "closed" &&
        po.status !== "cancelled"
    ).length;
  }, [purchaseOrders]);

  const unreadAlerts = useMemo(() => {
    return alerts.filter((a: any) => !a.isRead);
  }, [alerts]);

  const last30DaysData: ChartData[] = useMemo(() => {
    const days: ChartData[] = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayName = date.toLocaleDateString("vi-VN", { weekday: "short", day: "numeric" });

      const dayReceipts = recentReceipts
        .filter((r: any) => {
          const rDate = new Date(r.receiptDate).toISOString().split("T")[0];
          return rDate === dateStr;
        })
        .reduce((sum: number, r: any) => sum + r.totalValue, 0);

      const dayIssues = recentIssues
        .filter((gi: any) => {
          const giDate = new Date(gi.issueDate).toISOString().split("T")[0];
          return giDate === dateStr;
        })
        .reduce((sum: number, gi: any) => sum + gi.totalValue, 0);

      days.push({
        date: dayName,
        nhap: Math.round(dayReceipts / 1000000),
        xuat: Math.round(dayIssues / 1000000),
      });
    }
    return days;
  }, [recentReceipts, recentIssues]);

  const topProductsData: TopProductData[] = useMemo(() => {
    return (stats?.topProducts || []).map((p: any) => ({
      name: p.name.slice(0, 15) + (p.name.length > 15 ? "..." : ""),
      quantity: p.totalQuantity || 0,
    }));
  }, [stats]);

  const categoryDistribution: CategoryData[] = useMemo(() => {
    return (stats?.inventoryByCategory || []).map((cat: any) => ({
      name: CATEGORY_LABELS[cat.category as ProductCategory] || cat.category,
      value: Math.round(cat.totalValue / 1000000),
    }));
  }, [stats]);

  const recentActivity: Activity[] = useMemo(() => {
    const activities: Activity[] = [];

    recentReceipts.slice(0, 10).forEach((r: any) => {
      activities.push({
        id: r.id,
        type: "receipt" as const,
        title: `Nhập kho ${r.receiptNumber}`,
        description: `${r.warehouseName || 'N/A'} - ${formatCurrency(r.totalValue)}`,
        time: new Date(r.receiptDate).toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
        timestamp: new Date(r.receiptDate),
      });
    });

    recentIssues.slice(0, 10).forEach((gi: any) => {
      activities.push({
        id: gi.id,
        type: "issue" as const,
        title: `Xuất kho ${gi.issueNumber}`,
        description: `${gi.warehouseName || 'N/A'} - ${formatCurrency(gi.totalValue)}`,
        time: new Date(gi.issueDate).toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
        timestamp: new Date(gi.issueDate),
      });
    });

    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
  }, [recentReceipts, recentIssues]);

  const alertList: AlertData[] = useMemo(() => {
    return alerts
      .filter((a: any) => !a.isRead)
      .slice(0, 10)
      .map((alert: any) => {
        const product = products.find((p: any) => p.id === alert.productId);
        const severity = getAlertSeverity(alert.quantity, product?.reorderPoint || 0);
        return { ...alert, severity, product };
      });
  }, [alerts, products]);

  const PIE_COLORS = [
    "#0ea5e9",
    "#8b5cf6",
    "#10b981",
    "#f59e0b",
    "#ec4899",
    "#6366f1",
    "#64748b",
  ];

  const criticalAlerts = unreadAlerts.filter((a: any) => a.type === "critical").length;
  const warningAlerts = unreadAlerts.filter((a: any) => a.type === "warning").length;

  return (
    <ErrorBoundary moduleName="Dashboard">
      <AppShell>
        <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Tổng quan</h1>
            <p className="text-slate-400 mt-1">
              Chào mừng bạn quay trở lại hệ thống Quản Lý Kho
            </p>
          </div>
          <Button
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={() => {
              const { fetchDashboard } = useWarehouseStore.getState();
              fetchDashboard();
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Làm mới
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-400">Tổng SKU</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {formatNumber(stats?.totalProducts || 0)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Sản phẩm đang quản lý
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-sky-500/10">
                  <Package className="w-6 h-6 text-sky-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-400">Kho hàng</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {stats?.totalWarehouses || 0}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {stats?.totalSuppliers || 0} nhà cung cấp
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-500/10">
                  <Warehouse className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-400">Cảnh báo</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {(stats?.lowStockCount || 0) + (stats?.outOfStockCount || 0)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {stats?.outOfStockCount || 0} hết, {stats?.lowStockCount || 0} sắp hết
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-400">Chờ xử lý</p>
                  <p className="text-3xl font-bold text-white mt-2">{openPOs}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {stats?.pendingReceipts || 0} nhập, {stats?.pendingIssues || 0} xuất
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-amber-500/10">
                  <FileText className="w-6 h-6 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Import Chart */}
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="border-b border-slate-800 pb-4">
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    Nhập kho 30 ngày
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={last30DaysData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis
                        dataKey="date"
                        stroke="#94a3b8"
                        fontSize={10}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={10}
                        tickLine={false}
                        tickFormatter={(value) => `${value}M`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                          color: "#f8fafc",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="nhap"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                        name="Nhập kho"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Export Chart */}
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="border-b border-slate-800 pb-4">
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-red-400" />
                    Xuất kho 30 ngày
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={last30DaysData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis
                        dataKey="date"
                        stroke="#94a3b8"
                        fontSize={10}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={10}
                        tickLine={false}
                        tickFormatter={(value) => `${value}M`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                          color: "#f8fafc",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="xuat"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={false}
                        name="Xuất kho"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Top Products Bar Chart */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="border-b border-slate-800 pb-4">
                <CardTitle className="text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-400" />
                  Top 10 hàng xuất nhiều nhất tháng này
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topProductsData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      width={120}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                        color: "#f8fafc",
                      }}
                    />
                    <Bar dataKey="quantity" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Số lượng" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="border-b border-slate-800 pb-4">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Warehouse className="w-5 h-5 text-sky-400" />
                    Phân bổ tồn kho theo danh mục
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={categoryDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                      >
                        {categoryDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                          color: "#f8fafc",
                        }}
                      />
                      <Legend
                        formatter={(value) => (
                          <span className="text-slate-300 text-xs">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="border-b border-slate-800 pb-4">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-400" />
                    Hoạt động gần đây
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {recentActivity.map((activity, index) => (
                      <div
                        key={`${activity.id}-${index}`}
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
                      >
                        <div
                          className={`p-2 rounded-lg ${
                            activity.type === "receipt"
                              ? "bg-emerald-500/10"
                              : "bg-red-500/10"
                          }`}
                        >
                          {activity.type === "receipt" ? (
                            <PackagePlus className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <PackageMinus className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {activity.title}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {activity.description}
                          </p>
                        </div>
                        <span className="text-xs text-slate-500 whitespace-nowrap">
                          {activity.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column - Alerts & Stats */}
          <div className="space-y-6">
            {/* Alerts Panel */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="border-b border-slate-800 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-red-400" />
                    Cảnh báo
                  </CardTitle>
                  <Badge className="bg-red-500 text-white">
                    {alertList.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {alertList.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Không có cảnh báo nào</p>
                    </div>
                  ) : (
                    alertList.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-3 rounded-lg border ${getAlertColor(alert.severity)}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge className={`${getAlertBadge(alert.severity)} text-xs`}>
                                {alert.severity === "critical"
                                  ? "NGHIÊM TRỌNG"
                                  : alert.severity === "warning"
                                  ? "CẢNH BÁO"
                                  : "THÔNG TIN"}
                              </Badge>
                              <span className="text-xs text-slate-400">
                                {alert.warehouseName}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-white mt-2">
                              {alert.productName}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              SKU: {alert.productSku}
                            </p>
                            <p className="text-xs mt-1">
                              Tồn kho:{" "}
                              <span
                                className={
                                  alert.quantity === 0
                                    ? "text-red-400 font-semibold"
                                    : "text-amber-400"
                                }
                              >
                                {alert.quantity}
                              </span>
                              {alert.reorderPoint && (
                                <span className="text-slate-500">
                                  {" "}
                                  / Tối thiểu: {alert.reorderPoint}
                                </span>
                              )}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-sky-400 hover:text-sky-300 hover:bg-sky-500/10"
                            onClick={() => markAlertAsRead(alert.id)}
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </div>
                        <Link href="/inventory" className="block mt-3">
                          <Button
                            size="sm"
                            className={`w-full ${
                              alert.severity === "critical"
                                ? "bg-red-500 hover:bg-red-600"
                                : "bg-amber-500 hover:bg-amber-600"
                            } text-white`}
                          >
                            Xử lý ngay
                          </Button>
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pending Orders */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="border-b border-slate-800 pb-4">
                <CardTitle className="text-white">Đơn hàng cần xử lý</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {purchaseOrders
                    .filter(
                      (po: any) =>
                        po.status !== "fully_received" &&
                        po.status !== "closed" &&
                        po.status !== "cancelled"
                    )
                    .slice(0, 5)
                    .map((po: any) => (
                      <Link key={po.id} href="/purchase-order">
                        <div className="p-3 rounded-lg border border-slate-700 hover:bg-slate-800/50 transition-colors cursor-pointer">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-mono text-sky-400">
                              {po.orderNumber}
                            </span>
                            <Badge
                              className={
                                po.status === "pending_approval"
                                  ? "bg-amber-500/10 text-amber-400"
                                  : po.status === "confirmed" || po.status === "sent"
                                  ? "bg-sky-500/10 text-sky-400"
                                  : po.status === "partially_received"
                                  ? "bg-purple-500/10 text-purple-400"
                                  : "bg-slate-500/10 text-slate-400"
                              }
                            >
                              {po.status === "pending_approval"
                                ? "Chờ duyệt"
                                : po.status === "confirmed" || po.status === "sent"
                                ? "Đã xác nhận"
                                : po.status === "partially_received"
                                ? "Nhận một phần"
                                : "Nháp"}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-300 mt-2 truncate">
                            {po.supplierName}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {formatCurrency(po.totalValue)} •{" "}
                            {new Date(po.orderDate).toLocaleDateString("vi-VN")}
                          </p>
                        </div>
                      </Link>
                    ))}
                  <Link href="/purchase-order" className="block">
                    <Button
                      variant="outline"
                      className="w-full border-slate-700 text-slate-400 hover:bg-slate-800"
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Xem tất cả đơn hàng
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="border-b border-b-slate-800 pb-4">
                <CardTitle className="text-white">Thống kê nhanh</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Package className="w-4 h-4" />
                      <span className="text-sm">Tổng kho hàng</span>
                    </div>
                    <span className="text-white font-semibold">
                      {stats?.totalWarehouses || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-400">
                      <PackagePlus className="w-4 h-4" />
                      <span className="text-sm">Phiếu nhập tháng</span>
                    </div>
                    <span className="text-white font-semibold">
                      {recentReceipts.filter((r: any) => {
                        const date = new Date(r.receiptDate);
                        const now = new Date();
                        return (
                          date.getMonth() === now.getMonth() &&
                          date.getFullYear() === now.getFullYear()
                        );
                      }).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-400">
                      <PackageMinus className="w-4 h-4" />
                      <span className="text-sm">Phiếu xuất tháng</span>
                    </div>
                    <span className="text-white font-semibold">
                      {recentIssues.filter((gi: any) => {
                        const date = new Date(gi.issueDate);
                        const now = new Date();
                        return (
                          date.getMonth() === now.getMonth() &&
                          date.getFullYear() === now.getFullYear()
                        );
                      }).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm">Hàng sắp hết</span>
                    </div>
                    <span className="text-amber-400 font-semibold">
                      {(stats?.lowStockCount || 0) + (stats?.outOfStockCount || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
    </ErrorBoundary>
  );
}
