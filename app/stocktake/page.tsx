"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { AppShell, ErrorBoundary } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClipboardList,
  Search,
  Plus,
  Play,
  Check,
  CheckCircle2,
  AlertTriangle,
  Package,
  MapPin,
  Calendar,
  User,
  Clock,
  TrendingUp,
  TrendingDown,
  FileText,
  Eye,
  ArrowRight,
  RotateCcw,
  Send,
  Percent,
  DollarSign,
  Target,
} from "lucide-react";
import {
  useStocktakeSessions,
  useStocktakeActions,
  useInventoryItems,
  useProducts,
  useWarehouses,
  useInventoryActions,
  useAuditLogActions,
} from "@/lib/store";
import { StocktakeStatus, StocktakeType, AuditAction } from "@/lib/types";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: Date | string): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const STATUS_STYLES: Record<StocktakeStatus, { color: string; bg: string; label: string }> = {
  [StocktakeStatus.DRAFT]: {
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    label: "Nháp",
  },
  [StocktakeStatus.IN_PROGRESS]: {
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    label: "Đang kiểm kê",
  },
  [StocktakeStatus.PENDING_APPROVAL]: {
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    label: "Chờ phê duyệt",
  },
  [StocktakeStatus.APPROVED]: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    label: "Đã phê duyệt",
  },
  [StocktakeStatus.COMPLETED]: {
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    label: "Hoàn thành",
  },
  [StocktakeStatus.CANCELLED]: {
    color: "text-slate-500",
    bg: "bg-slate-500/10",
    label: "Đã hủy",
  },
};

const TYPE_LABELS: Record<StocktakeType, string> = {
  [StocktakeType.FULL]: "Full Count",
  [StocktakeType.CYCLE]: "Cycle Count",
  [StocktakeType.SPOT]: "Spot Check",
};

interface StocktakeCountItem {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  location: string;
  systemQuantity: number;
  countedQuantity: number | null;
}

interface DiscrepancyResult {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  location: string;
  systemQuantity: number;
  countedQuantity: number;
  difference: number;
  variancePercentage: number;
  unitPrice: number;
  varianceValue: number;
  reason: string;
  notes: string;
}

