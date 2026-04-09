"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell, ErrorBoundary } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import {
  Warehouse,
  Building2,
  MapPin,
  Package,
  Search,
  Filter,
  ChevronRight,
  Boxes,
} from "lucide-react";

interface WarehouseWithStats {
  id: string;
  name: string;
  code: string;
  address: string;
  type: string;
  capacity: number;
  isActive: boolean;
  _stats: {
    itemCount: number;
    totalValue: number;
  };
}

interface WarehouseForm {
  name: string;
  code: string;
  address: string;
  type: string;
  capacity: number;
  isActive: boolean;
}

const WAREHOUSE_TYPES = [
  { value: "RAW_MATERIAL", label: "Nguyên vật liệu" },
  { value: "FINISHED_GOODS", label: "Thành phẩm" },
  { value: "DISTRIBUTION", label: "Phân phối" },
  { value: "BONDED", label: "Kho ngoại quan" },
  { value: "COLD_STORAGE", label: "Kho lạnh" },
  { value: "HAZARDOUS", label: "Kho chứa hàng nguy hiểm" },
];

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

export default function WarehousesPage() {
  const router = useRouter();
  const [warehousesData, setWarehousesData] = useState<WarehouseWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<WarehouseForm>({
    name: "",
    code: "",
    address: "",
    type: "DISTRIBUTION",
    capacity: 0,
    isActive: true,
  });

  // Fetch warehouses
  useEffect(() => {
    async function fetchWarehouses() {
      try {
        const res = await fetch("/api/warehouses?includeStats=true");
        if (res.ok) {
          const data = await res.json();
          setWarehousesData(data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch warehouses:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchWarehouses();
  }, []);

  // Handle form input change
  const handleFormChange = (field: keyof WarehouseForm, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Handle create warehouse
  const handleCreateWarehouse = async () => {
    if (!form.name || !form.code) {
      toast.error("Vui lòng nhập đầy đủ thông tin bắt buộc");
      return;
    }

    setIsSubmitting(true);
    try {
      const newWarehouse = {
        id: `wh-${Date.now()}`,
        ...form,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Gọi API tạo warehouse
      const res = await fetch("/api/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newWarehouse),
      });

      if (res.ok) {
        // Cập nhật local state
        setWarehousesData((prev) => [...prev, { ...newWarehouse, _stats: { itemCount: 0, totalValue: 0 } }]);
        toast.success("Tạo kho mới thành công");
        setIsCreateOpen(false);
        setForm({
          name: "",
          code: "",
          address: "",
          type: "DISTRIBUTION",
          capacity: 0,
          isActive: true,
        });
      } else {
        toast.error("Tạo kho thất bại");
      }
    } catch (error) {
      console.error("Failed to create warehouse:", error);
      toast.error("Tạo kho thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredWarehouses = warehousesData.filter((warehouse) => {
    const matchesSearch =
      warehouse.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warehouse.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warehouse.address?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && warehouse.isActive) ||
      (statusFilter === "inactive" && !warehouse.isActive);
    return matchesSearch && matchesStatus;
  });

  const totalItems = warehousesData.reduce((sum, w) => sum + w._stats.itemCount, 0);
  const totalValue = warehousesData.reduce((sum, w) => sum + w._stats.totalValue, 0);

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
      <ErrorBoundary moduleName="Kho hàng">
        <AppShell>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
          </div>
        </AppShell>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary moduleName="Kho hàng">
      <AppShell>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Kho hàng</h1>
              <p className="text-slate-400 mt-1">
                Quản lý thông tin kho và vị trí lưu trữ
              </p>
            </div>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-sky-500 hover:bg-sky-600 text-white"
            >
              <Building2 className="w-4 h-4 mr-2" />
              Thêm kho mới
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-sky-500/10">
                    <Building2 className="w-6 h-6 text-sky-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{warehousesData.length}</p>
                    <p className="text-sm text-slate-400">Tổng số kho</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-emerald-500/10">
                    <Package className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{formatNumber(totalItems)}</p>
                    <p className="text-sm text-slate-400">Mặt hàng tồn kho</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-purple-500/10">
                    <Boxes className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{formatCurrency(totalValue)}</p>
                    <p className="text-sm text-slate-400">Tổng giá trị tồn</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-amber-500/10">
                    <Building2 className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {warehousesData.filter((w) => w.isActive).length}
                    </p>
                    <p className="text-sm text-slate-400">Kho đang hoạt động</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Tìm kiếm kho..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-800 border-slate-700 text-slate-200"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value || "all")}>
                  <SelectTrigger className="w-40 bg-slate-800 border-slate-700">
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="active">Hoạt động</SelectItem>
                    <SelectItem value="inactive">Ngừng hoạt động</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Warehouse List */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Kho</TableHead>
                    <TableHead className="text-slate-400">Loại kho</TableHead>
                    <TableHead className="text-slate-400">Địa chỉ</TableHead>
                    <TableHead className="text-right text-slate-400">Sức chứa</TableHead>
                    <TableHead className="text-right text-slate-400">Mặt hàng</TableHead>
                    <TableHead className="text-right text-slate-400">Giá trị tồn</TableHead>
                    <TableHead className="text-center text-slate-400">Trạng thái</TableHead>
                    <TableHead className="text-right text-slate-400">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWarehouses.map((warehouse) => (
                    <TableRow
                      key={warehouse.id}
                      className="border-slate-800/50 hover:bg-slate-800/30 cursor-pointer transition-all duration-300"
                      onClick={() => router.push(`/warehouses/${warehouse.id}`)}
                    >
                      <TableCell className="font-medium">
                        <div>
                          <p className="text-white font-mono text-sm">{warehouse.code}</p>
                          <p className="text-slate-300 text-sm">{warehouse.name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {getWarehouseTypeLabel(warehouse.type)}
                      </TableCell>
                      <TableCell className="text-slate-400 max-w-xs truncate">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0" />
                          {warehouse.address}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-slate-300">
                        {formatNumber(warehouse.capacity || 0)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-white">
                        {formatNumber(warehouse._stats.itemCount)}
                      </TableCell>
                      <TableCell className="text-right text-emerald-400 font-medium">
                        {formatCurrency(warehouse._stats.totalValue)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={
                            warehouse.isActive
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-red-500/10 text-red-400"
                          }
                        >
                          {warehouse.isActive ? "Hoạt động" : "Ngừng"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-sky-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/warehouses/${warehouse.id}`);
                          }}
                        >
                          Chi tiết
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredWarehouses.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  Không có kho nào
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AppShell>

      {/* Create Warehouse Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Thêm kho mới</DialogTitle>
            <DialogDescription className="text-slate-400">
              Nhập thông tin kho hàng mới
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="wh-code">Mã kho *</Label>
              <Input
                id="wh-code"
                placeholder="VD: WH-HCM-01"
                value={form.code}
                onChange={(e) => handleFormChange("code", e.target.value.toUpperCase())}
                className="bg-slate-800 border-slate-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wh-name">Tên kho *</Label>
              <Input
                id="wh-name"
                placeholder="VD: Kho Hồ Chí Minh"
                value={form.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                className="bg-slate-800 border-slate-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wh-type">Loại kho</Label>
              <Select value={form.type} onValueChange={(v) => handleFormChange("type", v)}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {WAREHOUSE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wh-address">Địa chỉ</Label>
              <Input
                id="wh-address"
                placeholder="VD: 123 Nguyễn Huệ, Q1, TP.HCM"
                value={form.address}
                onChange={(e) => handleFormChange("address", e.target.value)}
                className="bg-slate-800 border-slate-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wh-capacity">Sức chứa (đơn vị)</Label>
              <Input
                id="wh-capacity"
                type="number"
                min={0}
                placeholder="VD: 10000"
                value={form.capacity || ""}
                onChange={(e) => handleFormChange("capacity", parseInt(e.target.value) || 0)}
                className="bg-slate-800 border-slate-700"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              className="border-slate-700 text-slate-300"
            >
              Hủy
            </Button>
            <Button
              onClick={handleCreateWarehouse}
              disabled={isSubmitting || !form.name || !form.code}
              className="bg-sky-500 hover:bg-sky-600"
            >
              {isSubmitting ? "Đang tạo..." : "Tạo kho"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  );
}
