"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowRight,
  PackagePlus,
  PackageMinus,
  ShoppingCart,
  Clock,
} from "lucide-react";
import { MOCK_PRODUCTS, CATEGORIES } from "@/lib/constants";
import Link from "next/link";

const stats = [
  {
    title: "Tổng sản phẩm",
    value: "1,248",
    change: "+12%",
    trend: "up",
    icon: Package,
  },
  {
    title: "Giá trị tồn kho",
    value: "2.5B",
    change: "+8.3%",
    trend: "up",
    icon: TrendingUp,
  },
  {
    title: "Sản phẩm sắp hết",
    value: "23",
    change: "-5",
    trend: "down",
    icon: AlertTriangle,
    variant: "warning",
  },
  {
    title: "Đơn chờ xử lý",
    value: "8",
    change: "+3",
    trend: "up",
    icon: Clock,
    variant: "info",
  },
];

const recentActivity = [
  {
    type: "receipt",
    title: "Nhập kho - phiếu NK-2024-001",
    description: "Nhập 50 bộ bàn ghế từ Công ty Việt Phát",
    time: "10 phút trước",
  },
  {
    type: "issue",
    title: "Xuất kho - phiếu XK-2024-015",
    description: "Xuất 20 máy tính cho phòng IT",
    time: "30 phút trước",
  },
  {
    type: "order",
    title: "Đặt hàng - ĐH-2024-008",
    description: "Đặt 100 thùng carton từ Nhựa Bình Minh",
    time: "1 giờ trước",
  },
  {
    type: "stocktake",
    title: "Kiểm kê - PK-2024-003",
    description: "Hoàn thành kiểm kê kho A",
    time: "2 giờ trước",
  },
];

const lowStockProducts = MOCK_PRODUCTS.filter((p) => p.quantity <= p.reorderLevel * 1.5).slice(0, 5);

export function DashboardContent() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Tổng quan</h1>
          <p className="text-slate-400 mt-1">Chào mừng bạn quay trở lại hệ thống</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <PackagePlus className="w-4 h-4 mr-2" />
            Nhập kho
          </Button>
          <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <PackageMinus className="w-4 h-4 mr-2" />
            Xuất kho
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-400">{stat.title}</p>
                    <p className="text-3xl font-bold text-white mt-2">{stat.value}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {stat.trend === "up" ? (
                        <TrendingUp className={`w-4 h-4 ${stat.variant === "warning" ? "text-amber-400" : stat.variant === "info" ? "text-sky-400" : "text-emerald-400"}`} />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      )}
                      <span className={`text-sm ${stat.trend === "up" ? (stat.variant === "warning" ? "text-amber-400" : stat.variant === "info" ? "text-sky-400" : "text-emerald-400") : "text-red-400"}`}>
                        {stat.change}
                      </span>
                      <span className="text-slate-500 text-sm">vs tháng trước</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.variant === "warning" ? "bg-amber-500/10" : stat.variant === "info" ? "bg-sky-500/10" : "bg-slate-800"}`}>
                    <Icon className={`w-6 h-6 ${stat.variant === "warning" ? "text-amber-400" : stat.variant === "info" ? "text-sky-400" : "text-slate-400"}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-slate-900/50 border-slate-800">
          <CardHeader className="border-b border-slate-800 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Tồn kho theo danh mục</CardTitle>
              <Button variant="ghost" size="sm" className="text-sky-400 hover:text-sky-300">
                Xem chi tiết
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {CATEGORIES.map((category, index) => {
                const productCount = MOCK_PRODUCTS.filter((p) => p.category === category.value).length;
                const percentage = (productCount / MOCK_PRODUCTS.length) * 100;
                return (
                  <div key={category.value} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">{category.label}</span>
                      <span className="text-slate-400">{productCount} sản phẩm</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: ["#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#6366f1"][index],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="border-b border-slate-800 pb-4">
            <CardTitle className="text-white">Hoạt động gần đây</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex gap-3">
                  <div className={`p-2 rounded-lg ${
                    activity.type === "receipt" ? "bg-emerald-500/10" :
                    activity.type === "issue" ? "bg-red-500/10" :
                    activity.type === "order" ? "bg-amber-500/10" :
                    "bg-sky-500/10"
                  }`}>
                    {activity.type === "receipt" ? (
                      <PackagePlus className={`w-4 h-4 text-emerald-400`} />
                    ) : activity.type === "issue" ? (
                      <PackageMinus className={`w-4 h-4 text-red-400`} />
                    ) : activity.type === "order" ? (
                      <ShoppingCart className={`w-4 h-4 text-amber-400`} />
                    ) : (
                      <Clock className={`w-4 h-4 text-sky-400`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{activity.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{activity.description}</p>
                    <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="border-b border-slate-800 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Sản phẩm sắp hết hàng</CardTitle>
            <Link href="/inventory">
              <Button variant="ghost" size="sm" className="text-sky-400 hover:text-sky-300">
                Xem tất cả
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">SKU</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Sản phẩm</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Danh mục</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Tồn kho</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Mức tối thiểu</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.map((product) => {
                  const category = CATEGORIES.find((c) => c.value === product.category);
                  const isCritical = product.quantity <= product.reorderLevel;
                  return (
                    <tr key={product.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="py-3 px-4">
                        <code className="text-sm font-mono text-sky-400">{product.sku}</code>
                      </td>
                      <td className="py-3 px-4 text-slate-200">{product.name}</td>
                      <td className="py-3 px-4 text-slate-400">{category?.label}</td>
                      <td className="py-3 px-4 text-right font-medium text-white">{product.quantity}</td>
                      <td className="py-3 px-4 text-right text-slate-400">{product.reorderLevel}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={isCritical ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"}>
                          {isCritical ? "Hết hàng" : "Sắp hết"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}