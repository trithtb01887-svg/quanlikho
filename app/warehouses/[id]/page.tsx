"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell, ErrorBoundary } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Building2,
  MapPin,
  Package,
  Search,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Box,
  Grid3X3,
} from "lucide-react";

interface InventoryItem {
  id: string;
  productId: string;
  warehouseId: string;
  locationZone: string | null;
  locationAisle: string | null;
  locationRack: string | null;
  locationShelf: string | null;
  locationBin: string | null;
  lotNumber: string | null;
  quantityAvailable: number;
  product: {
    id: string;
    name: string;
    sku: string;
    barcode: string | null;
    category: string;
    unit: string;
    costPrice: number;
    sellingPrice: number;
    reorderPoint: number;
  };
}

interface WarehouseStats {
  itemCount: number;
  totalValue: number;
  lowStockCount: number;
}

interface WarehouseDetail {
  id: string;
  name: string;
  code: string;
  address: string;
  type: string;
  capacity: number;
  isActive: boolean;
  manager: string | null;
  phone: string | null;
  email: string | null;
  groupedByZone: Record<string, Record<string, InventoryItem[]>>;
  stats: WarehouseStats;
}

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

export default function WarehouseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const warehouseId = params.id as string;

  const [warehouse, setWarehouse] = useState<WarehouseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());
  const [expandedRacks, setExpandedRacks] = useState<Set<string>>(new Set());

  // Fetch warehouse
  useEffect(() => {
    async function fetchWarehouse() {
      try {
        const res = await fetch(`/api/warehouses/${warehouseId}`);
        if (res.ok) {
          const data = await res.json();
          setWarehouse(data);
          // Expand all zones by default
          const zones = Object.keys(data.groupedByZone || {});
          setExpandedZones(new Set(zones));
        } else if (res.status === 404) {
          setError("Kho không tìm thấy");
        } else {
          setError("Lỗi khi tải dữ liệu kho");
        }
      } catch (err) {
        console.error("Failed to fetch warehouse:", err);
        setError("Lỗi kết nối");
      } finally {
        setIsLoading(false);
      }
    }
    if (warehouseId) {
      fetchWarehouse();
    }
  }, [warehouseId]);

  // Filter items based on search
  const filterItems = (items: InventoryItem[]) => {
    if (!searchTerm) return items;
    const search = searchTerm.toLowerCase();
    return items.filter(
      (item) =>
        item.product.name.toLowerCase().includes(search) ||
        item.product.sku.toLowerCase().includes(search) ||
        item.lotNumber?.toLowerCase().includes(search)
    );
  };

  // Get filtered grouped data
  const getFilteredGroupedData = () => {
    if (!warehouse) return {};

    const filtered: Record<string, Record<string, InventoryItem[]>> = {};

    Object.entries(warehouse.groupedByZone).forEach(([zone, racks]) => {
      Object.entries(racks).forEach(([rack, items]) => {
        const filteredItems = filterItems(items);
        if (filteredItems.length > 0) {
          if (!filtered[zone]) filtered[zone] = {};
          filtered[zone][rack] = filteredItems;
        }
      });
    });

    return filtered;
  };

  const filteredData = getFilteredGroupedData();

  const toggleZone = (zone: string) => {
    const newExpanded = new Set(expandedZones);
    if (newExpanded.has(zone)) {
      newExpanded.delete(zone);
    } else {
      newExpanded.add(zone);
    }
    setExpandedZones(newExpanded);
  };

  const toggleRack = (rackKey: string) => {
    const newExpanded = new Set(expandedRacks);
    if (newExpanded.has(rackKey)) {
      newExpanded.delete(rackKey);
    } else {
      newExpanded.add(rackKey);
    }
    setExpandedRacks(newExpanded);
  };

  const getWarehouseTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      RAW_MATERIAL: "Nguyên vật liệu",
      FINISHED_GOODS: "Thành phẩm",
      DISTRIBUTION: "Phân phối",
      BONDED: "Kho ngoại quan",
      COLD_STORAGE: "Kho lạnh",
      HAZARDOUS: "Kho chứa hàng nguy hiểm",
    };
    return types[type] || type;
  };

  if (isLoading) {
    return (
      <ErrorBoundary moduleName="Chi tiết kho">
        <AppShell>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-8 w-48" />
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <Skeleton className="h-96" />
          </div>
        </AppShell>
      </ErrorBoundary>
    );
  }

  if (error || !warehouse) {
    return (
      <ErrorBoundary moduleName="Chi tiết kho">
        <AppShell>
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <p className="text-slate-400">{error || "Không tìm thấy kho"}</p>
            <Button onClick={() => router.push("/warehouses")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại danh sách kho
            </Button>
          </div>
        </AppShell>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary moduleName="Chi tiết kho">
      <AppShell>
        <div className="space-y-6">
          {/* Breadcrumb */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="/warehouses"
                  className="text-slate-400 hover:text-white"
                >
                  Kho hàng
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-slate-600" />
              <BreadcrumbItem>
                <span className="text-white font-medium">{warehouse.name}</span>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/warehouses")}
                className="text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <Building2 className="w-8 h-8 text-sky-400" />
                  {warehouse.name}
                  <Badge
                    className={
                      warehouse.isActive
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400"
                    }
                  >
                    {warehouse.isActive ? "Hoạt động" : "Ngừng"}
                  </Badge>
                </h1>
                <p className="text-slate-400 mt-1">
                  Mã kho: {warehouse.code} • {getWarehouseTypeLabel(warehouse.type)}
                </p>
              </div>
            </div>
            <Button className="bg-sky-500 hover:bg-sky-600 text-white">
              <Package className="w-4 h-4 mr-2" />
              Nhập hàng vào kho
            </Button>
          </div>

          {/* Warehouse Info */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-slate-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-400">Địa chỉ</p>
                    <p className="text-white">{warehouse.address || "Chưa cập nhật"}</p>
                  </div>
                </div>
                {warehouse.manager && (
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-slate-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-400">Quản lý kho</p>
                      <p className="text-white">{warehouse.manager}</p>
                    </div>
                  </div>
                )}
                {warehouse.phone && (
                  <div className="flex items-start gap-3">
                    <Box className="w-5 h-5 text-slate-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-400">Điện thoại</p>
                      <p className="text-white">{warehouse.phone}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Grid3X3 className="w-5 h-5 text-slate-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-400">Sức chứa</p>
                    <p className="text-white">
                      {warehouse.capacity ? formatNumber(warehouse.capacity) : "Không giới hạn"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-sky-500/10">
                    <Package className="w-6 h-6 text-sky-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {formatNumber(warehouse.stats.itemCount)}
                    </p>
                    <p className="text-sm text-slate-400">Mặt hàng trong kho</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-emerald-500/10">
                    <Box className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-400">
                      {formatCurrency(warehouse.stats.totalValue)}
                    </p>
                    <p className="text-sm text-slate-400">Tổng giá trị tồn</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-amber-500/10">
                    <Package className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-400">
                      {warehouse.stats.lowStockCount}
                    </p>
                    <p className="text-sm text-slate-400">Sắp hết hàng</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Tìm kiếm sản phẩm trong kho..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700 text-slate-200"
                />
              </div>
            </CardContent>
          </Card>

          {/* Inventory by Location */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Grid3X3 className="w-5 h-5 text-sky-400" />
                Hàng tồn theo vị trí
              </h2>

              {Object.keys(filteredData).length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  Không có hàng tồn trong kho
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(filteredData)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([zone, racks]) => {
                      const isZoneExpanded = expandedZones.has(zone);
                      const totalItemsInZone = Object.values(racks).flat().length;

                      return (
                        <div key={zone} className="border border-slate-700 rounded-lg overflow-hidden">
                          {/* Zone Header */}
                          <button
                            onClick={() => toggleZone(zone)}
                            className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold text-sky-400">
                                Zone {zone}
                              </span>
                              <Badge variant="secondary" className="bg-slate-700 text-slate-300">
                                {totalItemsInZone} mặt hàng
                              </Badge>
                            </div>
                            {isZoneExpanded ? (
                              <ChevronDown className="w-5 h-5 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-slate-400" />
                            )}
                          </button>

                          {/* Racks */}
                          {isZoneExpanded && (
                            <div className="p-4 space-y-3">
                              {Object.entries(racks)
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([rack, items]) => {
                                  const rackKey = `${zone}-${rack}`;
                                  const isRackExpanded = expandedRacks.has(rackKey);

                                  return (
                                    <div key={rack} className="border border-slate-700/50 rounded-lg overflow-hidden">
                                      {/* Rack Header */}
                                      <button
                                        onClick={() => toggleRack(rackKey)}
                                        className="w-full flex items-center justify-between p-3 bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                                      >
                                        <div className="flex items-center gap-2">
                                          <Grid3X3 className="w-4 h-4 text-emerald-400" />
                                          <span className="font-mono text-slate-300">
                                            {zone}-{rack}
                                          </span>
                                          <Badge variant="secondary" className="bg-slate-700/50 text-slate-400">
                                            {items.length} items
                                          </Badge>
                                        </div>
                                        {isRackExpanded ? (
                                          <ChevronDown className="w-4 h-4 text-slate-500" />
                                        ) : (
                                          <ChevronRight className="w-4 h-4 text-slate-500" />
                                        )}
                                      </button>

                                      {/* Items */}
                                      {isRackExpanded && (
                                        <div className="p-3 space-y-2">
                                          {items.map((item) => (
                                            <div
                                              key={item.id}
                                              className="flex items-center justify-between p-3 bg-slate-800/20 rounded-lg hover:bg-slate-800/40 transition-colors"
                                            >
                                              <div className="flex items-center gap-3">
                                                <Box className="w-4 h-4 text-slate-500" />
                                                <div>
                                                  <p className="text-white font-medium">
                                                    {item.locationShelf || "S01"}:{" "}
                                                    <span className="text-sky-400">
                                                      {item.product.sku}
                                                    </span>
                                                  </p>
                                                  <p className="text-slate-400 text-sm">
                                                    {item.product.name}
                                                  </p>
                                                </div>
                                                {item.lotNumber && (
                                                  <Badge variant="outline" className="border-slate-600 text-slate-400">
                                                    Lot: {item.lotNumber}
                                                  </Badge>
                                                )}
                                              </div>
                                              <div className="text-right">
                                                <p className="text-white font-bold">
                                                  {formatNumber(item.quantityAvailable)}
                                                </p>
                                                <p className="text-slate-500 text-sm">
                                                  {item.product.unit}
                                                </p>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </ErrorBoundary>
  );
}
