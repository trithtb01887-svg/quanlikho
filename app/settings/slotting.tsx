"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowRight,
  MapPin,
  Package,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Move,
} from "lucide-react";
import { useProducts, useInventoryItems, useGoodsIssues } from "@/lib/store";

interface ZoneSlot {
  zone: string;
  aisle: number;
  rack: number;
  shelf: number;
  frequency: number;
  sku: string | null;
  productName: string | null;
  currentMovements: number;
  suggestedNewSlot: string | null;
  benefit: string;
}

function generateSlotId(zone: string, aisle: number, rack: number, shelf: number): string {
  return `${zone}-${aisle}-${rack}-${shelf}`;
}

export function SlottingOptimization() {
  const products = useProducts();
  const inventoryItems = useInventoryItems();
  const goodsIssues = useGoodsIssues();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Generate mock warehouse layout
  const zones = ["A", "B", "C", "D"];
  const aisles = [1, 2, 3];
  const racks = [1, 2, 3, 4, 5];

  const warehouseLayout = useMemo(() => {
    // Calculate movement frequency for each product
    const productMovements: Record<string, number> = {};
    goodsIssues.forEach((gi: any) => {
      gi.items?.forEach((item: any) => {
        productMovements[item.productId] = (productMovements[item.productId] || 0) + (item.quantity || 0);
      });
    });

    // Generate slots with mock data
    const slots: ZoneSlot[] = [];
    const assignedProducts = new Set<string>();

    zones.forEach((zone) => {
      aisles.forEach((aisle) => {
        racks.forEach((rack) => {
          for (let shelf = 1; shelf <= 4; shelf++) {
            const slotId = generateSlotId(zone, aisle, rack, shelf);

            // Assign products to slots based on movement frequency
            let sku: string | null = null;
            let productName: string | null = null;
            let currentMovements = 0;

            // Higher shelves get faster moving items (easier access)
            if (shelf <= 2 && assignedProducts.size < products.length) {
              // Find unassigned product with highest movements
              const unassignedProducts = products
                .filter((p: any) => !assignedProducts.has(p.id))
                .map((p: any) => ({
                  ...p,
                  movements: productMovements[p.id] || Math.floor(Math.random() * 20),
                }))
                .sort((a: any, b: any) => b.movements - a.movements);

              if (unassignedProducts.length > 0) {
                const selectedProduct = unassignedProducts[0];
                sku = selectedProduct.sku;
                productName = selectedProduct.name;
                currentMovements = selectedProduct.movements;
                assignedProducts.add(selectedProduct.id);
              }
            }

            const frequency = currentMovements > 0
              ? Math.min(currentMovements / 2, 100)
              : Math.floor(Math.random() * 20);

            slots.push({
              zone,
              aisle,
              rack,
              shelf,
              frequency,
              sku,
              productName,
              currentMovements,
              suggestedNewSlot: null,
              benefit: "",
            });
          }
        });
      });
    });

    return slots;
  }, [products, inventoryItems, goodsIssues]);

  // Calculate suggestions
  const suggestions = useMemo(() => {
    const highFrequencySlots = warehouseLayout
      .filter((s) => s.frequency > 50 && s.shelf > 2)
      .sort((a, b) => b.frequency - a.frequency);

    const lowFrequencySlots = warehouseLayout
      .filter((s) => s.frequency < 20 && s.shelf <= 2)
      .sort((a, b) => a.frequency - b.frequency);

    return highFrequencySlots.slice(0, 5).map((slot) => {
      // Find a better slot for this item
      const betterSlot = warehouseLayout.find(
        (s) =>
          s.shelf <= 2 &&
          s.frequency < 20 &&
          s.zone === slot.zone &&
          !s.sku
      );

      const benefit = betterSlot
        ? `Di chuyển lên kệ cao hơn sẽ giảm 15-20% thời gian lấy hàng`
        : `Nên đặt gần cửa ra vào để tăng tốc độ xuất hàng`;

      return {
        ...slot,
        suggestedNewSlot: betterSlot ? generateSlotId(betterSlot.zone, betterSlot.aisle, betterSlot.rack, betterSlot.shelf) : null,
        benefit,
      };
    });
  }, [warehouseLayout]);

  // Get heat color based on frequency
  const getHeatColor = (frequency: number): string => {
    if (frequency > 80) return "bg-red-500";
    if (frequency > 60) return "bg-orange-500";
    if (frequency > 40) return "bg-yellow-500";
    if (frequency > 20) return "bg-lime-500";
    return "bg-emerald-500";
  };

  // Stats
  const stats = useMemo(() => {
    const totalSlots = warehouseLayout.length;
    const occupiedSlots = warehouseLayout.filter((s) => s.sku).length;
    const avgFrequency = warehouseLayout.reduce((sum, s) => sum + s.frequency, 0) / totalSlots;
    const highFreqSlots = warehouseLayout.filter((s) => s.frequency > 50).length;

    return { totalSlots, occupiedSlots, avgFrequency: Math.round(avgFrequency), highFreqSlots };
  }, [warehouseLayout]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/20">
            <MapPin className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Tối ưu vị trí kho (Slotting)</h2>
            <p className="text-slate-400 text-sm">AI phân tích và đề xuất sắp xếp kho hiệu quả</p>
          </div>
        </div>
        <Badge className="bg-emerald-500/10 text-emerald-400 border-0">
          <Sparkles className="w-3 h-3 mr-1" />
          AI-Powered
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 text-center">
            <Package className="w-6 h-6 text-sky-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{stats.occupiedSlots}</p>
            <p className="text-sm text-slate-400">Vị trí đang sử dụng</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 text-center">
            <MapPin className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{stats.totalSlots - stats.occupiedSlots}</p>
            <p className="text-sm text-slate-400">Vị trí trống</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{stats.avgFrequency}</p>
            <p className="text-sm text-slate-400">Tần suất TB (lần/tháng)</p>
          </CardContent>
        </Card>
        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="p-4 text-center">
            <TrendingDown className="w-6 h-6 text-red-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-400">{stats.highFreqSlots}</p>
            <p className="text-sm text-slate-400">Vị trí cần tối ưu</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Heat Map */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-violet-400" />
              Bản đồ nhiệt kho
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {zones.map((zone) => (
                <div key={zone}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-slate-700 text-white">Zone {zone}</Badge>
                    <span className="text-slate-500 text-xs">
                      {warehouseLayout.filter((s) => s.zone === zone && s.sku).length} vị trí sử dụng
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {aisles.map((aisle) => (
                      <div key={aisle} className="space-y-1">
                        <p className="text-xs text-slate-500 text-center">A{aisle}</p>
                        {racks.slice(0, 3).map((rack) => {
                          const slot = warehouseLayout.find(
                            (s) => s.zone === zone && s.aisle === aisle && s.rack === rack && s.shelf === 1
                          );
                          if (!slot) return <div key={`${aisle}-${rack}`} className="w-8 h-8" />;

                          return (
                            <div
                              key={`${aisle}-${rack}`}
                              className={`w-8 h-8 rounded ${getHeatColor(slot.frequency)} ${
                                slot.sku ? "" : "opacity-30"
                              } flex items-center justify-center text-xs font-bold text-white cursor-pointer hover:ring-2 hover:ring-sky-400 transition-all`}
                              onClick={() => setSelectedSlot(generateSlotId(zone, aisle, rack, 1))}
                              title={slot.productName || "Trống"}
                            >
                              {slot.sku ? slot.shelf : "-"}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-emerald-500" />
                  <span className="text-xs text-slate-400">Ít hoạt động</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-yellow-500" />
                  <span className="text-xs text-slate-400">Trung bình</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-500" />
                  <span className="text-xs text-slate-400">Nhiều hoạt động</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Suggestions */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Đề xuất tối ưu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-sky-500/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-sky-500/10">
                      <Move className="w-5 h-5 text-sky-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-red-500/10 text-red-400 border-0">
                          {suggestion.frequency} lần/tháng
                        </Badge>
                        <span className="text-slate-500 text-sm">•</span>
                        <span className="text-slate-400 text-sm">
                          Kệ {suggestion.zone}{suggestion.aisle}-{suggestion.rack}-{suggestion.shelf}
                        </span>
                      </div>
                      <p className="text-white font-medium">{suggestion.productName}</p>
                      <p className="text-slate-400 text-sm font-mono mt-1">{suggestion.sku}</p>

                      {suggestion.suggestedNewSlot && (
                        <div className="flex items-center gap-2 mt-2 text-sm">
                          <span className="text-slate-500">Nên chuyển đến:</span>
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-0">
                            <ArrowRight className="w-3 h-3 mr-1" />
                            {suggestion.suggestedNewSlot}
                          </Badge>
                        </div>
                      )}

                      <p className="text-sky-400 text-sm mt-2">
                        💡 {suggestion.benefit}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {suggestions.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Kho đang được sắp xếp tối ưu!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Chi tiết vị trí cần tối ưu</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400">Vị trí hiện tại</TableHead>
                <TableHead className="text-slate-400">Sản phẩm</TableHead>
                <TableHead className="text-right text-slate-400">Tần suất/tháng</TableHead>
                <TableHead className="text-slate-400">Vị trí đề xuất</TableHead>
                <TableHead className="text-slate-400">Lợi ích</TableHead>
                <TableHead className="text-right text-slate-400">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suggestions.map((item, index) => (
                <TableRow key={index} className="border-slate-800/50">
                  <TableCell>
                    <Badge className="bg-slate-700 text-white">
                      {item.zone}{item.aisle}-{item.rack}-{item.shelf}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-white">{item.productName}</p>
                      <p className="text-slate-400 text-sm font-mono">{item.sku}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`font-bold ${
                      item.frequency > 60 ? "text-red-400" :
                      item.frequency > 40 ? "text-amber-400" : "text-slate-300"
                    }`}>
                      {item.frequency} lần
                    </span>
                  </TableCell>
                  <TableCell>
                    {item.suggestedNewSlot ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-0">
                        <ArrowRight className="w-3 h-3 mr-1" />
                        {item.suggestedNewSlot}
                      </Badge>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-slate-400 text-sm">{item.benefit}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="border-sky-500/50 text-sky-400 hover:bg-sky-500/10">
                      Áp dụng
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
