"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { AppShell, ErrorBoundary } from "@/components/shared";
import BarcodeScanner from "@/components/shared/BarcodeScanner";
import BarcodeGenerator from "@/components/shared/BarcodeGenerator";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  FileSpreadsheet,
  Printer,
  MapPin,
  Clock,
  AlertTriangle,
  Edit,
  ArrowRightLeft,
  ShoppingCart,
  History,
  TrendingUp,
  TrendingDown,
  Check,
  X,
  AlertCircle,
  Calendar,
  ScanLine,
  QrCode,
  ScanBarcode,
  ChevronDown,
} from "lucide-react";
import {
  useWarehouseStore,
  useInventoryItems,
  useProducts,
  useWarehouses,
  useGoodsReceipts,
  useGoodsIssues,
  useAuditLogs,
  useAuditLogActions,
  useInventoryActions,
  useGoodsReceiptActions,
  useGoodsIssueActions,
  useWarehouseActions,
} from "@/lib/store";
import { ProductCategory, AuditAction, GoodsIssueReason } from "@/lib/types";
import { InventoryItem, Product, Warehouse } from "@/lib/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  exportInventoryReport,
  InventoryExportItem,
} from "@/lib/exportExcel";
import { toast } from "sonner";
import { printBarcodeLabels, LabelPrintData } from "@/lib/printTemplates";

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  [ProductCategory.ELECTRONICS]: "Điện tử",
  [ProductCategory.FURNITURE]: "Nội thất",
  [ProductCategory.OFFICE_SUPPLIES]: "Văn phòng phẩm",
  [ProductCategory.TOOLS]: "Dụng cụ",
  [ProductCategory.PACKAGING]: "Đóng gói",
  [ProductCategory.RAW_MATERIALS]: "Nguyên vật liệu",
  [ProductCategory.OTHER]: "Khác",
};

type StockStatus = "available" | "low_stock" | "out_of_stock" | "expiring";

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

function formatDate(date: Date | string): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getDaysUntilExpiry(expiryDate: Date | string | undefined): number {
  if (!expiryDate) return Infinity;
  const today = new Date();
  const expiry = new Date(expiryDate);
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getStockStatus(
  quantity: number,
  reorderPoint: number,
  expiryDate?: Date | string
): StockStatus {
  if (quantity === 0) return "out_of_stock";
  
  const daysUntilExpiry = getDaysUntilExpiry(expiryDate);
  if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0) return "expiring";
  
  if (quantity <= reorderPoint) return "low_stock";
  
  return "available";
}

