"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PackagePlus,
  Search,
  Filter,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Check,
  MapPin,
  FileText,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  Warehouse,
  ShoppingCart,
  ScanLine,
  QrCode,
  Printer,
  Download,
  FileSpreadsheet,
  ChevronDown,
} from "lucide-react";
import {
  useWarehouseStore,
  useGoodsReceipts,
  useGoodsReceiptActions,
  usePurchaseOrders,
  usePurchaseOrderActions,
  useSuppliers,
  useWarehouses,
  useProducts,
  useInventoryItems,
  useInventoryActions,
  useAuditLogActions,
} from "@/lib/store";
import { GoodsReceiptStatus, PurchaseOrderStatus, AuditAction, Product, ProductCategory, UnitOfMeasure } from "@/lib/types";
import {
  exportGoodsReceipt,
  exportGoodsReceipts,
  GoodsReceiptExport,
} from "@/lib/exportExcel";
import { printGoodsReceipt } from "@/lib/printTemplates";

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

function formatDateTime(date: Date | string): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_STYLES: Record<GoodsReceiptStatus, { color: string; bg: string; label: string }> = {
  [GoodsReceiptStatus.DRAFT]: {
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    label: "Nháp",
  },
  [GoodsReceiptStatus.PENDING]: {
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    label: "Chờ duyệt",
  },
  [GoodsReceiptStatus.CONFIRMED]: {
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    label: "Đã xác nhận",
  },
  [GoodsReceiptStatus.COMPLETED]: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    label: "Hoàn thành",
  },
  [GoodsReceiptStatus.CANCELLED]: {
    color: "text-red-400",
    bg: "bg-red-500/10",
    label: "Đã hủy",
  },
};

interface GRNItemForm {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  unit: string;
  quantity: number;
  receivedQuantity: number;
  unitPrice: number;
  lotNumber: string;
  expiryDate: string;
  quarantineQuantity: number;
  suggestedLocation: string;
}

interface NewGRNForm {
  sourceType: "po" | "direct";
  purchaseOrderId: string;
  supplierId: string;
  warehouseId: string;
  receiptDate: string;
  receivedBy: string;
  notes: string;
  items: GRNItemForm[];
}

const STEPS = [
  { id: 1, title: "Nguồn nhập" },
  { id: 2, title: "Thông tin" },
  { id: 3, title: "Danh sách hàng" },
  { id: 4, title: "Vị trí lưu" },
  { id: 5, title: "Xác nhận" },
];

