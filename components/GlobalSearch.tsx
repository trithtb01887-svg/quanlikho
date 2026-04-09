"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Package,
  ShoppingCart,
  Truck,
  FileText,
  ClipboardList,
  X,
  ArrowRight,
  Command,
} from "lucide-react";
import {
  useProducts,
  usePurchaseOrders,
  useGoodsReceipts,
  useGoodsIssues,
  useSuppliers,
} from "@/lib/store";

interface SearchResult {
  id: string;
  type: "product" | "po" | "grn" | "gi" | "supplier";
  title: string;
  subtitle: string;
  href: string;
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  const products = useProducts();
  const purchaseOrders = usePurchaseOrders();
  const goodsReceipts = useGoodsReceipts();
  const goodsIssues = useGoodsIssues();
  const suppliers = useSuppliers();

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Search results
  const results = useMemo((): SearchResult[] => {
    if (!query.trim()) return [];

    const q = query.toLowerCase();
    const searchResults: SearchResult[] = [];

    // Products
    products
      .filter((p: any) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .forEach((p: any) => {
        searchResults.push({
          id: p.id,
          type: "product",
          title: p.name,
          subtitle: `SKU: ${p.sku} • ${formatCurrency(p.costPrice)}`,
          href: "/inventory",
        });
      });

    // Purchase Orders
    purchaseOrders
      .filter((po: any) =>
        po.orderNumber?.toLowerCase().includes(q) ||
        po.supplierName?.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .forEach((po: any) => {
        searchResults.push({
          id: po.id,
          type: "po",
          title: po.orderNumber,
          subtitle: `${po.supplierName || "NCC"} • ${formatCurrency(po.totalValue)}`,
          href: "/purchase-order",
        });
      });

    // Goods Receipts
    goodsReceipts
      .filter((gr: any) =>
        gr.receiptNumber?.toLowerCase().includes(q) ||
        gr.supplierName?.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .forEach((gr: any) => {
        searchResults.push({
          id: gr.id,
          type: "grn",
          title: gr.receiptNumber,
          subtitle: `${gr.supplierName || "NCC"} • ${formatDate(gr.receiptDate)}`,
          href: "/goods-receipt",
        });
      });

    // Goods Issues
    goodsIssues
      .filter((gi: any) =>
        gi.issueNumber?.toLowerCase().includes(q) ||
        gi.issueTo?.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .forEach((gi: any) => {
        searchResults.push({
          id: gi.id,
          type: "gi",
          title: gi.issueNumber,
          subtitle: `${gi.issueTo || "Khách hàng"} • ${formatDate(gi.issueDate)}`,
          href: "/goods-issue",
        });
      });

    // Suppliers
    suppliers
      .filter((s: any) =>
        s.name?.toLowerCase().includes(q) ||
        s.code?.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .forEach((s: any) => {
        searchResults.push({
          id: s.id,
          type: "supplier",
          title: s.name,
          subtitle: `${s.code} • ${s.contactName || ""}`,
          href: "/suppliers",
        });
      });

    return searchResults;
  }, [query, products, purchaseOrders, goodsReceipts, goodsIssues, suppliers]);

  // Group results by type
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {
      product: [],
      po: [],
      grn: [],
      gi: [],
      supplier: [],
    };

    results.forEach((r) => {
      groups[r.type].push(r);
    });

    return groups;
  }, [results]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      }
      if (e.key === "Enter" && results[selectedIndex]) {
        router.push(results[selectedIndex].href);
        setIsOpen(false);
        setQuery("");
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, results, selectedIndex, router]);

  const getTypeIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "product":
        return <Package className="w-4 h-4 text-sky-400" />;
      case "po":
        return <ShoppingCart className="w-4 h-4 text-violet-400" />;
      case "grn":
        return <ClipboardList className="w-4 h-4 text-emerald-400" />;
      case "gi":
        return <ClipboardList className="w-4 h-4 text-red-400" />;
      case "supplier":
        return <Truck className="w-4 h-4 text-amber-400" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  const getTypeLabel = (type: SearchResult["type"]) => {
    switch (type) {
      case "product":
        return "Sản phẩm";
      case "po":
        return "Đơn mua hàng";
      case "grn":
        return "Phiếu nhập kho";
      case "gi":
        return "Phiếu xuất kho";
      case "supplier":
        return "Nhà cung cấp";
      default:
        return type;
    }
  };

  let currentIndex = 0;

  return (
    <>
      {/* Search Button */}
      <div className="relative hidden md:block">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
        >
          <Search className="w-4 h-4" />
          <span className="text-sm">Tìm kiếm...</span>
          <kbd className="hidden lg:flex items-center gap-1 px-2 py-1 bg-slate-700 rounded text-xs">
            <Command className="w-3 h-3" />K
          </kbd>
        </button>
      </div>

      {/* Search Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 p-0 gap-0 max-w-2xl w-[calc(100%-2rem)]">
          <div className="p-4 border-b border-slate-700">
            <DialogTitle className="sr-only">Tìm kiếm toàn cục</DialogTitle>
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Tìm sản phẩm, đơn hàng, phiếu, nhà cung cấp..."
                className="bg-transparent border-0 text-lg text-white placeholder:text-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0"
                autoFocus
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="p-1 hover:bg-slate-800 rounded"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>
          </div>

          <ScrollArea className="max-h-96">
            {query && results.length === 0 ? (
              <div className="p-8 text-center">
                <Search className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p className="text-slate-400">Không tìm thấy kết quả nào</p>
                <p className="text-slate-500 text-sm mt-1">
                  Thử tìm với từ khóa khác
                </p>
              </div>
            ) : query ? (
              <div className="p-2">
                {Object.entries(groupedResults).map(([type, items]) => {
                  if (items.length === 0) return null;

                  return (
                    <div key={type} className="mb-4">
                      <div className="px-3 py-2 flex items-center gap-2">
                        {getTypeIcon(type as SearchResult["type"])}
                        <span className="text-xs font-medium text-slate-400 uppercase">
                          {getTypeLabel(type as SearchResult["type"])}
                        </span>
                        <Badge className="bg-slate-700 text-slate-300 border-0 text-xs">
                          {items.length}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        {items.map((item) => {
                          const itemIndex = currentIndex++;
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                router.push(item.href);
                                setIsOpen(false);
                                setQuery("");
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                                itemIndex === selectedIndex
                                  ? "bg-sky-500/20 text-sky-400"
                                  : "hover:bg-slate-800 text-slate-300"
                              }`}
                            >
                              {getTypeIcon(item.type)}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{item.title}</p>
                                <p className="text-sm text-slate-500 truncate">
                                  {item.subtitle}
                                </p>
                              </div>
                              <ArrowRight className="w-4 h-4 text-slate-500" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Search className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p className="text-slate-400">Nhập từ khóa để tìm kiếm</p>
                <p className="text-slate-500 text-sm mt-1">
                  Tìm sản phẩm, đơn hàng, phiếu nhập/xuất, nhà cung cấp
                </p>
              </div>
            )}
          </ScrollArea>

          {results.length > 0 && (
            <div className="p-3 border-t border-slate-700 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <span>
                  <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">↑</kbd>
                  <kbd className="px-1.5 py-0.5 bg-slate-800 rounded ml-1">↓</kbd>{" "}
                  Di chuyển
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">Enter</kbd> Chọn
                </span>
              </div>
              <span>{results.length} kết quả</span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

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
