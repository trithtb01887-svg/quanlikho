"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { AppShell, ErrorBoundary } from "@/components/shared";
import BarcodeScanner from "@/components/shared/BarcodeScanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus,
  PackageMinus,
  FileText,
  ScanLine,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Package,
  ShoppingCart,
  Clock,
  User,
  Truck,
  Printer,
  Download,
  FileSpreadsheet,
  ChevronDown,
} from "lucide-react";
import {
  useProducts,
  useWarehouses,
  useInventoryItems,
  useGoodsIssues,
  useGoodsIssueActions,
  useInventoryActions,
  useAuditLogActions,
  useWarehouseStore,
} from "@/lib/store";
import { GoodsIssueStatus, GoodsIssueReason, AuditAction, UnitOfMeasure } from "@/lib/types";
import {
  exportGoodsIssue,
  exportGoodsIssues,
  GoodsIssueExport,
} from "@/lib/exportExcel";
import { printGoodsIssue, printPickingList } from "@/lib/printTemplates";

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

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  draft: { label: "Nháp", className: "bg-slate-500/10 text-slate-400 border-slate-500/30" },
  pending: { label: "Chờ duyệt", className: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  confirmed: { label: "Đã xác nhận", className: "bg-sky-500/10 text-sky-400 border-sky-500/30" },
  completed: { label: "Hoàn thành", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  cancelled: { label: "Đã hủy", className: "bg-red-500/10 text-red-400 border-red-500/30" },
};

const REASON_LABELS: Record<GoodsIssueReason, string> = {
  [GoodsIssueReason.SALES]: "Bán hàng",
  [GoodsIssueReason.PRODUCTION]: "Sản xuất",
  [GoodsIssueReason.TRANSFER]: "Điều chuyển",
  [GoodsIssueReason.SAMPLE]: "Mẫu thử",
  [GoodsIssueReason.DAMAGE]: "Hư hỏng",
  [GoodsIssueReason.EXPIRY]: "Hết hạn",
  [GoodsIssueReason.ADJUSTMENT]: "Điều chỉnh",
  [GoodsIssueReason.RETURN]: "Trả hàng",
};

interface PickingItem {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  quantity: number;
  pickedQuantity: number;
  location: string;
  lotNumber?: string;
  isPicked: boolean;
}

interface PickingListForm {
  reason: GoodsIssueReason;
  customerName: string;
  warehouseId: string;
  notes: string;
  items: PickingItem[];
}

function isValidWarehouseId(id: string | null | undefined): id is string {
  return id !== null && id !== undefined && id !== "";
}

export default function GoodsIssuePage() {
  const products = useProducts();
  const warehouses = useWarehouses();
  const inventoryItems = useInventoryItems();
  const issues = useGoodsIssues();
  const { addGoodsIssue, updateGoodsIssue, fetchGoodsIssues } = useGoodsIssueActions();
  const { adjustInventoryQuantity } = useInventoryActions();
  const { addAuditLog } = useAuditLogActions();

  const [activeTab, setActiveTab] = useState<"list" | "create">("list");
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [pickingMode, setPickingMode] = useState<"add" | "confirm" | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Fetch data on mount
  useEffect(() => {
    fetchGoodsIssues();
  }, [fetchGoodsIssues]);

  const [form, setForm] = useState<PickingListForm>({
    reason: GoodsIssueReason.SALES,
    customerName: "",
    warehouseId: "",
    notes: "",
    items: [],
  });

  const enrichedIssues = useMemo(() => {
    return issues.map((issue: any) => ({
      ...issue,
      reasonLabel: REASON_LABELS[issue.reason as GoodsIssueReason] || issue.reason,
    }));
  }, [issues]);

  const enrichedPickingItems = useMemo(() => {
    return form.items.map((item) => {
      const product = products.find((p: any) => p.id === item.productId);
      const invItem = inventoryItems.find(
        (i: any) => i.productId === item.productId && i.warehouseId === form.warehouseId
      );
      const location = invItem?.location
        ? `${invItem.location.zone || ""}-${invItem.location.aisle || ""}-${invItem.location.rack || ""}-${invItem.location.shelf || ""}`
        : "Chưa xác định";

      return {
        ...item,
        location,
        availableQty: invItem?.quantityAvailable || 0,
        product,
      };
    });
  }, [form.items, form.warehouseId, products, inventoryItems]);

  const handleOpenScanner = useCallback((mode: "add" | "confirm") => {
    setScanError(null);
    setPickingMode(mode);
    setIsScannerOpen(true);
  }, []);

  const handleCloseScanner = useCallback(() => {
    setIsScannerOpen(false);
    setPickingMode(null);
    setScanError(null);
  }, []);

  const handleScanForAdd = useCallback(
    (barcode: string) => {
      const matchedProduct = products.find(
        (p: any) =>
          p.barcode === barcode ||
          p.sku === barcode ||
          p.id === barcode
      );

      if (matchedProduct) {
        const existingItem = form.items.find((i) => i.productId === matchedProduct.id);
        if (existingItem) {
          setForm((prev) => ({
            ...prev,
            items: prev.items.map((i) =>
              i.productId === matchedProduct.id
                ? { ...i, quantity: i.quantity + 1 }
                : i
            ),
          }));
        } else {
          const newItem: PickingItem = {
            id: `pick-${Date.now()}`,
            productId: matchedProduct.id,
            productSku: matchedProduct.sku,
            productName: matchedProduct.name,
            quantity: 1,
            pickedQuantity: 0,
            location: "",
            isPicked: false,
          };
          setForm((prev) => ({ ...prev, items: [...prev.items, newItem] }));
        }
      } else {
        setScanError(`Không tìm thấy sản phẩm với mã: ${barcode}`);
      }
    },
    [products, form.items]
  );

  const handleScanForConfirm = useCallback(
    (barcode: string) => {
      const matchedItem = form.items.find(
        (i) =>
          i.productSku === barcode ||
          i.productId === barcode ||
          `${i.productId}` === barcode
      );

      if (!matchedItem) {
        setScanError(`Sản phẩm không có trong danh sách xuất`);
        return;
      }

      if (matchedItem.isPicked) {
        setScanError(`Sản phẩm "${matchedItem.productName}" đã được xác nhận`);
        return;
      }

      setForm((prev) => ({
        ...prev,
        items: prev.items.map((i) =>
          i.id === matchedItem.id
            ? { ...i, pickedQuantity: i.quantity, isPicked: true }
            : i
        ),
      }));
    },
    [form.items]
  );

  const handleBarcodeScan = useCallback(
    (barcode: string) => {
      if (pickingMode === "add") {
        handleScanForAdd(barcode);
      } else if (pickingMode === "confirm") {
        handleScanForConfirm(barcode);
      }
      handleCloseScanner();
    },
    [pickingMode, handleScanForAdd, handleScanForConfirm, handleCloseScanner]
  );

  const handleRemoveItem = useCallback((itemId: string) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.id !== itemId),
    }));
  }, []);

  const handleUpdateItemQuantity = useCallback((itemId: string, quantity: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        i.id === itemId ? { ...i, quantity } : i
      ),
    }));
  }, []);

  const transformIssueForExport = (issue: any): GoodsIssueExport => ({
    issueNumber: issue.issueNumber,
    issueDate: issue.issueDate,
    reason: REASON_LABELS[issue.reason as GoodsIssueReason] || issue.reason,
    customerName: issue.customerName,
    warehouseName: issue.warehouse?.name || "",
    issuedBy: issue.issuedByName || issue.issuedBy,
    status: issue.status,
    items: (issue.items || []).map((item: any, idx: number) => ({
      stt: idx + 1,
      productSku: item.productSku || "",
      productName: item.productName || "",
      serialNumbers: item.serialNumbers,
      lotNumber: item.lotNumber,
      expiryDate: item.expiryDate,
      unit: item.unit || "piece",
      quantity: item.quantity,
      unitPrice: item.unitPrice || 0,
      totalPrice: item.totalPrice || (item.quantity * item.unitPrice),
      location: item.location,
    })),
    subtotal: issue.subtotal || 0,
    totalValue: issue.totalValue || 0,
    notes: issue.notes,
  });

  const handleExportGIExcel = useCallback(() => {
    const exportData = issues.map(transformIssueForExport);
    exportGoodsIssues(exportData);
  }, [issues]);

  const handlePrintGI = useCallback((issue: any) => {
    const data = transformIssueForExport(issue);
    printGoodsIssue(data);
  }, []);

  const handlePrintPickingList = useCallback(() => {
    if (form.items.length === 0) return;

    const pickingData = {
      pickingListNumber: `PL-${Date.now().toString().slice(-6)}`,
      pickingListDate: new Date(),
      warehouseName: warehouses.find((w: any) => w.id === form.warehouseId)?.name || "",
      assignedTo: "",
      items: form.items.map((item) => ({
        productSku: item.productSku,
        productName: item.productName,
        quantity: item.quantity,
        pickedQuantity: item.isPicked ? item.quantity : 0,
        location: item.location,
        lotNumber: item.lotNumber,
      })),
    };

    printPickingList(pickingData);
  }, [form, warehouses]);

  const handleResetForm = useCallback(() => {
    setForm({
      reason: GoodsIssueReason.SALES,
      customerName: "",
      warehouseId: "",
      notes: "",
      items: [],
    });
    setActiveTab("list");
  }, []);

  const handleSubmit = useCallback(() => {
    if (form.items.length === 0) return;

    const issueNumber = `XK-${Date.now().toString().slice(-6)}`;
    const warehouse = warehouses.find((w: any) => w.id === form.warehouseId);

    const issueItems = form.items.map((item, index) => ({
      id: `gi-item-${Date.now()}-${index}`,
      productId: item.productId,
      productSku: item.productSku,
      productName: item.productName,
      unit: UnitOfMeasure.PIECE,
      quantity: item.quantity,
      unitPrice: 0,
      totalPrice: 0,
      warehouseId: form.warehouseId,
      notes: item.isPicked ? "Đã pick đủ" : "Chưa pick đủ",
    }));

    const newIssue = {
      id: `gi-${Date.now()}`,
      issueNumber,
      reason: form.reason,
      customerName: form.customerName,
      items: issueItems,
      subtotal: 0,
      totalValue: 0,
      status: GoodsIssueStatus.COMPLETED,
      issueDate: new Date(),
      issuedBy: "user-001",
      issuedByName: "Nguyễn Văn Minh",
      warehouseId: form.warehouseId,
      warehouse,
      notes: form.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addGoodsIssue(newIssue as any);

    form.items.forEach((item) => {
      if (item.isPicked) {
        adjustInventoryQuantity(
          item.productId,
          form.warehouseId,
          item.quantity,
          "subtract"
        );
      }
    });

    addAuditLog({
      action: AuditAction.CREATE,
      entity: "GoodsIssue",
      entityId: newIssue.id,
      entityName: issueNumber,
      userId: "user-001",
      userName: "Nguyễn Văn Minh",
      newValue: {
        itemCount: form.items.length,
        pickedCount: form.items.filter((i) => i.isPicked).length,
        reason: form.reason,
      },
      reason: REASON_LABELS[form.reason],
    });

    handleResetForm();
  }, [form, warehouses, addGoodsIssue, adjustInventoryQuantity, addAuditLog, handleResetForm]);

  const allItemsPicked = enrichedPickingItems.length > 0 &&
    enrichedPickingItems.every((i: any) => i.isPicked);

  return (
    <ErrorBoundary moduleName="Xuất kho">
      <AppShell>
        <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Xuất kho</h1>
            <p className="text-slate-400 mt-1">Quản lý phiếu xuất kho & picking list</p>
          </div>
          <div className="flex gap-3">
            {/* Export Dropdown */}
            <div className="relative group">
              <Button
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
              <div className="absolute right-0 top-full mt-1 z-50 hidden group-hover:block">
                <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 min-w-[180px]">
                  <button
                    onClick={handleExportGIExcel}
                    className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Xuất Excel
                  </button>
                  <button
                    onClick={handlePrintPickingList}
                    disabled={form.items.length === 0}
                    className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Printer className="w-4 h-4" />
                    In Picking List
                  </button>
                </div>
              </div>
            </div>
            <Button
              onClick={() => setActiveTab("create")}
              className="bg-sky-500 hover:bg-sky-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Tạo phiếu xuất
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => v === "list" ? setActiveTab("list") : setActiveTab("create")} className="w-full">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="list">Danh sách phiếu xuất</TabsTrigger>
            <TabsTrigger value="create">Tạo phiếu xuất mới</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-6 space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10">
                      <PackageMinus className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{issues.length}</p>
                      <p className="text-sm text-slate-400">Tổng phiếu xuất</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10">
                      <Clock className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {issues.filter((i: any) => i.status === "pending").length}
                      </p>
                      <p className="text-sm text-slate-400">Chờ duyệt</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {issues.filter((i: any) => i.status === "completed").length}
                      </p>
                      <p className="text-sm text-slate-400">Hoàn thành</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-sky-500/10">
                      <Truck className="w-5 h-5 text-sky-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {issues.filter((i: any) => i.status === "confirmed").length}
                      </p>
                      <p className="text-sm text-slate-400">Đã xác nhận</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Issues Table */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="border-b border-slate-800 pb-4">
                <CardTitle className="text-white">Danh sách phiếu xuất kho</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400">Số phiếu</TableHead>
                      <TableHead className="text-slate-400">Ngày xuất</TableHead>
                      <TableHead className="text-slate-400">Lý do xuất</TableHead>
                      <TableHead className="text-right text-slate-400">Số mặt hàng</TableHead>
                      <TableHead className="text-right text-slate-400">Tổng tiền</TableHead>
                      <TableHead className="text-center text-slate-400">Trạng thái</TableHead>
                      <TableHead className="text-right text-slate-400">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrichedIssues.map((issue: any) => {
                      const status = STATUS_STYLES[issue.status] || STATUS_STYLES.draft;
                      return (
                        <TableRow
                          key={issue.id}
                          className="border-slate-800/50 hover:bg-slate-800/30 cursor-pointer"
                          onClick={() => {
                            setSelectedIssue(issue);
                            setIsDetailOpen(true);
                          }}
                        >
                          <TableCell className="font-mono text-sky-400">{issue.issueNumber}</TableCell>
                          <TableCell className="text-slate-300">{formatDate(issue.issueDate)}</TableCell>
                          <TableCell className="text-slate-300">{issue.reasonLabel}</TableCell>
                          <TableCell className="text-right text-slate-300">{issue.items?.length || 0}</TableCell>
                          <TableCell className="text-right font-medium text-white">
                            {formatCurrency(issue.totalValue || 0)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={status.className}>{status.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-slate-400 hover:text-sky-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedIssue(issue);
                                setIsDetailOpen(true);
                              }}
                            >
                              Xem chi tiết
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {enrichedIssues.length === 0 && (
                      <TableRow className="border-slate-800/50">
                        <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                          Chưa có phiếu xuất nào
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create" className="mt-6">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Tạo phiếu xuất mới</h2>
                    <p className="text-slate-400">Scan barcode để thêm sản phẩm vào danh sách picking</p>
                  </div>
                  <Button
                    onClick={() => setActiveTab("list")}
                    variant="ghost"
                    className="text-slate-400 hover:text-white"
                  >
                    Hủy
                  </Button>
                </div>

                {/* Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Lý do xuất *</Label>
                    <Select
                      value={form.reason}
                      onValueChange={(v) => setForm((prev) => ({ ...prev, reason: v as GoodsIssueReason }))}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {Object.entries(REASON_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Kho xuất *</Label>
                    <Select
                      value={form.warehouseId}
                      onValueChange={(v) => setForm((prev) => ({ ...prev, warehouseId: v || "" }))}
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

                  <div className="space-y-2">
                    <Label>Tên khách hàng</Label>
                    <Input
                      placeholder="Nhập tên khách hàng (nếu có)"
                      value={form.customerName}
                      onChange={(e) => setForm((prev) => ({ ...prev, customerName: e.target.value }))}
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Ghi chú</Label>
                    <Input
                      placeholder="Nhập ghi chú"
                      value={form.notes}
                      onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                </div>

                {/* Picking List Actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleOpenScanner("add")}
                    className="bg-emerald-500 hover:bg-emerald-600"
                  >
                    <ScanLine className="w-4 h-4 mr-2" />
                    Scan thêm hàng
                  </Button>
                  {form.items.length > 0 && (
                    <Button
                      onClick={() => handleOpenScanner("confirm")}
                      variant="outline"
                      className="border-sky-700 text-sky-400 hover:bg-sky-500/10"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Scan xác nhận pick
                    </Button>
                  )}
                </div>

                {/* Scan Error */}
                {scanError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <p className="text-red-400">{scanError}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto text-red-400 hover:text-red-300"
                      onClick={() => setScanError(null)}
                    >
                      Đóng
                    </Button>
                  </div>
                )}

                {/* Picking List */}
                {form.items.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="bg-slate-800/50 rounded-xl p-8 border border-dashed border-slate-700">
                      <Package className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                      <p className="text-slate-400 mb-2">Danh sách picking trống</p>
                      <p className="text-slate-500 text-sm mb-4">Scan barcode để thêm sản phẩm</p>
                      <Button
                        onClick={() => handleOpenScanner("add")}
                        className="bg-emerald-500 hover:bg-emerald-600"
                      >
                        <ScanLine className="w-4 h-4 mr-2" />
                        Bắt đầu scan
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-semibold">
                        Danh sách picking ({form.items.length} sản phẩm)
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 text-sm">
                          Đã pick: {form.items.filter((i) => i.isPicked).length}
                        </span>
                        <span className="text-slate-500">/</span>
                        <span className="text-slate-300 text-sm">{form.items.length}</span>
                      </div>
                    </div>

                    {enrichedPickingItems.map((item: any) => (
                      <Card
                        key={item.id}
                        className={`bg-slate-800/50 border-slate-700 ${
                          item.isPicked ? "border-emerald-500/50 bg-emerald-500/5" : ""
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                item.isPicked
                                  ? "bg-emerald-500/20"
                                  : "bg-slate-700"
                              }`}
                            >
                              {item.isPicked ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                              ) : (
                                <Package className="w-5 h-5 text-slate-400" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-white font-medium truncate">{item.productName}</p>
                                {item.isPicked && (
                                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                    Đã pick
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-slate-400">
                                <span className="font-mono">{item.productSku}</span>
                                <span className="text-slate-600">|</span>
                                <span className="flex items-center gap-1">
                                  <Package className="w-3 h-3" />
                                  Tồn: {item.availableQty}
                                </span>
                                <span className="text-slate-600">|</span>
                                <span className="font-mono">{item.location}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="w-8 h-8 border-slate-600"
                                  onClick={() =>
                                    handleUpdateItemQuantity(item.id, Math.max(1, item.quantity - 1))
                                  }
                                >
                                  -
                                </Button>
                                <Input
                                  type="number"
                                  className="w-16 text-center bg-slate-800 border-slate-700"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleUpdateItemQuantity(item.id, parseInt(e.target.value) || 1)
                                  }
                                />
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="w-8 h-8 border-slate-600"
                                  onClick={() =>
                                    handleUpdateItemQuantity(item.id, item.quantity + 1)
                                  }
                                >
                                  +
                                </Button>
                              </div>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-slate-400 hover:text-red-400"
                                onClick={() => handleRemoveItem(item.id)}
                              >
                                <XCircle className="w-5 h-5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {/* Submit Button */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                      <div className="flex items-center gap-2">
                        {allItemsPicked ? (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 py-1">
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Tất cả đã được pick
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 py-1">
                            <AlertTriangle className="w-4 h-4 mr-1" />
                            Còn sản phẩm chưa pick
                          </Badge>
                        )}
                      </div>
                      <Button
                        onClick={handleSubmit}
                        disabled={form.items.length === 0 || !form.warehouseId}
                        className="bg-emerald-500 hover:bg-emerald-600"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Xuất kho ({form.items.length} sản phẩm)
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="bg-slate-900 border-slate-800 w-full sm:max-w-xl overflow-y-auto">
          {selectedIssue && (
            <>
              <SheetHeader>
                <SheetTitle className="text-white">
                  Chi tiết phiếu xuất
                </SheetTitle>
                <SheetDescription className="text-slate-400">
                  {selectedIssue.issueNumber}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handlePrintGI(selectedIssue)}
                    className="flex-1 bg-sky-500 hover:bg-sky-600"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    In phiếu PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const data = transformIssueForExport(selectedIssue);
                      exportGoodsIssue(data);
                    }}
                    className="flex-1 border-slate-700 text-slate-300"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Tải Excel
                  </Button>
                </div>

                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Trạng thái:</span>
                      <Badge className={STATUS_STYLES[selectedIssue.status]?.className}>
                        {STATUS_STYLES[selectedIssue.status]?.label}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Lý do:</span>
                      <span className="text-white">{selectedIssue.reasonLabel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Ngày xuất:</span>
                      <span className="text-white">{formatDate(selectedIssue.issueDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Kho:</span>
                      <span className="text-white">{selectedIssue.warehouse?.name}</span>
                    </div>
                    {selectedIssue.customerName && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Khách hàng:</span>
                        <span className="text-white">{selectedIssue.customerName}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div>
                  <h3 className="text-white font-medium mb-3">
                    Danh sách hàng ({selectedIssue.items?.length || 0})
                  </h3>
                  <div className="space-y-2">
                    {selectedIssue.items?.map((item: any, index: number) => (
                      <Card key={index} className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-medium">{item.productName}</p>
                              <p className="text-slate-400 text-sm font-mono">{item.productSku}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-white font-medium">x{item.quantity}</p>
                              <p className="text-slate-400 text-sm">
                                {formatCurrency(item.unitPrice * item.quantity)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Barcode Scanner */}
      <BarcodeScanner
        isOpen={isScannerOpen}
        onClose={handleCloseScanner}
        onScan={handleBarcodeScan}
        title={pickingMode === "add" ? "Scan thêm hàng" : "Scan xác nhận pick"}
        description={
          pickingMode === "add"
            ? "Quét barcode để thêm sản phẩm vào danh sách"
            : "Quét barcode để xác nhận đã pick sản phẩm"
        }
      />
    </AppShell>
    </ErrorBoundary>
  );
}