export default function GoodsReceiptPage() {
  const receipts = useGoodsReceipts();
  const purchaseOrders = usePurchaseOrders();
  const suppliers = useSuppliers();
  const warehouses = useWarehouses();
  const products = useProducts();
  const inventoryItems = useInventoryItems();
  const { addGoodsReceipt, completeGoodsReceipt, fetchGoodsReceipts } = useGoodsReceiptActions();
  const { addInventoryItem, checkLowStockAlerts } = useInventoryActions();
  const { addAuditLog } = useAuditLogActions();

  const [activeTab, setActiveTab] = useState<string>("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Fetch data on mount
  useEffect(() => {
    fetchGoodsReceipts();
  }, [fetchGoodsReceipts]);

  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTargetItemId, setScannerTargetItemId] = useState<string | null>(null);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [unknownBarcodeDialog, setUnknownBarcodeDialog] = useState<{
    open: boolean;
    barcode: string;
    suggestedProduct?: any;
  }>({ open: false, barcode: "" });
  const [newProductDialog, setNewProductDialog] = useState(false);

  const [form, setForm] = useState<NewGRNForm>({
    sourceType: "direct",
    purchaseOrderId: "",
    supplierId: "",
    warehouseId: "",
    receiptDate: new Date().toISOString().split("T")[0],
    receivedBy: "Nguyễn Văn Minh",
    notes: "",
    items: [],
  });

  const approvedPOs = useMemo(() => {
    return purchaseOrders.filter(
      (po: any) =>
        po.status === PurchaseOrderStatus.APPROVED ||
        po.status === PurchaseOrderStatus.SENT ||
        po.status === PurchaseOrderStatus.CONFIRMED ||
        po.status === PurchaseOrderStatus.PARTIALLY_RECEIVED
    );
  }, [purchaseOrders]);

  const selectedPO = useMemo(() => {
    if (!form.purchaseOrderId) return null;
    return purchaseOrders.find((po: any) => po.id === form.purchaseOrderId);
  }, [form.purchaseOrderId, purchaseOrders]);

  const filteredReceipts = useMemo(() => {
    let filtered = [...receipts];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r: any) =>
          r.receiptNumber?.toLowerCase().includes(search) ||
          r.grnNumber?.toLowerCase().includes(search) ||
          r.supplierName?.toLowerCase().includes(search)
      );
    }

    if (supplierFilter !== "all") {
      filtered = filtered.filter((r: any) => r.supplierId === supplierFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((r: any) => r.status === statusFilter);
    }

    if (dateFrom) {
      filtered = filtered.filter((r: any) => new Date(r.receiptDate) >= new Date(dateFrom));
    }

    if (dateTo) {
      filtered = filtered.filter((r: any) => new Date(r.receiptDate) <= new Date(dateTo));
    }

    return filtered.sort(
      (a: any, b: any) =>
        new Date(b.receiptDate).getTime() - new Date(a.receiptDate).getTime()
    );
  }, [receipts, searchTerm, supplierFilter, statusFilter, dateFrom, dateTo]);

  const handleSelectPO = useCallback((poId: string) => {
    if (!poId) return;
    const po = purchaseOrders.find((p: any) => p.id === poId);
    if (!po) return;

    const poItems: GRNItemForm[] = po.items.map((item: any, index: number) => {
      const product = products.find((p: any) => p.id === item.productId);
      return {
        id: `new-item-${Date.now()}-${index}`,
        productId: item.productId,
        productSku: item.productSku || product?.sku || "",
        productName: item.productName || product?.name || "",
        unit: item.unit || product?.unit || "unit",
        quantity: item.orderedQuantity || item.quantity || 0,
        receivedQuantity: item.orderedQuantity || item.quantity || 0,
        unitPrice: item.unitPrice || product?.costPrice || 0,
        lotNumber: "",
        expiryDate: "",
        quarantineQuantity: 0,
        suggestedLocation: "",
      };
    });

    setForm((prev) => ({
      ...prev,
      purchaseOrderId: poId,
      sourceType: "po",
      supplierId: po.supplierId || "",
      warehouseId: "",
      items: poItems,
    }));
  }, [purchaseOrders, products]);

  const handleAddItem = useCallback(() => {
    const newItem: GRNItemForm = {
      id: `new-item-${Date.now()}`,
      productId: "",
      productSku: "",
      productName: "",
      unit: "unit",
      quantity: 0,
      receivedQuantity: 0,
      unitPrice: 0,
      lotNumber: "",
      expiryDate: "",
      quarantineQuantity: 0,
      suggestedLocation: "",
    };
    setForm((prev) => ({ ...prev, items: [...prev.items, newItem] }));
  }, []);

  const handleRemoveItem = useCallback((itemId: string) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.id !== itemId),
    }));
  }, []);

  const handleItemChange = useCallback(
    (itemId: string, field: keyof GRNItemForm, value: any) => {
      setForm((prev) => ({
        ...prev,
        items: prev.items.map((item) => {
          if (item.id !== itemId) return item;
          const updated = { ...item, [field]: value };

          if (field === "productId") {
            const product = products.find((p: any) => p.id === value);
            if (product) {
              updated.productSku = product.sku;
              updated.productName = product.name;
              updated.unit = product.unit;
              updated.unitPrice = product.costPrice;
            }
          }

          return updated;
        }),
      }));
    },
    [products]
  );

  // Barcode Scanner handlers
  const handleOpenScanner = useCallback((itemId?: string) => {
    setScannerTargetItemId(itemId || null);
    setIsScannerOpen(true);
  }, []);

  const handleCloseScanner = useCallback(() => {
    setIsScannerOpen(false);
    setScannerTargetItemId(null);
  }, []);

  const handleBarcodeScan = useCallback(
    (barcode: string, format: string) => {
      console.log(`Scanned: ${barcode} (${format})`);

      // Search for product by barcode
      const matchedProduct = products.find(
        (p: any) =>
          p.barcode === barcode ||
          p.sku === barcode ||
          p.id === barcode
      );

      if (matchedProduct) {
        // Product found - fill in the form
        if (scannerTargetItemId) {
          // Update specific item
          handleItemChange(scannerTargetItemId, "productId", matchedProduct.id);
        } else {
          // Add new item with scanned product
          const newItem: GRNItemForm = {
            id: `new-item-${Date.now()}`,
            productId: matchedProduct.id,
            productSku: matchedProduct.sku,
            productName: matchedProduct.name,
            unit: matchedProduct.unit,
            quantity: 0,
            receivedQuantity: 1,
            unitPrice: matchedProduct.costPrice,
            lotNumber: "",
            expiryDate: "",
            quarantineQuantity: 0,
            suggestedLocation: "",
          };
          setForm((prev) => ({ ...prev, items: [...prev.items, newItem] }));
        }
      } else {
        // Product not found - show dialog to create new
        setUnknownBarcodeDialog({
          open: true,
          barcode,
        });
      }

      handleCloseScanner();
    },
    [products, scannerTargetItemId, handleItemChange, handleCloseScanner]
  );

  const handleScannerError = useCallback((error: string) => {
    console.error("Scanner error:", error);
  }, []);

  const handleCreateNewProduct = useCallback(() => {
    if (!unknownBarcodeDialog.barcode) return;

    const newProductId = `prod-${Date.now()}`;
    const newProduct = {
      id: newProductId,
      sku: `NEW-${unknownBarcodeDialog.barcode.slice(0, 8).toUpperCase()}`,
      barcode: unknownBarcodeDialog.barcode,
      name: `Sản phẩm mới (${unknownBarcodeDialog.barcode})`,
      unit: UnitOfMeasure.PIECE,
      costPrice: 0,
      category: ProductCategory.ELECTRONICS,
      isActive: true,
      reorderPoint: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "user-001",
    } as Product;

    // Add to store
    const { addProduct } = useWarehouseStore.getState();
    addProduct(newProduct);

    // If we have a target item, update it
    if (scannerTargetItemId) {
      handleItemChange(scannerTargetItemId, "productId", newProductId);
    } else {
      // Add as new item
      const newItem: GRNItemForm = {
        id: `new-item-${Date.now()}`,
        productId: newProductId,
        productSku: newProduct.sku,
        productName: newProduct.name,
        unit: newProduct.unit,
        quantity: 0,
        receivedQuantity: 1,
        unitPrice: 0,
        lotNumber: "",
        expiryDate: "",
        quarantineQuantity: 0,
        suggestedLocation: "",
      };
      setForm((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    }

    setUnknownBarcodeDialog({ open: false, barcode: "" });
    setNewProductDialog(false);
  }, [unknownBarcodeDialog.barcode, scannerTargetItemId, handleItemChange]);

  const suggestedLocations = useMemo(() => {
    if (!form.warehouseId) return {};
    const suggestions: Record<string, string> = {};
    const warehouseInventory = inventoryItems.filter(
      (i: any) => i.warehouseId === form.warehouseId
    );

    form.items.forEach((item) => {
      if (!item.productId) return;

      const existingLocations = warehouseInventory.filter(
        (i: any) => i.productId === item.productId
      );

      if (existingLocations.length > 0) {
        const existing = existingLocations[0];
        const locStr = existing.location
          ? `${existing.location.zone || ""}-${existing.location.aisle || ""}-${existing.location.rack || ""}-${existing.location.shelf || ""}`
          : "A-01-01-01";
        suggestions[item.id] = locStr;
      } else {
        suggestions[item.id] = "A-01-01-01";
      }
    });

    return suggestions;
  }, [form.warehouseId, form.items, inventoryItems]);

  const subtotal = useMemo(() => {
    return form.items.reduce((sum, item) => {
      const qty = item.receivedQuantity - item.quarantineQuantity;
      return sum + qty * item.unitPrice;
    }, 0);
  }, [form.items]);

  const taxAmount = subtotal * 0.1;
  const totalValue = subtotal + taxAmount;

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 1:
        return form.sourceType === "direct" || form.purchaseOrderId !== "";
      case 2:
        return form.supplierId !== "" && form.warehouseId !== "" && form.receiptDate !== "";
      case 3:
        return form.items.length > 0 && form.items.every((i) => i.productId && i.receivedQuantity > 0);
      case 4:
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  }, [currentStep, form]);

  const handleNext = () => {
    if (currentStep < 5 && canProceed()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = useCallback(() => {
    setIsSubmitting(true);

    const receiptNumber = `GRN-${Date.now().toString().slice(-6)}`;
    const warehouse = warehouses.find((w: any) => w.id === form.warehouseId);
    const supplier = suppliers.find((s: any) => s.id === form.supplierId);

    const receiptItems = form.items.map((item, index) => {
      const product = products.find((p: any) => p.id === item.productId);
      const acceptedQty = item.receivedQuantity - item.quarantineQuantity;
      return {
        id: `gr-item-${Date.now()}-${index}`,
        productId: item.productId,
        productSku: item.productSku,
        productName: item.productName,
        unit: item.unit as UnitOfMeasure,
        quantity: item.quantity,
        receivedQuantity: item.receivedQuantity,
        acceptedQuantity: acceptedQty,
        rejectedQuantity: item.quarantineQuantity,
        quarantineQuantity: item.quarantineQuantity,
        unitPrice: item.unitPrice,
        totalPrice: acceptedQty * item.unitPrice,
        lotNumber: item.lotNumber,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
        warehouseId: form.warehouseId,
        location: {
          zone: suggestedLocations[item.id]?.split("-")[0] || "A",
          aisle: suggestedLocations[item.id]?.split("-")[1] || "01",
          rack: suggestedLocations[item.id]?.split("-")[2] || "01",
          shelf: suggestedLocations[item.id]?.split("-")[3] || "01",
        },
        notes: "",
      };
    });

    const newReceipt = {
      id: `gr-${Date.now()}`,
      receiptNumber,
      grnNumber: receiptNumber,
      referenceType: form.sourceType === "po" ? "po" as const : undefined,
      referenceId: form.sourceType === "po" ? form.purchaseOrderId : undefined,
      referenceNumber: form.sourceType === "po" ? selectedPO?.orderNumber : undefined,
      supplierId: form.supplierId,
      supplierName: supplier?.name,
      items: receiptItems,
      subtotal,
      taxAmount,
      totalValue,
      status: GoodsReceiptStatus.COMPLETED,
      receiptDate: new Date(form.receiptDate),
      receivedBy: "user-001",
      receivedByName: form.receivedBy,
      warehouseId: form.warehouseId,
      warehouse,
      notes: form.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addGoodsReceipt(newReceipt);

    receiptItems.forEach((item) => {
      const existingItem = inventoryItems.find(
        (i: any) => i.productId === item.productId && i.warehouseId === item.warehouseId
      );

      if (existingItem) {
        const updatedQuantity = existingItem.quantityAvailable + item.acceptedQuantity;
        useWarehouseStore.getState().updateInventoryItem(existingItem.id, {
          quantityAvailable: updatedQuantity,
          quantityTotal: updatedQuantity,
          lastReceiptDate: new Date(),
          updatedAt: new Date(),
        });
      } else {
        addInventoryItem({
          id: `inv-${Date.now()}-${item.productId}`,
          productId: item.productId,
          warehouseId: item.warehouseId,
          location: item.location,
          quantityTotal: item.acceptedQuantity,
          quantityAvailable: item.acceptedQuantity,
          quantityReserved: 0,
          quantityQuarantine: item.quarantineQuantity,
          quantityDamaged: 0,
          lastReceiptDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    });

    addAuditLog({
      action: AuditAction.CREATE,
      entity: "GoodsReceipt",
      entityId: newReceipt.id,
      entityName: receiptNumber,
      userId: "user-001",
      userName: form.receivedBy,
      newValue: { totalValue, itemCount: form.items.length },
      reason: form.sourceType === "po" ? `Nhập từ PO ${selectedPO?.orderNumber}` : "Nhập trực tiếp",
    });

    checkLowStockAlerts();

    setIsSubmitting(false);
    setCurrentStep(1);
    setForm({
      sourceType: "direct",
      purchaseOrderId: "",
      supplierId: "",
      warehouseId: "",
      receiptDate: new Date().toISOString().split("T")[0],
      receivedBy: "Nguyễn Văn Minh",
      notes: "",
      items: [],
    });
    setActiveTab("list");
  }, [
    form,
    subtotal,
    taxAmount,
    totalValue,
    selectedPO,
    suggestedLocations,
    warehouses,
    suppliers,
    products,
    inventoryItems,
    addGoodsReceipt,
    addInventoryItem,
    addAuditLog,
    checkLowStockAlerts,
  ]);

  const handleViewDetail = (receipt: any) => {
    setSelectedReceipt(receipt);
    setIsDetailOpen(true);
  };

  const handleNewReceipt = () => {
    setActiveTab("create");
    setCurrentStep(1);
    setForm({
      sourceType: "direct",
      purchaseOrderId: "",
      supplierId: "",
      warehouseId: "",
      receiptDate: new Date().toISOString().split("T")[0],
      receivedBy: "Nguyễn Văn Minh",
      notes: "",
      items: [],
    });
  };

  const transformReceiptForExport = (receipt: any): GoodsReceiptExport => ({
    receiptNumber: receipt.receiptNumber || receipt.grnNumber,
    receiptDate: receipt.receiptDate,
    supplierName: receipt.supplierName,
    warehouseName: receipt.warehouse?.name || "",
    receivedBy: receipt.receivedByName || receipt.receivedBy,
    status: receipt.status,
    items: (receipt.items || []).map((item: any, idx: number) => ({
      stt: idx + 1,
      productSku: item.productSku || "",
      productName: item.productName || "",
      unit: item.unit || "piece",
      orderedQuantity: item.quantity,
      receivedQuantity: item.receivedQuantity || item.quantity,
      acceptedQuantity: item.acceptedQuantity || item.quantity,
      quarantineQuantity: item.quarantineQuantity || 0,
      unitPrice: item.unitPrice || 0,
      totalPrice: item.totalPrice || (item.quantity * item.unitPrice),
      lotNumber: item.lotNumber,
      expiryDate: item.expiryDate,
      location: item.location
        ? `${item.location.zone || ""}-${item.location.aisle || ""}-${item.location.rack || ""}-${item.location.shelf || ""}`
        : "",
    })),
    subtotal: receipt.subtotal || 0,
    taxAmount: receipt.taxAmount || 0,
    totalValue: receipt.totalValue || 0,
    notes: receipt.notes,
  });

  const handleExportGRNExcel = useCallback(() => {
    const exportData = receipts.map(transformReceiptForExport);
    exportGoodsReceipts(exportData);
  }, [receipts]);

  const handlePrintGRN = useCallback((receipt: any) => {
    const data = transformReceiptForExport(receipt);
    printGoodsReceipt(data);
  }, []);

  return (
    <ErrorBoundary moduleName="Nhập kho">
      <AppShell>
        <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Nhập kho</h1>
            <p className="text-slate-400 mt-1">Quản lý phiếu nhập kho (GRN)</p>
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
                    onClick={handleExportGRNExcel}
                    className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Xuất Excel
                  </button>
                  {selectedReceipt && (
                    <button
                      onClick={() => handlePrintGRN(selectedReceipt)}
                      className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2"
                    >
                      <Printer className="w-4 h-4" />
                      In phiếu PDF
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="list">Danh sách GRN</TabsTrigger>
            <TabsTrigger value="create">Tạo phiếu nhập mới</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-6 space-y-4">
            {/* Filters */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Tìm kiếm số GRN, mã PO..."
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
                      <SelectTrigger className="w-36 bg-slate-800 border-slate-700">
                        <SelectValue placeholder="Trạng thái" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="all">Tất cả</SelectItem>
                        <SelectItem value={GoodsReceiptStatus.DRAFT}>Nháp</SelectItem>
                        <SelectItem value={GoodsReceiptStatus.PENDING}>Chờ duyệt</SelectItem>
                        <SelectItem value={GoodsReceiptStatus.CONFIRMED}>Đã xác nhận</SelectItem>
                        <SelectItem value={GoodsReceiptStatus.COMPLETED}>Hoàn thành</SelectItem>
                        <SelectItem value={GoodsReceiptStatus.CANCELLED}>Đã hủy</SelectItem>
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

            {/* Table */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400">Số GRN</TableHead>
                      <TableHead className="text-slate-400">Ngày nhận</TableHead>
                      <TableHead className="text-slate-400">Nhà cung cấp</TableHead>
                      <TableHead className="text-right text-slate-400">Số items</TableHead>
                      <TableHead className="text-right text-slate-400">Giá trị</TableHead>
                      <TableHead className="text-center text-slate-400">Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReceipts.map((receipt: any) => {
                      const styles = STATUS_STYLES[receipt.status as GoodsReceiptStatus] || STATUS_STYLES[GoodsReceiptStatus.DRAFT];
                      return (
                        <TableRow
                          key={receipt.id}
                          className="border-slate-800/50 hover:bg-slate-800/30 cursor-pointer"
                          onClick={() => handleViewDetail(receipt)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-sky-400" />
                              <span className="text-sky-400 font-mono">{receipt.receiptNumber || receipt.grnNumber}</span>
                            </div>
                            {receipt.referenceNumber && (
                              <p className="text-xs text-slate-500 mt-1">PO: {receipt.referenceNumber}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-400">
                            {formatDate(receipt.receiptDate)}
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {receipt.supplierName || "-"}
                          </TableCell>
                          <TableCell className="text-right text-white">
                            {receipt.items?.length || 0}
                          </TableCell>
                          <TableCell className="text-right text-emerald-400 font-medium">
                            {formatCurrency(receipt.totalValue)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={`${styles.bg} ${styles.color} border-0`}>
                              {styles.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredReceipts.length === 0 && (
                      <TableRow className="border-slate-800/50">
                        <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                          Không có phiếu nhập nào
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <div className="p-4 border-t border-slate-800 text-sm text-slate-400">
                  Hiển thị {filteredReceipts.length} phiếu nhập
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create" className="mt-6">
            {/* Stepper */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {STEPS.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                        currentStep >= step.id
                          ? "bg-sky-500 border-sky-500 text-white"
                          : "border-slate-600 text-slate-400"
                      }`}
                    >
                      {currentStep > step.id ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <span className="text-sm font-bold">{step.id}</span>
                      )}
                    </div>
                    <span
                      className={`ml-3 text-sm font-medium hidden sm:block ${
                        currentStep >= step.id ? "text-white" : "text-slate-500"
                      }`}
                    >
                      {step.title}
                    </span>
                    {index < STEPS.length - 1 && (
                      <div
                        className={`w-12 sm:w-24 h-0.5 mx-4 ${
                          currentStep > step.id ? "bg-sky-500" : "bg-slate-700"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step Content */}
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                {/* Step 1: Source Selection */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-2">Chọn nguồn nhập kho</h2>
                      <p className="text-slate-400">Chọn loại nguồn nhập cho phiếu nhập kho</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div
                        className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                          form.sourceType === "po"
                            ? "border-sky-500 bg-sky-500/10"
                            : "border-slate-700 hover:border-slate-600"
                        }`}
                        onClick={() => setForm((prev) => ({ ...prev, sourceType: "po" }))}
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className="p-3 rounded-lg bg-sky-500/20">
                            <ShoppingCart className="w-6 h-6 text-sky-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white">Nhập từ PO</h3>
                            <p className="text-sm text-slate-400">Chọn từ đơn đặt hàng đã duyệt</p>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                          form.sourceType === "direct"
                            ? "border-sky-500 bg-sky-500/10"
                            : "border-slate-700 hover:border-slate-600"
                        }`}
                        onClick={() => setForm((prev) => ({ ...prev, sourceType: "direct", purchaseOrderId: "", items: [] }))}
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className="p-3 rounded-lg bg-emerald-500/20">
                            <PackagePlus className="w-6 h-6 text-emerald-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white">Nhập trực tiếp</h3>
                            <p className="text-sm text-slate-400">Nhập hàng không qua đơn đặt hàng</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {form.sourceType === "po" && (
                      <div className="space-y-2">
                        <Label>Chọn Purchase Order *</Label>
                        <Select
                          value={form.purchaseOrderId}
                          onValueChange={(v) => handleSelectPO(v || "")}
                        >
                          <SelectTrigger className="bg-slate-800 border-slate-700">
                            <SelectValue placeholder="-- Chọn PO --" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {approvedPOs.map((po: any) => (
                              <SelectItem key={po.id} value={po.id}>
                                {po.orderNumber} - {po.supplierName} - {formatCurrency(po.totalValue)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: Receipt Info */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-2">Thông tin nhập kho</h2>
                      <p className="text-slate-400">Nhập thông tin chi tiết cho phiếu nhập kho</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Nhà cung cấp *</Label>
                        <Select
                          value={form.supplierId}
                          onValueChange={(v) => setForm((prev) => ({ ...prev, supplierId: v || "" }))}
                        >
                          <SelectTrigger className="bg-slate-800 border-slate-700">
                            <SelectValue placeholder="Chọn nhà cung cấp" />
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

                      <div className="space-y-2">
                        <Label>Kho nhận *</Label>
                        <Select
                          value={form.warehouseId}
                          onValueChange={(v) => setForm((prev) => ({ ...prev, warehouseId: v || "" }))}
                        >
                          <SelectTrigger className="bg-slate-800 border-slate-700">
                            <SelectValue placeholder="Chọn kho nhận" />
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
                        <Label>Ngày nhận *</Label>
                        <Input
                          type="date"
                          value={form.receiptDate}
                          onChange={(e) => setForm((prev) => ({ ...prev, receiptDate: e.target.value }))}
                          className="bg-slate-800 border-slate-700"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Người nhận</Label>
                        <Input
                          value={form.receivedBy}
                          onChange={(e) => setForm((prev) => ({ ...prev, receivedBy: e.target.value }))}
                          className="bg-slate-800 border-slate-700"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Ghi chú</Label>
                        <Input
                          placeholder="Nhập ghi chú (nếu có)"
                          value={form.notes}
                          onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                          className="bg-slate-800 border-slate-700"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Items List */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-white mb-2">Danh sách hàng nhập</h2>
                        <p className="text-slate-400">Thêm và cập nhật thông tin các mặt hàng</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleOpenScanner()}
                          variant="outline"
                          className="border-emerald-700 text-emerald-400 hover:bg-emerald-500/10"
                        >
                          <ScanLine className="w-4 h-4 mr-2" />
                          Scan hàng nhập
                        </Button>
                        <Button onClick={handleAddItem} variant="outline" className="border-slate-700 text-slate-300">
                          <Plus className="w-4 h-4 mr-2" />
                          Thêm dòng
                        </Button>
                      </div>
                    </div>

                    {form.items.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="bg-slate-800/50 rounded-xl p-8 border border-dashed border-slate-700">
                          <Package className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                          <p className="text-slate-400 mb-2">Chưa có mặt hàng nào</p>
                          <p className="text-slate-500 text-sm mb-4">Quét barcode hoặc thêm thủ công</p>
                          <div className="flex gap-2 justify-center">
                            <Button
                              onClick={() => handleOpenScanner()}
                              className="bg-emerald-500 hover:bg-emerald-600"
                            >
                              <ScanLine className="w-4 h-4 mr-2" />
                              Scan barcode
                            </Button>
                            <Button
                              onClick={handleAddItem}
                              variant="outline"
                              className="border-slate-700 text-slate-300"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Thêm dòng
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {form.items.map((item, index) => {
                          const poItem = selectedPO?.items.find((pi: any) => pi.productId === item.productId);
                          const qtyDiff = item.quantity - item.receivedQuantity;
                          const hasDiff = qtyDiff !== 0;

                          return (
                            <Card key={item.id} className="bg-slate-800/50 border-slate-700">
                              <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                  <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Sản phẩm</Label>
                                      <Select
                                        value={item.productId}
                                        onValueChange={(v) => handleItemChange(item.id, "productId", v)}
                                      >
                                        <SelectTrigger className="bg-slate-800 border-slate-700 h-9">
                                          <SelectValue placeholder="Chọn sản phẩm" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-700">
                                          {products.map((p: any) => (
                                            <SelectItem key={p.id} value={p.id}>
                                              {p.sku} - {p.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">SL thực nhận</Label>
                                      <Input
                                        type="number"
                                        min={0}
                                        value={item.receivedQuantity}
                                        onChange={(e) => handleItemChange(item.id, "receivedQuantity", parseInt(e.target.value) || 0)}
                                        className="bg-slate-800 border-slate-700 h-9"
                                      />
                                      {poItem && hasDiff && (
                                        <p className="text-xs text-amber-400">
                                          PO: {item.quantity} {qtyDiff < 0 ? `(-${Math.abs(qtyDiff)})` : `(+${qtyDiff})`}
                                        </p>
                                      )}
                                    </div>

                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Số lô</Label>
                                      <Input
                                        value={item.lotNumber}
                                        onChange={(e) => handleItemChange(item.id, "lotNumber", e.target.value)}
                                        placeholder="Nhập số lô"
                                        className="bg-slate-800 border-slate-700 h-9"
                                      />
                                    </div>

                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Hạn sử dụng</Label>
                                      <Input
                                        type="date"
                                        value={item.expiryDate}
                                        onChange={(e) => handleItemChange(item.id, "expiryDate", e.target.value)}
                                        className="bg-slate-800 border-slate-700 h-9"
                                      />
                                    </div>

                                    <div className="space-y-1">
                                      <Label className="text-xs text-slate-400">Đơn giá</Label>
                                      <Input
                                        type="number"
                                        min={0}
                                        value={item.unitPrice}
                                        onChange={(e) => handleItemChange(item.id, "unitPrice", parseInt(e.target.value) || 0)}
                                        className="bg-slate-800 border-slate-700 h-9"
                                      />
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <Select
                                      value={item.quarantineQuantity > 0 ? "quarantine" : "normal"}
                                      onValueChange={(v) =>
                                        handleItemChange(
                                          item.id,
                                          "quarantineQuantity",
                                          v === "quarantine" ? item.receivedQuantity : 0
                                        )
                                      }
                                    >
                                      <SelectTrigger className="w-32 bg-slate-800 border-slate-700 h-9">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="normal">Bình thường</SelectItem>
                                        <SelectItem value="quarantine">Cách ly</SelectItem>
                                      </SelectContent>
                                    </Select>

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

                                {hasDiff && (
                                  <div className="mt-3 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                                    <p className="text-sm text-amber-400">
                                      Số lượng thực nhận {qtyDiff < 0 ? "thấp hơn" : "cao hơn"} số lượng PO
                                    </p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4: Location Suggestions */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-2">Vị trí lưu trữ</h2>
                      <p className="text-slate-400">Gợi ý vị trí lưu trữ cho từng sản phẩm</p>
                    </div>

                    {form.items.length === 0 ? (
                      <div className="text-center py-12 text-slate-500">
                        <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Chưa có sản phẩm nào để gợi ý vị trí</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {form.items.map((item) => {
                          const suggestion = suggestedLocations[item.id] || "Chưa có gợi ý";
                          const existingLocation = inventoryItems.find(
                            (i: any) => i.productId === item.productId && i.warehouseId === form.warehouseId
                          );

                          return (
                            <Card key={item.id} className="bg-slate-800/50 border-slate-700">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-white font-medium">{item.productName}</p>
                                    <p className="text-slate-400 text-sm font-mono">{item.productSku}</p>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    {existingLocation && (
                                      <div className="text-right">
                                        <p className="text-xs text-slate-400">Vị trí hiện tại</p>
                                        <p className="text-amber-400 font-mono">
                                          {existingLocation.location
                                            ? `${existingLocation.location.zone || ""}-${existingLocation.location.aisle || ""}-${existingLocation.location.rack || ""}-${existingLocation.location.shelf || ""}`
                                            : "Chưa có"}
                                        </p>
                                      </div>
                                    )}
                                    <div className="text-right">
                                      <p className="text-xs text-slate-400">Gợi ý lưu</p>
                                      <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-sky-400" />
                                        <Input
                                          value={suggestion}
                                          onChange={(e) =>
                                            setForm((prev) => ({
                                              ...prev,
                                              items: prev.items.map((i) =>
                                                i.id === item.id ? { ...i, suggestedLocation: e.target.value } : i
                                              ),
                                            }))
                                          }
                                          className="w-40 bg-slate-800 border-slate-700 h-8 font-mono text-center"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 5: Confirmation */}
                {currentStep === 5 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-2">Xác nhận & Lưu</h2>
                      <p className="text-slate-400">Kiểm tra thông tin trước khi hoàn tất</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base text-white">Thông tin chung</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Nguồn:</span>
                            <span className="text-white">
                              {form.sourceType === "po" ? `PO: ${selectedPO?.orderNumber}` : "Nhập trực tiếp"}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Nhà cung cấp:</span>
                            <span className="text-white">
                              {suppliers.find((s: any) => s.id === form.supplierId)?.name || "-"}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Kho nhận:</span>
                            <span className="text-white">
                              {warehouses.find((w: any) => w.id === form.warehouseId)?.name || "-"}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Ngày nhận:</span>
                            <span className="text-white">{formatDate(form.receiptDate)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Người nhận:</span>
                            <span className="text-white">{form.receivedBy}</span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base text-white">Tóm tắt giá trị</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Số mặt hàng:</span>
                            <span className="text-white">{form.items.length}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Tổng số lượng:</span>
                            <span className="text-white">
                              {form.items.reduce((sum, i) => sum + i.receivedQuantity, 0)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Thuế (10%):</span>
                            <span className="text-amber-400">{formatCurrency(taxAmount)}</span>
                          </div>
                          <div className="flex justify-between text-sm pt-2 border-t border-slate-700">
                            <span className="text-white font-medium">Tổng giá trị:</span>
                            <span className="text-emerald-400 font-bold text-lg">{formatCurrency(totalValue)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base text-white">Danh sách hàng nhập</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-700">
                              <TableHead className="text-slate-400">Sản phẩm</TableHead>
                              <TableHead className="text-right text-slate-400">SL</TableHead>
                              <TableHead className="text-right text-slate-400">Đơn giá</TableHead>
                              <TableHead className="text-right text-slate-400">Thành tiền</TableHead>
                              <TableHead className="text-center text-slate-400">Trạng thái</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {form.items.map((item) => (
                              <TableRow key={item.id} className="border-slate-700/50">
                                <TableCell className="text-slate-300">
                                  {item.productName}
                                  <br />
                                  <span className="text-xs text-slate-500">{item.productSku}</span>
                                </TableCell>
                                <TableCell className="text-right text-white">{item.receivedQuantity}</TableCell>
                                <TableCell className="text-right text-slate-400">
                                  {formatCurrency(item.unitPrice)}
                                </TableCell>
                                <TableCell className="text-right text-emerald-400">
                                  {formatCurrency(item.receivedQuantity * item.unitPrice)}
                                </TableCell>
                                <TableCell className="text-center">
                                  {item.quarantineQuantity > 0 ? (
                                    <Badge className="bg-orange-500/10 text-orange-400 border-0">Cách ly</Badge>
                                  ) : (
                                    <Badge className="bg-emerald-500/10 text-emerald-400 border-0">Bình thường</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    {form.notes && (
                      <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                        <p className="text-sm text-slate-400">Ghi chú:</p>
                        <p className="text-slate-200 mt-1">{form.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8 pt-6 border-t border-slate-800">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 1}
                    className="border-slate-700 text-slate-300"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Quay lại
                  </Button>

                  {currentStep < 5 ? (
                    <Button
                      onClick={handleNext}
                      disabled={!canProceed()}
                      className="bg-sky-500 hover:bg-sky-600"
                    >
                      Tiếp tục
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="bg-emerald-500 hover:bg-emerald-600"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Xác nhận nhập kho
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="bg-slate-900 border-slate-800 w-full sm:max-w-xl overflow-y-auto">
          {selectedReceipt && (
            <>
              <SheetHeader>
                <SheetTitle className="text-white">
                  Chi tiết phiếu nhập
                </SheetTitle>
                <SheetDescription className="text-slate-400">
                  {selectedReceipt.receiptNumber || selectedReceipt.grnNumber}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handlePrintGRN(selectedReceipt)}
                    className="flex-1 bg-sky-500 hover:bg-sky-600"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    In phiếu PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const data = transformReceiptForExport(selectedReceipt);
                      exportGoodsReceipt(data);
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
                        className={`${STATUS_STYLES[selectedReceipt.status as GoodsReceiptStatus]?.bg} ${STATUS_STYLES[selectedReceipt.status as GoodsReceiptStatus]?.color} border-0`}
                      >
                        {STATUS_STYLES[selectedReceipt.status as GoodsReceiptStatus]?.label}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Ngày nhận:</span>
                      <span className="text-white">{formatDate(selectedReceipt.receiptDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Nhà cung cấp:</span>
                      <span className="text-white">{selectedReceipt.supplierName || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Kho nhận:</span>
                      <span className="text-white">{selectedReceipt.warehouse?.name || "-"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Người nhận:</span>
                      <span className="text-white">{selectedReceipt.receivedByName || "-"}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-700">
                      <span className="text-white font-medium">Tổng giá trị:</span>
                      <span className="text-emerald-400 font-bold">{formatCurrency(selectedReceipt.totalValue)}</span>
                    </div>
                  </CardContent>
                </Card>

                <div>
                  <h3 className="text-white font-medium mb-3">Danh sách hàng ({selectedReceipt.items?.length || 0})</h3>
                  <div className="space-y-3">
                    {selectedReceipt.items?.map((item: any, index: number) => (
                      <Card key={index} className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-white font-medium">{item.productName}</p>
                              <p className="text-slate-400 text-sm font-mono">{item.productSku}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-emerald-400 font-medium">
                                {formatCurrency(item.totalPrice)}
                              </p>
                              <p className="text-slate-400 text-sm">
                                {item.receivedQuantity} × {formatCurrency(item.unitPrice)}
                              </p>
                            </div>
                          </div>
                          {item.lotNumber && (
                            <p className="text-xs text-slate-500 mt-2">Lô: {item.lotNumber}</p>
                          )}
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

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        isOpen={isScannerOpen}
        onClose={handleCloseScanner}
        onScan={handleBarcodeScan}
        onError={handleScannerError}
        title="Scan hàng nhập"
        description="Quét barcode sản phẩm để tự động thêm vào danh sách"
      />

      {/* Unknown Barcode Dialog */}
      <Dialog
        open={unknownBarcodeDialog.open}
        onOpenChange={(open) => setUnknownBarcodeDialog({ ...unknownBarcodeDialog, open })}
      >
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Không tìm thấy sản phẩm
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Mã barcode <span className="font-mono text-white">{unknownBarcodeDialog.barcode}</span> chưa có trong hệ thống.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-300 mb-4">Bạn muốn:</p>
            <div className="space-y-2">
              <Button
                onClick={() => {
                  setNewProductDialog(true);
                  handleCreateNewProduct();
                }}
                className="w-full bg-emerald-500 hover:bg-emerald-600 justify-start"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tạo sản phẩm mới với barcode này
              </Button>
              <Button
                onClick={() => {
                  setUnknownBarcodeDialog({ open: false, barcode: "" });
                  handleOpenScanner();
                }}
                variant="outline"
                className="w-full border-slate-700 text-slate-300 justify-start"
              >
                <ScanLine className="w-4 h-4 mr-2" />
                Quét lại barcode khác
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
    </ErrorBoundary>
  );
}
