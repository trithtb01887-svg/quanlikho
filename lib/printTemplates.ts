import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { GoodsReceiptExport, GoodsIssueExport, PurchaseOrderExport } from "./exportExcel";

// ============================================
// TYPES
// ============================================

export interface PrintOptions {
  preview?: boolean;
  save?: boolean;
  filename?: string;
}

interface GRNPrintData {
  receiptNumber: string;
  receiptDate: Date | string;
  supplierName: string;
  warehouseName: string;
  receivedBy: string;
  inspectedBy?: string;
  items: Array<{
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
  }>;
  subtotal: number;
  taxAmount: number;
  totalValue: number;
  notes?: string;
}

interface GIPrintData {
  issueNumber: string;
  issueDate: Date | string;
  reason: string;
  customerName?: string;
  warehouseName: string;
  issuedBy: string;
  destination?: string;
  items: Array<{
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
  }>;
  subtotal: number;
  totalValue: number;
  notes?: string;
}

interface PickingListItem {
  productSku: string;
  productName: string;
  quantity: number;
  pickedQuantity?: number;
  location: string;
  lotNumber?: string;
  serialNumbers?: string[];
}

interface PickingListPrintData {
  pickingListNumber: string;
  pickingListDate: Date | string;
  issueNumber?: string;
  warehouseName: string;
  assignedTo?: string;
  items: PickingListItem[];
  notes?: string;
}

export interface LabelPrintData {
  sku: string;
  name: string;
  barcode: string;
  lotNumber?: string;
  expiryDate?: Date | string;
  serialNumber?: string;
  voltage?: string;
  model?: string;
  warehouse?: string;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatDate(date: Date | string | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(date: Date | string | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("vi-VN").format(num);
}

function numberToVietNamdong(num: number): string {
  const units = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const tens = ["", "mười", "hai mươi", "ba mươi", "bốn mươi", "năm mươi", "sáu mươi", "bảy mươi", "tám mươi", "chín mươi"];
  
  if (num === 0) return "không đồng";
  
  const rounded = Math.round(num);
  let str = rounded.toString();
  let result = "";
  
  // Simple Vietnamese number conversion
  if (rounded < 10) {
    result = units[rounded];
  } else if (rounded < 100) {
    const tensDigit = Math.floor(rounded / 10);
    const unitsDigit = rounded % 10;
    result = tens[tensDigit] + (unitsDigit > 0 ? " " + units[unitsDigit] : "");
  } else if (rounded < 1000) {
    const hundreds = Math.floor(rounded / 100);
    const remainder = rounded % 100;
    result = units[hundreds] + " trăm" + (remainder > 0 ? " " + numberToVietNamdong(remainder).replace(" đồng", "") : "");
  } else if (rounded < 1000000) {
    const thousands = Math.floor(rounded / 1000);
    const remainder = rounded % 1000;
    result = numberToVietNamdong(thousands).replace(" đồng", "") + " nghìn" + (remainder > 0 ? " " + numberToVietNamdong(remainder).replace(" đồng", "") : "");
  } else {
    const millions = Math.floor(rounded / 1000000);
    const remainder = rounded % 1000000;
    result = numberToVietNamdong(millions).replace(" đồng", "") + " triệu" + (remainder > 0 ? " " + numberToVietNamdong(remainder).replace(" đồng", "") : "");
  }
  
  return result.charAt(0).toUpperCase() + result.slice(1) + " đồng";
}

function addHeader(doc: jsPDF, title: string, subtitle?: string) {
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(title, 105, 20, { align: "center" });
  
  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, 105, 27, { align: "center" });
  }
  
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 32, 190, 32);
}

function addFooter(doc: jsPDF) {
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text(
    `In lúc: ${formatDateTime(new Date())}`,
    20,
    doc.internal.pageSize.height - 10
  );
  doc.text(
    `Trang 1`,
    190,
    doc.internal.pageSize.height - 10,
    { align: "right" }
  );
}

// ============================================
// TEMPLATE 1: PHIẾU NHẬP KHO (GRN)
// ============================================

