import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// ============================================
// TYPES
// ============================================

export interface InventoryExportItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  warehouse: string;
  warehouseId: string;
  location?: string;
  lotNumber?: string;
  expiryDate?: Date | string;
  quantityTotal: number;
  quantityAvailable: number;
  quantityReserved: number;
  quantityQuarantine: number;
  quantityDamaged: number;
  costPrice: number;
  sellingPrice?: number;
  reorderPoint?: number;
  value: number;
}

export interface GoodsReceiptExport {
  receiptNumber: string;
  receiptDate: Date | string;
  supplierName: string;
  warehouseName: string;
  receivedBy: string;
  status: string;
  items: GoodsReceiptItemExport[];
  subtotal: number;
  taxAmount: number;
  totalValue: number;
  notes?: string;
}

export interface GoodsReceiptItemExport {
  stt: number;
  productSku: string;
  productName: string;
  unit: string;
  orderedQuantity?: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  quarantineQuantity?: number;
  unitPrice: number;
  totalPrice: number;
  lotNumber?: string;
  expiryDate?: Date | string;
  location?: string;
}

export interface GoodsIssueExport {
  issueNumber: string;
  issueDate: Date | string;
  reason: string;
  customerName?: string;
  warehouseName: string;
  issuedBy: string;
  status: string;
  items: GoodsIssueItemExport[];
  subtotal: number;
  totalValue: number;
  notes?: string;
}

export interface GoodsIssueItemExport {
  stt: number;
  productSku: string;
  productName: string;
  serialNumbers?: string[];
  lotNumber?: string;
  expiryDate?: Date | string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  location?: string;
}

