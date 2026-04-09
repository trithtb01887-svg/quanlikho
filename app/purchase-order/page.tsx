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
  ShoppingCart,
  Search,
  Plus,
  Trash2,
  Check,
  X,
  FileText,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  Star,
  AlertTriangle,
  Send,
  CheckSquare,
  Square,
  TrendingUp,
  Truck,
  History,
  ClipboardList,
  Printer,
  Download,
  FileSpreadsheet,
  ChevronDown,
} from "lucide-react";
import {
  usePurchaseOrders,
  usePurchaseOrderActions,
  useSuppliers,
  useProducts,
  useInventoryItems,
  useGoodsReceipts,
  useAuditLogActions,
} from "@/lib/store";
import {
  PurchaseOrderStatus,
  SupplierRating,
  AuditAction,
} from "@/lib/types";
import {
  exportPurchaseOrders,
  PurchaseOrderExport,
} from "@/lib/exportExcel";
import { printPurchaseOrder } from "@/lib/printTemplates";

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

const STATUS_STYLES: Record<PurchaseOrderStatus, { color: string; bg: string; label: string }> = {
  [PurchaseOrderStatus.DRAFT]: {
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    label: "Nháp",
  },
  [PurchaseOrderStatus.PENDING_APPROVAL]: {
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    label: "Chờ duyệt",
  },
  [PurchaseOrderStatus.APPROVED]: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    label: "Đã duyệt",
  },
  [PurchaseOrderStatus.SENT]: {
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    label: "Đã gửi",
  },
  [PurchaseOrderStatus.CONFIRMED]: {
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    label: "Đã xác nhận",
  },
  [PurchaseOrderStatus.PARTIALLY_RECEIVED]: {
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    label: "Nhận một phần",
  },
  [PurchaseOrderStatus.FULLY_RECEIVED]: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    label: "Đã nhận đủ",
  },
  [PurchaseOrderStatus.CLOSED]: {
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    label: "Đã đóng",
  },
  [PurchaseOrderStatus.CANCELLED]: {
    color: "text-red-400",
    bg: "bg-red-500/10",
    label: "Đã hủy",
  },
};

const RATING_STARS: Record<number, { stars: number; label: string; color: string }> = {
  5: { stars: 5, label: "Xuất sắc", color: "text-yellow-400" },
  4: { stars: 4, label: "Rất tốt", color: "text-emerald-400" },
  3: { stars: 3, label: "Tốt", color: "text-sky-400" },
  2: { stars: 2, label: "Trung bình", color: "text-amber-400" },
  1: { stars: 1, label: "Kém", color: "text-red-400" },
};

interface POItemForm {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes: string;
}

interface NewPOForm {
  supplierId: string;
  orderDate: string;
  expectedDeliveryDate: string;
  items: POItemForm[];
  notes: string;
  internalNotes: string;
}

function getApprovalLevel(totalValue: number): { level: string; icon: string; color: string; bg: string } {
  if (totalValue < 10000000) {
    return {
      level: "Quản lý kho duyệt",
      icon: "warehouse",
      color: "text-sky-400",
      bg: "bg-sky-500/10",
    };
  } else if (totalValue < 50000000) {
    return {
      level: "Trưởng phòng duyệt",
      icon: "manager",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    };
  } else {
    return {
      level: "Giám đốc duyệt",
      icon: "director",
      color: "text-red-400",
      bg: "bg-red-500/10",
    };
  }
}

function calculateEOQ(
  annualDemand: number,
  orderingCost: number,
  holdingCostRate: number,
  unitCost: number
): number {
  if (unitCost === 0 || holdingCostRate === 0) return 0;
  const holdingCostPerUnit = unitCost * holdingCostRate;
  const eoq = Math.sqrt((2 * annualDemand * orderingCost) / holdingCostPerUnit);
  return Math.ceil(eoq);
}