export function printGoodsReceipt(data: GRNPrintData, options: PrintOptions = {}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.width;

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(13, 71, 161); // Dark blue
  doc.text("PHIẾU NHẬP KHO", pageWidth / 2, 15, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);
  doc.text(`Số: ${data.receiptNumber}`, pageWidth / 2, 22, { align: "center" });
  doc.text(`Ngày: ${formatDate(data.receiptDate)}`, pageWidth / 2, 28, { align: "center" });

  // Info section
  doc.setFontSize(10);
  const infoY = 38;
  const labelX = 20;
  const valueX = 60;

  doc.setFont("helvetica", "bold");
  doc.text("THÔNG TIN", labelX, infoY);
  doc.setFont("helvetica", "normal");

  doc.text("Nhà cung cấp:", labelX, infoY + 8);
  doc.text(data.supplierName || "-", valueX, infoY + 8);

  doc.text("Kho nhận:", labelX, infoY + 14);
  doc.text(data.warehouseName, valueX, infoY + 14);

  doc.text("Người giao:", labelX, infoY + 20);
  doc.text("-", valueX, infoY + 20);

  doc.text("Người nhận:", labelX, infoY + 26);
  doc.text(data.receivedBy, valueX, infoY + 26);

  if (data.notes) {
    doc.text("Ghi chú:", labelX, infoY + 32);
    doc.text(data.notes, valueX, infoY + 32);
  }

  // Items table
  const tableY = data.notes ? infoY + 42 : infoY + 38;
  
  const tableData = data.items.map((item, index) => [
    index + 1,
    item.productSku,
    item.productName,
    item.unit,
    item.orderedQuantity?.toString() || "-",
    item.receivedQuantity.toString(),
    item.acceptedQuantity.toString(),
    item.quarantineQuantity?.toString() || "0",
    formatCurrency(item.unitPrice),
    formatCurrency(item.totalPrice),
  ]);

  autoTable(doc, {
    startY: tableY,
    head: [["STT", "Mã hàng", "Tên hàng", "ĐVT", "SL đặt", "SL nhận", "SL nhận thực", "SL cách ly", "Đơn giá", "Thành tiền"]],
    body: tableData,
    foot: [
      ["", "", "", "", "", "", "", "Tổng tiền hàng:", "", formatCurrency(data.subtotal)],
      ["", "", "", "", "", "", "", "Thuế (10%):", "", formatCurrency(data.taxAmount)],
      ["", "", "", "", "", "", "", "TỔNG CỘNG:", "", formatCurrency(data.totalValue)],
    ],
    theme: "striped",
    headStyles: {
      fillColor: [13, 71, 161],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
    },
    footStyles: {
      fillColor: [240, 240, 240],
      fontStyle: "bold",
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 22 },
      2: { cellWidth: 45 },
      3: { cellWidth: 12, halign: "center" },
      4: { cellWidth: 15, halign: "center" },
      5: { cellWidth: 15, halign: "center" },
      6: { cellWidth: 18, halign: "center" },
      7: { cellWidth: 15, halign: "center" },
      8: { cellWidth: 22, halign: "right" },
      9: { cellWidth: 26, halign: "right" },
    },
    margin: { left: 20, right: 20 },
  });

  // Amount in words
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold");
  doc.text("Số tiền bằng chữ:", 20, finalY);
  doc.setFont("helvetica", "normal");
  doc.text(numberToVietNamdong(data.totalValue), 55, finalY);

  // Signature section
  const sigY = finalY + 20;
  const sigWidth = (pageWidth - 40) / 4;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("NGƯỜI GIAO", 20 + sigWidth * 0.5, sigY, { align: "center" });
  doc.text("THỦ KHO", 20 + sigWidth * 1.5, sigY, { align: "center" });
  doc.text("KẾ TOÁN", 20 + sigWidth * 2.5, sigY, { align: "center" });
  doc.text("GIÁM ĐỐC", 20 + sigWidth * 3.5, sigY, { align: "center" });

  // Signature boxes
  doc.setDrawColor(0);
  doc.rect(20 + sigWidth * 0.25, sigY + 3, sigWidth - 10, 25);
  doc.rect(20 + sigWidth * 1.25, sigY + 3, sigWidth - 10, 25);
  doc.rect(20 + sigWidth * 2.25, sigY + 3, sigWidth - 10, 25);
  doc.rect(20 + sigWidth * 3.25, sigY + 3, sigWidth - 10, 25);

  doc.setFont("helvetica", "italic");
  doc.text("(Ký)", 20 + sigWidth * 0.5, sigY + 32, { align: "center" });
  doc.text("(Ký)", 20 + sigWidth * 1.5, sigY + 32, { align: "center" });
  doc.text("(Ký)", 20 + sigWidth * 2.5, sigY + 32, { align: "center" });
  doc.text("(Ký)", 20 + sigWidth * 3.5, sigY + 32, { align: "center" });

  addFooter(doc);

  // Handle output
  if (options.save || options.preview !== false) {
    const filename = options.filename || `Phieu_Nhap_Kho_${data.receiptNumber}`;
    if (options.preview !== false) {
      window.open(doc.output("bloburl"), "_blank");
    }
  }

  return doc;
}