export interface PurchaseOrderExport {
  orderNumber: string;
  orderDate: Date | string;
  supplierName: string;
  status: string;
  expectedDeliveryDate?: Date | string;
  items: PurchaseOrderItemExport[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalValue: number;
  createdBy: string;
}

export interface PurchaseOrderItemExport {
  stt: number;
  productSku: string;
  productName: string;
  unit: string;
  quantity: number;
  orderedQuantity: number;
  receivedQuantity: number;
  pendingQuantity: number;
  unitPrice: number;
  totalPrice: number;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: Date | string | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("vi-VN").format(num);
}

function numberToWords(num: number): string {
  const units = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const tens = ["", "mười", "hai mươi", "ba mươi", "bốn mươi", "năm mươi", "sáu mươi", "bảy mươi", "tám mươi", "chín mươi"];
  
  if (num === 0) return "không đồng";
  
  if (num < 10) return units[num];
  
  if (num < 20) {
    return num === 10 ? "mười" : "mười " + units[num - 10];
  }
  
  if (num < 100) {
    const tensDigit = Math.floor(num / 10);
    const unitsDigit = num % 10;
    return tens[tensDigit] + (unitsDigit > 0 ? " " + units[unitsDigit] : "");
  }
  
  if (num < 1000) {
    const hundreds = Math.floor(num / 100);
    const remainder = num % 100;
    return units[hundreds] + " trăm" + (remainder > 0 ? " " + numberToWords(remainder) : "");
  }
  
  if (num < 1000000) {
    const thousands = Math.floor(num / 1000);
    const remainder = num % 1000;
    return numberToWords(thousands) + " nghìn" + (remainder > 0 ? " " + numberToWords(remainder) : "");
  }
  
  const millions = Math.floor(num / 1000000);
  const remainder = num % 1000000;
  return numberToWords(millions) + " triệu" + (remainder > 0 ? " " + numberToWords(remainder) : "");
}

function numberToVietNamdong(num: number): string {
  const rounded = Math.round(num);
  const words = numberToWords(rounded);
  return words.charAt(0).toUpperCase() + words.slice(1) + " đồng";
}

// ============================================
// INVENTORY EXPORT
// ============================================

export function exportInventoryReport(
  data: InventoryExportItem[],
  filename: string = "ton_kho"
): void {
  const wb = XLSX.utils.book_new();
  
  // Style helpers
  const headerStyle = {
    fill: { fgColor: { rgb: "0D47A1" } },
    font: { bold: true, color: { rgb: "FFFFFF" } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } },
    },
  };

  const cellStyle = {
    border: {
      top: { style: "thin", color: { rgb: "CCCCCC" } },
      bottom: { style: "thin", color: { rgb: "CCCCCC" } },
      left: { style: "thin", color: { rgb: "CCCCCC" } },
      right: { style: "thin", color: { rgb: "CCCCCC" } },
    },
    alignment: { vertical: "middle" },
  };

  // ===== SHEET 1: Tồn kho tổng hợp =====
  const summaryData = data.map((item, index) => [
    index + 1,
    item.sku,
    item.name,
    item.category,
    item.warehouse,
    item.quantityTotal,
    item.quantityAvailable,
    item.quantityReserved,
    item.quantityQuarantine,
    item.quantityDamaged,
    item.costPrice,
    item.value,
    item.reorderPoint || 0,
    item.quantityAvailable <= (item.reorderPoint || 0) ? "CÓ" : "",
  ]);

  const summaryHeaders = [
    "STT", "SKU", "Tên sản phẩm", "Danh mục", "Kho", 
    "Tổng tồn", "Còn hàng", "Đặt trước", "Cách ly", "Hư hỏng",
    "Giá vốn", "Giá trị", "Tối thiểu", "Cần đặt"
  ];

  const summaryWS = XLSX.utils.aoa_to_sheet([
    ["BÁO CÁO TỒN KHO"],
    [`Ngày xuất: ${formatDate(new Date())}`],
    [],
    summaryHeaders,
    ...summaryData,
  ]);

  // Set column widths
  summaryWS["!cols"] = [
    { wch: 5 },  // STT
    { wch: 15 }, // SKU
    { wch: 35 }, // Tên
    { wch: 15 }, // Danh mục
    { wch: 15 }, // Kho
    { wch: 10 }, // Tổng tồn
    { wch: 10 }, // Còn hàng
    { wch: 10 }, // Đặt trước
    { wch: 10 }, // Cách ly
    { wch: 10 }, // Hư hỏng
    { wch: 15 }, // Giá vốn
    { wch: 15 }, // Giá trị
    { wch: 10 }, // Tối thiểu
    { wch: 10 }, // Cần đặt
  ];

  // Freeze first row
  summaryWS["!freeze"] = { xSplit: 0, ySplit: 4 };

  XLSX.utils.book_append_sheet(wb, summaryWS, "Tổng hợp");

  // ===== SHEET 2: Chi tiết theo lô =====
  const lotData = data
    .filter((item) => item.lotNumber || item.expiryDate)
    .map((item, index) => [
      index + 1,
      item.sku,
      item.name,
      item.warehouse,
      item.location || "-",
      item.lotNumber || "-",
      item.expiryDate ? formatDate(item.expiryDate) : "-",
      item.quantityAvailable,
      item.costPrice,
      item.quantityAvailable * item.costPrice,
    ]);

  const lotHeaders = [
    "STT", "SKU", "Tên sản phẩm", "Kho", "Vị trí", 
    "Số lô", "Hạn SD", "SL tồn", "Đơn giá", "Giá trị"
  ];

  const lotWS = XLSX.utils.aoa_to_sheet([
    ["BÁO CÁO TỒN KHO - CHI TIẾT THEO LÔ"],
    [`Ngày xuất: ${formatDate(new Date())}`],
    [],
    lotHeaders,
    ...lotData,
  ]);

  lotWS["!cols"] = [
    { wch: 5 }, { wch: 15 }, { wch: 35 }, { wch: 15 }, { wch: 15 },
    { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 15 },
  ];
  lotWS["!freeze"] = { xSplit: 0, ySplit: 4 };

  XLSX.utils.book_append_sheet(wb, lotWS, "Theo Lô");

  // ===== SHEET 3: Hàng cần đặt thêm =====
  const reorderData = data
    .filter((item) => item.quantityAvailable <= (item.reorderPoint || 0))
    .map((item, index) => [
      index + 1,
      item.sku,
      item.name,
      item.category,
      item.warehouse,
      item.quantityAvailable,
      item.reorderPoint || 0,
      (item.reorderPoint || 0) - item.quantityAvailable,
      item.costPrice,
      ((item.reorderPoint || 0) - item.quantityAvailable) * item.costPrice,
    ]);

  const reorderHeaders = [
    "STT", "SKU", "Tên sản phẩm", "Danh mục", "Kho",
    "Tồn kho", "Tối thiểu", "Cần đặt", "Đơn giá", "Giá trị cần đặt"
  ];

  const reorderWS = XLSX.utils.aoa_to_sheet([
    ["BÁO CÁO HÀNG CẦN ĐẶT THÊM"],
    [`Ngày xuất: ${formatDate(new Date())}`],
    [`Số lượng sản phẩm: ${reorderData.length}`],
    [],
    reorderHeaders,
    ...reorderData,
  ]);

  reorderWS["!cols"] = [
    { wch: 5 }, { wch: 15 }, { wch: 35 }, { wch: 15 }, { wch: 15 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 },
  ];
  reorderWS["!freeze"] = { xSplit: 0, ySplit: 5 };

  XLSX.utils.book_append_sheet(wb, reorderWS, "Cần đặt thêm");

  // ===== SHEET 4: Tổng hợp theo kho =====
  const warehouseSummary = Array.from(
    data.reduce((acc, item) => {
      const key = item.warehouseId;
      const existing = acc.get(key) || {
        warehouse: item.warehouse,
        totalQty: 0,
        totalValue: 0,
        count: 0,
      };
      acc.set(key, {
        warehouse: item.warehouse,
        totalQty: existing.totalQty + item.quantityTotal,
        totalValue: existing.totalValue + item.value,
        count: existing.count + 1,
      });
      return acc;
    }, new Map<string, { warehouse: string; totalQty: number; totalValue: number; count: number }>())
  ).map((item, index) => [
    index + 1,
    item[1].warehouse,
    item[1].count,
    item[1].totalQty,
    item[1].totalValue,
  ]);

  const warehouseHeaders = ["STT", "Kho", "Số SKU", "Tổng số lượng", "Tổng giá trị"];

  const warehouseWS = XLSX.utils.aoa_to_sheet([
    ["TỔNG HỢP THEO KHO"],
    [`Ngày xuất: ${formatDate(new Date())}`],
    [],
    warehouseHeaders,
    ...warehouseSummary,
    [],
    [],
    ["TỔNG CỘNG", "", "", 
      warehouseSummary.reduce((sum, row) => sum + (row[3] as number), 0),
      warehouseSummary.reduce((sum, row) => sum + (row[4] as number), 0),
    ],
  ]);

  warehouseWS["!cols"] = [
    { wch: 5 }, { wch: 25 }, { wch: 10 }, { wch: 15 }, { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(wb, warehouseWS, "Theo Kho");

  // Save file
  const fileName = `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(wb, fileName, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/octet-stream" }), fileName);
}

// ============================================
// GOODS RECEIPT EXPORT
// ============================================

export function exportGoodsReceipt(
  grn: GoodsReceiptExport,
  filename: string = "phieu_nhap_kho"
): void {
  const wb = XLSX.utils.book_new();

  // Header row
  const headerRow = [
    ["PHIẾU NHẬP KHO"],
    [`Số: ${grn.receiptNumber}`],
    [`Ngày: ${formatDate(grn.receiptDate)}`],
    [],
    ["THÔNG TIN PHIẾU"],
    ["Nhà cung cấp:", grn.supplierName || "-"],
    ["Kho nhận:", grn.warehouseName],
    ["Người giao:", "-"],
    ["Người nhận:", grn.receivedBy],
    ["Ghi chú:", grn.notes || "-"],
    [],
    ["DANH SÁCH HÀNG HÓA"],
  ];

  // Items header
  const itemHeaders = [
    "STT", "Mã hàng", "Tên hàng", "ĐVT", 
    "SL đặt", "SL nhận", "SL cách ly",
    "Đơn giá", "Thành tiền"
  ];

  // Items data
  const itemData = grn.items.map((item, index) => [
    index + 1,
    item.productSku,
    item.productName,
    item.unit,
    item.orderedQuantity || "-",
    item.receivedQuantity,
    item.quarantineQuantity || 0,
    item.unitPrice,
    item.totalPrice,
  ]);

  // Summary
  const summaryRows = [
    [],
    [],
    ["", "", "", "", "", "", "Tổng tiền hàng:", grn.subtotal],
    ["", "", "", "", "", "", "Thuế (10%):", grn.taxAmount],
    ["", "", "", "", "", "", "TỔNG CỘNG:", grn.totalValue],
    [],
    ["Bằng chữ:", numberToVietNamdong(grn.totalValue)],
  ];

  // Signatures section
  const signatureRows = [
    [],
    ["", "", "", "", "KẾ TOÁN", "THỦ KHO", "NGƯỜI GIAO", "GIÁM ĐỐC"],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "(Ký)", "(Ký)", "(Ký)", "(Ký)"],
  ];

  const wsData = [
    ...headerRow,
    itemHeaders,
    ...itemData,
    ...summaryRows,
    ...signatureRows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws["!cols"] = [
    { wch: 5 },   // STT
    { wch: 15 },  // Mã hàng
    { wch: 35 },  // Tên hàng
    { wch: 8 },   // ĐVT
    { wch: 10 },  // SL đặt
    { wch: 10 },  // SL nhận
    { wch: 10 },  // SL cách ly
    { wch: 15 },  // Đơn giá
    { wch: 15 },  // Thành tiền
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Phiếu Nhập Kho");

  const fileName = `${filename}_${grn.receiptNumber}_${formatDate(grn.receiptDate).replace(/\//g, "-")}.xlsx`;
  XLSX.writeFile(wb, fileName, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/octet-stream" }), fileName);
}

// ============================================
// GOODS ISSUE EXPORT
// ============================================

export function exportGoodsIssue(
  gi: GoodsIssueExport,
  filename: string = "phieu_xuat_kho"
): void {
  const wb = XLSX.utils.book_new();

  const headerRow = [
    ["PHIẾU XUẤT KHO"],
    [`Số: ${gi.issueNumber}`],
    [`Ngày: ${formatDate(gi.issueDate)}`],
    [],
    ["THÔNG TIN PHIẾU"],
    ["Lý do xuất:", gi.reason],
    ["Khách hàng:", gi.customerName || "-"],
    ["Kho xuất:", gi.warehouseName],
    ["Người xuất:", gi.issuedBy],
    ["Ghi chú:", gi.notes || "-"],
    [],
    ["DANH SÁCH HÀNG HÓA"],
  ];

  const itemHeaders = [
    "STT", "Mã hàng", "Tên hàng", "Lô", "Hạn SD", 
    "ĐVT", "SL", "Đơn giá", "Thành tiền", "Vị trí"
  ];

  const itemData = gi.items.map((item, index) => [
    index + 1,
    item.productSku,
    item.productName,
    item.lotNumber || "-",
    item.expiryDate ? formatDate(item.expiryDate) : "-",
    item.unit,
    item.quantity,
    item.unitPrice,
    item.totalPrice,
    item.location || "-",
  ]);

  const summaryRows = [
    [],
    [],
    ["", "", "", "", "", "", "", "TỔNG CỘNG:", gi.totalValue],
    [],
    ["Bằng chữ:", numberToVietNamdong(gi.totalValue)],
  ];

  const signatureRows = [
    [],
    ["", "", "", "NGƯỜI NHẬN", "THỦ KHO", "KẾ TOÁN", "GIÁM ĐỐC"],
    ["", "", "", "", "", "", ""],
    ["", "", "", "", "", "", ""],
    ["", "", "", "(Ký)", "(Ký)", "(Ký)", "(Ký)"],
  ];

  const wsData = [
    ...headerRow,
    itemHeaders,
    ...itemData,
    ...summaryRows,
    ...signatureRows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws["!cols"] = [
    { wch: 5 }, { wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 12 },
    { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Phiếu Xuất Kho");

  const fileName = `${filename}_${gi.issueNumber}_${formatDate(gi.issueDate).replace(/\//g, "-")}.xlsx`;
  XLSX.writeFile(wb, fileName, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/octet-stream" }), fileName);
}

// ============================================
// PURCHASE ORDER EXPORT
// ============================================

export function exportPurchaseOrders(
  data: PurchaseOrderExport[],
  filename: string = "danh_sach_PO"
): void {
  const wb = XLSX.utils.book_new();

  // ===== SHEET 1: Danh sách PO =====
  const listData = data.map((po, index) => [
    index + 1,
    po.orderNumber,
    formatDate(po.orderDate),
    po.supplierName,
    po.status,
    po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate) : "-",
    po.items.length,
    formatCurrency(po.totalValue),
    po.createdBy,
  ]);

  const listHeaders = [
    "STT", "Số PO", "Ngày đặt", "Nhà cung cấp", "Trạng thái",
    "Ngày giao dự kiến", "Số dòng", "Giá trị", "Người tạo"
  ];

  const listWS = XLSX.utils.aoa_to_sheet([
    ["DANH SÁCH ĐƠN ĐẶT HÀNG"],
    [`Ngày xuất: ${formatDate(new Date())}`],
    [`Tổng số: ${data.length} đơn`],
    [],
    listHeaders,
    ...listData,
    [],
    [],
    [
      "TỔNG CỘNG:",
      "",
      "",
      "",
      "",
      "",
      data.reduce((sum, po) => sum + po.items.length, 0),
      data.reduce((sum, po) => sum + po.totalValue, 0),
    ],
  ]);

  listWS["!cols"] = [
    { wch: 5 }, { wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 15 },
    { wch: 15 }, { wch: 8 }, { wch: 18 }, { wch: 15 },
  ];
  listWS["!freeze"] = { xSplit: 0, ySplit: 5 };

  XLSX.utils.book_append_sheet(wb, listWS, "Danh sách PO");

  // ===== SHEET 2: Pivot theo NCC =====
  const supplierPivot = Array.from(
    data.reduce((acc, po) => {
      const key = po.supplierName;
      const existing = acc.get(key) || {
        supplier: po.supplierName,
        draftCount: 0,
        confirmedCount: 0,
        receivedCount: 0,
        totalValue: 0,
      };
      
      if (po.status === "draft" || po.status === "pending") existing.draftCount++;
      else if (po.status === "confirmed" || po.status === "sent") existing.confirmedCount++;
      else if (po.status === "completed" || po.status === "received") existing.receivedCount++;
      
      existing.totalValue += po.totalValue;
      acc.set(key, existing);
      return acc;
    }, new Map<string, { supplier: string; draftCount: number; confirmedCount: number; receivedCount: number; totalValue: number }>())
  ).map((item, index) => [
    index + 1,
    item[1].supplier,
    item[1].draftCount,
    item[1].confirmedCount,
    item[1].receivedCount,
    item[1].totalValue,
  ]);

  const pivotHeaders = ["STT", "Nhà cung cấp", "Đang xử lý", "Đã xác nhận", "Hoàn thành", "Tổng giá trị"];

  const pivotWS = XLSX.utils.aoa_to_sheet([
    ["TỔNG HỢP THEO NHÀ CUNG CẤP"],
    [`Ngày xuất: ${formatDate(new Date())}`],
    [],
    pivotHeaders,
    ...supplierPivot,
  ]);

  pivotWS["!cols"] = [
    { wch: 5 }, { wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(wb, pivotWS, "Theo NCC");

  // ===== SHEET 3: Tổng hợp theo trạng thái =====
  const statusSummary = [
    ["TRẠNG THÁI", "SỐ LƯỢNG", "TỔNG GIÁ TRỊ"],
    ["Nháp", data.filter(po => po.status === "draft").length, data.filter(po => po.status === "draft").reduce((sum, po) => sum + po.totalValue, 0)],
    ["Chờ duyệt", data.filter(po => po.status === "pending" || po.status === "pending_approval").length, data.filter(po => po.status === "pending" || po.status === "pending_approval").reduce((sum, po) => sum + po.totalValue, 0)],
    ["Đã duyệt", data.filter(po => po.status === "approved").length, data.filter(po => po.status === "approved").reduce((sum, po) => sum + po.totalValue, 0)],
    ["Đã gửi", data.filter(po => po.status === "sent").length, data.filter(po => po.status === "sent").reduce((sum, po) => sum + po.totalValue, 0)],
    ["Đã xác nhận", data.filter(po => po.status === "confirmed").length, data.filter(po => po.status === "confirmed").reduce((sum, po) => sum + po.totalValue, 0)],
    ["Nhận một phần", data.filter(po => po.status === "partially_received").length, data.filter(po => po.status === "partially_received").reduce((sum, po) => sum + po.totalValue, 0)],
    ["Hoàn thành", data.filter(po => po.status === "completed" || po.status === "fully_received").length, data.filter(po => po.status === "completed" || po.status === "fully_received").reduce((sum, po) => sum + po.totalValue, 0)],
    ["Đã hủy", data.filter(po => po.status === "cancelled").length, data.filter(po => po.status === "cancelled").reduce((sum, po) => sum + po.totalValue, 0)],
    [],
    ["TỔNG CỘNG", data.length, data.reduce((sum, po) => sum + po.totalValue, 0)],
  ];

  const statusWS = XLSX.utils.aoa_to_sheet([
    ["TỔNG HỢP THEO TRẠNG THÁI"],
    [`Ngày xuất: ${formatDate(new Date())}`],
    [],
    ...statusSummary,
  ]);

  statusWS["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 20 }];

  XLSX.utils.book_append_sheet(wb, statusWS, "Theo Trạng thái");

  const fileName = `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(wb, fileName, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/octet-stream" }), fileName);
}

// ============================================
// GOODS RECEIPT LIST EXPORT
// ============================================

export function exportGoodsReceipts(
  data: GoodsReceiptExport[],
  filename: string = "danh_sach_nhap_kho"
): void {
  const wb = XLSX.utils.book_new();

  const listData = data.map((grn, index) => [
    index + 1,
    grn.receiptNumber,
    formatDate(grn.receiptDate),
    grn.supplierName || "-",
    grn.warehouseName,
    grn.items.length,
    grn.totalValue,
    grn.receivedBy,
    grn.status,
  ]);

  const headers = [
    "STT", "Số GRN", "Ngày nhận", "Nhà cung cấp", "Kho nhận",
    "Số dòng", "Giá trị", "Người nhận", "Trạng thái"
  ];

  const ws = XLSX.utils.aoa_to_sheet([
    ["DANH SÁCH PHIẾU NHẬP KHO"],
    [`Ngày xuất: ${formatDate(new Date())}`],
    [`Tổng số: ${data.length} phiếu`],
    [],
    headers,
    ...listData,
    [],
    [],
    [
      "TỔNG CỘNG:",
      "",
      "",
      "",
      "",
      data.reduce((sum, grn) => sum + grn.items.length, 0),
      data.reduce((sum, grn) => sum + grn.totalValue, 0),
      "",
      "",
    ],
  ]);

  ws["!cols"] = [
    { wch: 5 }, { wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 15 },
    { wch: 8 }, { wch: 18 }, { wch: 15 }, { wch: 12 },
  ];
  ws["!freeze"] = { xSplit: 0, ySplit: 5 };

  XLSX.utils.book_append_sheet(wb, ws, "Danh sách GRN");

  const fileName = `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(wb, fileName, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/octet-stream" }), fileName);
}

// ============================================
// GOODS ISSUE LIST EXPORT
// ============================================

export function exportGoodsIssues(
  data: GoodsIssueExport[],
  filename: string = "danh_sach_xuat_kho"
): void {
  const wb = XLSX.utils.book_new();

  const listData = data.map((gi, index) => [
    index + 1,
    gi.issueNumber,
    formatDate(gi.issueDate),
    gi.reason,
    gi.customerName || "-",
    gi.warehouseName,
    gi.items.length,
    gi.totalValue,
    gi.issuedBy,
    gi.status,
  ]);

  const headers = [
    "STT", "Số phiếu", "Ngày xuất", "Lý do", "Khách hàng", "Kho xuất",
    "Số dòng", "Giá trị", "Người xuất", "Trạng thái"
  ];

  const ws = XLSX.utils.aoa_to_sheet([
    ["DANH SÁCH PHIẾU XUẤT KHO"],
    [`Ngày xuất: ${formatDate(new Date())}`],
    [`Tổng số: ${data.length} phiếu`],
    [],
    headers,
    ...listData,
    [],
    [],
    [
      "TỔNG CỘNG:",
      "",
      "",
      "",
      "",
      "",
      data.reduce((sum, gi) => sum + gi.items.length, 0),
      data.reduce((sum, gi) => sum + gi.totalValue, 0),
      "",
      "",
    ],
  ]);

  ws["!cols"] = [
    { wch: 5 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 15 },
    { wch: 8 }, { wch: 18 }, { wch: 15 }, { wch: 12 },
  ];
  ws["!freeze"] = { xSplit: 0, ySplit: 5 };

  XLSX.utils.book_append_sheet(wb, ws, "Danh sách Xuất Kho");

  const fileName = `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(wb, fileName, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], { type: "application/octet-stream" }), fileName);
}