export default function PurchaseOrderPage() {
  const purchaseOrders = usePurchaseOrders();
  const suppliers = useSuppliers();
  const products = useProducts();
  const inventoryItems = useInventoryItems();
  const goodsReceipts = useGoodsReceipts();
  const { addPurchaseOrder, updatePurchaseOrder, fetchPurchaseOrders } = usePurchaseOrderActions();
  const { addAuditLog } = useAuditLogActions();

  const [activeTab, setActiveTab] = useState<string>("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Fetch data on mount
  useEffect(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [form, setForm] = useState<NewPOForm>({
    supplierId: "",
    orderDate: new Date().toISOString().split("T")[0],
    expectedDeliveryDate: "",
    items: [],
    notes: "",
    internalNotes: "",
  });

  const [productSearch, setProductSearch] = useState("");

  // Low stock items for auto-suggestion
  const [suggestionItems, setSuggestionItems] = useState<Record<string, boolean>>({});

  const transformPOForExport = (po: any): PurchaseOrderExport => ({
    orderNumber: po.orderNumber,
    orderDate: po.orderDate,
    supplierName: po.supplierName,
    status: po.status,
    expectedDeliveryDate: po.expectedDeliveryDate,
    items: (po.items || []).map((item: any, idx: number) => ({
      stt: idx + 1,
      productSku: item.productSku || "",
      productName: item.productName || "",
      unit: item.unit || "piece",
      quantity: item.quantity,
      orderedQuantity: item.orderedQuantity || item.quantity,
      receivedQuantity: item.receivedQuantity || 0,
      pendingQuantity: item.pendingQuantity || (item.orderedQuantity || item.quantity) - (item.receivedQuantity || 0),
      unitPrice: item.unitPrice || 0,
      totalPrice: item.totalPrice || (item.quantity * item.unitPrice),
    })),
    subtotal: po.subtotal || 0,
    taxAmount: po.taxAmount || 0,
    discountAmount: po.discountAmount || 0,
    totalValue: po.totalValue || 0,
    createdBy: po.createdByName || po.createdBy || "",
  });

  const handleExportPOExcel = useCallback(() => {
    const exportData = purchaseOrders.map(transformPOForExport);
    exportPurchaseOrders(exportData);
  }, [purchaseOrders]);

  const handlePrintPO = useCallback((po: any) => {
    const data = transformPOForExport(po);
    printPurchaseOrder(data);
  }, []);

  const filteredPOs = useMemo(() => {
    let filtered = [...purchaseOrders];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (po: any) =>
          po.orderNumber?.toLowerCase().includes(search) ||
          po.supplierName?.toLowerCase().includes(search)
      );
    }

    if (supplierFilter !== "all") {
      filtered = filtered.filter((po: any) => po.supplierId === supplierFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((po: any) => po.status === statusFilter);
    }

    if (dateFrom) {
      filtered = filtered.filter((po: any) => new Date(po.orderDate) >= new Date(dateFrom));
    }

    if (dateTo) {
      filtered = filtered.filter((po: any) => new Date(po.orderDate) <= new Date(dateTo));
    }

    return filtered.sort(
      (a: any, b: any) =>
        new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
    );
  }, [purchaseOrders, searchTerm, supplierFilter, statusFilter, dateFrom, dateTo]);

  const selectedSupplier = useMemo(() => {
    if (!form.supplierId) return null;
    return suppliers.find((s: any) => s.id === form.supplierId);
  }, [form.supplierId, suppliers]);

  const subtotal = useMemo(() => {
    return form.items.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [form.items]);

  const taxAmount = subtotal * 0.1;
  const discountAmount = 0;
  const totalValue = subtotal + taxAmount - discountAmount;

  const approvalLevel = getApprovalLevel(totalValue);

  const supplierOrderHistory = useMemo(() => {
    if (!selectedSupplier) return [];
    return purchaseOrders
      .filter((po: any) => po.supplierId === selectedSupplier.id)
      .sort((a: any, b: any) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
      .slice(0, 5);
  }, [selectedSupplier, purchaseOrders]);

  // Auto-suggestion: low stock items
  const lowStockItems = useMemo(() => {
    return inventoryItems
      .map((item: any) => {
        const product = products.find((p: any) => p.id === item.productId);
        if (!product || !product.reorderPoint) return null;

        const totalQty = inventoryItems
          .filter((i: any) => i.productId === product.id)
          .reduce((sum: number, i: any) => sum + i.quantityAvailable, 0);

        if (totalQty <= product.reorderPoint) {
          const annualDemand = 1200;
          const orderingCost = 500000;
          const holdingCostRate = 0.2;
          const suggestedQty = calculateEOQ(
            annualDemand,
            orderingCost,
            holdingCostRate,
            product.costPrice
          );

          const bestSupplier = suppliers.find((s: any) => s.id === form.supplierId);

          return {
            productId: product.id,
            productSku: product.sku,
            productName: product.name,
            currentStock: totalQty,
            reorderPoint: product.reorderPoint,
            suggestedQty: Math.max(suggestedQty, product.reorderPoint * 2),
            unit: product.unit,
            unitPrice: product.costPrice,
            estimatedValue: Math.max(suggestedQty, product.reorderPoint * 2) * product.costPrice,
            supplier: bestSupplier,
          };
        }
        return null;
      })
      .filter(Boolean);
  }, [inventoryItems, products, suppliers, form.supplierId]);

  const selectedSuggestionItems = Object.entries(suggestionItems).filter(([, v]) => v);
  const totalSuggestedValue = selectedSuggestionItems.reduce((sum, [productId]) => {
    const item = lowStockItems.find((i: any) => i.productId === productId);
    return sum + (item?.estimatedValue || 0);
  }, 0);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return [];
    const search = productSearch.toLowerCase();
    return products
      .filter(
        (p: any) =>
          p.name.toLowerCase().includes(search) ||
          p.sku.toLowerCase().includes(search)
      )
      .slice(0, 10);
  }, [productSearch, products]);

  const handleAddItem = useCallback((product: any) => {
    const existingItem = form.items.find((i) => i.productId === product.id);
    if (existingItem) return;

    const newItem: POItemForm = {
      id: `po-item-${Date.now()}`,
      productId: product.id,
      productSku: product.sku,
      productName: product.name,
      unit: product.unit,
      quantity: 1,
      unitPrice: product.costPrice,
      totalPrice: product.costPrice,
      notes: "",
    };
    setForm((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    setProductSearch("");
  }, [form.items]);

  const handleRemoveItem = useCallback((itemId: string) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.id !== itemId),
    }));
  }, []);

  const handleItemChange = useCallback((itemId: string, field: keyof POItemForm, value: any) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== itemId) return item;
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "unitPrice") {
          updated.totalPrice = updated.quantity * updated.unitPrice;
        }
        return updated;
      }),
    }));
  }, []);

  const handleAction = useCallback(
    (po: any, action: "approve" | "send" | "cancel") => {
      let newStatus: PurchaseOrderStatus;
      let auditAction: AuditAction;
      let reason = "";

      switch (action) {
        case "approve":
          newStatus = PurchaseOrderStatus.APPROVED;
          auditAction = AuditAction.APPROVE;
          reason = "Phê duyệt đơn đặt hàng";
          break;
        case "send":
          newStatus = PurchaseOrderStatus.SENT;
          auditAction = AuditAction.SEND;
          reason = "Gửi đơn đặt hàng cho nhà cung cấp";
          break;
        case "cancel":
          newStatus = PurchaseOrderStatus.CANCELLED;
          auditAction = AuditAction.REJECT;
          reason = "Hủy đơn đặt hàng";
          break;
      }

      updatePurchaseOrder(po.id, { status: newStatus });

      addAuditLog({
        action: auditAction,
        entity: "PurchaseOrder",
        entityId: po.id,
        entityName: po.orderNumber,
        userId: "user-001",
        userName: "Nguyễn Văn Minh",
        oldValue: { status: po.status },
        newValue: { status: newStatus },
        reason,
      });
    },
    [updatePurchaseOrder, addAuditLog]
  );

  const handleSaveDraft = useCallback(() => {
    const orderNumber = `PO-${Date.now().toString().slice(-6)}`;

    const newPO = {
      id: `po-${Date.now()}`,
      orderNumber,
      supplierId: form.supplierId,
      supplierName: selectedSupplier?.name,
      items: form.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productSku: item.productSku,
        productName: item.productName,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        orderedQuantity: item.quantity,
        receivedQuantity: 0,
        pendingQuantity: item.quantity,
        notes: item.notes,
      })),
      subtotal,
      taxAmount,
      discountAmount,
      totalValue,
      status: PurchaseOrderStatus.DRAFT,
      orderDate: new Date(form.orderDate),
      expectedDeliveryDate: form.expectedDeliveryDate ? new Date(form.expectedDeliveryDate) : undefined,
      notes: form.notes,
      internalNotes: form.internalNotes,
      createdBy: "user-001",
      createdByName: "Nguyễn Văn Minh",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addPurchaseOrder(newPO as any);

    addAuditLog({
      action: AuditAction.CREATE,
      entity: "PurchaseOrder",
      entityId: newPO.id,
      entityName: orderNumber,
      userId: "user-001",
      userName: "Nguyễn Văn Minh",
      newValue: { totalValue, itemCount: form.items.length },
      reason: "Tạo đơn đặt hàng mới",
    });

    setForm({
      supplierId: "",
      orderDate: new Date().toISOString().split("T")[0],
      expectedDeliveryDate: "",
      items: [],
      notes: "",
      internalNotes: "",
    });
    setActiveTab("list");
  }, [form, subtotal, taxAmount, discountAmount, totalValue, selectedSupplier, addPurchaseOrder, addAuditLog]);

  const handleSendApproval = useCallback(() => {
    const orderNumber = `PO-${Date.now().toString().slice(-6)}`;

    const newPO = {
      id: `po-${Date.now()}`,
      orderNumber,
      supplierId: form.supplierId,
      supplierName: selectedSupplier?.name,
      items: form.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productSku: item.productSku,
        productName: item.productName,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        orderedQuantity: item.quantity,
        receivedQuantity: 0,
        pendingQuantity: item.quantity,
        notes: item.notes,
      })),
      subtotal,
      taxAmount,
      discountAmount,
      totalValue,
      status: PurchaseOrderStatus.PENDING_APPROVAL,
      orderDate: new Date(form.orderDate),
      expectedDeliveryDate: form.expectedDeliveryDate ? new Date(form.expectedDeliveryDate) : undefined,
      notes: form.notes,
      internalNotes: form.internalNotes,
      createdBy: "user-001",
      createdByName: "Nguyễn Văn Minh",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addPurchaseOrder(newPO as any);

    addAuditLog({
      action: AuditAction.CREATE,
      entity: "PurchaseOrder",
      entityId: newPO.id,
      entityName: orderNumber,
      userId: "user-001",
      userName: "Nguyễn Văn Minh",
      newValue: { totalValue, itemCount: form.items.length, approvalRequired: approvalLevel.level },
      reason: `Gửi phê duyệt - ${approvalLevel.level}`,
    });

    setForm({
      supplierId: "",
      orderDate: new Date().toISOString().split("T")[0],
      expectedDeliveryDate: "",
      items: [],
      notes: "",
      internalNotes: "",
    });
    setActiveTab("list");
  }, [form, subtotal, taxAmount, discountAmount, totalValue, selectedSupplier, approvalLevel, addPurchaseOrder, addAuditLog]);

  const handleCreateBatchPO = useCallback(() => {
    if (selectedSuggestionItems.length === 0) return;

    const itemsBySupplier: Record<string, any[]> = {};
    selectedSuggestionItems.forEach(([productId, selected]) => {
      if (!selected) return;
      const item = lowStockItems.find((i: any) => i.productId === productId);
      if (!item || !item.supplier) return;
      const supplierId = item.supplier.id;
      if (!itemsBySupplier[supplierId]) itemsBySupplier[supplierId] = [];
      itemsBySupplier[supplierId].push({
        productId: item.productId,
        productSku: item.productSku,
        productName: item.productName,
        unit: item.unit,
        quantity: item.suggestedQty,
        unitPrice: item.unitPrice,
        totalPrice: item.estimatedValue,
        orderedQuantity: item.suggestedQty,
        receivedQuantity: 0,
        pendingQuantity: item.suggestedQty,
      });
    });

    Object.entries(itemsBySupplier).forEach(([supplierId, items]) => {
      const supplier = suppliers.find((s: any) => s.id === supplierId);
      const orderNumber = `PO-${Date.now().toString().slice(-6)}-${supplierId.slice(-4)}`;
      const total = items.reduce((sum, i) => sum + i.totalPrice, 0);

      addPurchaseOrder({
        id: `po-${Date.now()}-${supplierId}`,
        orderNumber,
        supplierId,
        supplierName: supplier?.name,
        items,
        subtotal: total / 1.1,
        taxAmount: total / 11,
        discountAmount: 0,
        totalValue: total,
        status: PurchaseOrderStatus.DRAFT,
        orderDate: new Date(),
        expectedDeliveryDate: supplier?.leadTimeDays
          ? new Date(Date.now() + supplier.leadTimeDays * 24 * 60 * 60 * 1000)
          : undefined,
        notes: "",
        internalNotes: "Tạo tự động từ đề xuất",
        createdBy: "user-001",
        createdByName: "Nguyễn Văn Minh",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
    });

    setSuggestionItems({});
    setActiveTab("list");
  }, [selectedSuggestionItems, lowStockItems, suppliers, addPurchaseOrder]);

  const handleViewDetail = (po: any) => {
    setSelectedPO(po);
    setIsDetailOpen(true);
  };

  const toggleSuggestionItem = (productId: string) => {
    setSuggestionItems((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  return (
    <ErrorBoundary moduleName="Đơn đặt hàng">
      <AppShell>
        <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Đơn đặt hàng</h1>
            <p className="text-slate-400 mt-1">Quản lý Purchase Orders</p>
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
                    onClick={handleExportPOExcel}
                    className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Xuất Excel
                  </button>
                  {selectedPO && (
                    <button
                      onClick={() => handlePrintPO(selectedPO)}
                      className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                    >
                      <Printer className="w-4 h-4" />
                      In PO PDF
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="list">Danh sách PO</TabsTrigger>
            <TabsTrigger value="create">Tạo PO mới</TabsTrigger>
            <TabsTrigger value="suggestions">Đề xuất tự động</TabsTrigger>
          </TabsList>

          {/* Tab 1: PO List */}
          <TabsContent value="list" className="mt-6 space-y-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Tìm kiếm số PO, NCC..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-slate-800 border-slate-700 text-slate-200"
                    />
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    <Select value={supplierFilter} onValueChange={(v) => setSupplierFilter(v || "all")}>
                      <SelectTrigger className="w-44 bg-slate-800 border-slate-700">
                        <SelectValue placeholder="Nhà cung cấp" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="all">Tất cả NCC</SelectItem>
                        {suppliers.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "all")}>
                      <SelectTrigger className="w-40 bg-slate-800 border-slate-700">
                        <SelectValue placeholder="Trạng thái" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="all">Tất cả</SelectItem>
                        <SelectItem value={PurchaseOrderStatus.DRAFT}>Nháp</SelectItem>
                        <SelectItem value={PurchaseOrderStatus.PENDING_APPROVAL}>Chờ duyệt</SelectItem>
                        <SelectItem value={PurchaseOrderStatus.APPROVED}>Đã duyệt</SelectItem>
                        <SelectItem value={PurchaseOrderStatus.SENT}>Đã gửi</SelectItem>
                        <SelectItem value={PurchaseOrderStatus.CONFIRMED}>Đã xác nhận</SelectItem>
                        <SelectItem value={PurchaseOrderStatus.PARTIALLY_RECEIVED}>Nhận một phần</SelectItem>
                        <SelectItem value={PurchaseOrderStatus.CLOSED}>Đã đóng</SelectItem>
                        <SelectItem value={PurchaseOrderStatus.CANCELLED}>Đã hủy</SelectItem>
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
                      <TableHead className="text-slate-400">Số PO</TableHead>
                      <TableHead className="text-slate-400">Ngày tạo</TableHead>
                      <TableHead className="text-slate-400">NCC</TableHead>
                      <TableHead className="text-right text-slate-400">Giá trị</TableHead>
                      <TableHead className="text-center text-slate-400">Trạng thái</TableHead>
                      <TableHead className="text-slate-400">Ngày giao dự kiến</TableHead>
                      <TableHead className="text-center text-slate-400">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPOs.map((po: any) => {
                      const styles = STATUS_STYLES[po.status as PurchaseOrderStatus] || STATUS_STYLES[PurchaseOrderStatus.DRAFT];
                      const canApprove = po.status === PurchaseOrderStatus.PENDING_APPROVAL;
                      const canSend = po.status === PurchaseOrderStatus.APPROVED;
                      const canCancel = po.status === PurchaseOrderStatus.DRAFT || po.status === PurchaseOrderStatus.PENDING_APPROVAL;

                      return (
                        <TableRow key={po.id} className="border-slate-800/50 hover:bg-slate-800/30">
                          <TableCell className="font-medium cursor-pointer" onClick={() => handleViewDetail(po)}>
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-sky-400" />
                              <span className="text-sky-400 font-mono">{po.orderNumber}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-400">{formatDate(po.orderDate)}</TableCell>
                          <TableCell className="text-slate-300">{po.supplierName}</TableCell>
                          <TableCell className="text-right text-emerald-400 font-medium">
                            {formatCurrency(po.totalValue)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={`${styles.bg} ${styles.color} border-0`}>
                              {styles.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-400">
                            {po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate) : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {canApprove && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAction(po, "approve")}
                                  className="text-emerald-400 hover:text-emerald-300 h-8 px-2"
                                  title="Duyệt"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                              )}
                              {canSend && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAction(po, "send")}
                                  className="text-sky-400 hover:text-sky-300 h-8 px-2"
                                  title="Gửi NCC"
                                >
                                  <Send className="w-4 h-4" />
                                </Button>
                              )}
                              {canCancel && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAction(po, "cancel")}
                                  className="text-red-400 hover:text-red-300 h-8 px-2"
                                  title="Hủy"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredPOs.length === 0 && (
                      <TableRow className="border-slate-800/50">
                        <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                          Không có đơn đặt hàng nào
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <div className="p-4 border-t border-slate-800 text-sm text-slate-400">
                  Hiển thị {filteredPOs.length} đơn đặt hàng
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Create PO */}
          <TabsContent value="create" className="mt-6 space-y-6">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Tạo đơn đặt hàng mới</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Supplier Selection */}
                <div className="space-y-2">
                  <Label>Chọn nhà cung cấp *</Label>
                  <Select
                    value={form.supplierId}
                    onValueChange={(v) => setForm((prev) => ({ ...prev, supplierId: v || "" }))}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue placeholder="-- Chọn nhà cung cấp --" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {suppliers.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Supplier Preview */}
                {selectedSupplier && (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-sky-500/10">
                            <Star className="w-5 h-5 text-sky-400" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Đánh giá</p>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < (RATING_STARS[(selectedSupplier.rating as number) || 0]?.stars || 0)
                                      ? "text-yellow-400 fill-yellow-400"
                                      : "text-slate-600"
                                  }`}
                                />
                              ))}
                              <span className={`text-xs ml-1 ${RATING_STARS[(selectedSupplier.rating as number) || 0]?.color}`}>
                                {RATING_STARS[(selectedSupplier.rating as number) || 0]?.label}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-emerald-500/10">
                            <Truck className="w-5 h-5 text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Lead time</p>
                            <p className="text-white font-medium">
                              {selectedSupplier.leadTimeDays || 7} ngày
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-amber-500/10">
                            <History className="w-5 h-5 text-amber-400" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Đơn hàng đã đặt</p>
                            <p className="text-white font-medium">
                              {selectedSupplier.totalOrders || 0} đơn
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-violet-500/10">
                            <ClipboardList className="w-5 h-5 text-violet-400" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Tổng giá trị</p>
                            <p className="text-white font-medium">
                              {formatCurrency(selectedSupplier.totalValue || 0)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {supplierOrderHistory.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-700">
                          <p className="text-xs text-slate-400 mb-2">5 đơn gần nhất:</p>
                          <div className="flex flex-wrap gap-2">
                            {supplierOrderHistory.map((po: any) => (
                              <div
                                key={po.id}
                                className="px-2 py-1 bg-slate-700/50 rounded text-xs"
                              >
                                <span className="text-sky-400">{po.orderNumber}</span>
                                <span className="text-slate-400 ml-2">
                                  {formatCurrency(po.totalValue)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Product Search & Add */}
                <div className="space-y-2">
                  <Label>Tìm và thêm sản phẩm</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Tìm sản phẩm theo tên, SKU..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-10 bg-slate-800 border-slate-700"
                    />
                    {filteredProducts.length > 0 && (
                      <Card className="absolute top-full mt-1 w-full z-10 bg-slate-800 border-slate-700 max-h-64 overflow-y-auto">
                        <CardContent className="p-2">
                          {filteredProducts.map((p: any) => (
                            <div
                              key={p.id}
                              className="p-2 hover:bg-slate-700 rounded cursor-pointer"
                              onClick={() => handleAddItem(p)}
                            >
                              <p className="text-white font-medium">{p.name}</p>
                              <p className="text-slate-400 text-xs">
                                {p.sku} • {formatCurrency(p.costPrice)}
                              </p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>

                {/* Items List */}
                {form.items.length > 0 ? (
                  <div className="space-y-3">
                    <Label>Danh sách sản phẩm</Label>
                    {form.items.map((item) => (
                      <Card key={item.id} className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                            <div className="md:col-span-4">
                              <p className="text-white font-medium">{item.productName}</p>
                              <p className="text-slate-400 text-sm font-mono">{item.productSku}</p>
                            </div>
                            <div className="md:col-span-2">
                              <Label className="text-xs text-slate-400">Số lượng</Label>
                              <Input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => handleItemChange(item.id, "quantity", parseInt(e.target.value) || 0)}
                                className="bg-slate-800 border-slate-700 h-9"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <Label className="text-xs text-slate-400">Đơn giá</Label>
                              <Input
                                type="number"
                                min={0}
                                value={item.unitPrice}
                                onChange={(e) => handleItemChange(item.id, "unitPrice", parseInt(e.target.value) || 0)}
                                className="bg-slate-800 border-slate-700 h-9"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <Label className="text-xs text-slate-400">Thành tiền</Label>
                              <p className="text-emerald-400 font-bold text-lg h-9 flex items-center">
                                {formatCurrency(item.totalPrice)}
                              </p>
                            </div>
                            <div className="md:col-span-1 flex justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-slate-400 hover:text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Chưa có sản phẩm nào. Tìm và thêm sản phẩm ở trên.</p>
                  </div>
                )}

                {/* Dates & Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Ngày đặt hàng</Label>
                    <Input
                      type="date"
                      value={form.orderDate}
                      onChange={(e) => setForm((prev) => ({ ...prev, orderDate: e.target.value }))}
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ngày giao hàng yêu cầu</Label>
                    <Input
                      type="date"
                      value={form.expectedDeliveryDate}
                      onChange={(e) => setForm((prev) => ({ ...prev, expectedDeliveryDate: e.target.value }))}
                      className="bg-slate-800 border-slate-700"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Ghi chú điều khoản</Label>
                  <Textarea
                    placeholder="Nhập ghi chú, điều khoản thanh toán, vận chuyển..."
                    value={form.notes}
                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                    className="bg-slate-800 border-slate-700 min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Ghi chú nội bộ</Label>
                  <Textarea
                    placeholder="Ghi chú nội bộ (không hiển thị với NCC)..."
                    value={form.internalNotes}
                    onChange={(e) => setForm((prev) => ({ ...prev, internalNotes: e.target.value }))}
                    className="bg-slate-800 border-slate-700 min-h-[60px]"
                  />
                </div>

                {/* Approval Level & Totals */}
                <Card className={`${approvalLevel.bg} border ${approvalLevel.color.replace("text-", "border-")}/30`}>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm opacity-70">Tạm tính</p>
                        <p className="text-lg font-bold text-white">{formatCurrency(subtotal)}</p>
                      </div>
                      <div>
                        <p className="text-sm opacity-70">Thuế (10%)</p>
                        <p className="text-lg font-bold text-amber-400">{formatCurrency(taxAmount)}</p>
                      </div>
                      <div>
                        <p className="text-sm opacity-70">Tổng giá trị</p>
                        <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalValue)}</p>
                      </div>
                      <div>
                        <p className="text-sm opacity-70">Cần phê duyệt</p>
                        <p className={`text-lg font-bold ${approvalLevel.color}`}>
                          {approvalLevel.level}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <Button
                    variant="outline"
                    onClick={() => setForm({
                      supplierId: "",
                      orderDate: new Date().toISOString().split("T")[0],
                      expectedDeliveryDate: "",
                      items: [],
                      notes: "",
                      internalNotes: "",
                    })}
                    className="border-slate-700 text-slate-300"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Hủy
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={form.items.length === 0}
                    className="border-slate-700 text-slate-300"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Lưu Draft
                  </Button>
                  <Button
                    onClick={handleSendApproval}
                    disabled={form.items.length === 0 || !form.supplierId}
                    className="bg-sky-500 hover:bg-sky-600"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Gửi Phê duyệt
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Auto Suggestions */}
          <TabsContent value="suggestions" className="mt-6 space-y-6">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Đề xuất tự động</CardTitle>
                <p className="text-slate-400 text-sm">
                  Danh sách hàng đang ở mức tồn kho thấp hoặc bằng điểm đặt hàng lại
                </p>
              </CardHeader>
              <CardContent>
                {lowStockItems.length > 0 ? (
                  <>
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-slate-400">
                        <span className="text-white font-medium">{lowStockItems.length}</span> mặt hàng cần đặt
                      </p>
                      {selectedSuggestionItems.length > 0 && (
                        <p className="text-emerald-400">
                          Đã chọn {selectedSuggestionItems.length} mặt hàng • Tổng: {formatCurrency(totalSuggestedValue)}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      {lowStockItems.map((item: any) => {
                        const isSelected = suggestionItems[item.productId];
                        return (
                          <Card
                            key={item.productId}
                            className={`bg-slate-800/50 border-slate-700 cursor-pointer transition-colors ${
                              isSelected ? "border-sky-500 bg-sky-500/5" : ""
                            }`}
                            onClick={() => toggleSuggestionItem(item.productId)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-4">
                                <div className="mt-1">
                                  {isSelected ? (
                                    <CheckSquare className="w-5 h-5 text-sky-400" />
                                  ) : (
                                    <Square className="w-5 h-5 text-slate-500" />
                                  )}
                                </div>

                                <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                                  <div>
                                    <p className="text-white font-medium">{item.productName}</p>
                                    <p className="text-slate-400 text-sm font-mono">{item.productSku}</p>
                                  </div>

                                  <div>
                                    <p className="text-xs text-slate-400">Tồn kho hiện tại</p>
                                    <p className="text-amber-400 font-bold">{item.currentStock}</p>
                                    <p className="text-xs text-slate-500">Min: {item.reorderPoint}</p>
                                  </div>

                                  <div>
                                    <p className="text-xs text-slate-400">Gợi ý đặt (EOQ)</p>
                                    <p className="text-sky-400 font-bold">{item.suggestedQty}</p>
                                    <p className="text-xs text-slate-500">{item.unit}</p>
                                  </div>

                                  <div>
                                    <p className="text-xs text-slate-400">Đơn giá</p>
                                    <p className="text-white">{formatCurrency(item.unitPrice)}</p>
                                  </div>

                                  <div>
                                    <p className="text-xs text-slate-400">Giá trị ước tính</p>
                                    <p className="text-emerald-400 font-bold">{formatCurrency(item.estimatedValue)}</p>
                                    {item.supplier && (
                                      <p className="text-xs text-slate-500 mt-1">
                                        NCC: {item.supplier.name}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {isSelected && (
                                <div className="mt-4 ml-9 p-3 bg-slate-700/50 rounded-lg">
                                  <p className="text-sm text-slate-400 mb-2">NCC được gợi ý:</p>
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1">
                                      {Array.from({ length: 5 }).map((_, i) => (
                                        <Star
                                          key={i}
                                          className={`w-3 h-3 ${
                                            i < (RATING_STARS[((item.supplier?.rating as number) || 0)]?.stars || 0)
                                              ? "text-yellow-400 fill-yellow-400"
                                              : "text-slate-600"
                                          }`}
                                        />
                                      ))}
                                    </div>
                                    <span className="text-white font-medium">{item.supplier?.name}</span>
                                    <span className="text-slate-400 text-sm">
                                      • Lead time: {item.supplier?.leadTimeDays || 7} ngày
                                    </span>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setSuggestionItems({})}
                        className="border-slate-700 text-slate-300"
                      >
                        Bỏ chọn tất cả
                      </Button>
                      <Button
                        onClick={handleCreateBatchPO}
                        disabled={selectedSuggestionItems.length === 0}
                        className="bg-emerald-500 hover:bg-emerald-600"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Tạo PO hàng loạt ({selectedSuggestionItems.length})
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Tất cả hàng hóa đều có tồn kho đạt mức an toàn</p>
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
          {selectedPO && (
            <>
              <SheetHeader>
                <SheetTitle className="text-white">{selectedPO.orderNumber}</SheetTitle>
                <SheetDescription className="text-slate-400">
                  Chi tiết đơn đặt hàng
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handlePrintPO(selectedPO)}
                    className="flex-1 bg-sky-500 hover:bg-sky-600"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    In PO PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const data = transformPOForExport(selectedPO);
                      exportPurchaseOrders([data]);
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
                      <Badge
                        className={`${STATUS_STYLES[selectedPO.status as PurchaseOrderStatus]?.bg} ${STATUS_STYLES[selectedPO.status as PurchaseOrderStatus]?.color} border-0`}
                      >
                        {STATUS_STYLES[selectedPO.status as PurchaseOrderStatus]?.label}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Ngày tạo:</span>
                      <span className="text-white">{formatDate(selectedPO.orderDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">NCC:</span>
                      <span className="text-white">{selectedPO.supplierName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Ngày giao dự kiến:</span>
                      <span className="text-white">
                        {selectedPO.expectedDeliveryDate ? formatDate(selectedPO.expectedDeliveryDate) : "-"}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-700">
                      <span className="text-white font-medium">Tổng giá trị:</span>
                      <span className="text-emerald-400 font-bold">{formatCurrency(selectedPO.totalValue)}</span>
                    </div>
                  </CardContent>
                </Card>

                {selectedPO.notes && (
                  <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <p className="text-sm text-slate-400">Ghi chú:</p>
                    <p className="text-slate-200 mt-1">{selectedPO.notes}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-white font-medium mb-3">Danh sách sản phẩm ({selectedPO.items?.length || 0})</h3>
                  <div className="space-y-3">
                    {selectedPO.items?.map((item: any, index: number) => (
                      <Card key={index} className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-white font-medium">{item.productName}</p>
                              <p className="text-slate-400 text-sm font-mono">{item.productSku}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-emerald-400 font-medium">{formatCurrency(item.totalPrice)}</p>
                              <p className="text-slate-400 text-sm">
                                {item.quantity} × {formatCurrency(item.unitPrice)}
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
    </AppShell>
    </ErrorBoundary>
  );
}