// ============================================
// TEMPLATE 2: PHIẾU XUẤT KHO (GI)
// ============================================

export function printGoodsIssue(data: GIPrintData, options: PrintOptions = {}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.width;

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(183, 28, 28); // Dark red
  doc.text("PHIẾU XUẤT KHO", pageWidth / 2, 15, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);
  doc.text(`Số: ${data.issueNumber}`, pageWidth / 2, 22, { align: "center" });
  doc.text(`Ngày: ${formatDate(data.issueDate)}`, pageWidth / 2, 28, { align: "center" });

  // Info section
  doc.setFontSize(10);
  const infoY = 38;
  const labelX = 20;
  const valueX = 60;

  doc.setFont("helvetica", "bold");
  doc.text("THÔNG TIN", labelX, infoY);
  doc.setFont("helvetica", "normal");

  doc.text("Lý do xuất:", labelX, infoY + 8);
  doc.text(data.reason, valueX, infoY + 8);

  doc.text("Khách hàng:", labelX, infoY + 14);
  doc.text(data.customerName || "-", valueX, infoY + 14);

  doc.text("Kho xuất:", labelX, infoY + 20);
  doc.text(data.warehouseName, valueX, infoY + 20);

  doc.text("Người xuất:", labelX, infoY + 26);
  doc.text(data.issuedBy, valueX, infoY + 26);

  if (data.destination) {
    doc.text("Bộ phận nhận:", labelX, infoY + 32);
    doc.text(data.destination, valueX, infoY + 32);
  }

  if (data.notes) {
    const notesY = data.destination ? infoY + 38 : infoY + 32;
    doc.text("Ghi chú:", labelX, notesY);
    doc.text(data.notes, valueX, notesY);
  }

  // Items table
  const tableY = data.notes ? infoY + 48 : data.destination ? infoY + 42 : infoY + 36;

  const tableData = data.items.map((item, index) => {
    const serialDisplay = item.serialNumbers?.length 
      ? item.serialNumbers.slice(0, 3).join(", ") + (item.serialNumbers.length > 3 ? "..." : "")
      : "-";
    
    return [
      index + 1,
      item.productSku,
      item.productName,
      item.lotNumber || "-",
      item.expiryDate ? formatDate(item.expiryDate) : "-",
      item.unit,
      item.quantity.toString(),
      formatCurrency(item.unitPrice),
      formatCurrency(item.totalPrice),
      item.location || "-",
    ];
  });

  autoTable(doc, {
    startY: tableY,
    head: [["STT", "Mã hàng", "Tên hàng", "Số lô", "Hạn SD", "ĐVT", "SL", "Đơn giá", "Thành tiền", "Vị trí"]],
    body: tableData,
    foot: [
      ["", "", "", "", "", "", "", "TỔNG CỘNG:", "", formatCurrency(data.totalValue)],
    ],
    theme: "striped",
    headStyles: {
      fillColor: [183, 28, 28],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
    },
    footStyles: {
      fillColor: [240, 240, 240],
      fontStyle: "bold",
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 18 },
      2: { cellWidth: 35 },
      3: { cellWidth: 15 },
      4: { cellWidth: 15 },
      5: { cellWidth: 10, halign: "center" },
      6: { cellWidth: 10, halign: "center" },
      7: { cellWidth: 18, halign: "right" },
      8: { cellWidth: 20, halign: "right" },
      9: { cellWidth: 18 },
    },
    margin: { left: 15, right: 15 },
  });

  // Serial numbers detail if exists
  const itemsWithSerial = data.items.filter(i => i.serialNumbers && i.serialNumbers.length > 0);
  if (itemsWithSerial.length > 0) {
    let detailY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFont("helvetica", "bold");
    doc.text("CHI TIẾT SERIAL NUMBER:", 20, detailY);
    detailY += 6;

    itemsWithSerial.forEach((item, idx) => {
      if (detailY > doc.internal.pageSize.height - 40) {
        doc.addPage();
        detailY = 20;
      }
      
      doc.setFont("helvetica", "normal");
      doc.text(`${idx + 1}. ${item.productSku} - ${item.productName}:`, 20, detailY);
      detailY += 5;
      
      doc.setFontSize(7);
      item.serialNumbers!.forEach((sn, snIdx) => {
        if (snIdx % 8 === 0) {
          doc.text(sn + (snIdx < item.serialNumbers!.length - 1 ? ", " : ""), 25, detailY);
          detailY += 4;
        } else {
          doc.text(sn + (snIdx < item.serialNumbers!.length - 1 ? ", " : ""), 25 + (snIdx % 8) * 15, detailY);
        }
      });
      detailY += 4;
      doc.setFontSize(9);
    });
  }

  // Amount in words
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Số tiền bằng chữ:", 20, finalY);
  doc.setFont("helvetica", "normal");
  doc.text(numberToVietNamdong(data.totalValue), 55, finalY);

  // Signature section
  const sigY = finalY + 20;
  const sigWidth = (pageWidth - 40) / 4;

  doc.setFontSize(8);
  doc.text("NGƯỜI NHẬN", 20 + sigWidth * 0.5, sigY, { align: "center" });
  doc.text("THỦ KHO", 20 + sigWidth * 1.5, sigY, { align: "center" });
  doc.text("KẾ TOÁN", 20 + sigWidth * 2.5, sigY, { align: "center" });
  doc.text("GIÁM ĐỐC", 20 + sigWidth * 3.5, sigY, { align: "center" });

  doc.rect(20 + sigWidth * 0.25, sigY + 3, sigWidth - 10, 25);
  doc.rect(20 + sigWidth * 1.25, sigY + 3, sigWidth - 10, 25);
  doc.rect(20 + sigWidth * 2.25, sigY + 3, sigWidth - 10, 25);
  doc.rect(20 + sigWidth * 3.25, sigY + 3, sigWidth - 10, 25);

  doc.setFont("helvetica", "italic");
  doc.text("(Ký)", 20 + sigWidth * 0.5, sigY + 32, { align: "center" });
  doc.text("(Ký)", 20 + sigWidth * 1.5, sigY + 32, { align: "center" });
  doc.text("(Ký)", 20 + sigWidth * 2.5, sigY + 32, { align: "center" });
  doc.text("(Ký)", 20 + sigWidth * 3.5, sigY + 32, { align: "center" });

  addFooter(doc);

  if (options.preview !== false) {
    const filename = options.filename || `Phieu_Xuat_Kho_${data.issueNumber}`;
    window.open(doc.output("bloburl"), "_blank");
  }

  return doc;
}

