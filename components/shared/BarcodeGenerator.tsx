"use client";

import { useState, useCallback, useRef } from "react";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  QrCode,
  Printer,
  Download,
  X,
  Package,
  Hash,
  Barcode,
  Copy,
  Check,
} from "lucide-react";

export interface BarcodeGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  products?: Array<{
    id: string;
    sku: string;
    name: string;
    barcode?: string;
  }>;
  productId?: string;
  productSku?: string;
  productName?: string;
  barcode?: string;
  onPrintSingle?: (data: { sku: string; name: string; barcode: string }) => void;
  onPrintBatch?: (products: Array<{ sku: string; name: string; barcode: string }>) => void;
}

interface LabelData {
  sku: string;
  name: string;
  barcode: string;
}

export default function BarcodeGenerator({
  isOpen,
  onClose,
  products = [],
  productId,
  productSku,
  productName,
  barcode,
  onPrintSingle,
  onPrintBatch,
}: BarcodeGeneratorProps) {
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const singleProductData: LabelData | null =
    productSku && productName
      ? {
          sku: productSku,
          name: productName,
          barcode: barcode || productSku,
        }
      : null;

  const qrData = useCallback(
    (data: LabelData) => {
      return JSON.stringify({
        SKU: data.sku,
        NAME: data.name,
        BARCODE: data.barcode,
        TS: new Date().toISOString(),
      });
    },
    []
  );

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const toggleProductSelection = useCallback((productId: string) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  }, []);

  const selectAllProducts = useCallback(() => {
    setSelectedProducts(new Set(products.map((p) => p.id)));
  }, [products]);

  const deselectAllProducts = useCallback(() => {
    setSelectedProducts(new Set());
  }, []);

  const handlePrintSingle = useCallback(() => {
    if (!singleProductData) return;
    onPrintSingle?.(singleProductData);
    const printContent = `
      <div style="width: 50mm; padding: 2mm; font-family: Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 2mm;">
          <svg width="40mm" height="40mm" viewBox="0 0 40 40" style="width: 100%; height: auto;">
            ${generateSimpleQR(singleProductData)}
          </svg>
        </div>
        <div style="text-align: center; font-size: 10pt; font-weight: bold; margin-bottom: 1mm;">
          ${singleProductData.sku}
        </div>
        <div style="text-align: center; font-size: 8pt; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${singleProductData.name}
        </div>
        <div style="text-align: center; font-size: 7pt; font-family: 'Libre Barcode 39', monospace; margin-top: 1mm;">
          *${singleProductData.barcode}*
        </div>
      </div>
    `;
    openPrintDialog(printContent);
  }, [singleProductData, onPrintSingle]);

  const handlePrintBatch = useCallback(() => {
    const selectedProductsData = products
      .filter((p) => selectedProducts.has(p.id))
      .map((p) => ({
        sku: p.sku,
        name: p.name,
        barcode: p.barcode || p.sku,
      }));

    if (selectedProductsData.length === 0) return;
    onPrintBatch?.(selectedProductsData);

    const labelsHtml = selectedProductsData
      .map(
        (data) => `
        <div style="width: 50mm; height: 30mm; padding: 2mm; border: 1px dashed #ccc; box-sizing: border-box; page-break-inside: avoid; display: inline-block; vertical-align: top;">
          <div style="text-align: center; margin-bottom: 1mm;">
            <svg width="20mm" height="20mm" viewBox="0 0 40 40" style="width: 20mm; height: 20mm;">
              ${generateSimpleQR(data)}
            </svg>
          </div>
          <div style="text-align: center; font-size: 9pt; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${data.sku}
          </div>
          <div style="text-align: center; font-size: 7pt; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${data.name}
          </div>
        </div>
      `
      )
      .join("");

    const printContent = `
      <div style="display: flex; flex-wrap: wrap; gap: 2mm; justify-content: flex-start; padding: 5mm;">
        ${labelsHtml}
      </div>
    `;
    openPrintDialog(printContent);
  }, [products, selectedProducts, onPrintBatch]);

  const openPrintDialog = (content: string) => {
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>In Nhãn Barcode</title>
          <style>
            @page {
              size: 50mm 30mm;
              margin: 0;
            }
            @media print {
              body { margin: 0; padding: 0; }
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
            }
          </style>
        </head>
        <body>
          ${content}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const generateSimpleQR = (data: LabelData) => {
    return `<rect width="40" height="40" fill="white"/>
      <text x="20" y="22" text-anchor="middle" font-size="6" font-family="Arial">${data.sku.slice(0, 8)}</text>
      <rect x="5" y="25" width="2" height="10" fill="black"/>
      <rect x="8" y="25" width="1" height="10" fill="black"/>
      <rect x="10" y="25" width="4" height="10" fill="black"/>
      <rect x="15" y="25" width="2" height="10" fill="black"/>
      <rect x="18" y="25" width="1" height="10" fill="black"/>
      <rect x="20" y="25" width="3" height="10" fill="black"/>
      <rect x="24" y="25" width="2" height="10" fill="black"/>
      <rect x="27" y="25" width="4" height="10" fill="black"/>
      <rect x="32" y="25" width="1" height="10" fill="black"/>
      <rect x="34" y="25" width="2" height="10" fill="black"/>`;
  };

  const downloadQRCode = useCallback(
    (data: LabelData) => {
      const svg = document.getElementById(`qr-${data.sku}`);
      if (!svg) return;

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      canvas.width = 200;
      canvas.height = 200;

      img.onload = () => {
        if (ctx) {
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, 200, 200);

          const link = document.createElement("a");
          link.download = `QR-${data.sku}.png`;
          link.href = canvas.toDataURL("image/png");
          link.click();
        }
      };

      img.src = "data:image/svg+xml;base64," + btoa(svgData);
    },
    []
  );

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-sky-400" />
            Tạo & In Nhãn Barcode/QR
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Tạo mã QR cho sản phẩm và in nhãn với kích thước chuẩn 50x30mm
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Single Product Mode */}
          {singleProductData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Nhãn đơn
                </h3>
              </div>

              <div className="flex gap-6 items-start">
                {/* QR Preview */}
                <div className="flex-shrink-0 bg-white p-4 rounded-lg">
                  <QRCode
                    id={`qr-${singleProductData.sku}`}
                    value={qrData(singleProductData)}
                    size={160}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="M"
                  />
                </div>

                {/* Product Info */}
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-xs text-slate-400">SKU</p>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-mono font-bold text-lg">
                        {singleProductData.sku}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-400 hover:text-white"
                        onClick={() => handleCopy(singleProductData.sku, "sku")}
                      >
                        {copied === "sku" ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">Tên sản phẩm</p>
                    <p className="text-white">{singleProductData.name}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">Barcode</p>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-mono">
                        {singleProductData.barcode}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-400 hover:text-white"
                        onClick={() => handleCopy(singleProductData.barcode, "barcode")}
                      >
                        {copied === "barcode" ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-700 text-slate-300 hover:bg-slate-800"
                      onClick={() => downloadQRCode(singleProductData)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Tải QR
                    </Button>
                    <Button
                      size="sm"
                      className="bg-sky-500 hover:bg-sky-600"
                      onClick={handlePrintSingle}
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      In nhãn
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Batch Mode */}
          {products.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Barcode className="w-4 h-4" />
                  In hàng loạt
                </h3>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-sky-400 hover:text-sky-300 hover:bg-sky-500/10"
                    onClick={selectAllProducts}
                  >
                    Chọn tất cả
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-white"
                    onClick={deselectAllProducts}
                  >
                    Bỏ chọn
                  </Button>
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto border border-slate-700 rounded-lg">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className={`flex items-center gap-3 p-3 border-b border-slate-700/50 last:border-b-0 cursor-pointer transition-colors ${
                      selectedProducts.has(product.id)
                        ? "bg-sky-500/10"
                        : "hover:bg-slate-800/50"
                    }`}
                    onClick={() => toggleProductSelection(product.id)}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        selectedProducts.has(product.id)
                          ? "bg-sky-500 border-sky-500"
                          : "border-slate-600"
                      }`}
                    >
                      {selectedProducts.has(product.id) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{product.name}</p>
                      <p className="text-slate-400 text-sm font-mono">
                        {product.sku}
                        {product.barcode && product.barcode !== product.sku && (
                          <span className="ml-2 text-slate-500">
                            | {product.barcode}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {selectedProducts.size > 0 && (
                <div className="flex items-center justify-between">
                  <Badge className="bg-sky-500/20 text-sky-400 border-sky-500/30">
                    Đã chọn: {selectedProducts.size} sản phẩm
                  </Badge>
                  <Button
                    size="sm"
                    className="bg-emerald-500 hover:bg-emerald-600"
                    onClick={handlePrintBatch}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    In {selectedProducts.size} nhãn
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Label Size Info */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h4 className="text-sm font-semibold text-white mb-2">
              Kích thước nhãn chuẩn
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-400">Kích thước</p>
                <p className="text-white font-mono">50mm x 30mm</p>
              </div>
              <div>
                <p className="text-slate-400">Phù hợp máy in</p>
                <p className="text-white">Xprinter, TSC, Zebra</p>
              </div>
              <div>
                <p className="text-slate-400">Loại giấy</p>
                <p className="text-white">Decal trắng, giấy in mã vạch</p>
              </div>
              <div>
                <p className="text-slate-400">Khoảng cách nhãn</p>
                <p className="text-white font-mono">2mm</p>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden print content */}
        <div ref={printRef} className="hidden print:block">
          {singleProductData && (
            <div className="p-4">
              <QRCode
                value={qrData(singleProductData)}
                size={100}
                bgColor="#ffffff"
                fgColor="#000000"
              />
              <p className="text-center font-bold mt-2">{singleProductData.sku}</p>
              <p className="text-center text-sm">{singleProductData.name}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