function getStatusStyles(status: StockStatus): { color: string; bg: string; label: string } {
  switch (status) {
    case "out_of_stock":
      return { color: "text-red-400", bg: "bg-red-500/10", label: "Hết hàng" };
    case "low_stock":
      return { color: "text-amber-400", bg: "bg-amber-500/10", label: "Sắp hết" };
    case "expiring":
      return { color: "text-orange-400", bg: "bg-orange-500/10", label: "Sắp hết hạn" };
    case "available":
    default:
      return { color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Còn hàng" };
  }
}

interface AdjustmentForm {
  newQuantity: number;
  reason: string;
  notes: string;
}

interface TransferForm {
  targetWarehouseId: string;
  quantity: number;
  notes: string;
}

export default function InventoryPage() {
  const inventoryItemsRaw = useInventoryItems();
  const inventoryItems = Array.isArray(inventoryItemsRaw) ? inventoryItemsRaw : [];
  const productsRaw = useProducts();
  const products = Array.isArray(productsRaw) ? productsRaw : [];
  const warehousesRaw = useWarehouses();
  const warehouses = Array.isArray(warehousesRaw) ? warehousesRaw : [];
  const receipts = useGoodsReceipts();
  const issues = useGoodsIssues();
  const auditLogs = useAuditLogs();
  const { addAuditLog } = useAuditLogActions();
  const { adjustInventoryQuantity, fetchInventory } = useInventoryActions();
  const { fetchWarehouses } = useWarehouseActions();
  const { addGoodsIssue } = useGoodsIssueActions();
  const { addGoodsReceipt } = useGoodsReceiptActions();

  const [searchTerm, setSearchTerm] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const router = useRouter();
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Fetch inventory and warehouses on mount
  useEffect(() => {
    fetchInventory();
    fetchWarehouses();
  }, [fetchInventory, fetchWarehouses]);

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [generatorProduct, setGeneratorProduct] = useState<any>(null);
  const [adjustmentForm, setAdjustmentForm] = useState<AdjustmentForm>({
    newQuantity: 0,
    reason: "",
    notes: "",
  });
  const [transferForm, setTransferForm] = useState<TransferForm>({
    targetWarehouseId: "",
    quantity: 0,
    notes: "",
  });
  const [isTransferring, setIsTransferring] = useState(false);

  const tableRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

  const enrichedItems = useMemo(() => {
    return inventoryItems.map((item: any) => {
      // Use product/warehouse from API response (already included)
      const product = item.product || products.find((p: any) => p.id === item.productId);
      const warehouse = item.warehouse || warehouses.find((w: any) => w.id === item.warehouseId);
      const status = getStockStatus(
        item.quantityAvailable,
        product?.reorderPoint || 0,
        item.expiryDate
      );
      const value = (product?.costPrice || 0) * item.quantityAvailable;
      
      // Build location string from individual fields
      const locationStr = item.locationZone || item.locationRack || item.locationShelf
        ? `${item.locationZone || ""}-${item.locationAisle || ""}-${item.locationRack || ""}-${item.locationShelf || ""}`
        : "-";
      
      return {
        ...item,
        product,
        warehouse,
        status,
        value,
        locationStr,
      };
    });
  }, [inventoryItems, products, warehouses]);

  const filteredItems = useMemo(() => {
    let filtered = enrichedItems;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item: any) =>
          item.product?.name.toLowerCase().includes(search) ||
          item.product?.sku.toLowerCase().includes(search) ||
          item.product?.barcode?.toLowerCase().includes(search)
      );
    }

    if (warehouseFilter !== "all") {
      filtered = filtered.filter((item: any) => item.warehouseId === warehouseFilter);
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((item: any) => item.product?.category === categoryFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((item: any) => item.status === statusFilter);
    }

    filtered.sort((a: any, b: any) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = (a.product?.name || "").localeCompare(b.product?.name || "");
          break;
        case "quantity":
          comparison = a.quantityAvailable - b.quantityAvailable;
          break;
        case "value":
          comparison = a.value - b.value;
          break;
        case "expiry":
          const aExpiry = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
          const bExpiry = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
          comparison = aExpiry - bExpiry;
          break;
        default:
          comparison = 0;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [enrichedItems, searchTerm, warehouseFilter, categoryFilter, statusFilter, sortBy, sortOrder]);

  const handleSort = useCallback((column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  }, [sortBy, sortOrder]);

  const handleRowClick = useCallback((item: any) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  }, []);

  // Barcode Scanner handlers
  const handleOpenScanner = useCallback(() => {
    setIsScannerOpen(true);
  }, []);

  const handleCloseScanner = useCallback(() => {
    setIsScannerOpen(false);
  }, []);

  const handleBarcodeScan = useCallback(
    (barcode: string) => {
      // Find item by barcode
      const matchedItem = filteredItems.find(
        (item: any) =>
          item.product?.barcode === barcode ||
          item.product?.sku === barcode ||
          item.product?.id === barcode
      );

      if (matchedItem) {
        // Found - open detail sheet and highlight row
        setSelectedItem(matchedItem);
        setIsDetailOpen(true);

        // Scroll to the row
        setTimeout(() => {
          const row = itemRefs.current.get(matchedItem.id);
          if (row) {
            row.scrollIntoView({ behavior: "smooth", block: "center" });
            row.classList.add("ring-2", "ring-sky-500");
            setTimeout(() => {
              row.classList.remove("ring-2", "ring-sky-500");
            }, 2000);
          }
        }, 100);
      } else {
        // Not found - show search
        setSearchTerm(barcode);
      }

      handleCloseScanner();
    },
    [filteredItems, handleCloseScanner]
  );

  const handleOpenGenerator = useCallback((item?: any) => {
    setGeneratorProduct(item);
    setIsGeneratorOpen(true);
  }, []);

  const handleExportExcel = useCallback(() => {
    const exportData: InventoryExportItem[] = enrichedItems.map((item: any) => ({
      id: item.id,
      sku: item.product?.sku || "",
      name: item.product?.name || "",
      category: item.product?.category || "",
      warehouse: item.warehouse?.name || "",
      warehouseId: item.warehouseId,
      location: item.locationStr,
      lotNumber: item.lotNumber,
      expiryDate: item.expiryDate,
      quantityTotal: item.quantityTotal,
      quantityAvailable: item.quantityAvailable,
      quantityReserved: item.quantityReserved,
      quantityQuarantine: item.quantityQuarantine,
      quantityDamaged: item.quantityDamaged,
      costPrice: item.product?.costPrice || 0,
      sellingPrice: item.product?.sellingPrice,
      reorderPoint: item.product?.reorderPoint,
      value: item.value,
    }));

    exportInventoryReport(exportData, "ton_kho");
  }, [enrichedItems]);

  const handleExportLabels = useCallback(() => {
    const labels: LabelPrintData[] = enrichedItems.map((item: any) => ({
      sku: item.product?.sku || "",
      name: item.product?.name || "",
      barcode: item.product?.barcode || item.product?.sku || "",
      lotNumber: item.lotNumber,
      expiryDate: item.expiryDate,
      warehouse: item.warehouse?.name,
    }));

    printBarcodeLabels(labels);
  }, [enrichedItems]);

  const selectedItemHistory = useMemo(() => {
    if (!selectedItem) return [];
    
    const history: any[] = [];
    
    receipts.forEach((r: any) => {
      r.items.forEach((item: any) => {
        if (item.productId === selectedItem.productId) {
          history.push({
            id: r.id,
            type: "receipt",
            date: new Date(r.receiptDate),
            quantity: item.quantity,
            balance: item.quantity,
            reference: r.receiptNumber,
            notes: item.notes || "",
          });
        }
      });
    });

    issues.forEach((gi: any) => {
      gi.items.forEach((item: any) => {
        if (item.productId === selectedItem.productId) {
          history.push({
            id: gi.id,
            type: "issue",
            date: new Date(gi.issueDate),
            quantity: -item.quantity,
            balance: item.quantity,
            reference: gi.issueNumber,
            notes: item.notes || "",
          });
        }
      });
    });

    return history.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 30);
  }, [selectedItem, receipts, issues]);

  const selectedItemLocations = useMemo(() => {
    if (!selectedItem) return [];
    return enrichedItems.filter((item: any) => item.productId === selectedItem.productId);
  }, [selectedItem, enrichedItems]);

  const stockMovementData = useMemo(() => {
    if (!selectedItem) return [];
    
    const dailyData: Record<string, { date: string; receipts: number; issues: number }> = {};
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      dailyData[dateStr] = { date: dateStr, receipts: 0, issues: 0 };
    }

    receipts.forEach((r: any) => {
      const dateStr = new Date(r.receiptDate).toISOString().split("T")[0];
      if (dailyData[dateStr]) {
        r.items.forEach((item: any) => {
          if (item.productId === selectedItem.productId) {
            dailyData[dateStr].receipts += item.quantity;
          }
        });
      }
    });

    issues.forEach((gi: any) => {
      const dateStr = new Date(gi.issueDate).toISOString().split("T")[0];
      if (dailyData[dateStr]) {
        gi.items.forEach((item: any) => {
          if (item.productId === selectedItem.productId) {
            dailyData[dateStr].issues += item.quantity;
          }
        });
      }
    });

    let runningBalance = selectedItem.quantityAvailable;
    return Object.values(dailyData).reverse().map((day) => {
      runningBalance = runningBalance - (day.receipts || 0) + (day.issues || 0);
      return {
        date: new Date(day.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
        nhap: day.receipts,
        xuat: day.issues,
        ton: runningBalance,
      };
    });
  }, [selectedItem, receipts, issues]);

  const handleAdjustment = useCallback(() => {
    if (!selectedItem || !adjustmentForm.reason) return;

    const diff = adjustmentForm.newQuantity - selectedItem.quantityAvailable;
    const percentage = Math.abs(diff) / selectedItem.quantityAvailable * 100;
    const needsApproval = percentage > 5;

    adjustInventoryQuantity(
      selectedItem.productId,
      selectedItem.warehouseId,
      Math.abs(diff),
      diff > 0 ? "add" : "subtract"
    );

    addAuditLog({
      action: AuditAction.ADJUST,
      entity: "InventoryItem",
      entityId: selectedItem.id,
      entityName: `${selectedItem.product?.sku} - ${selectedItem.product?.name}`,
      userId: "user-001",
      userName: "Nguyễn Văn Minh",
      newValue: {
        oldQuantity: selectedItem.quantityAvailable,
        newQuantity: adjustmentForm.newQuantity,
        difference: diff,
        reason: adjustmentForm.reason,
        notes: adjustmentForm.notes,
        needsApproval,
      },
      reason: adjustmentForm.reason,
      notes: adjustmentForm.notes,
    });

    setIsAdjustmentOpen(false);
    setAdjustmentForm({ newQuantity: 0, reason: "", notes: "" });
    setSelectedItem(null);
    setIsDetailOpen(false);
  }, [selectedItem, adjustmentForm, adjustInventoryQuantity, addAuditLog]);

  // Get warehouses list for transfer (excluding current warehouse, only active)
  const targetWarehouses = useMemo(() => {
    if (!selectedItem) return [];
    console.log('[Transfer] all warehouses:', warehouses.length);
    console.log('[Transfer] selectedItem.warehouseId:', selectedItem?.warehouseId);
    const filtered = warehouses.filter(
      (w: any) => w.id !== selectedItem.warehouseId && w.isActive !== false
    );
    console.log('[Transfer] targetWarehouses:', filtered.length);
    return filtered;
  }, [warehouses, selectedItem]);

  // Handle open transfer dialog
  const handleOpenTransfer = useCallback(() => {
    if (!selectedItem) return;
    setTransferForm({
      targetWarehouseId: "",
      quantity: selectedItem.quantityAvailable,
      notes: "",
    });
    setIsTransferOpen(true);
  }, [selectedItem]);

  // Handle transfer submit
  const handleTransfer = useCallback(async () => {
    if (!selectedItem || !transferForm.targetWarehouseId || transferForm.quantity <= 0) {
      toast.error("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    if (transferForm.quantity > selectedItem.quantityAvailable) {
      toast.error("Số lượng chuyển không được lớn hơn số lượng hiện có");
      return;
    }

    setIsTransferring(true);
    try {
      const sourceWarehouse = warehouses.find((w: any) => w.id === selectedItem.warehouseId);
      const destWarehouse = warehouses.find((w: any) => w.id === transferForm.targetWarehouseId);
      const product = selectedItem.product;

      // 1. Tạo GoodsIssue cho kho nguồn (xuất)
      const issueNumber = `XK-${Date.now().toString().slice(-6)}`;
      const issueItems = [{
        id: `gi-tf-${Date.now()}`,
        productId: selectedItem.productId,
        productSku: product?.sku || "",
        productName: product?.name || "",
        unit: product?.unit || "piece",
        quantity: transferForm.quantity,
        unitPrice: product?.costPrice || 0,
        totalPrice: (product?.costPrice || 0) * transferForm.quantity,
        warehouseId: selectedItem.warehouseId,
      }];

      const newIssue = {
        id: `gi-${Date.now()}`,
        issueNumber,
        reason: GoodsIssueReason.TRANSFER,
        customerName: `Chuyển đến: ${destWarehouse?.name}`,
        items: issueItems,
        subtotal: (product?.costPrice || 0) * transferForm.quantity,
        totalValue: (product?.costPrice || 0) * transferForm.quantity,
        status: "completed",
        issueDate: new Date(),
        issuedBy: "user-001",
        issuedByName: "Nguyễn Văn Minh",
        warehouseId: selectedItem.warehouseId,
        warehouse: sourceWarehouse,
        notes: transferForm.notes ? `Chuyển kho: ${transferForm.notes}` : "Chuyển kho",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 2. Tạo GoodsReceipt cho kho đích (nhập)
      const receiptNumber = `GRN-${Date.now().toString().slice(-6)}`;
      const receiptItems = [{
        id: `gr-tf-${Date.now()}`,
        productId: selectedItem.productId,
        productSku: product?.sku || "",
        productName: product?.name || "",
        unit: product?.unit || "piece",
        quantity: transferForm.quantity,
        receivedQuantity: transferForm.quantity,
        acceptedQuantity: transferForm.quantity,
        rejectedQuantity: 0,
        unitPrice: product?.costPrice || 0,
        totalPrice: (product?.costPrice || 0) * transferForm.quantity,
        warehouseId: transferForm.targetWarehouseId,
        notes: "",
      }];

      const newReceipt = {
        id: `gr-${Date.now()}`,
        receiptNumber,
        referenceType: "transfer" as const,
        referenceId: newIssue.id,
        supplierId: undefined,
        supplierName: `Từ kho: ${sourceWarehouse?.name}`,
        items: receiptItems,
        subtotal: (product?.costPrice || 0) * transferForm.quantity,
        taxAmount: 0,
        totalValue: (product?.costPrice || 0) * transferForm.quantity,
        status: "completed",
        receiptDate: new Date(),
        receivedBy: "user-001",
        receivedByName: "Nguyễn Văn Minh",
        warehouseId: transferForm.targetWarehouseId,
        warehouse: destWarehouse,
        notes: transferForm.notes ? `Chuyển kho: ${transferForm.notes}` : "Chuyển kho",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Thêm vào store
      addGoodsIssue(newIssue);
      addGoodsReceipt(newReceipt);

      // Cập nhật tồn kho
      adjustInventoryQuantity(
        selectedItem.productId,
        selectedItem.warehouseId,
        transferForm.quantity,
        "subtract"
      );
      adjustInventoryQuantity(
        selectedItem.productId,
        transferForm.targetWarehouseId,
        transferForm.quantity,
        "add"
      );

      // Ghi log
      addAuditLog({
        action: AuditAction.CREATE,
        entity: "Transfer",
        entityId: `transfer-${Date.now()}`,
        entityName: `${sourceWarehouse?.name} → ${destWarehouse?.name}`,
        userId: "user-001",
        userName: "Nguyễn Văn Minh",
        newValue: {
          productId: selectedItem.productId,
          productName: product?.name,
          quantity: transferForm.quantity,
          sourceWarehouseId: selectedItem.warehouseId,
          sourceWarehouseName: sourceWarehouse?.name,
          targetWarehouseId: transferForm.targetWarehouseId,
          targetWarehouseName: destWarehouse?.name,
        },
        reason: `Chuyển kho ${transferForm.quantity} ${product?.unit} từ ${sourceWarehouse?.name} sang ${destWarehouse?.name}`,
      });

      toast.success(`Đã chuyển ${transferForm.quantity} ${product?.unit} từ ${sourceWarehouse?.name} sang ${destWarehouse?.name}`);
      setIsTransferOpen(false);
      setIsDetailOpen(false);
      setSelectedItem(null);
    } catch (error) {
      console.error("Transfer error:", error);
      toast.error("Chuyển kho thất bại");
    } finally {
      setIsTransferring(false);
    }
  }, [selectedItem, transferForm, warehouses, addGoodsIssue, addGoodsReceipt, adjustInventoryQuantity, addAuditLog]);

  // Handle create PO - navigate to purchase-order page with prefilled data
  const handleCreatePO = useCallback(() => {
    if (!selectedItem) return;
    const product = selectedItem.product;
    const params = new URLSearchParams({
      productId: selectedItem.productId,
      productName: product?.name || "",
      sku: product?.sku || "",
    });
    router.push(`/purchase-order?${params.toString()}`);
  }, [selectedItem, router]);

  const currentDiff = selectedItem 
    ? adjustmentForm.newQuantity - selectedItem.quantityAvailable 
    : 0;
  const diffPercentage = selectedItem && selectedItem.quantityAvailable > 0
    ? Math.abs(currentDiff) / selectedItem.quantityAvailable * 100
    : 0;
  const needsApproval = diffPercentage > 5;

  return (
    <ErrorBoundary moduleName="Tồn kho">
      <AppShell>
        <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Quản lý tồn kho</h1>
            <p className="text-slate-400 mt-1">
              Quản lý danh sách sản phẩm trong kho
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleOpenScanner}
              variant="outline"
              className="border-emerald-700 text-emerald-400 hover:bg-emerald-500/10"
            >
              <ScanLine className="w-4 h-4 mr-2" />
              Scan barcode
            </Button>
            
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
                    onClick={handleExportExcel}
                    className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Xuất Excel
                  </button>
                  <button
                    onClick={handleExportLabels}
                    className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    In nhãn barcode
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Tìm kiếm theo tên, SKU, barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700 text-slate-200"
                />
              </div>

              <div className="flex gap-3 flex-wrap">
                <Select value={warehouseFilter} onValueChange={(value) => setWarehouseFilter(value || "all")}>
                  <SelectTrigger className="w-40 bg-slate-800 border-slate-700">
                    <SelectValue placeholder="Kho" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all">Tất cả kho</SelectItem>
                    {warehouses.map((w: any) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value || "all")}>
                  <SelectTrigger className="w-40 bg-slate-800 border-slate-700">
                    <SelectValue placeholder="Danh mục" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all">Tất cả danh mục</SelectItem>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value || "all")}>
                  <SelectTrigger className="w-40 bg-slate-800 border-slate-700">
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    <SelectItem value="available">Còn hàng</SelectItem>
                    <SelectItem value="low_stock">Sắp hết</SelectItem>
                    <SelectItem value="out_of_stock">Hết hàng</SelectItem>
                    <SelectItem value="expiring">Sắp hết hạn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400 cursor-pointer" onClick={() => handleSort("name")}>
                      <div className="flex items-center gap-1">
                        Tên hàng
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </TableHead>
                    <TableHead className="text-slate-400">Kho</TableHead>
                    <TableHead className="text-slate-400">Vị trí</TableHead>
                    <TableHead className="text-right text-slate-400 cursor-pointer" onClick={() => handleSort("quantity")}>
                      <div className="flex items-center justify-end gap-1">
                        Available
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right text-slate-400">Reserved</TableHead>
                    <TableHead className="text-right text-slate-400">Quarantine</TableHead>
                    <TableHead className="text-right text-slate-400">On-order</TableHead>
                    <TableHead className="text-slate-400 cursor-pointer" onClick={() => handleSort("expiry")}>
                      <div className="flex items-center gap-1">
                        Hạn SD
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right text-slate-400 cursor-pointer" onClick={() => handleSort("value")}>
                      <div className="flex items-center justify-end gap-1">
                        Giá trị
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </TableHead>
                    <TableHead className="text-center text-slate-400">Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item: any) => {
                    const styles = getStatusStyles(item.status);
                    return (
                      <TableRow
                        key={item.id}
                        ref={(el) => {
                          if (el) itemRefs.current.set(item.id, el);
                          else itemRefs.current.delete(item.id);
                        }}
                        className="border-slate-800/50 hover:bg-slate-800/30 cursor-pointer transition-all duration-300"
                        onClick={() => handleRowClick(item)}
                      >
                        <TableCell className="font-medium">
                          <div>
                            <p className="text-white font-mono text-sm">{item.product?.sku}</p>
                            <p className="text-slate-300 text-sm">{item.product?.name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">
                          {item.warehouse?.name}
                        </TableCell>
                        <TableCell className="text-slate-400 font-mono text-sm">
                          {item.locationStr}
                        </TableCell>
                        <TableCell className="text-right font-medium text-white">
                          {formatNumber(item.quantityAvailable)}
                        </TableCell>
                        <TableCell className="text-right text-amber-400">
                          {item.quantityReserved > 0 ? formatNumber(item.quantityReserved) : "-"}
                        </TableCell>
                        <TableCell className="text-right text-orange-400">
                          {item.quantityQuarantine > 0 ? formatNumber(item.quantityQuarantine) : "-"}
                        </TableCell>
                        <TableCell className="text-right text-sky-400">
                          {item.product?.onOrder || 0}
                        </TableCell>
                        <TableCell className={`text-sm ${getDaysUntilExpiry(item.expiryDate) <= 30 ? "text-orange-400" : "text-slate-400"}`}>
                          {item.expiryDate ? (
                            <div className="flex items-center gap-1 justify-end">
                              <Calendar className="w-3 h-3" />
                              {formatDate(item.expiryDate)}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right text-emerald-400 font-medium">
                          {formatCurrency(item.value)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`${styles.bg} ${styles.color} border-0`}>
                            {styles.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="p-4 border-t border-slate-800 text-sm text-slate-400">
              Hiển thị {filteredItems.length} / {enrichedItems.length} mặt hàng
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="bg-slate-900 border-slate-800 w-full sm:max-w-xl overflow-y-auto">
          {selectedItem && (
            <>
              <SheetHeader>
                <SheetTitle className="text-white">
                  {selectedItem.product?.name}
                </SheetTitle>
                <SheetDescription className="text-slate-400">
                  SKU: {selectedItem.product?.sku} • {selectedItem.warehouse?.name}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-4">
                      <p className="text-slate-400 text-sm">Available</p>
                      <p className="text-2xl font-bold text-white mt-1">
                        {formatNumber(selectedItem.quantityAvailable)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-4">
                      <p className="text-slate-400 text-sm">Giá trị</p>
                      <p className="text-2xl font-bold text-emerald-400 mt-1">
                        {formatCurrency(selectedItem.value)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Tabs defaultValue="history" className="w-full">
                  <TabsList className="bg-slate-800 border-slate-700">
                    <TabsTrigger value="history">Lịch sử</TabsTrigger>
                    <TabsTrigger value="chart">Biến động</TabsTrigger>
                    <TabsTrigger value="locations">Vị trí</TabsTrigger>
                  </TabsList>

                  <TabsContent value="history" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      {selectedItemHistory.length === 0 ? (
                        <p className="text-slate-500 text-sm text-center py-8">
                          Chưa có giao dịch nào
                        </p>
                      ) : (
                        selectedItemHistory.map((log: any, index: number) => (
                          <div
                            key={`${log.id}-${index}`}
                            className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50"
                          >
                            <div
                              className={`p-2 rounded-lg ${
                                log.type === "receipt"
                                  ? "bg-emerald-500/10"
                                  : "bg-red-500/10"
                              }`}
                            >
                              {log.type === "receipt" ? (
                                <TrendingUp className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-400" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-white font-medium">
                                  {log.type === "receipt" ? "Nhập kho" : "Xuất kho"}{" "}
                                  <span className="text-sky-400">{log.reference}</span>
                                </p>
                                <p
                                  className={`font-bold ${
                                    log.quantity > 0 ? "text-emerald-400" : "text-red-400"
                                  }`}
                                >
                                  {log.quantity > 0 ? "+" : ""}
                                  {log.quantity}
                                </p>
                              </div>
                              <p className="text-slate-400 text-sm mt-1">
                                {formatDate(log.date)}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="chart" className="mt-4">
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardContent className="p-4">
                        <p className="text-slate-400 text-sm mb-4">Biến động tồn kho 30 ngày</p>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={stockMovementData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                            <YAxis stroke="#94a3b8" fontSize={10} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#1e293b",
                                border: "1px solid #334155",
                                borderRadius: "8px",
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="ton"
                              stroke="#0ea5e9"
                              strokeWidth={2}
                              dot={false}
                              name="Tồn kho"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="locations" className="mt-4">
                    <div className="space-y-3">
                      {selectedItemLocations.map((loc: any) => (
                        <Card
                          key={loc.id}
                          className={`bg-slate-800/50 border-slate-700 ${
                            loc.id === selectedItem.id ? "border-sky-500" : ""
                          }`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-white font-medium">{loc.warehouse?.name}</p>
                                <p className="text-slate-400 text-sm font-mono mt-1">
                                  {loc.locationStr}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-bold text-white">
                                  {formatNumber(loc.quantityAvailable)}
                                </p>
                                <p className="text-slate-400 text-sm">
                                  / {formatNumber(loc.quantityTotal)}
                                </p>
                              </div>
                            </div>
                            {loc.lotNumber && (
                              <p className="text-slate-500 text-sm mt-2">
                                Lot: {loc.lotNumber}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button
                    variant="outline"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                    onClick={() => {
                      setAdjustmentForm({
                        newQuantity: selectedItem.quantityAvailable,
                        reason: "",
                        notes: "",
                      });
                      setIsAdjustmentOpen(true);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Điều chỉnh
                  </Button>
                  <Button
                    variant="outline"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                    onClick={() => handleOpenGenerator(selectedItem)}
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    In barcode
                  </Button>
                  <Button
                    variant="outline"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                    onClick={handleOpenTransfer}
                  >
                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                    Chuyển kho
                  </Button>
                  <Button
                    variant="outline"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                    onClick={handleCreatePO}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Tạo PO
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Adjustment Dialog */}
      <Dialog open={isAdjustmentOpen} onOpenChange={setIsAdjustmentOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Điều chỉnh tồn kho</DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedItem?.product?.name} - {selectedItem?.warehouse?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tồn kho hiện tại</Label>
                <div className="p-3 bg-slate-800 rounded-lg text-center text-xl font-bold">
                  {selectedItem?.quantityAvailable || 0}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tồn kho mới</Label>
                <Input
                  type="number"
                  min={0}
                  value={adjustmentForm.newQuantity}
                  onChange={(e) =>
                    setAdjustmentForm({
                      ...adjustmentForm,
                      newQuantity: parseInt(e.target.value) || 0,
                    })
                  }
                  className="bg-slate-800 border-slate-700 text-xl font-bold text-center"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-800 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Chênh lệch:</span>
                <span
                  className={`text-xl font-bold ${
                    currentDiff > 0
                      ? "text-emerald-400"
                      : currentDiff < 0
                      ? "text-red-400"
                      : "text-slate-400"
                  }`}
                >
                  {currentDiff > 0 ? "+" : ""}
                  {currentDiff} ({diffPercentage.toFixed(1)}%)
                </span>
              </div>
            </div>

            {needsApproval && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-400 font-medium">Cần phê duyệt quản lý</p>
                  <p className="text-amber-400/70 text-sm mt-1">
                    Chênh lệch vượt quá 5% cần được phê duyệt trước khi áp dụng
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Lý do điều chỉnh *</Label>
              <Select
                value={adjustmentForm.reason}
                onValueChange={(value) =>
                  setAdjustmentForm({ ...adjustmentForm, reason: value || "" })
                }
              >
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue placeholder="Chọn lý do" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="stocktake">Kiểm kê phát hiện</SelectItem>
                  <SelectItem value="damage">Hàng hư hỏng</SelectItem>
                  <SelectItem value="expiry">Hàng hết hạn</SelectItem>
                  <SelectItem value="lost">Hàng bị mất</SelectItem>
                  <SelectItem value="return">Nhập lại hàng</SelectItem>
                  <SelectItem value="correction">Điều chỉnh sai</SelectItem>
                  <SelectItem value="other">Lý do khác</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ghi chú</Label>
              <Input
                placeholder="Nhập ghi chú bổ sung..."
                value={adjustmentForm.notes}
                onChange={(e) =>
                  setAdjustmentForm({ ...adjustmentForm, notes: e.target.value })
                }
                className="bg-slate-800 border-slate-700"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAdjustmentOpen(false)}
              className="border-slate-700 text-slate-300"
            >
              Hủy
            </Button>
            <Button
              onClick={handleAdjustment}
              disabled={!adjustmentForm.reason}
              className="bg-sky-500 hover:bg-sky-600"
            >
              <Check className="w-4 h-4 mr-2" />
              Lưu điều chỉnh
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>Chuyển kho</DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedItem?.product?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Source Warehouse */}
            <div className="space-y-2">
              <Label>Kho nguồn</Label>
              <div className="p-3 bg-slate-800 rounded-lg">
                <p className="text-white font-medium">
                  {selectedItem?.warehouse?.name || "Kho hiện tại"}
                </p>
              </div>
            </div>

            {/* Target Warehouse */}
            <div className="space-y-2">
              <Label>Kho đích *</Label>
              <Select
                value={transferForm.targetWarehouseId}
                onValueChange={(value) =>
                  setTransferForm({ ...transferForm, targetWarehouseId: value || "" })
                }
              >
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue placeholder="Chọn kho đích" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {targetWarehouses.map((w: any) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {targetWarehouses.length === 0 && (
                <p className="text-slate-500 text-sm">Không có kho nào khác để chuyển</p>
              )}
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label>Số lượng chuyển *</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  max={selectedItem?.quantityAvailable || 0}
                  value={transferForm.quantity}
                  onChange={(e) =>
                    setTransferForm({
                      ...transferForm,
                      quantity: parseInt(e.target.value) || 0,
                    })
                  }
                  className="bg-slate-800 border-slate-700"
                />
                <span className="text-slate-400">
                  / {selectedItem?.quantityAvailable || 0} có sẵn
                </span>
              </div>
              {transferForm.quantity > (selectedItem?.quantityAvailable || 0) && (
                <p className="text-red-400 text-sm">Số lượng không được lớn hơn số lượng hiện có</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Ghi chú</Label>
              <Input
                placeholder="VD: Chuyển để cân bằng tồn kho..."
                value={transferForm.notes}
                onChange={(e) =>
                  setTransferForm({ ...transferForm, notes: e.target.value })
                }
                className="bg-slate-800 border-slate-700"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTransferOpen(false)}
              className="border-slate-700 text-slate-300"
            >
              Hủy
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={
                isTransferring ||
                !transferForm.targetWarehouseId ||
                transferForm.quantity <= 0 ||
                transferForm.quantity > (selectedItem?.quantityAvailable || 0)
              }
              className="bg-sky-500 hover:bg-sky-600"
            >
              {isTransferring ? "Đang chuyển..." : "Chuyển kho"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner */}
      <BarcodeScanner
        isOpen={isScannerOpen}
        onClose={handleCloseScanner}
        onScan={handleBarcodeScan}
        title="Scan tìm sản phẩm"
        description="Quét barcode để tìm và xem thông tin sản phẩm trong kho"
      />

      {/* Barcode Generator */}
      <BarcodeGenerator
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        productId={generatorProduct?.product?.id}
        productSku={generatorProduct?.product?.sku}
        productName={generatorProduct?.product?.name}
        barcode={generatorProduct?.product?.barcode}
      />
    </AppShell>
    </ErrorBoundary>
  );
}
