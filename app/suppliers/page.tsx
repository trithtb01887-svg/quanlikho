"use client";

import { useState, useEffect } from "react";
import { AppShell, ErrorBoundary } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Truck, Phone, Mail, MapPin, Search, Filter } from "lucide-react";
import { useSuppliers, useSupplierActions } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface SupplierForm {
  name: string;
  code: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  isActive: boolean;
}

export default function SuppliersPage() {
  const suppliers = useSuppliers();
  const { addSupplier, fetchSuppliers } = useSupplierActions();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<SupplierForm>({
    name: "",
    code: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    isActive: true,
  });

  // Fetch data on mount
  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Handle form input change
  const handleFormChange = (field: keyof SupplierForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Handle create supplier
  const handleCreateSupplier = async () => {
    if (!form.name || !form.code) {
      toast.error("Vui lòng nhập đầy đủ thông tin bắt buộc");
      return;
    }

    setIsSubmitting(true);
    try {
      const newSupplier = {
        id: `sup-${Date.now()}`,
        ...form,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Gọi API tạo supplier
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSupplier),
      });

      if (res.ok) {
        // Cập nhật local state
        addSupplier(newSupplier as any);
        toast.success("Tạo nhà cung cấp mới thành công");
        setIsCreateOpen(false);
        setForm({
          name: "",
          code: "",
          contactPerson: "",
          phone: "",
          email: "",
          address: "",
          isActive: true,
        });
      } else {
        toast.error("Tạo nhà cung cấp thất bại");
      }
    } catch (error) {
      console.error("Failed to create supplier:", error);
      toast.error("Tạo nhà cung cấp thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSuppliers = suppliers.filter((supplier: any) => {
    const matchesSearch =
      supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.phone?.includes(searchTerm);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && supplier.isActive) ||
      (statusFilter === "inactive" && !supplier.isActive);
    return matchesSearch && matchesStatus;
  });

  const activeCount = suppliers.filter((s: any) => s.isActive).length;

  return (
    <ErrorBoundary moduleName="Nhà cung cấp">
      <AppShell>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Nhà cung cấp</h1>
              <p className="text-slate-400 mt-1">Quản lý thông tin nhà cung cấp</p>
            </div>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-sky-500 hover:bg-sky-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Thêm nhà cung cấp
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-sky-500/10">
                    <Truck className="w-6 h-6 text-sky-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{suppliers.length}</p>
                    <p className="text-sm text-slate-400">Tổng nhà cung cấp</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-emerald-500/10">
                    <span className="text-2xl font-bold text-emerald-400">{activeCount}</span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Đang hoạt động</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-purple-500/10">
                    <span className="text-2xl font-bold text-purple-400">{suppliers.length - activeCount}</span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Ngừng hoạt động</p>
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
                    placeholder="Tìm kiếm nhà cung cấp..."
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

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="border-b border-slate-800 pb-4">
              <CardTitle className="text-white">Danh sách nhà cung cấp</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Tên nhà cung cấp</TableHead>
                    <TableHead className="text-slate-400">Người liên hệ</TableHead>
                    <TableHead className="text-slate-400">Số điện thoại</TableHead>
                    <TableHead className="text-slate-400">Email</TableHead>
                    <TableHead className="text-slate-400">Địa chỉ</TableHead>
                    <TableHead className="text-center text-slate-400">Trạng thái</TableHead>
                    <TableHead className="text-right text-slate-400">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier: any) => (
                    <TableRow key={supplier.id} className="border-slate-800/50 hover:bg-slate-800/30">
                      <TableCell className="font-medium text-white">{supplier.name}</TableCell>
                      <TableCell className="text-slate-300">{supplier.contactPerson || supplier.contact}</TableCell>
                      <TableCell className="text-slate-300">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-slate-500" />
                          {supplier.phone}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-slate-500" />
                          {supplier.email}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400 max-w-xs truncate">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0" />
                          {supplier.address}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={supplier.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}>
                          {supplier.isActive ? "Hoạt động" : "Không hoạt động"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-sky-400">
                          Xem chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredSuppliers.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  Không có nhà cung cấp nào
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AppShell>

      {/* Create Supplier Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Thêm nhà cung cấp mới</DialogTitle>
            <DialogDescription className="text-slate-400">
              Nhập thông tin nhà cung cấp mới
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sup-code">Mã NCC *</Label>
              <Input
                id="sup-code"
                placeholder="VD: NCC-001"
                value={form.code}
                onChange={(e) => handleFormChange("code", e.target.value.toUpperCase())}
                className="bg-slate-800 border-slate-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sup-name">Tên NCC *</Label>
              <Input
                id="sup-name"
                placeholder="VD: Công ty TNHH ABC"
                value={form.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                className="bg-slate-800 border-slate-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sup-contact">Người liên hệ</Label>
              <Input
                id="sup-contact"
                placeholder="VD: Nguyễn Văn A"
                value={form.contactPerson}
                onChange={(e) => handleFormChange("contactPerson", e.target.value)}
                className="bg-slate-800 border-slate-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sup-phone">Số điện thoại</Label>
                <Input
                  id="sup-phone"
                  placeholder="VD: 0901234567"
                  value={form.phone}
                  onChange={(e) => handleFormChange("phone", e.target.value)}
                  className="bg-slate-800 border-slate-700"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sup-email">Email</Label>
                <Input
                  id="sup-email"
                  type="email"
                  placeholder="VD: email@example.com"
                  value={form.email}
                  onChange={(e) => handleFormChange("email", e.target.value)}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sup-address">Địa chỉ</Label>
              <Input
                id="sup-address"
                placeholder="VD: 123 Đường ABC, Quận 1, TP.HCM"
                value={form.address}
                onChange={(e) => handleFormChange("address", e.target.value)}
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
              onClick={handleCreateSupplier}
              disabled={isSubmitting || !form.name || !form.code}
              className="bg-sky-500 hover:bg-sky-600"
            >
              {isSubmitting ? "Đang tạo..." : "Tạo NCC"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  );
}