export default function StocktakePage() {
  const sessions = useStocktakeSessions();
  const inventoryItems = useInventoryItems();
  const products = useProducts();
  const warehousesRaw = useWarehouses();
  const warehouses = Array.isArray(warehousesRaw) ? warehousesRaw : [];
  const { addStocktakeSession, updateStocktakeSession, completeStocktake, fetchStocktakes } = useStocktakeActions();
  const { adjustInventoryQuantity, checkLowStockAlerts } = useInventoryActions();
  const { addAuditLog } = useAuditLogActions();

  const [activeTab, setActiveTab] = useState<string>("history");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Fetch data on mount
  useEffect(() => {
    fetchStocktakes();
  }, [fetchStocktakes]);

  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Create new session form
  const [createForm, setCreateForm] = useState({
    type: StocktakeType.FULL as StocktakeType,
    warehouseId: "",
    area: "",
    scheduledDate: new Date().toISOString().split("T")[0],
    assignedTo: "Nguyễn Văn Minh",
    notes: "",
  });

  // Active counting session
  const [activeSession, setActiveSession] = useState<any>(null);
  const [countItems, setCountItems] = useState<StocktakeCountItem[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);

  // Results & adjustments
  const [results, setResults] = useState<DiscrepancyResult[]>([]);
  const [resultSession, setResultSession] = useState<any>(null);

  const filteredSessions = useMemo(() => {
    let filtered = [...sessions];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s: any) =>
          s.stocktakeNumber?.toLowerCase().includes(search) ||
          s.warehouse?.name?.toLowerCase().includes(search)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((s: any) => s.status === statusFilter);
    }

    if (dateFrom) {
      filtered = filtered.filter((s: any) => new Date(s.scheduledDate) >= new Date(dateFrom));
    }

    if (dateTo) {
      filtered = filtered.filter((s: any) => new Date(s.scheduledDate) <= new Date(dateTo));
    }

    return filtered.sort(
      (a: any, b: any) =>
        new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
    );
  }, [sessions, searchTerm, statusFilter, dateFrom, dateTo]);

  const activeSessions = useMemo(() => {
    return sessions.filter((s: any) => s.status === StocktakeStatus.IN_PROGRESS);
  }, [sessions]);

  const pendingApprovalSessions = useMemo(() => {
    return sessions.filter((s: any) => s.status === StocktakeStatus.PENDING_APPROVAL);
  }, [sessions]);

  const countedCount = useMemo(() => {
    return countItems.filter((i) => i.countedQuantity !== null).length;
  }, [countItems]);

  const totalVariance = useMemo(() => {
    return results.reduce((sum, r) => sum + r.varianceValue, 0);
  }, [results]);

  const totalPositive = useMemo(() => {
    return results
      .filter((r) => r.difference > 0)
      .reduce((sum, r) => sum + r.varianceValue, 0);
  }, [results]);

  const totalNegative = useMemo(() => {
    return results
      .filter((r) => r.difference < 0)
      .reduce((sum, r) => sum + Math.abs(r.varianceValue), 0);
  }, [results]);

  const discrepanciesOver5Percent = useMemo(() => {
    return results.filter((r) => Math.abs(r.variancePercentage) > 5).length;
  }, [results]);

  const handleStartSession = useCallback(() => {
    const warehouse = warehouses.find((w: any) => w.id === createForm.warehouseId);
    const stocktakeNumber = `STK-${Date.now().toString().slice(-6)}`;

    // Get items to count based on type
    let itemsToCount: StocktakeCountItem[] = [];

    if (createForm.type === StocktakeType.FULL) {
      itemsToCount = inventoryItems
        .filter((i: any) => createForm.warehouseId === "" || i.warehouseId === createForm.warehouseId)
        .map((item: any) => {
          const product = products.find((p: any) => p.id === item.productId);
          return {
            id: `count-${item.id}`,
            productId: item.productId,
            productSku: product?.sku || "",
            productName: product?.name || "",
            location: item.location
              ? `${item.location.zone || ""}-${item.location.aisle || ""}-${item.location.rack || ""}-${item.location.shelf || ""}`
              : "-",
            systemQuantity: item.quantityAvailable,
            countedQuantity: null,
          };
        });
    } else {
      itemsToCount = inventoryItems
        .filter((i: any) => i.warehouseId === createForm.warehouseId)
        .slice(0, Math.min(20, inventoryItems.length))
        .map((item: any) => {
          const product = products.find((p: any) => p.id === item.productId);
          return {
            id: `count-${item.id}`,
            productId: item.productId,
            productSku: product?.sku || "",
            productName: product?.name || "",
            location: item.location
              ? `${item.location.zone || ""}-${item.location.aisle || ""}-${item.location.rack || ""}-${item.location.shelf || ""}`
              : "-",
            systemQuantity: item.quantityAvailable,
            countedQuantity: null,
          };
        });
    }

    const newSession = {
      id: `stk-${Date.now()}`,
      stocktakeNumber,
      type: createForm.type,
      warehouseId: createForm.warehouseId,
      warehouse,
      area: createForm.area,
      status: StocktakeStatus.IN_PROGRESS,
      scheduledDate: new Date(createForm.scheduledDate),
      startedDate: new Date(),
      assignedTo: "user-001",
      assignedToName: createForm.assignedTo,
      discrepancies: [],
      totalProducts: itemsToCount.length,
      countedProducts: 0,
      totalDiscrepancies: 0,
      positiveVariance: 0,
      negativeVariance: 0,
      netVariance: 0,
      notes: createForm.notes,
      createdBy: "user-001",
      createdByName: createForm.assignedTo,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addStocktakeSession(newSession as any);

    setActiveSession(newSession);
    setCountItems(itemsToCount);
    setCurrentItemIndex(0);
    setActiveTab("counting");

    addAuditLog({
      action: AuditAction.CREATE,
      entity: "StocktakeSession",
      entityId: newSession.id,
      entityName: stocktakeNumber,
      userId: "user-001",
      userName: createForm.assignedTo,
      newValue: {
        type: createForm.type,
        warehouse: warehouse?.name,
        totalProducts: itemsToCount.length,
      },
      reason: "Bắt đầu phiên kiểm kê",
    });
  }, [createForm, warehouses, products, inventoryItems, addStocktakeSession, addAuditLog]);

  const handleUpdateCount = useCallback((itemId: string, quantity: number | null) => {
    setCountItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, countedQuantity: quantity } : item
      )
    );
  }, []);

  const handleNextItem = useCallback(() => {
    if (currentItemIndex < countItems.length - 1) {
      setCurrentItemIndex((prev) => prev + 1);
    }
  }, [currentItemIndex, countItems.length]);

  const handlePrevItem = useCallback(() => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex((prev) => prev - 1);
    }
  }, [currentItemIndex]);

  const handleCompleteCount = useCallback(() => {
    if (!activeSession) return;

    // Calculate discrepancies
    const discrepancies: DiscrepancyResult[] = countItems.map((item) => {
      const product = products.find((p: any) => p.id === item.productId);
      const counted = item.countedQuantity ?? 0;
      const difference = counted - item.systemQuantity;
      const variancePercentage = item.systemQuantity > 0
        ? (difference / item.systemQuantity) * 100
        : counted > 0 ? 100 : 0;
      const unitPrice = product?.costPrice || 0;

      return {
        id: `disc-${item.id}`,
        productId: item.productId,
        productSku: item.productSku,
        productName: item.productName,
        location: item.location,
        systemQuantity: item.systemQuantity,
        countedQuantity: counted,
        difference,
        variancePercentage,
        unitPrice,
        varianceValue: difference * unitPrice,
        reason: "",
        notes: "",
      };
    });

    const positiveVariance = discrepancies
      .filter((d) => d.difference > 0)
      .reduce((sum, d) => sum + d.difference * d.unitPrice, 0);
    const negativeVariance = discrepancies
      .filter((d) => d.difference < 0)
      .reduce((sum, d) => sum + Math.abs(d.difference) * d.unitPrice, 0);
    const netVariance = positiveVariance - negativeVariance;

    updateStocktakeSession(activeSession.id, {
      status: StocktakeStatus.PENDING_APPROVAL,
      completedDate: new Date(),
      countedProducts: countedCount,
      discrepancies: discrepancies.map((d) => ({
        id: d.id,
        productId: d.productId,
        productSku: d.productSku,
        productName: d.productName,
        systemQuantity: d.systemQuantity,
        countedQuantity: d.countedQuantity,
        difference: d.difference,
        variancePercentage: d.variancePercentage,
        unitPrice: d.unitPrice,
        adjustmentStatus: "pending" as const,
      })),
      totalDiscrepancies: discrepancies.filter((d) => d.difference !== 0).length,
      positiveVariance,
      negativeVariance,
      netVariance,
    } as any);

    setResults(discrepancies);
    setResultSession({ ...activeSession, countedProducts: countedCount });
    setActiveSession(null);
    setCountItems([]);
    setCurrentItemIndex(0);
    setActiveTab("results");
  }, [activeSession, countItems, countedCount, products, updateStocktakeSession]);

  const handleUpdateReason = useCallback((resultId: string, reason: string) => {
    setResults((prev) =>
      prev.map((r) => (r.id === resultId ? { ...r, reason } : r))
    );
  }, []);

  const handleUpdateNotes = useCallback((resultId: string, notes: string) => {
    setResults((prev) =>
      prev.map((r) => (r.id === resultId ? { ...r, notes } : r))
    );
  }, []);

  const handleSubmitApproval = useCallback(() => {
    if (!resultSession) return;

    addAuditLog({
      action: AuditAction.SEND,
      entity: "StocktakeSession",
      entityId: resultSession.id,
      entityName: resultSession.stocktakeNumber,
      userId: "user-001",
      userName: "Nguyễn Văn Minh",
      newValue: {
        discrepanciesCount: results.filter((r) => r.difference !== 0).length,
        netVariance: totalVariance,
        over5PercentCount: discrepanciesOver5Percent,
      },
      reason: "Gửi phê duyệt điều chỉnh tồn kho",
    });

    updateStocktakeSession(resultSession.id, {
      status: StocktakeStatus.PENDING_APPROVAL,
    } as any);

    setResults([]);
    setResultSession(null);
    setActiveTab("history");
  }, [resultSession, results, totalVariance, discrepanciesOver5Percent, addAuditLog, updateStocktakeSession]);

  const handleResumeSession = useCallback((session: any) => {
    // Reconstruct count items from discrepancies
    const items: StocktakeCountItem[] = session.discrepancies?.map((d: any) => ({
      id: `count-resume-${d.productId}`,
      productId: d.productId,
      productSku: d.productSku,
      productName: d.productName,
      location: d.location || "-",
      systemQuantity: d.systemQuantity,
      countedQuantity: d.countedQuantity,
    })) || [];

    setActiveSession(session);
    setCountItems(items);
    setCurrentItemIndex(0);
    setActiveTab("counting");
  }, []);

  const handleViewResults = useCallback((session: any) => {
    const discrepancies: DiscrepancyResult[] = session.discrepancies?.map((d: any) => {
      const product = products.find((p: any) => p.id === d.productId);
      const difference = d.countedQuantity - d.systemQuantity;
      const variancePercentage = d.systemQuantity > 0
        ? (difference / d.systemQuantity) * 100
        : d.countedQuantity > 0 ? 100 : 0;

      return {
        id: d.id,
        productId: d.productId,
        productSku: d.productSku,
        productName: d.productName,
        location: d.location || "-",
        systemQuantity: d.systemQuantity,
        countedQuantity: d.countedQuantity,
        difference,
        variancePercentage,
        unitPrice: product?.costPrice || 0,
        varianceValue: difference * (product?.costPrice || 0),
        reason: d.reason || "",
        notes: d.notes || "",
      };
    }) || [];

    setResults(discrepancies);
    setResultSession(session);
    setActiveTab("results");
  }, [products]);

  return (
    <ErrorBoundary moduleName="Kiểm kê">
      <AppShell>
        <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Kiểm kê kho</h1>
            <p className="text-slate-400 mt-1">Quản lý phiên kiểm kê và điều chỉnh tồn kho</p>
          </div>
          {activeSessions.length > 0 && (
            <Badge className="bg-sky-500/10 text-sky-400 border-0">
              {activeSessions.length} phiên đang thực hiện
            </Badge>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="history">Lịch sử kiểm kê</TabsTrigger>
            <TabsTrigger value="create">Tạo phiên mới</TabsTrigger>
            <TabsTrigger value="counting">
              Đang kiểm kê
              {activeSessions.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-sky-500 text-white text-xs rounded-full">
                  {activeSessions.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="results">
              Kết quả & Điều chỉnh
              {pendingApprovalSessions.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-amber-500 text-white text-xs rounded-full">
                  {pendingApprovalSessions.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: History */}
          <TabsContent value="history" className="mt-6 space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Tìm kiếm số kiểm kê, kho..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-slate-800 border-slate-700 text-slate-200"
                    />
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "all")}>
                      <SelectTrigger className="w-40 bg-slate-800 border-slate-700">
                        <SelectValue placeholder="Trạng thái" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="all">Tất cả</SelectItem>
                        <SelectItem value={StocktakeStatus.DRAFT}>Nháp</SelectItem>
                        <SelectItem value={StocktakeStatus.IN_PROGRESS}>Đang kiểm kê</SelectItem>
                        <SelectItem value={StocktakeStatus.PENDING_APPROVAL}>Chờ phê duyệt</SelectItem>
                        <SelectItem value={StocktakeStatus.APPROVED}>Đã phê duyệt</SelectItem>
                        <SelectItem value={StocktakeStatus.COMPLETED}>Hoàn thành</SelectItem>
                      </SelectContent>
                    </Select>

                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-36 bg-slate-800 border-slate-700 text-slate-200"
                    />
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-36 bg-slate-800 border-slate-700 text-slate-200"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400">Số kiểm kê</TableHead>
                      <TableHead className="text-slate-400">Loại</TableHead>
                      <TableHead className="text-slate-400">Kho / Khu vực</TableHead>
                      <TableHead className="text-slate-400">Người phụ trách</TableHead>
                      <TableHead className="text-right text-slate-400">Chênh lệch</TableHead>
                      <TableHead className="text-center text-slate-400">Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSessions.map((session: any) => {
                      const styles = STATUS_STYLES[session.status as StocktakeStatus] || STATUS_STYLES[StocktakeStatus.DRAFT];
                      const varianceColor = session.netVariance > 0
                        ? "text-emerald-400"
                        : session.netVariance < 0
                        ? "text-red-400"
                        : "text-slate-400";

                      return (
                        <TableRow
                          key={session.id}
                          className="border-slate-800/50 hover:bg-slate-800/30 cursor-pointer"
                          onClick={() => {
                            if (session.status === StocktakeStatus.IN_PROGRESS) {
                              handleResumeSession(session);
                            } else if (session.status === StocktakeStatus.PENDING_APPROVAL) {
                              handleViewResults(session);
                            } else {
                              setSelectedSession(session);
                              setIsDetailOpen(true);
                            }
                          }}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <ClipboardList className="w-4 h-4 text-violet-400" />
                              <span className="text-violet-400 font-mono">{session.stocktakeNumber}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              {formatDate(session.scheduledDate)}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-slate-700 text-slate-300 border-0">
                              {TYPE_LABELS[session.type as StocktakeType] || session.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {session.warehouse?.name || "-"}
                            {session.area && <span className="text-slate-500"> / {session.area}</span>}
                          </TableCell>
                          <TableCell className="text-slate-400">
                            {session.assignedToName || "-"}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${varianceColor}`}>
                            {formatCurrency(session.netVariance || 0)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={`${styles.bg} ${styles.color} border-0`}>
                              {styles.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredSessions.length === 0 && (
                      <TableRow className="border-slate-800/50">
                        <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                          Không có phiên kiểm kê nào
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <div className="p-4 border-t border-slate-800 text-sm text-slate-400">
                  Hiển thị {filteredSessions.length} phiên kiểm kê
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Create New Session */}
          <TabsContent value="create" className="mt-6">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Tạo phiên kiểm kê mới</CardTitle>
                <p className="text-slate-400 text-sm">Thiết lập thông tin cho phiên kiểm kê mới</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Loại kiểm kê *</Label>
                    <Select
                      value={createForm.type}
                      onValueChange={(v) => setCreateForm((prev) => ({ ...prev, type: v as StocktakeType }))}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value={StocktakeType.FULL}>Full Count - Kiểm kê toàn bộ</SelectItem>
                        <SelectItem value={StocktakeType.CYCLE}>Cycle Count - Kiểm kê luân phiên</SelectItem>
                        <SelectItem value={StocktakeType.SPOT}>Spot Check - Kiểm tra đột xuất</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Kho *</Label>
                    <Select
                      value={createForm.warehouseId}
                      onValueChange={(v) => setCreateForm((prev) => ({ ...prev, warehouseId: v || "" }))}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700">
                        <SelectValue placeholder="Chọn kho" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {warehouses.map((w: any) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {(createForm.type === StocktakeType.CYCLE || createForm.type === StocktakeType.SPOT) && (
                    <div className="space-y-2">
                      <Label>Khu vực (tùy chọn)</Label>
                      <Input
                        placeholder="VD: Zone A, Khu vực 1..."
                        value={createForm.area}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, area: e.target.value }))}
                        className="bg-slate-800 border-slate-700"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Ngày kiểm kê</Label>
                    <Input
                      type="date"
                      value={createForm.scheduledDate}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, scheduledDate: e.target.value }))}
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Người phụ trách</Label>
                    <Input
                      value={createForm.assignedTo}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, assignedTo: e.target.value }))}
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Ghi chú</Label>
                  <Textarea
                    placeholder="Nhập ghi chú cho phiên kiểm kê..."
                    value={createForm.notes}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, notes: e.target.value }))}
                    className="bg-slate-800 border-slate-700 min-h-[80px]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <Button
                    onClick={handleStartSession}
                    disabled={!createForm.warehouseId}
                    className="bg-emerald-500 hover:bg-emerald-600"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Bắt đầu kiểm kê
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Active Counting */}
          <TabsContent value="counting" className="mt-6">
            {!activeSession ? (
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-12 text-center">
                  <Target className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                  <h3 className="text-xl font-semibold text-white mb-2">Không có phiên đang kiểm kê</h3>
                  <p className="text-slate-400 mb-6">Tạo phiên kiểm kê mới hoặc tiếp tục phiên đang dở</p>
                  <div className="flex justify-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("create")}
                      className="border-slate-700 text-slate-300"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Tạo phiên mới
                    </Button>
                    {activeSessions.length > 0 && (
                      <Button
                        onClick={() => handleResumeSession(activeSessions[0])}
                        className="bg-sky-500 hover:bg-sky-600"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Tiếp tục phiên dở
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Session Info */}
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-sky-500/20">
                          <ClipboardList className="w-6 h-6 text-sky-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-semibold">{activeSession.stocktakeNumber}</h3>
                          <p className="text-slate-400 text-sm">
                            {activeSession.warehouse?.name} • {TYPE_LABELS[activeSession.type as StocktakeType]}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-white">
                            {countedCount} / {countItems.length}
                          </p>
                          <p className="text-slate-400 text-sm">items đã kiểm</p>
                        </div>

                        {countItems.length > 0 && (
                          <div className="w-48">
                            <div className="flex justify-between text-xs text-slate-400 mb-1">
                              <span>Tiến độ</span>
                              <span>{Math.round((countedCount / countItems.length) * 100)}%</span>
                            </div>
                            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-sky-500 transition-all duration-300"
                                style={{ width: `${(countedCount / countItems.length) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Current Item to Count */}
                {countItems.length > 0 && (
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePrevItem}
                            disabled={currentItemIndex === 0}
                            className="border-slate-700 text-slate-300"
                          >
                            ←
                          </Button>
                          <span className="text-slate-400">
                            Item {currentItemIndex + 1} / {countItems.length}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleNextItem}
                            disabled={currentItemIndex === countItems.length - 1}
                            className="border-slate-700 text-slate-300"
                          >
                            →
                          </Button>
                        </div>

                        {countItems[currentItemIndex]?.countedQuantity !== null && (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-0">
                            <Check className="w-3 h-3 mr-1" />
                            Đã đếm
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <Label className="text-xs text-slate-400">SKU</Label>
                            <p className="text-white font-mono font-medium text-lg">
                              {countItems[currentItemIndex]?.productSku}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-slate-400">Tên hàng</Label>
                            <p className="text-white font-medium text-lg">
                              {countItems[currentItemIndex]?.productName}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-slate-400">Vị trí</Label>
                            <p className="text-sky-400 font-mono font-medium text-lg flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              {countItems[currentItemIndex]?.location}
                            </p>
                          </div>
                        </div>

                        <div className="border-t border-slate-700 pt-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <Label className="text-xs text-slate-400">Số lượng trong hệ thống (BLIND)</Label>
                              <div className="p-4 bg-slate-800 rounded-lg text-center">
                                <span className="text-3xl font-bold text-slate-600">???</span>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-slate-400">Số lượng thực đếm *</Label>
                              <Input
                                type="number"
                                min={0}
                                placeholder="Nhập số lượng..."
                                value={countItems[currentItemIndex]?.countedQuantity ?? ""}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? null : parseInt(e.target.value) || 0;
                                  handleUpdateCount(countItems[currentItemIndex]?.id, val);
                                }}
                                className="p-4 text-center text-2xl font-bold bg-slate-800 border-slate-700"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-3">
                          <Button
                            variant="outline"
                            onClick={handleNextItem}
                            disabled={currentItemIndex === countItems.length - 1}
                            className="border-slate-700 text-slate-300"
                          >
                            Bỏ qua
                          </Button>
                          <Button
                            onClick={handleNextItem}
                            disabled={
                              countItems[currentItemIndex]?.countedQuantity === null ||
                              currentItemIndex === countItems.length - 1
                            }
                            className="bg-sky-500 hover:bg-sky-600"
                          >
                            Lưu & Tiếp →
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Jump */}
                {countItems.length > 0 && (
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardContent className="p-4">
                      <p className="text-sm text-slate-400 mb-3">Duyệt nhanh:</p>
                      <div className="flex flex-wrap gap-2">
                        {countItems.slice(0, 20).map((item, index) => (
                          <button
                            key={item.id}
                            onClick={() => setCurrentItemIndex(index)}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                              index === currentItemIndex
                                ? "bg-sky-500 text-white"
                                : item.countedQuantity !== null
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                            }`}
                          >
                            {index + 1}
                          </button>
                        ))}
                        {countItems.length > 20 && (
                          <span className="px-3 py-1 text-slate-500">...</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Complete Count Button */}
                <div className="flex justify-center">
                  <Button
                    size="lg"
                    onClick={handleCompleteCount}
                    disabled={countedCount === 0}
                    className="bg-emerald-500 hover:bg-emerald-600"
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Hoàn thành đếm ({countedCount}/{countItems.length})
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tab 4: Results & Adjustments */}
          <TabsContent value="results" className="mt-6">
            {!resultSession ? (
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-12 text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                  <h3 className="text-xl font-semibold text-white mb-2">Chưa có kết quả kiểm kê</h3>
                  <p className="text-slate-400">Hoàn thành phiên kiểm kê để xem kết quả</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-slate-900/50 border-slate-800">
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-slate-400">Tổng mặt hàng</p>
                      <p className="text-2xl font-bold text-white mt-1">{results.length}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-emerald-500/5 border-emerald-500/20">
                    <CardContent className="p-4 text-center">
                      <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                      <p className="text-sm text-emerald-400">Chênh dương</p>
                      <p className="text-xl font-bold text-emerald-400">{formatCurrency(totalPositive)}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-500/5 border-red-500/20">
                    <CardContent className="p-4 text-center">
                      <TrendingDown className="w-5 h-5 text-red-400 mx-auto mb-1" />
                      <p className="text-sm text-red-400">Chênh âm</p>
                      <p className="text-xl font-bold text-red-400">{formatCurrency(totalNegative)}</p>
                    </CardContent>
                  </Card>
                  <Card className={`${totalVariance >= 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"}`}>
                    <CardContent className="p-4 text-center">
                      <DollarSign className="w-5 h-5 mx-auto mb-1" />
                      <p className="text-sm text-slate-400">Chênh lệch ròng</p>
                      <p className={`text-xl font-bold ${totalVariance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {formatCurrency(totalVariance)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Warning for > 5% discrepancies */}
                {discrepanciesOver5Percent > 0 && (
                  <Card className="bg-amber-500/10 border-amber-500/30">
                    <CardContent className="p-4 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-amber-400 font-medium">
                          {discrepanciesOver5Percent} mặt hàng có chênh lệch trên 5%
                        </p>
                        <p className="text-amber-400/70 text-sm mt-1">
                          Cần giải trình chi tiết trước khi phê duyệt
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Results Table */}
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Kết quả kiểm kê - {resultSession.stocktakeNumber}
                    </CardTitle>
                    <p className="text-slate-400 text-sm">
                      {resultSession.warehouse?.name} • {formatDate(resultSession.scheduledDate)}
                    </p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-800 hover:bg-transparent">
                            <TableHead className="text-slate-400">Sản phẩm</TableHead>
                            <TableHead className="text-center text-slate-400">Vị trí</TableHead>
                            <TableHead className="text-right text-slate-400">Sổ sách</TableHead>
                            <TableHead className="text-right text-slate-400">Thực tế</TableHead>
                            <TableHead className="text-right text-slate-400">Chênh lệch</TableHead>
                            <TableHead className="text-center text-slate-400">%</TableHead>
                            <TableHead className="text-right text-slate-400">Giá trị</TableHead>
                            <TableHead className="text-slate-400">Nguyên nhân</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {results.map((result) => {
                            const isOver5 = Math.abs(result.variancePercentage) > 5;
                            const diffColor = result.difference > 0
                              ? "text-emerald-400"
                              : result.difference < 0
                              ? "text-red-400"
                              : "text-slate-400";

                            return (
                              <TableRow
                                key={result.id}
                                className={`border-slate-800/50 ${isOver5 ? "bg-amber-500/5" : ""}`}
                              >
                                <TableCell>
                                  <div>
                                    <p className="text-white font-medium">{result.productName}</p>
                                    <p className="text-slate-400 text-xs font-mono">{result.productSku}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-slate-400 font-mono text-sm">
                                  {result.location}
                                </TableCell>
                                <TableCell className="text-right text-slate-300">
                                  {result.systemQuantity}
                                </TableCell>
                                <TableCell className="text-right text-white font-medium">
                                  {result.countedQuantity}
                                </TableCell>
                                <TableCell className={`text-right font-bold ${diffColor}`}>
                                  {result.difference > 0 ? "+" : ""}
                                  {result.difference}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge
                                    className={`${
                                      isOver5
                                        ? "bg-amber-500/20 text-amber-400 border-0"
                                        : result.difference === 0
                                        ? "bg-slate-500/20 text-slate-400 border-0"
                                        : diffColor.replace("text-", "bg-").replace("400", "/10")
                                    }`}
                                  >
                                    {result.variancePercentage > 0 ? "+" : ""}
                                    {result.variancePercentage.toFixed(1)}%
                                  </Badge>
                                </TableCell>
                                <TableCell className={`text-right font-medium ${diffColor}`}>
                                  {formatCurrency(result.varianceValue)}
                                </TableCell>
                                <TableCell className="w-48">
                                  <Input
                                    placeholder="Nguyên nhân..."
                                    value={result.reason}
                                    onChange={(e) => handleUpdateReason(result.id, e.target.value)}
                                    className={`bg-slate-800 border-slate-700 text-sm h-8 ${
                                      isOver5 ? "border-amber-500/50" : ""
                                    }`}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Submit Approval */}
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setResults([]);
                      setResultSession(null);
                      setActiveTab("history");
                    }}
                    className="border-slate-700 text-slate-300"
                  >
                    Hủy
                  </Button>
                  <Button
                    onClick={handleSubmitApproval}
                    className="bg-amber-500 hover:bg-amber-600"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Gửi phê duyệt điều chỉnh
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="bg-slate-900 border-slate-800 w-full sm:max-w-xl overflow-y-auto">
          {selectedSession && (
            <>
              <SheetHeader>
                <SheetTitle className="text-white">{selectedSession.stocktakeNumber}</SheetTitle>
                <SheetDescription className="text-slate-400">
                  Chi tiết phiên kiểm kê
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Trạng thái:</span>
                      <Badge
                        className={`${STATUS_STYLES[selectedSession.status as StocktakeStatus]?.bg} ${STATUS_STYLES[selectedSession.status as StocktakeStatus]?.color} border-0`}
                      >
                        {STATUS_STYLES[selectedSession.status as StocktakeStatus]?.label}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Loại:</span>
                      <span className="text-white">
                        {TYPE_LABELS[selectedSession.type as StocktakeType]}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Kho:</span>
                      <span className="text-white">{selectedSession.warehouse?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Ngày kiểm kê:</span>
                      <span className="text-white">{formatDate(selectedSession.scheduledDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Người phụ trách:</span>
                      <span className="text-white">{selectedSession.assignedToName}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-700">
                      <span className="text-white font-medium">Chênh lệch ròng:</span>
                      <span className={`font-bold ${
                        selectedSession.netVariance >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {formatCurrency(selectedSession.netVariance)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {selectedSession.notes && (
                  <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <p className="text-sm text-slate-400">Ghi chú:</p>
                    <p className="text-slate-200 mt-1">{selectedSession.notes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
    </ErrorBoundary>
  );
}
