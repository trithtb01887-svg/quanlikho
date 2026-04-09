"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  Calendar,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  useProducts,
  useInventoryItems,
  useGoodsIssues,
} from "@/lib/store";

interface ForecastItem {
  productId: string;
  productSku: string;
  productName: string;
  currentStock: number;
  onOrder: number;
  projectedStock: number;
  avgMonthlyDemand: number;
  forecast30Days: number;
  daysOfStock: number;
  stockoutDate: Date | null;
  status: "ok" | "low" | "critical" | "stockout";
  trend: "up" | "down" | "stable";
  trendPercent: number;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(value));
}

export function InventoryForecast() {
  const products = useProducts();
  const inventoryItems = useInventoryItems();
  const goodsIssues = useGoodsIssues();

  const forecastData = useMemo(() => {
    const results: ForecastItem[] = [];

    products.forEach((product: any) => {
      // Get historical demand (last 6 months)
      const demandHistory: number[] = [];
      const now = new Date();

      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

        const monthlyDemand = goodsIssues.reduce((sum: number, gi: any) => {
          const issueDate = new Date(gi.issueDate);
          if (issueDate >= monthStart && issueDate <= monthEnd) {
            const item = gi.items?.find((it: any) => it.productId === product.id);
            return sum + (item?.quantity || 0);
          }
          return sum;
        }, 0);

        demandHistory.push(monthlyDemand);
      }

      // Calculate average monthly demand
      const validDemand = demandHistory.filter((d) => d > 0);
      const avgMonthlyDemand = validDemand.length > 0
        ? validDemand.reduce((a, b) => a + b, 0) / validDemand.length
        : 10;

      // Calculate trend (simple linear regression)
      const n = demandHistory.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      demandHistory.forEach((y, x) => {
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
      });
      const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) : 0;
      const trendPercent = avgMonthlyDemand > 0 ? (slope / avgMonthlyDemand) * 100 : 0;
      const trend: "up" | "down" | "stable" =
        trendPercent > 5 ? "up" : trendPercent < -5 ? "down" : "stable";

      // Apply trend factor for 30-day forecast
      const trendFactor = 1 + (slope / avgMonthlyDemand) * 0.5;
      const forecast30Days = avgMonthlyDemand * trendFactor;

      // Get current stock
      const totalStock = inventoryItems
        .filter((item: any) => item.productId === product.id)
        .reduce((sum: number, item: any) => sum + item.quantityAvailable, 0);

      // Simulate on-order quantity
      const onOrder = Math.random() > 0.7 ? Math.floor(Math.random() * 50) + 10 : 0;

      // Projected stock after 30 days
      const projectedStock = totalStock + onOrder - forecast30Days;

      // Days of stock
      const dailyDemand = avgMonthlyDemand / 30;
      const daysOfStock = dailyDemand > 0 ? totalStock / dailyDemand : 999;

      // Stockout date
      let stockoutDate: Date | null = null;
      if (projectedStock < 0) {
        const daysToStockout = totalStock / (forecast30Days / 30);
        stockoutDate = new Date(Date.now() + daysToStockout * 24 * 60 * 60 * 1000);
      }

      // Status
      let status: ForecastItem["status"] = "ok";
      if (daysOfStock < 7) status = "stockout";
      else if (daysOfStock < 15) status = "critical";
      else if (daysOfStock < 30) status = "low";

      results.push({
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        currentStock: totalStock,
        onOrder,
        projectedStock,
        avgMonthlyDemand,
        forecast30Days,
        daysOfStock: Math.round(daysOfStock),
        stockoutDate,
        status,
        trend,
        trendPercent,
      });
    });

    // Sort by urgency
    return results.sort((a, b) => {
      if (a.status === "stockout" && b.status !== "stockout") return -1;
      if (b.status === "stockout" && a.status !== "stockout") return 1;
      if (a.status === "critical" && b.status !== "critical" && b.status !== "stockout") return -1;
      if (b.status === "critical" && a.status !== "critical" && a.status !== "stockout") return 1;
      return a.daysOfStock - b.daysOfStock;
    });
  }, [products, inventoryItems, goodsIssues]);

  const summary = useMemo(() => {
    const critical = forecastData.filter((f) => f.status === "critical" || f.status === "stockout").length;
    const low = forecastData.filter((f) => f.status === "low").length;
    const avgDaysOfStock = forecastData.length > 0
      ? forecastData.reduce((sum, f) => sum + f.daysOfStock, 0) / forecastData.length
      : 0;
    return { critical, low, avgDaysOfStock: Math.round(avgDaysOfStock) };
  }, [forecastData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/20">
            <Sparkles className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Dự báo nhu cầu</h2>
            <p className="text-slate-400 text-sm">AI dự đoán nhu cầu 30 ngày tới</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-400">{summary.critical}</p>
            <p className="text-sm text-slate-400">Cần đặt hàng ngay</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4 text-center">
            <Package className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-amber-400">{summary.low}</p>
            <p className="text-sm text-slate-400">Sắp hết hàng</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 text-center">
            <Calendar className="w-6 h-6 text-sky-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{summary.avgDaysOfStock}</p>
            <p className="text-sm text-slate-400">Ngày tồn TB</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{forecastData.length}</p>
            <p className="text-sm text-slate-400">Sản phẩm được phân tích</p>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Table */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-violet-400" />
            Dự kiến nhu cầu 30 ngày tới
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left text-slate-400 font-medium p-4">Sản phẩm</th>
                  <th className="text-right text-slate-400 font-medium p-4">Tồn hiện tại</th>
                  <th className="text-right text-slate-400 font-medium p-4">Đang đặt</th>
                  <th className="text-right text-slate-400 font-medium p-4">Dự báo 30 ngày</th>
                  <th className="text-center text-slate-400 font-medium p-4">Xu hướng</th>
                  <th className="text-center text-slate-400 font-medium p-4">Ngày tồn</th>
                  <th className="text-center text-slate-400 font-medium p-4">Trạng thái</th>
                  <th className="text-right text-slate-400 font-medium p-4">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {forecastData.slice(0, 15).map((item) => (
                  <tr key={item.productId} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="p-4">
                      <div>
                        <p className="text-white font-medium">{item.productName}</p>
                        <p className="text-slate-400 text-sm font-mono">{item.productSku}</p>
                      </div>
                    </td>
                    <td className="text-right p-4">
                      <span className={`font-medium ${
                        item.status === "stockout" ? "text-red-400" :
                        item.status === "critical" ? "text-amber-400" :
                        "text-white"
                      }`}>
                        {formatNumber(item.currentStock)}
                      </span>
                    </td>
                    <td className="text-right p-4">
                      <span className="text-sky-400 font-medium">
                        {item.onOrder > 0 ? `+${formatNumber(item.onOrder)}` : "-"}
                      </span>
                    </td>
                    <td className="text-right p-4">
                      <div>
                        <p className="text-white font-medium">{formatNumber(item.forecast30Days)}</p>
                        <p className="text-slate-500 text-xs">
                          TB: {formatNumber(item.avgMonthlyDemand)}/tháng
                        </p>
                      </div>
                    </td>
                    <td className="text-center p-4">
                      <div className="flex items-center justify-center gap-1">
                        {item.trend === "up" && (
                          <>
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                            <span className="text-emerald-400 text-sm">+{item.trendPercent.toFixed(0)}%</span>
                          </>
                        )}
                        {item.trend === "down" && (
                          <>
                            <TrendingDown className="w-4 h-4 text-red-400" />
                            <span className="text-red-400 text-sm">{item.trendPercent.toFixed(0)}%</span>
                          </>
                        )}
                        {item.trend === "stable" && (
                          <span className="text-slate-400 text-sm">~0%</span>
                        )}
                      </div>
                    </td>
                    <td className="text-center p-4">
                      <span className={`font-medium ${
                        item.daysOfStock < 15 ? "text-red-400" :
                        item.daysOfStock < 30 ? "text-amber-400" :
                        "text-slate-300"
                      }`}>
                        {item.daysOfStock >= 999 ? "∞" : `${item.daysOfStock} ngày`}
                      </span>
                    </td>
                    <td className="text-center p-4">
                      <Badge className={`${
                        item.status === "stockout" ? "bg-red-500/10 text-red-400 border-0" :
                        item.status === "critical" ? "bg-red-500/10 text-red-400 border-0" :
                        item.status === "low" ? "bg-amber-500/10 text-amber-400 border-0" :
                        "bg-emerald-500/10 text-emerald-400 border-0"
                      }`}>
                        {item.status === "stockout" ? "Hết hàng" :
                         item.status === "critical" ? "Nguy cơ" :
                         item.status === "low" ? "Thấp" : "OK"}
                      </Badge>
                    </td>
                    <td className="text-right p-4">
                      {item.status !== "ok" && (
                        <button className="text-sky-400 hover:text-sky-300 text-sm flex items-center gap-1 ml-auto">
                          Đặt hàng
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {forecastData.length > 15 && (
            <div className="p-4 border-t border-slate-800 text-center text-slate-400 text-sm">
              Hiển thị 15 / {forecastData.length} sản phẩm
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stockout Alerts */}
      {forecastData.filter((f) => f.stockoutDate).length > 0 && (
        <Card className="bg-red-500/5 border-red-500/20">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Cảnh báo hết hàng trong 30 ngày
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {forecastData
                .filter((f) => f.stockoutDate)
                .slice(0, 5)
                .map((item) => (
                  <div key={item.productId} className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                      <div>
                        <p className="text-white font-medium">{item.productName}</p>
                        <p className="text-slate-400 text-sm">{item.productSku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-red-400 font-medium">
                        Dự kiến hết: {item.stockoutDate && new Date(item.stockoutDate).toLocaleDateString("vi-VN")}
                      </p>
                      <p className="text-slate-400 text-sm">
                        Cần đặt: {formatNumber(Math.max(0, item.forecast30Days - item.currentStock - item.onOrder))} đơn vị
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
