"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X,
  MessageSquare,
  Send,
  Bot,
  User,
  Package,
  Truck,
  Calendar,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  ShoppingCart,
  BarChart3,
  Sparkles,
} from "lucide-react";
import {
  useProducts,
  useInventoryItems,
  useSuppliers,
  useGoodsReceipts,
  useGoodsIssues,
} from "@/lib/store";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  data?: any;
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

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Xin chào! Tôi là trợ lý AI của hệ thống Quản Lý Kho. Tôi có thể giúp bạn:\n\n• Kiểm tra tồn kho\n• Xem hàng sắp hết hạn\n• Tạo đề xuất đặt hàng\n• Xem báo cáo nhanh\n• Đánh giá nhà cung cấp\n\nBạn cần hỗ trợ gì?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const products = useProducts();
  const inventoryItems = useInventoryItems();
  const suppliers = useSuppliers();
  const goodsReceipts = useGoodsReceipts();
  const goodsIssues = useGoodsIssues();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const processQuery = (query: string): Message => {
    const lowerQuery = query.toLowerCase();

    // Pattern 1: Check inventory for specific product
    const stockMatch = lowerQuery.match(/còn\s*(bao\s*nhiêu)?\s*([\w\s]+?)\s*(trong\s*kho)?$/i);
    if (stockMatch || lowerQuery.includes("còn bao nhiêu")) {
      const productName = stockMatch?.[2]?.trim() || "";
      const results = productName
        ? inventoryItems.filter((item: any) => {
            const product = products.find((p: any) => p.id === item.productId);
            return product?.name.toLowerCase().includes(productName);
          })
        : inventoryItems;

      const data = results.slice(0, 5).map((item: any) => {
        const product = products.find((p: any) => p.id === item.productId);
        return {
          name: product?.name || "Unknown",
          sku: product?.sku || "",
          quantity: item.quantityAvailable,
          reorderPoint: product?.reorderPoint || 0,
          status: item.quantityAvailable <= (product?.reorderPoint || 0) ? "low" : "ok",
        };
      });

      return {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: data.length > 0
          ? `Tìm thấy ${data.length} sản phẩm${productName ? ` liên quan đến "${productName}"` : ""}:`
          : `Không tìm thấy sản phẩm nào${productName ? ` với tên "${productName}"` : ""}.`,
        data,
      };
    }

    // Pattern 2: Expiry check
    if (lowerQuery.includes("hết hạn") || lowerQuery.includes("sắp hết hạn")) {
      const now = new Date();
      const thresholdDays = 30;
      const nearExpiry = inventoryItems
        .filter((item: any) => item.expiryDate)
        .map((item: any) => {
          const product = products.find((p: any) => p.id === item.productId);
          const expiryDate = new Date(item.expiryDate);
          const daysUntil = Math.floor(
            (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          return {
            name: product?.name || "Unknown",
            sku: product?.sku || "",
            lotNumber: item.lotNumber || "-",
            expiryDate,
            daysUntil,
            quantity: item.quantityAvailable,
          };
        })
        .filter((item) => item.daysUntil <= thresholdDays && item.daysUntil > 0)
        .sort((a, b) => a.daysUntil - b.daysUntil)
        .slice(0, 5);

      const expired = inventoryItems
        .filter((item: any) => item.expiryDate && new Date(item.expiryDate) < now)
        .map((item: any) => {
          const product = products.find((p: any) => p.id === item.productId);
          return { name: product?.name || "Unknown", sku: product?.sku || "" };
        });

      return {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: nearExpiry.length > 0
          ? `Có ${nearExpiry.length} mặt hàng sắp hết hạn trong ${thresholdDays} ngày tới${expired.length > 0 ? ` và ${expired.length} đã hết hạn` : ""}:`
          : "Không có hàng nào sắp hết hạn trong 30 ngày tới.",
        data: { nearExpiry, expired },
      };
    }

    // Pattern 3: Create PO suggestion for low stock
    if (lowerQuery.includes("tạo PO") || lowerQuery.includes("đặt hàng") || lowerQuery.includes("hàng hết")) {
      const lowStock = inventoryItems
        .filter((item: any) => {
          const product = products.find((p: any) => p.id === item.productId);
          return product && item.quantityAvailable <= (product.reorderPoint || 0);
        })
        .map((item: any) => {
          const product = products.find((p: any) => p.id === item.productId);
          const suggestedQty = Math.max(
            (product?.reorderPoint || 10) * 2 - item.quantityAvailable,
            (product?.reorderPoint || 10)
          );
          return {
            name: product?.name || "Unknown",
            sku: product?.sku || "",
            currentStock: item.quantityAvailable,
            reorderPoint: product?.reorderPoint || 0,
            suggestedQty,
            unitPrice: product?.costPrice || 0,
            totalValue: suggestedQty * (product?.costPrice || 0),
          };
        })
        .slice(0, 10);

      return {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: lowStock.length > 0
          ? `Có ${lowStock.length} mặt hàng cần đặt hàng (dưới mức tối thiểu):`
          : "Tất cả hàng hóa đều có tồn kho đạt mức an toàn.",
        data: { lowStock },
      };
    }

    // Pattern 4: Daily report
    if (lowerQuery.includes("báo cáo hôm nay") || lowerQuery.includes("hôm nay")) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayReceipts = goodsReceipts.filter((gr: any) => {
        const date = new Date(gr.receiptDate);
        return date >= today;
      });

      const todayIssues = goodsIssues.filter((gi: any) => {
        const date = new Date(gi.issueDate);
        return date >= today;
      });

      const receiptValue = todayReceipts.reduce((sum: number, r: any) => sum + (r.totalValue || 0), 0);
      const issueValue = todayIssues.reduce((sum: number, i: any) => sum + (i.totalValue || 0), 0);

      return {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: `📊 Báo cáo ngày ${formatDate(today)}:`,
        data: {
          date: today,
          receiptCount: todayReceipts.length,
          issueCount: todayIssues.length,
          receiptValue,
          issueValue,
          netValue: receiptValue - issueValue,
        },
      };
    }

    // Pattern 5: Best supplier
    if (lowerQuery.includes("NCC tốt nhất") || lowerQuery.includes("nhà cung cấp tốt") || lowerQuery.includes("đánh giá NCC")) {
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
          };
        }
        supplierStats[gr.supplierId].totalOrders++;
        supplierStats[gr.supplierId].totalValue += gr.totalValue || 0;
        if (gr.status === "completed") {
          supplierStats[gr.supplierId].onTimeDeliveries++;
        }
      });

      const ranked = Object.values(supplierStats)
        .map((s: any) => {
          const supplier = suppliers.find((sup: any) => sup.id === s.supplierId);
          const onTimeRate = s.totalOrders > 0 ? (s.onTimeDeliveries / s.totalOrders) * 100 : 0;
          const rating = supplier?.rating || 3;
          const score = onTimeRate * 0.4 + rating * 20 * 0.6;
          return {
            ...s,
            rating: Number(score.toFixed(1)),
            onTimeRate: onTimeRate.toFixed(1),
            supplier,
          };
        })
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 5);

      return {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: ranked.length > 0
          ? `🏆 Top ${ranked.length} nhà cung cấp xuất sắc nhất:`
          : "Chưa có dữ liệu để đánh giá nhà cung cấp.",
        data: { suppliers: ranked },
      };
    }

    // Pattern 6: Low stock warning
    if (lowerQuery.includes("sắp hết") || lowerQuery.includes("tồn kho thấp")) {
      const lowStock = inventoryItems
        .filter((item: any) => {
          const product = products.find((p: any) => p.id === item.productId);
          return product && item.quantityAvailable <= (product.reorderPoint || 0);
        })
        .map((item: any) => {
          const product = products.find((p: any) => p.id === item.productId);
          return {
            name: product?.name || "Unknown",
            sku: product?.sku || "",
            quantity: item.quantityAvailable,
            reorderPoint: product?.reorderPoint || 0,
            daysOfStock: 0,
          };
        })
        .slice(0, 10);

      return {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: lowStock.length > 0
          ? `⚠️ Có ${lowStock.length} mặt hàng sắp hết hoặc đã hết hàng:`
          : "Tất cả hàng hóa đều có tồn kho trên mức tối thiểu.",
        data: { lowStock },
      };
    }

    // Default response
    return {
      id: `msg-${Date.now()}`,
      role: "assistant",
      content: "Tôi chưa hiểu ý của bạn. Bạn có thể hỏi tôi về:\n\n• \"Còn bao nhiêu [tên hàng]\" - Kiểm tra tồn kho\n• \"Hàng nào sắp hết hạn\" - Danh sách hàng gần hết hạn\n• \"Tạo PO cho hàng hết\" - Đề xuất đặt hàng\n• \"Báo cáo hôm nay\" - Tóm tắt ngày\n• \"NCC nào tốt nhất\" - Xếp hạng nhà cung cấp",
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate AI processing delay
    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 500));

    const response = processQuery(input.trim());
    setMessages((prev) => [...prev, response]);
    setIsTyping(false);
  };

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-50 transition-all duration-300 ${
          isOpen ? "bg-slate-700 hover:bg-slate-600" : "bg-sky-500 hover:bg-sky-600"
        }`}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <div className="relative">
            <MessageSquare className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          </div>
        )}
      </Button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 transition-all duration-300 ${
          isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-700 bg-slate-800/50 rounded-t-xl">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold">Trợ lý AI</h3>
            <p className="text-slate-400 text-xs">Hỗ trợ nghiệp vụ kho</p>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-400 border-0 text-xs">
            <span className="w-2 h-2 bg-emerald-400 rounded-full mr-1 animate-pulse" />
            Online
          </Badge>
        </div>

        {/* Messages */}
        <ScrollArea className="h-80 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id}>
                <div
                  className={`flex items-start gap-2 ${
                    msg.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-slate-300" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-xl p-3 ${
                      msg.role === "user"
                        ? "bg-sky-500 text-white"
                        : "bg-slate-800 text-slate-200"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>

                {/* Data Cards */}
                {msg.data && msg.role === "assistant" && (
                  <div className="mt-2 ml-10 space-y-2">
                    {/* Inventory Data */}
                    {msg.data.name && (
                      <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="w-4 h-4 text-sky-400" />
                            <span className="text-white font-medium">{msg.data.name}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-slate-400">SKU</p>
                              <p className="text-white font-mono">{msg.data.sku}</p>
                            </div>
                            <div>
                              <p className="text-slate-400">Tồn kho</p>
                              <p className={`font-medium ${msg.data.status === "low" ? "text-amber-400" : "text-emerald-400"}`}>
                                {msg.data.quantity}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Low Stock List */}
                    {msg.data.lowStock && !msg.data.name && (
                      <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-3 space-y-2">
                          {msg.data.lowStock.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                                <span className="text-white">{item.name}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-amber-400 font-medium">{item.quantity}</span>
                                <span className="text-slate-500 text-xs ml-1">/ {item.reorderPoint || "-"}</span>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Daily Report */}
                    {msg.data.receiptCount !== undefined && (
                      <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-3 space-y-2">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-2 bg-emerald-500/10 rounded-lg">
                              <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                              <p className="text-2xl font-bold text-emerald-400">{msg.data.receiptCount}</p>
                              <p className="text-xs text-slate-400">Phiếu nhập</p>
                              <p className="text-sm text-emerald-400">{formatCurrency(msg.data.receiptValue)}</p>
                            </div>
                            <div className="text-center p-2 bg-red-500/10 rounded-lg">
                              <TrendingDown className="w-5 h-5 text-red-400 mx-auto mb-1" />
                              <p className="text-2xl font-bold text-red-400">{msg.data.issueCount}</p>
                              <p className="text-xs text-slate-400">Phiếu xuất</p>
                              <p className="text-sm text-red-400">{formatCurrency(msg.data.issueValue)}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Supplier Ranking */}
                    {msg.data.suppliers && (
                      <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-3 space-y-2">
                          {msg.data.suppliers.map((sup: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                                  idx === 0 ? "bg-yellow-500 text-yellow-900" :
                                  idx === 1 ? "bg-slate-400 text-slate-900" :
                                  idx === 2 ? "bg-amber-700 text-amber-100" :
                                  "bg-slate-700 text-slate-300"
                                }`}>
                                  {idx + 1}
                                </span>
                                <span className="text-white">{sup.supplierName}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-emerald-400 font-medium">{sup.rating}</span>
                                <span className="text-slate-500 text-xs">/100</span>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Near Expiry */}
                    {msg.data.nearExpiry && (
                      <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-3 space-y-2">
                          {msg.data.nearExpiry.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-400" />
                                <span className="text-white">{item.name}</span>
                              </div>
                              <Badge className={`${item.daysUntil <= 7 ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"} border-0`}>
                                {item.daysUntil} ngày
                              </Badge>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-slate-800 rounded-xl px-4 py-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-slate-700">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi..."
              className="bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500"
            />
            <Button type="submit" size="icon" className="bg-sky-500 hover:bg-sky-600">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