// ============================================
// TEMPLATE 3: PICKING LIST (A5)
// ============================================

export function printPickingList(data: PickingListPrintData, options: PrintOptions = {}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a5", // 148mm x 210mm
  });

  const pageWidth = doc.internal.pageSize.width;

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 100, 0); // Dark green
  doc.text("PICKING LIST", pageWidth / 2, 12, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);
  doc.text(`Số: ${data.pickingListNumber}`, pageWidth / 2, 18, { align: "center" });
  doc.text(`Ngày: ${formatDate(data.pickingListDate)}`, pageWidth / 2, 23, { align: "center" });
  
  if (data.issueNumber) {
    doc.text(`Phiếu xuất: ${data.issueNumber}`, pageWidth / 2, 28, { align: "center" });
  }

  // Info
  doc.setFontSize(9);
  doc.text(`Kho: ${data.warehouseName}`, 10, 35);
  if (data.assignedTo) {
    doc.text(`Người lấy: ${data.assignedTo}`, 10, 40);
  }

  // Sort items by location for optimal picking route
  const sortedItems = [...data.items].sort((a, b) => {
    return a.location.localeCompare(b.location);
  });

  // Table with large font for easy reading
  const tableData = sortedItems.map((item, index) => [
    item.location,
    item.productSku,
    item.productName,
    item.lotNumber || "-",
    item.quantity.toString(),
    item.pickedQuantity !== undefined ? item.pickedQuantity.toString() : "",
  ]);

  autoTable(doc, {
    startY: data.assignedTo ? 44 : 38,
    head: [["VỊ TRÍ", "MÃ HANG", "TEN SAN PHAM", "LO", "SL", "DA LAY"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [0, 100, 0],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 11, // Larger font for warehouse use
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: "bold", halign: "center" },
      1: { cellWidth: 20 },
      2: { cellWidth: 45 },
      3: { cellWidth: 15, halign: "center" },
      4: { cellWidth: 12, halign: "center", fontStyle: "bold" },
      5: { cellWidth: 15, halign: "center" },
    },
    margin: { left: 10, right: 10 },
  });

  // Summary
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Tổng số dòng: ${data.items.length}`, 10, finalY);
  doc.text(
    `Đã lấy: ${data.items.filter(i => i.pickedQuantity !== undefined && i.pickedQuantity >= i.quantity).length}`,
    70,
    finalY
  );

  // Signature
  doc.setFont("helvetica", "normal");
  doc.text("Người lấy hàng:", 10, finalY + 15);
  doc.rect(10, finalY + 17, 60, 20);
  doc.text("Kiểm tra:", 85, finalY + 15);
  doc.rect(85, finalY + 17, 60, 20);

  addFooter(doc);

  if (options.preview !== false) {
    const filename = options.filename || `Picking_List_${data.pickingListNumber}`;
    window.open(doc.output("bloburl"), "_blank");
  }

  return doc;
}

// ============================================
// TEMPLATE 4: NHAN BARCODE (50x30mm)
// ============================================

export function printBarcodeLabels(
  labels: LabelPrintData[],
  options: PrintOptions = {}
): jsPDF {
  // Label size: 50mm x 30mm
  const labelWidth = 50;
  const labelHeight = 30;
  const labelsPerRow = 4;
  const labelsPerCol = 8;
  const labelsPerPage = labelsPerRow * labelsPerCol;
  
  // Margins
  const marginX = 10;
  const marginY = 10;
  const gapX = 2;
  const gapY = 2;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  labels.forEach((label, index) => {
    if (index > 0 && index % labelsPerPage === 0) {
      doc.addPage();
    }

    const pageIndex = index % labelsPerPage;
    const row = Math.floor(pageIndex / labelsPerRow);
    const col = pageIndex % labelsPerRow;

    const x = marginX + col * (labelWidth + gapX);
    const y = marginY + row * (labelHeight + gapY);

    // Draw label border
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.rect(x, y, labelWidth, labelHeight);

    // Product name (top)
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    const truncatedName = label.name.length > 35 
      ? label.name.substring(0, 35) + "..." 
      : label.name;
    doc.text(truncatedName, x + 2, y + 4);

    // SKU
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`SKU: ${label.sku}`, x + 2, y + 8);

    // Barcode placeholder (simple text representation)
    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.text(`BC: ${label.barcode}`, x + 2, y + 12);

    // Draw simple barcode lines
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    const barcodeStartX = x + 2;
    const barcodeY = y + 14;
    const barWidth = 3;
    const barHeight = 8;
    
    // Generate pseudo-random bars based on barcode
    const barcodeValue = label.barcode.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    for (let i = 0; i < 20; i++) {
      const shouldDraw = (barcodeValue + i * 7) % 3 !== 0;
      if (shouldDraw) {
        doc.line(
          barcodeStartX + i * barWidth,
          barcodeY,
          barcodeStartX + i * barWidth,
          barcodeY + barHeight
        );
      }
    }

    // Bottom info
    doc.setFontSize(5);
    if (label.lotNumber) {
      doc.text(`Lo: ${label.lotNumber}`, x + 2, y + 24);
    }
    
    if (label.expiryDate) {
      doc.text(`Han: ${formatDate(label.expiryDate)}`, x + 20, y + 24);
    }

    // Technical specs for electronics
    if (label.voltage || label.model) {
      doc.setFontSize(4);
      doc.setTextColor(50);
      const specs = [label.voltage, label.model].filter(Boolean).join(" | ");
      doc.text(specs, x + 2, y + 28);
    }
  });

  if (options.preview !== false) {
    const filename = options.filename || "Nhan_Barcode";
    window.open(doc.output("bloburl"), "_blank");
  }

  return doc;
}

// ============================================
// TEMPLATE 5: PURCHASE ORDER
// ============================================

export function printPurchaseOrder(data: PurchaseOrderExport, options: PrintOptions = {}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.width;

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(46, 125, 50); // Dark green
  doc.text("ĐƠN ĐẶT HÀNG", pageWidth / 2, 15, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);
  doc.text(`Số: ${data.orderNumber}`, pageWidth / 2, 22, { align: "center" });
  doc.text(`Ngày: ${formatDate(data.orderDate)}`, pageWidth / 2, 28, { align: "center" });

  // Info section
  doc.setFontSize(10);
  const infoY = 38;
  const labelX = 20;
  const valueX = 60;

  doc.setFont("helvetica", "bold");
  doc.text("THÔNG TIN", labelX, infoY);
  doc.setFont("helvetica", "normal");

  doc.text("Nhà cung cấp:", labelX, infoY + 8);
  doc.text(data.supplierName, valueX, infoY + 8);

  doc.text("Ngày giao dự kiến:", labelX, infoY + 14);
  doc.text(data.expectedDeliveryDate ? formatDate(data.expectedDeliveryDate) : "-", valueX, infoY + 14);

  doc.text("Người tạo:", labelX, infoY + 20);
  doc.text(data.createdBy, valueX, infoY + 20);

  // Items table
  const tableY = infoY + 30;

  const tableData = data.items.map((item, index) => [
    index + 1,
    item.productSku,
    item.productName,
    item.unit,
    item.quantity.toString(),
    item.unitPrice.toString(),
    item.totalPrice.toString(),
    item.pendingQuantity > 0 ? "Chưa nhận" : "Đã nhận đủ",
  ]);

  autoTable(doc, {
    startY: tableY,
    head: [["STT", "Mã hàng", "Tên hàng", "ĐVT", "SL đặt", "Đơn giá", "Thành tiền", "Trạng thái"]],
    body: tableData,
    foot: [
      ["", "", "", "", "", "TỔNG CỘNG:", data.totalValue.toString(), ""],
      ["", "", "", "", "", "Đã nhận:", data.items.reduce((sum, i) => sum + i.receivedQuantity * i.unitPrice, 0).toString(), ""],
      ["", "", "", "", "", "Còn nhận:", data.items.reduce((sum, i) => sum + i.pendingQuantity * i.unitPrice, 0).toString(), ""],
    ],
    theme: "striped",
    headStyles: {
      fillColor: [46, 125, 50],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
    },
    footStyles: {
      fillColor: [240, 240, 240],
      fontStyle: "bold",
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 20 },
      2: { cellWidth: 50 },
      3: { cellWidth: 15, halign: "center" },
      4: { cellWidth: 15, halign: "center" },
      5: { cellWidth: 25, halign: "right" },
      6: { cellWidth: 30, halign: "right" },
      7: { cellWidth: 25 },
    },
    margin: { left: 20, right: 20 },
  });

  // Signature section
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  const sigWidth = (pageWidth - 40) / 3;

  doc.setFontSize(8);
  doc.text("NGƯỜI ĐẶT HÀNG", 20 + sigWidth * 0.5, finalY, { align: "center" });
  doc.text("KẾ TOÁN", 20 + sigWidth * 1.5, finalY, { align: "center" });
  doc.text("GIÁM ĐỐC", 20 + sigWidth * 2.5, finalY, { align: "center" });

  doc.rect(20 + sigWidth * 0.25, finalY + 3, sigWidth - 10, 25);
  doc.rect(20 + sigWidth * 1.25, finalY + 3, sigWidth - 10, 25);
  doc.rect(20 + sigWidth * 2.25, finalY + 3, sigWidth - 10, 25);

  addFooter(doc);

  if (options.preview !== false) {
    const filename = options.filename || `Don_Dat_Hang_${data.orderNumber}`;
    window.open(doc.output("bloburl"), "_blank");
  }

  return doc;
}

// ============================================
// DOWNLOAD PDF
// ============================================

export function downloadPDF(doc: jsPDF, filename: string) {
  doc.save(`${filename}.pdf`);
}

export function getPDFBlob(doc: jsPDF): Blob {
  return doc.output("blob");
}
