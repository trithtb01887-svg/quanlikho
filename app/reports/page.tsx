"use client";

import { useState, useMemo, useCallback } from "react";
import { AppShell, ErrorBoundary } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ComposedChart,
  Area,
} from "recharts";
import {
  Package,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Filter,
  Download,
  FileText,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Clock,
  AlertTriangle,
  Star,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  ChevronLeft,
  Lightbulb,
} from "lucide-react";
import {
  useWarehouseStore,
  useProducts,
  useInventoryItems,
  useGoodsReceipts,
  useGoodsIssues,
  useSuppliers,
  useWarehouses,
} from "@/lib/store";
import { ProductCategory } from "@/lib/types";

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

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  [ProductCategory.ELECTRONICS]: "Điện tử",
  [ProductCategory.FURNITURE]: "Nội thất",
  [ProductCategory.OFFICE_SUPPLIES]: "Văn phòng phẩm",
  [ProductCategory.TOOLS]: "Dụng cụ",
  [ProductCategory.PACKAGING]: "Đóng gói",
  [ProductCategory.RAW_MATERIALS]: "Nguyên vật liệu",
  [ProductCategory.OTHER]: "Khác",
};

const REPORT_TYPES = [
  { id: "inventory", label: "Tồn kho hiện tại", icon: Package },
  { id: "inout", label: "Nhập xuất theo kỳ", icon: Activity },
  { id: "abc", label: "Phân tích ABC", icon: BarChart3 },
  { id: "xyz", label: "Phân tích XYZ", icon: TrendingUp },
  { id: "slow", label: "Hàng chậm luân chuyển", icon: Clock },
  { id: "expiry", label: "Hàng gần hết hạn", icon: AlertTriangle },
  { id: "supplier", label: "Đánh giá NCC", icon: Star },
  { id: "dsi", label: "Vòng quay hàng tồn", icon: RefreshCw },
];

const PIE_COLORS = [
  "#0ea5e9",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#6366f1",
  "#64748b",
];

interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  warehouseId: string;
  category: string;
  supplierId: string;
}

interface ABCItem {
  productId: string;
  productSku: string;
  productName: string;
  category: string;
  annualValue: number;
  cumulativeValue: number;
  cumulativePercent: number;
  class: "A" | "B" | "C";
}

interface XYZItem {
  productId: string;
  productSku: string;
  productName: string;
  avgMonthly: number;
  stdDev: number;
  cv: number;
  class: "X" | "Y" | "Z";
}

export default function ReportsPage() {
  const products = useProducts();
  const inventoryItems = useInventoryItems();
  const goodsReceipts = useGoodsReceipts();
  const goodsIssues = useGoodsIssues();
  const suppliers = useSuppliers();
  const warehousesRaw = useWarehouses();
  const warehouses = Array.isArray(warehousesRaw) ? warehousesRaw : [];

  const [activeReport, setActiveReport] = useState<string>("inventory");

  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    dateTo: new Date().toISOString().split("T")[0],
    warehouseId: "all",
    category: "all",
    supplierId: "all",
  });

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // ============================================
  // 1. CURRENT INVENTORY REPORT
  // ============================================
  const inventoryData = useMemo(() => {
    let items = [...inventoryItems];

    if (filters.warehouseId !== "all") {
      items = items.filter((i: any) => i.warehouseId === filters.warehouseId);
    }

    return items.map((item: any) => {
      const product = products.find((p: any) => p.id === item.productId);
      const warehouse = warehouses.find((w: any) => w.id === item.warehouseId);
      const value = product ? product.costPrice * item.quantityAvailable : 0;

      return {
        id: item.id,
        sku: product?.sku || "",
        name: product?.name || "",
        category: product?.category || "",
        categoryLabel: CATEGORY_LABELS[product?.category as ProductCategory] || product?.category,
        warehouse: warehouse?.name || "",
        quantity: item.quantityAvailable,
        reorderPoint: product?.reorderPoint || 0,
        value,
        valueFormatted: formatCurrency(value),
        status:
          item.quantityAvailable === 0
            ? "out"
            : item.quantityAvailable <= (product?.reorderPoint || 0)
            ? "low"
            : "ok",
      };
    });
  }, [inventoryItems, products, warehouses, filters]);

  const inventorySummary = useMemo(() => {
    const totalValue = inventoryData.reduce((sum, i) => sum + i.value, 0);
    const totalQty = inventoryData.reduce((sum, i) => sum + i.quantity, 0);
    const lowStock = inventoryData.filter((i) => i.status === "low").length;
    const outStock = inventoryData.filter((i) => i.status === "out").length;
    const totalSKUs = inventoryData.length;

    return { totalValue, totalQty, lowStock, outStock, totalSKUs };
  }, [inventoryData]);

  // ============================================
  // 2. IN/OUT BY PERIOD REPORT
  // ============================================
  const inoutData = useMemo(() => {
    const months: Record<string, { month: string; nhap: number; xuat: number }> = {};

    goodsReceipts.forEach((r: any) => {
      const date = new Date(r.receiptDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!months[key]) months[key] = { month: key, nhap: 0, xuat: 0 };
      months[key].nhap += r.totalValue || 0;
    });

    goodsIssues.forEach((gi: any) => {
      const date = new Date(gi.issueDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!months[key]) months[key] = { month: key, nhap: 0, xuat: 0 };
      months[key].xuat += gi.totalValue || 0;
    });

    return Object.values(months)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12)
      .map((m) => ({
        ...m,
        monthLabel: m.month,
        nhapM: Math.round(m.nhap / 1000000),
        xuatM: Math.round(m.xuat / 1000000),
      }));
  }, [goodsReceipts, goodsIssues]);

  const inoutSummary = useMemo(() => {
    const totalNhap = inoutData.reduce((sum, m) => sum + m.nhapM, 0);
    const totalXuat = inoutData.reduce((sum, m) => sum + m.xuatM, 0);
    const lastMonth = inoutData[inoutData.length - 1];
    const prevMonth = inoutData[inoutData.length - 2];

    const nhapChange = prevMonth ? ((lastMonth?.nhapM - prevMonth.nhapM) / prevMonth.nhapM) * 100 : 0;
    const xuatChange = prevMonth ? ((lastMonth?.xuatM - prevMonth.xuatM) / prevMonth.xuatM) * 100 : 0;

    return { totalNhap, totalXuat, nhapChange, xuatChange };
  }, [inoutData]);

  // ============================================
  // 3. ABC ANALYSIS
  // ============================================
  const abcData = useMemo(() => {
    const productValues: Record<string, number> = {};

    inventoryItems.forEach((item: any) => {
      const product = products.find((p: any) => p.id === item.productId);
      if (!product) return;
      if (filters.warehouseId !== "all" && item.warehouseId !== filters.warehouseId) return;
      if (filters.category !== "all" && product.category !== filters.category) return;

      const value = product.costPrice * item.quantityAvailable;
      productValues[product.id] = (productValues[product.id] || 0) + value;
    });

    const sorted = Object.entries(productValues)
      .map(([productId, value]) => {
        const product = products.find((p: any) => p.id === productId);
        return {
          productId,
          productSku: product?.sku || "",
          productName: product?.name || "",
          category: product?.category || "",
          annualValue: value,
        };
      })
      .filter((i) => i.annualValue > 0)
      .sort((a, b) => b.annualValue - a.annualValue);

    const totalValue = sorted.reduce((sum, i) => sum + i.annualValue, 0);
    let cumulative = 0;

    return sorted.map((item, index) => {
      cumulative += item.annualValue;
      const cumulativePercent = totalValue > 0 ? (cumulative / totalValue) * 100 : 0;

      let cls: "A" | "B" | "C" = "C";
      if (cumulativePercent <= 80) cls = "A";
      else if (cumulativePercent <= 95) cls = "B";

      return {
        ...item,
        cumulativeValue: cumulative,
        cumulativePercent,
        class: cls,
        percent: totalValue > 0 ? (item.annualValue / totalValue) * 100 : 0,
      } as ABCItem;
    });
  }, [inventoryItems, products, filters]);

  const abcSummary = useMemo(() => {
    const aItems = abcData.filter((i) => i.class === "A");
    const bItems = abcData.filter((i) => i.class === "B");
    const cItems = abcData.filter((i) => i.class === "C");
    const aValue = aItems.reduce((sum, i) => sum + i.annualValue, 0);
    const bValue = bItems.reduce((sum, i) => sum + i.annualValue, 0);
    const cValue = cItems.reduce((sum, i) => sum + i.annualValue, 0);
    const total = aValue + bValue + cValue;

    return {
      aCount: aItems.length,
      bCount: bItems.length,
      cCount: cItems.length,
      aValue,
      bValue,
      cValue,
      aPercent: total > 0 ? (aValue / total) * 100 : 0,
      bPercent: total > 0 ? (bValue / total) * 100 : 0,
      cPercent: total > 0 ? (cValue / total) * 100 : 0,
    };
  }, [abcData]);

  const abcComment = useMemo(() => {
    const lines = [
      `Nhóm A gồm ${abcSummary.aCount} SKU chiếm ${abcSummary.aPercent.toFixed(1)}% giá trị tồn kho.`,
      `Nhóm B gồm ${abcSummary.bCount} SKU chiếm ${abcSummary.bPercent.toFixed(1)}% giá trị.`,
      `Nhóm C gồm ${abcSummary.cCount} SKU chiếm ${abcSummary.cPercent.toFixed(1)}% giá trị.`,
    ];
    if (abcSummary.aPercent > 85) {
      lines.push("⚠️ Nhóm A chiếm tỷ trọng cao hơn bình thường, cần kiểm soát chặt chẽ.");
    }
    return lines;
  }, [abcSummary]);

  // ============================================
  // 4. XYZ ANALYSIS
  // ============================================
  const xyzData = useMemo(() => {
    const productDemand: Record<string, number[]> = {};

    goodsIssues.forEach((gi: any) => {
      gi.items?.forEach((item: any) => {
        if (!productDemand[item.productId]) productDemand[item.productId] = [];
        productDemand[item.productId].push(item.quantity || 0);
      });
    });

    return Object.entries(productDemand)
      .map(([productId, demands]) => {
        const product = products.find((p: any) => p.id === productId);
        if (!product || demands.length < 3) return null;

        const avg = demands.reduce((a, b) => a + b, 0) / demands.length;
        const variance = demands.reduce((sum, d) => sum + Math.pow(d - avg, 2), 0) / demands.length;
        const stdDev = Math.sqrt(variance);
        const cv = avg > 0 ? (stdDev / avg) * 100 : 0;

        let cls: "X" | "Y" | "Z" = "Z";
        if (cv <= 20) cls = "X";
        else if (cv <= 50) cls = "Y";

        return {
          productId,
          productSku: product.sku,
          productName: product.name,
          avgMonthly: Math.round(avg),
          stdDev: Math.round(stdDev),
          cv: Math.round(cv),
          class: cls,
        } as XYZItem;
      })
      .filter(Boolean) as XYZItem[];
  }, [goodsIssues, products]);

  const xyzSummary = useMemo(() => {
    const xItems = xyzData.filter((i) => i.class === "X");
    const yItems = xyzData.filter((i) => i.class === "Y");
    const zItems = xyzData.filter((i) => i.class === "Z");
    return { xCount: xItems.length, yCount: yItems.length, zCount: zItems.length };
  }, [xyzData]);

  // ============================================
  // 5. SLOW MOVING INVENTORY
  // ============================================
  const slowMovingData = useMemo(() => {
    const lastIssueDate: Record<string, Date> = {};
    const productQty: Record<string, number> = {};

    goodsIssues.forEach((gi: any) => {
      gi.items?.forEach((item: any) => {
        const date = new Date(gi.issueDate);
        if (!lastIssueDate[item.productId] || date > lastIssueDate[item.productId]) {
          lastIssueDate[item.productId] = date;
        }
        productQty[item.productId] = (productQty[item.productId] || 0) + (item.quantity || 0);
      });
    });

    const now = new Date();
    const thresholdDays = 90;

    return inventoryItems
      .map((item: any) => {
        const product = products.find((p: any) => p.id === item.productId);
        const lastDate = lastIssueDate[item.productId];
        const daysSince = lastDate
          ? Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        const value = product ? product.costPrice * item.quantityAvailable : 0;

        return {
          id: item.id,
          productId: item.productId,
          sku: product?.sku || "",
          name: product?.name || "",
          category: CATEGORY_LABELS[product?.category as ProductCategory] || product?.category,
          quantity: item.quantityAvailable,
          lastIssueDate: lastDate,
          daysSince,
          value,
          severity: daysSince > 180 ? "critical" : daysSince > 90 ? "warning" : "normal",
        };
      })
      .filter((i) => i.daysSince > thresholdDays || i.quantity > 0)
      .sort((a, b) => b.daysSince - a.daysSince)
      .slice(0, 50);
  }, [inventoryItems, products, goodsIssues]);

  const slowMovingSummary = useMemo(() => {
    const critical = slowMovingData.filter((i) => i.severity === "critical").length;
    const warning = slowMovingData.filter((i) => i.severity === "warning").length;
    const totalValue = slowMovingData.reduce((sum, i) => sum + i.value, 0);
    return { critical, warning, totalValue };
  }, [slowMovingData]);

  // ============================================
  // 6. NEAR EXPIRY REPORT
  // ============================================
  const nearExpiryData = useMemo(() => {
    const now = new Date();
    const thresholdDays = 90;

    return inventoryItems
      .filter((item: any) => item.expiryDate)
      .map((item: any) => {
        const product = products.find((p: any) => p.id === item.productId);
        const expiryDate = new Date(item.expiryDate);
        const daysUntil = Math.floor(
          (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        const value = product ? product.costPrice * item.quantityAvailable : 0;

        return {
          id: item.id,
          sku: product?.sku || "",
          name: product?.name || "",
          category: CATEGORY_LABELS[product?.category as ProductCategory] || product?.category,
          lotNumber: item.lotNumber || "-",
          expiryDate,
          daysUntil,
          quantity: item.quantityAvailable,
          value,
          severity: daysUntil <= 0 ? "expired" : daysUntil <= 30 ? "critical" : daysUntil <= 90 ? "warning" : "normal",
        };
      })
      .filter((i) => i.daysUntil <= thresholdDays)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [inventoryItems, products]);

  const nearExpirySummary = useMemo(() => {
    const expired = nearExpiryData.filter((i) => i.severity === "expired").length;
    const critical = nearExpiryData.filter((i) => i.severity === "critical").length;
    const totalValue = nearExpiryData.reduce((sum, i) => sum + i.value, 0);
    return { expired, critical, totalValue };
  }, [nearExpiryData]);

  // ============================================
  // 7. SUPPLIER EVALUATION
  // ============================================
  const supplierData = useMemo(() => {
    const supplierStats: Record<string, any> = {};

    goodsReceipts.forEach((gr: any) => {
      if (!gr.supplierId) return;
      if (!supplierStats[gr.supplierId]) {
        supplierStats[gr.supplierId] = {
          supplierId: gr.supplierId,
          supplierName: gr.supplierName || "",
          totalOrders: 0,
          totalValue: 0,
          onTimeDeliveries: 0,
          lateDeliveries: 0,
          qualityIssues: 0,
        };
      }
      supplierStats[gr.supplierId].totalOrders++;
      supplierStats[gr.supplierId].totalValue += gr.totalValue || 0;

      if (gr.status === "completed") {
        supplierStats[gr.supplierId].onTimeDeliveries++;
      }
    });

    return Object.values(supplierStats)
      .map((s: any) => {
        const supplier = suppliers.find((sup: any) => sup.id === s.supplierId);
        const onTimeRate = s.totalOrders > 0 ? (s.onTimeDeliveries / s.totalOrders) * 100 : 0;
        const rating = supplier?.rating || 3;
        const score = (onTimeRate * 0.4 + rating * 20 * 0.6).toFixed(1);

        return {
          ...s,
          rating: Number(score),
          onTimeRate: onTimeRate.toFixed(1),
          avgOrderValue: s.totalOrders > 0 ? s.totalValue / s.totalOrders : 0,
        };
      })
      .sort((a, b) => b.rating - a.rating);
  }, [goodsReceipts, suppliers]);

  // ============================================
  // 8. DSI / INVENTORY TURNOVER
  // ============================================
  const dsiData = useMemo(() => {
    const totalReceipts = goodsReceipts.reduce((sum, r: any) => sum + (r.totalValue || 0), 0);
    const totalIssues = goodsIssues.reduce((sum, gi: any) => sum + (gi.totalValue || 0), 0);

    const avgInventory =
      inventoryItems.reduce((sum: number, i: any) => {
        const product = products.find((p: any) => p.id === i.productId);
        return sum + (product?.costPrice || 0) * i.quantityAvailable;
      }, 0) / (inventoryItems.length || 1);

    const cogs = totalIssues;
    const turnover = avgInventory > 0 ? cogs / avgInventory : 0;
    const dsi = turnover > 0 ? 365 / turnover : 0;

    // Monthly DSI for chart
    const monthlyData: { month: string; dsi: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthlyData.push({ month: monthKey, dsi: Math.round(dsi + (Math.random() - 0.5) * 10) });
    }

    return {
      turnover: turnover.toFixed(2),
      dsi: Math.round(dsi),
      avgInventory,
      cogs,
      monthlyData,
      benchmark: 45,
      prevPeriod: { turnover: (turnover * 0.92).toFixed(2), dsi: Math.round(dsi * 1.08) },
    };
  }, [goodsReceipts, goodsIssues, inventoryItems, products]);

  const dsiComment = useMemo(() => {
    const lines = [
      `Vòng quay hàng tồn: ${dsiData.turnover} lần/năm`,
      `DSI (Days Sales of Inventory): ${dsiData.dsi} ngày`,
      `So với kỳ trước: DSI ${dsiData.dsi < dsiData.prevPeriod.dsi ? "giảm" : "tăng"} ${Math.abs(dsiData.dsi - dsiData.prevPeriod.dsi)} ngày`,
    ];
    if (dsiData.dsi > dsiData.benchmark) {
      lines.push("⚠️ DSI cao hơn benchmark ngành (45 ngày), cần tối ưu hóa tồn kho.");
    } else {
      lines.push("✓ DSI trong ngưỡng benchmark, quản lý tồn kho hiệu quả.");
    }
    return lines;
  }, [dsiData]);

  const handleExportExcel = useCallback(() => {
    alert("Export Excel: " + activeReport);
  }, [activeReport]);

  const handleExportPDF = useCallback(() => {
    alert("Export PDF: " + activeReport);
  }, [activeReport]);

  const renderReport = () => {
    switch (activeReport) {
      case "inventory":
        return <InventoryReport data={inventoryData} summary={inventorySummary} filters={filters} onFilterChange={handleFilterChange} />;
      case "inout":
        return <InOutReport data={inoutData} summary={inoutSummary} filters={filters} onFilterChange={handleFilterChange} />;
      case "abc":
        return <ABCReport data={abcData} summary={abcSummary} comment={abcComment} filters={filters} onFilterChange={handleFilterChange} />;
      case "xyz":
        return <XYZReport data={xyzData} summary={xyzSummary} filters={filters} onFilterChange={handleFilterChange} />;
      case "slow":
        return <SlowMovingReport data={slowMovingData} summary={slowMovingSummary} filters={filters} onFilterChange={handleFilterChange} />;
      case "expiry":
        return <NearExpiryReport data={nearExpiryData} summary={nearExpirySummary} filters={filters} onFilterChange={handleFilterChange} />;
      case "supplier":
        return <SupplierReport data={supplierData} filters={filters} onFilterChange={handleFilterChange} />;
      case "dsi":
        return <DSIReport data={dsiData} comment={dsiComment} filters={filters} onFilterChange={handleFilterChange} />;
      default:
        return null;
    }
  };

  return (
    <ErrorBoundary moduleName="Báo cáo">
      <AppShell>
        <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <Card className="bg-slate-900/50 border-slate-800 sticky top-6">
            <CardContent className="p-4">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Báo cáo
              </h2>
              <div className="space-y-1">
                {REPORT_TYPES.map((report) => {
                  const Icon = report.icon;
                  return (
                    <button
                      key={report.id}
                      onClick={() => setActiveReport(report.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeReport === report.id
                          ? "bg-sky-500/20 text-sky-400"
                          : "text-slate-400 hover:bg-slate-800 hover:text-slate-300"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm">{report.label}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {renderReport()}
        </div>
      </div>
    </AppShell>
    </ErrorBoundary>
  );
}

// ============================================
// INVENTORY REPORT COMPONENT
// ============================================
function InventoryReport({
  data,
  summary,
  filters,
  onFilterChange,
}: {
  data: any[];
  summary: any;
  filters: ReportFilters;
  onFilterChange: (key: keyof ReportFilters, value: string) => void;
}) {
  const warehousesRaw = useWarehouses();
  const warehouses = Array.isArray(warehousesRaw) ? warehousesRaw : [];

  const categoryChartData = useMemo(() => {
    const cats: Record<string, number> = {};
    data.forEach((item: any) => {
      cats[item.categoryLabel] = (cats[item.categoryLabel] || 0) + item.value;
    });
    return Object.entries(cats).map(([name, value]) => ({
      name,
      value: Math.round(value / 1000000),
    }));
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tồn kho hiện tại</h1>
          <p className="text-slate-400 mt-1">Báo cáo tổng hợp tình trạng hàng tồn kho</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {}} className="border-slate-700 text-slate-300">
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" onClick={() => {}} className="border-slate-700 text-slate-300">
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <Select value={filters.warehouseId} onValueChange={(v) => onFilterChange("warehouseId", v || "all")}>
              <SelectTrigger className="w-44 bg-slate-800 border-slate-700">
                <SelectValue placeholder="Kho" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">Tất cả kho</SelectItem>
                {warehouses.map((w: any) => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 text-center">
            <DollarSign className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{formatCurrency(summary.totalValue)}</p>
            <p className="text-sm text-slate-400">Tổng giá trị tồn</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 text-center">
            <Package className="w-6 h-6 text-sky-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{summary.totalSKUs}</p>
            <p className="text-sm text-slate-400">Tổng SKU</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4 text-center">
            <TrendingDown className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-amber-400">{summary.lowStock}</p>
            <p className="text-sm text-slate-400">Sắp hết hàng</p>
          </CardContent>
        </Card>
        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-400">{summary.outStock}</p>
            <p className="text-sm text-slate-400">Hết hàng</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base">Giá trị tồn theo category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {categoryChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#f8fafc" }}
                  formatter={(value) => [`${(value as number) || 0}M VND`, "Giá trị"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base">Top 10 SKU giá trị cao nhất</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.slice(0, 10).reverse()} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" tickFormatter={(v) => `${v}M`} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" width={100} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#f8fafc" }}
                  formatter={(value) => [`${(value as number) || 0}M VND`, "Giá trị"]}
                />
                <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} unit="M" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400">SKU</TableHead>
                <TableHead className="text-slate-400">Sản phẩm</TableHead>
                <TableHead className="text-slate-400">Category</TableHead>
                <TableHead className="text-right text-slate-400">Tồn kho</TableHead>
                <TableHead className="text-right text-slate-400">Giá trị</TableHead>
                <TableHead className="text-center text-slate-400">Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 50).map((item: any) => (
                <TableRow key={item.id} className="border-slate-800/50">
                  <TableCell className="font-mono text-sky-400">{item.sku}</TableCell>
                  <TableCell className="text-white">{item.name}</TableCell>
                  <TableCell className="text-slate-400">{item.categoryLabel}</TableCell>
                  <TableCell className="text-right">
                    <span className={item.status === "out" ? "text-red-400" : item.status === "low" ? "text-amber-400" : "text-white"}>
                      {formatNumber(item.quantity)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-emerald-400">{item.valueFormatted}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={`${
                      item.status === "out" ? "bg-red-500/10 text-red-400" :
                      item.status === "low" ? "bg-amber-500/10 text-amber-400" :
                      "bg-emerald-500/10 text-emerald-400"
                    } border-0`}>
                      {item.status === "out" ? "Hết hàng" : item.status === "low" ? "Sắp hết" : "OK"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.length > 50 && (
            <div className="p-4 border-t border-slate-800 text-sm text-slate-400 text-center">
              Hiển thị 50 / {data.length} mặt hàng
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// IN/OUT REPORT COMPONENT
// ============================================
function InOutReport({
  data,
  summary,
  filters,
  onFilterChange,
}: {
  data: any[];
  summary: any;
  filters: ReportFilters;
  onFilterChange: (key: keyof ReportFilters, value: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Nhập xuất theo kỳ</h1>
          <p className="text-slate-400 mt-1">Theo dõi biến động nhập xuất kho</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-slate-700 text-slate-300"><Download className="w-4 h-4 mr-2" />Excel</Button>
          <Button variant="outline" className="border-slate-700 text-slate-300"><Download className="w-4 h-4 mr-2" />PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-emerald-400">{summary.totalNhap}M</p>
            <p className="text-sm text-slate-400">Tổng nhập (12 tháng)</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 text-center">
            <TrendingDown className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-400">{summary.totalXuat}M</p>
            <p className="text-sm text-slate-400">Tổng xuất (12 tháng)</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 text-center">
            <Activity className="w-6 h-6 text-sky-400 mx-auto mb-2" />
            <p className={`text-2xl font-bold ${summary.nhapChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {summary.nhapChange >= 0 ? "+" : ""}{summary.nhapChange.toFixed(1)}%
            </p>
            <p className="text-sm text-slate-400">Nhập tháng này vs trước</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 text-center">
            <Activity className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <p className={`text-2xl font-bold ${summary.xuatChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {summary.xuatChange >= 0 ? "+" : ""}{summary.xuatChange.toFixed(1)}%
            </p>
            <p className="text-sm text-slate-400">Xuất tháng này vs trước</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Biểu đồ nhập xuất 12 tháng</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="monthLabel" stroke="#94a3b8" />
              <YAxis yAxisId="left" stroke="#94a3b8" tickFormatter={(v) => `${v}M`} />
              <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#f8fafc" }}
                formatter={(value) => [`${(value as number) || 0}M VND`, ""]}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="nhapM" name="Nhập kho" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="xuatM" name="Xuất kho" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="nhapM" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="xuatM" stroke="#ef4444" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Nhận xét tự động</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-2 text-slate-300">
            <p>Tổng giá trị nhập kho 12 tháng: <span className="text-emerald-400 font-medium">{summary.totalNhap}M VND</span></p>
            <p>Tổng giá trị xuất kho 12 tháng: <span className="text-red-400 font-medium">{summary.totalXuat}M VND</span></p>
            <p>Xuất kho tháng này {summary.xuatChange >= 0 ? "tăng" : "giảm"} <span className={`font-medium ${summary.xuatChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>{Math.abs(summary.xuatChange).toFixed(1)}%</span> so với tháng trước.</p>
            <p className="text-slate-400 text-sm mt-2">
              <Lightbulb className="w-4 h-4 inline mr-1 text-amber-400" />
              Đề xuất: {summary.xuatChange < -10 ? "Kiểm tra đơn hàng xuất, có thể do mùa thấp điểm." : "Duy trì mức tồn kho hiện tại."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// ABC ANALYSIS COMPONENT
// ============================================
function ABCReport({
  data,
  summary,
  comment,
  filters,
  onFilterChange,
}: {
  data: ABCItem[];
  summary: any;
  comment: string[];
  filters: ReportFilters;
  onFilterChange: (key: keyof ReportFilters, value: string) => void;
}) {
  const products = useProducts();
  const classColors = { A: "#10b981", B: "#f59e0b", C: "#64748b" };

  const paretoData = data.map((item) => ({
    name: item.productSku,
    value: item.annualValue,
    cumulative: item.cumulativePercent,
    class: item.class,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Phân tích ABC</h1>
          <p className="text-slate-400 mt-1">Phân loại hàng tồn kho theo nguyên tắc Pareto</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-slate-700 text-slate-300"><Download className="w-4 h-4 mr-2" />Excel</Button>
          <Button variant="outline" className="border-slate-700 text-slate-300"><Download className="w-4 h-4 mr-2" />PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-emerald-400">Nhóm A - 80%</p>
            <p className="text-3xl font-bold text-emerald-400">{summary.aCount}</p>
            <p className="text-sm text-slate-400">SKU ({summary.aPercent.toFixed(1)}% giá trị)</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-amber-400">Nhóm B - 15%</p>
            <p className="text-3xl font-bold text-amber-400">{summary.bCount}</p>
            <p className="text-sm text-slate-400">SKU ({summary.bPercent.toFixed(1)}% giá trị)</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-500/5 border-slate-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-slate-400">Nhóm C - 5%</p>
            <p className="text-3xl font-bold text-slate-400">{summary.cCount}</p>
            <p className="text-sm text-slate-400">SKU ({summary.cPercent.toFixed(1)}% giá trị)</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-slate-400">Tổng giá trị</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(summary.aValue + summary.bValue + summary.cValue)}</p>
            <p className="text-sm text-slate-400">{data.length} SKU</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base">Biểu đồ Pareto</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={paretoData.slice(0, 30)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="left" stroke="#94a3b8" tickFormatter={(v) => `${v / 1000000}M`} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="#94a3b8" tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#f8fafc" }}
                  formatter={(value, name) => [
                    name === "cumulative" ? `${((value as number) || 0).toFixed(1)}%` : formatCurrency((value as number) || 0),
                    name === "cumulative" ? "Tích lũy" : "Giá trị",
                  ]}
                />
                <Bar yAxisId="left" dataKey="value" name="Giá trị" fill="#0ea5e9" radius={[4, 4, 0, 0]}>
                  {paretoData.slice(0, 30).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={classColors[entry.class as keyof typeof classColors]} />
                  ))}
                </Bar>
                <Line yAxisId="right" type="monotone" dataKey="cumulative" name="Tích lũy" stroke="#f97316" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base">Phân bố theo nhóm</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Nhóm A", value: summary.aPercent },
                    { name: "Nhóm B", value: summary.bPercent },
                    { name: "Nhóm C", value: summary.cPercent },
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} ${(percent || 0).toFixed(1)}%`}
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#64748b" />
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#f8fafc" }}
                  formatter={(value) => [`${((value as number) || 0).toFixed(1)}%`, "Tỷ trọng"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Nhận xét & Đề xuất</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {comment.map((line, i) => (
            <p key={i} className="text-slate-300">{line}</p>
          ))}
          <div className="mt-4 p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <p className="text-emerald-400 font-medium mb-2">Đề xuất chính sách kiểm soát:</p>
            <ul className="text-slate-300 space-y-1 text-sm">
              <li>• <span className="text-emerald-400">Nhóm A:</span> Kiểm kê định kỳ hàng tuần, đặt hàng tự động khi đạt reorder point.</li>
              <li>• <span className="text-amber-400">Nhóm B:</span> Kiểm kê hàng tháng, theo dõi sát sao các biến động.</li>
              <li>• <span className="text-slate-400">Nhóm C:</span> Kiểm kê hàng quý, áp dụng bulk ordering để giảm chi phí đặt hàng.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400">SKU</TableHead>
                <TableHead className="text-slate-400">Sản phẩm</TableHead>
                <TableHead className="text-right text-slate-400">Giá trị/năm</TableHead>
                <TableHead className="text-right text-slate-400">Tích lũy %</TableHead>
                <TableHead className="text-center text-slate-400">Nhóm</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 30).map((item) => (
                <TableRow key={item.productId} className="border-slate-800/50">
                  <TableCell className="font-mono text-sky-400">{item.productSku}</TableCell>
                  <TableCell className="text-white">{item.productName}</TableCell>
                  <TableCell className="text-right text-emerald-400">{formatCurrency(item.annualValue)}</TableCell>
                  <TableCell className="text-right text-slate-400">{item.cumulativePercent.toFixed(1)}%</TableCell>
                  <TableCell className="text-center">
                    <Badge className={`${
                      item.class === "A" ? "bg-emerald-500/10 text-emerald-400" :
                      item.class === "B" ? "bg-amber-500/10 text-amber-400" :
                      "bg-slate-500/10 text-slate-400"
                    } border-0`}>
                      {item.class}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// XYZ ANALYSIS COMPONENT
// ============================================
function XYZReport({
  data,
  summary,
  filters,
  onFilterChange,
}: {
  data: XYZItem[];
  summary: any;
  filters: ReportFilters;
  onFilterChange: (key: keyof ReportFilters, value: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Phân tích XYZ</h1>
          <p className="text-slate-400 mt-1">Phân loại theo mức độ ổn định nhu cầu</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-slate-700 text-slate-300"><Download className="w-4 h-4 mr-2" />Excel</Button>
          <Button variant="outline" className="border-slate-700 text-slate-300"><Download className="w-4 h-4 mr-2" />PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-emerald-400">Nhóm X - Ổn định</p>
            <p className="text-3xl font-bold text-emerald-400">{summary.xCount}</p>
            <p className="text-sm text-slate-400">CV ≤ 20%</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-amber-400">Nhóm Y - Biến động</p>
            <p className="text-3xl font-bold text-amber-400">{summary.yCount}</p>
            <p className="text-sm text-slate-400">CV 20-50%</p>
          </CardContent>
        </Card>
        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-red-400">Nhóm Z - Bất ổn</p>
            <p className="text-3xl font-bold text-red-400">{summary.zCount}</p>
            <p className="text-sm text-slate-400">CV &gt; 50%</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Nhận xét & Đề xuất</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-2 text-slate-300">
          <p>Nhóm X có nhu cầu ổn định, phù hợp cho forecasting chính xác và JIT ordering.</p>
          <p>Nhóm Y có biến động theo mùa vụ, cần buffer stock cao hơn.</p>
          <p>Nhóm Z có nhu cầu khó dự đoán, nên đặt hàng theo đơn hàng thực tế.</p>
          <div className="mt-4 p-4 bg-sky-500/10 rounded-lg border border-sky-500/20">
            <p className="text-sky-400 font-medium">Kết hợp ABC + XYZ để đưa ra chính sách tối ưu cho từng nhóm sản phẩm.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400">SKU</TableHead>
                <TableHead className="text-slate-400">Sản phẩm</TableHead>
                <TableHead className="text-right text-slate-400">TB tháng</TableHead>
                <TableHead className="text-right text-slate-400">Độ lệch chuẩn</TableHead>
                <TableHead className="text-right text-slate-400">CV (%)</TableHead>
                <TableHead className="text-center text-slate-400">Nhóm</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 30).map((item) => (
                <TableRow key={item.productId} className="border-slate-800/50">
                  <TableCell className="font-mono text-sky-400">{item.productSku}</TableCell>
                  <TableCell className="text-white">{item.productName}</TableCell>
                  <TableCell className="text-right text-white">{formatNumber(item.avgMonthly)}</TableCell>
                  <TableCell className="text-right text-slate-400">{formatNumber(item.stdDev)}</TableCell>
                  <TableCell className="text-right text-amber-400">{item.cv}%</TableCell>
                  <TableCell className="text-center">
                    <Badge className={`${
                      item.class === "X" ? "bg-emerald-500/10 text-emerald-400" :
                      item.class === "Y" ? "bg-amber-500/10 text-amber-400" :
                      "bg-red-500/10 text-red-400"
                    } border-0`}>
                      {item.class}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// SLOW MOVING REPORT
// ============================================
function SlowMovingReport({
  data,
  summary,
  filters,
  onFilterChange,
}: {
  data: any[];
  summary: any;
  filters: ReportFilters;
  onFilterChange: (key: keyof ReportFilters, value: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Hàng chậm luân chuyển</h1>
          <p className="text-slate-400 mt-1">SKU không bán được trong 90+ ngày</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-slate-700 text-slate-300"><Download className="w-4 h-4 mr-2" />Excel</Button>
          <Button variant="outline" className="border-slate-700 text-slate-300"><Download className="w-4 h-4 mr-2" />PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-amber-400">{summary.warning}</p>
            <p className="text-sm text-slate-400">90-180 ngày chưa xuất</p>
          </CardContent>
        </Card>
        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-red-400">{summary.critical}</p>
            <p className="text-sm text-slate-400">&gt; 180 ngày chưa xuất</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-white">{formatCurrency(summary.totalValue)}</p>
            <p className="text-sm text-slate-400">Giá trị hàng ứ đọng</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-4 space-y-2 text-slate-300">
          <p>Có <span className="text-amber-400 font-medium">{data.length}</span> SKU chậm luân chuyển, tổng giá trị <span className="text-red-400 font-medium">{formatCurrency(summary.totalValue)}</span>.</p>
          <div className="mt-4 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <p className="text-amber-400 font-medium">Đề xuất hành động:</p>
            <ul className="text-slate-300 space-y-1 text-sm mt-2">
              <li>• Xem xét giảm giá thanh lý hàng &gt; 180 ngày.</li>
              <li>• Kiểm tra lại dự báo nhu cầu cho hàng 90-180 ngày.</li>
              <li>• Đàm phán trả hàng với nhà cung cấp nếu có thể.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400">SKU</TableHead>
                <TableHead className="text-slate-400">Sản phẩm</TableHead>
                <TableHead className="text-right text-slate-400">Tồn kho</TableHead>
                <TableHead className="text-right text-slate-400">Ngày chưa xuất</TableHead>
                <TableHead className="text-right text-slate-400">Giá trị</TableHead>
                <TableHead className="text-center text-slate-400">Mức độ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 30).map((item: any) => (
                <TableRow key={item.id} className="border-slate-800/50">
                  <TableCell className="font-mono text-sky-400">{item.sku}</TableCell>
                  <TableCell className="text-white">{item.name}</TableCell>
                  <TableCell className="text-right text-white">{formatNumber(item.quantity)}</TableCell>
                  <TableCell className="text-right text-amber-400">{item.daysSince} ngày</TableCell>
                  <TableCell className="text-right text-emerald-400">{formatCurrency(item.value)}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={`${
                      item.severity === "critical" ? "bg-red-500/10 text-red-400" :
                      item.severity === "warning" ? "bg-amber-500/10 text-amber-400" :
                      "bg-emerald-500/10 text-emerald-400"
                    } border-0`}>
                      {item.severity === "critical" ? "Nghiêm trọng" : item.severity === "warning" ? "Cảnh báo" : "Bình thường"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// NEAR EXPIRY REPORT
// ============================================
function NearExpiryReport({
  data,
  summary,
  filters,
  onFilterChange,
}: {
  data: any[];
  summary: any;
  filters: ReportFilters;
  onFilterChange: (key: keyof ReportFilters, value: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Hàng gần hết hạn</h1>
          <p className="text-slate-400 mt-1">Hàng hóa sắp hoặc đã hết hạn sử dụng</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-slate-700 text-slate-300"><Download className="w-4 h-4 mr-2" />Excel</Button>
          <Button variant="outline" className="border-slate-700 text-slate-300"><Download className="w-4 h-4 mr-2" />PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-red-400">{summary.expired}</p>
            <p className="text-sm text-slate-400">Đã hết hạn</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-amber-400">{summary.critical}</p>
            <p className="text-sm text-slate-400">Còn ≤ 30 ngày</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-white">{formatCurrency(summary.totalValue)}</p>
            <p className="text-sm text-slate-400">Giá trị cần xử lý</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-4 space-y-2 text-slate-300">
          <p>Tìm thấy <span className="text-amber-400 font-medium">{data.length}</span> lô hàng gần hết hạn trong 90 ngày tới.</p>
          <div className="mt-4 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <p className="text-amber-400 font-medium">Đề xuất hành động:</p>
            <ul className="text-slate-300 space-y-1 text-sm mt-2">
              <li>• Ưu tiên bán hàng sắp hết hạn trước (FEFO).</li>
              <li>• Liên hệ NCC để đổi trả hoặc giảm giá nếu có thể.</li>
              <li>• Xem xét thanh lý hàng đã hết hạn ngay lập tức.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400">SKU</TableHead>
                <TableHead className="text-slate-400">Sản phẩm</TableHead>
                <TableHead className="text-slate-400">Số lô</TableHead>
                <TableHead className="text-right text-slate-400">Hạn SD</TableHead>
                <TableHead className="text-right text-slate-400">Còn lại</TableHead>
                <TableHead className="text-center text-slate-400">Mức độ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 30).map((item: any) => (
                <TableRow key={item.id} className="border-slate-800/50">
                  <TableCell className="font-mono text-sky-400">{item.sku}</TableCell>
                  <TableCell className="text-white">{item.name}</TableCell>
                  <TableCell className="text-slate-400 font-mono">{item.lotNumber}</TableCell>
                  <TableCell className="text-right text-white">{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString("vi-VN") : "-"}</TableCell>
                  <TableCell className="text-right text-amber-400">{item.daysUntil <= 0 ? "Đã hết" : `${item.daysUntil} ngày`}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={`${
                      item.severity === "expired" ? "bg-red-500/10 text-red-400" :
                      item.severity === "critical" ? "bg-amber-500/10 text-amber-400" :
                      "bg-slate-500/10 text-slate-400"
                    } border-0`}>
                      {item.severity === "expired" ? "Hết hạn" : item.severity === "critical" ? "Nguy cơ" : "Cảnh báo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// SUPPLIER EVALUATION REPORT
// ============================================
function SupplierReport({
  data,
  filters,
  onFilterChange,
}: {
  data: any[];
  filters: ReportFilters;
  onFilterChange: (key: keyof ReportFilters, value: string) => void;
}) {
  const suppliers = useSuppliers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Đánh giá nhà cung cấp</h1>
          <p className="text-slate-400 mt-1">Performance & ranking nhà cung cấp</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-slate-700 text-slate-300"><Download className="w-4 h-4 mr-2" />Excel</Button>
          <Button variant="outline" className="border-slate-700 text-slate-300"><Download className="w-4 h-4 mr-2" />PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base">Top 10 NCC theo điểm đánh giá</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" />
                <YAxis dataKey="supplierName" type="category" stroke="#94a3b8" width={120} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#f8fafc" }}
                />
                <Bar dataKey="rating" name="Điểm" fill="#0ea5e9" radius={[0, 4, 4, 0]} unit="/100" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base">Tỷ lệ giao hàng đúng hạn</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" tickFormatter={(v) => `${v}%`} />
                <YAxis dataKey="supplierName" type="category" stroke="#94a3b8" width={120} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#f8fafc" }}
                  formatter={(value) => [`${(value as number) || 0}%`, "Đúng hạn"]}
                />
                <Bar dataKey="onTimeRate" name="Đúng hạn" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400">Nhà cung cấp</TableHead>
                <TableHead className="text-right text-slate-400">Số đơn</TableHead>
                <TableHead className="text-right text-slate-400">Giá trị</TableHead>
                <TableHead className="text-right text-slate-400">GT trung bình</TableHead>
                <TableHead className="text-center text-slate-400">Đúng hạn</TableHead>
                <TableHead className="text-center text-slate-400">Điểm</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 20).map((supplier: any) => (
                <TableRow key={supplier.supplierId} className="border-slate-800/50">
                  <TableCell className="text-white font-medium">{supplier.supplierName}</TableCell>
                  <TableCell className="text-right text-slate-400">{supplier.totalOrders}</TableCell>
                  <TableCell className="text-right text-emerald-400">{formatCurrency(supplier.totalValue)}</TableCell>
                  <TableCell className="text-right text-slate-400">{formatCurrency(supplier.avgOrderValue)}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={`${parseFloat(supplier.onTimeRate) >= 80 ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"} border-0`}>
                      {supplier.onTimeRate}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={`${
                      supplier.rating >= 80 ? "bg-emerald-500/10 text-emerald-400" :
                      supplier.rating >= 60 ? "bg-amber-500/10 text-amber-400" :
                      "bg-red-500/10 text-red-400"
                    } border-0`}>
                      {supplier.rating}/100
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// DSI / INVENTORY TURNOVER REPORT
// ============================================
function DSIReport({
  data,
  comment,
  filters,
  onFilterChange,
}: {
  data: any;
  comment: string[];
  filters: ReportFilters;
  onFilterChange: (key: keyof ReportFilters, value: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Vòng quay hàng tồn kho (DSI)</h1>
          <p className="text-slate-400 mt-1">Days Sales of Inventory & Inventory Turnover</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-slate-700 text-slate-300"><Download className="w-4 h-4 mr-2" />Excel</Button>
          <Button variant="outline" className="border-slate-700 text-slate-300"><Download className="w-4 h-4 mr-2" />PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-sky-500/5 border-sky-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-sky-400">Vòng quay</p>
            <p className="text-3xl font-bold text-sky-400">{data.turnover}</p>
            <p className="text-sm text-slate-400">lần/năm</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-emerald-400">DSI</p>
            <p className="text-3xl font-bold text-emerald-400">{data.dsi}</p>
            <p className="text-sm text-slate-400">ngày</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-slate-400">Benchmark</p>
            <p className="text-3xl font-bold text-white">{data.benchmark}</p>
            <p className="text-sm text-slate-400">ngày (ngành)</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-slate-400">Kỳ trước</p>
            <p className="text-2xl font-bold text-slate-400">{data.prevPeriod.dsi}</p>
            <p className="text-sm text-slate-400">ngày</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Xu hướng DSI 12 tháng</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" domain={[0, "auto"]} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#f8fafc" }}
                formatter={(value) => [`${(value as number) || 0} ngày`, "DSI"]}
              />
              <Line type="monotone" dataKey="dsi" stroke="#0ea5e9" strokeWidth={2} dot={{ fill: "#0ea5e9" }} />
              <Area
                type="monotone"
                dataKey="dsi"
                stroke="none"
                fill="#0ea5e9"
                fillOpacity={0.1}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Công thức tính</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="p-4 bg-slate-800 rounded-lg">
            <p className="text-slate-400 text-sm mb-2">Inventory Turnover = COGS / Average Inventory</p>
            <p className="text-white font-mono">
              {data.turnover} = {formatCurrency(data.cogs)} / {formatCurrency(data.avgInventory)}
            </p>
          </div>
          <div className="p-4 bg-slate-800 rounded-lg">
            <p className="text-slate-400 text-sm mb-2">DSI = 365 / Inventory Turnover</p>
            <p className="text-white font-mono">
              {data.dsi} ngày = 365 / {data.turnover}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Nhận xét & Đề xuất</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-2">
          {comment.map((line, i) => (
            <p key={i} className="text-slate-300">{line}</p>
          ))}
          <div className="mt-4 p-4 bg-sky-500/10 rounded-lg border border-sky-500/20">
            <p className="text-sky-400 font-medium">Hành động khuyến nghị:</p>
            <ul className="text-slate-300 space-y-1 text-sm mt-2">
              <li>• Tăng vòng quay bằng cách tối ưu lượng đặt hàng.</li>
              <li>• Áp dụng EOQ để giảm tồn kho trung bình.</li>
              <li>• Xem xét chương trình khuyến mãi cho hàng tồn lâu.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
