"use client";

import { useState, useMemo } from "react";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  ArrowRight,
  Download,
  Filter,
  Search,
  Clock,
  User,
  Package,
  ClipboardList,
  ShoppingCart,
  Truck,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuditLogs } from "@/lib/store";
import { AuditAction, UserRole } from "@/lib/types";

const ACTION_LABELS: Partial<Record<AuditAction, string>> = {
  [AuditAction.CREATE]: "Tạo mới",
  [AuditAction.UPDATE]: "Cập nhật",
  [AuditAction.DELETE]: "Xóa",
  [AuditAction.VIEW]: "Xem",
  [AuditAction.APPROVE]: "Phê duyệt",
  [AuditAction.REJECT]: "Từ chối",
  [AuditAction.COMPLETE]: "Hoàn thành",
  [AuditAction.SEND]: "Gửi",
  [AuditAction.IMPORT]: "Nhập liệu",
  [AuditAction.EXPORT]: "Xuất liệu",
  [AuditAction.PRINT]: "In ấn",
  [AuditAction.ADJUST]: "Điều chỉnh",
};

const ACTION_COLORS: Partial<Record<AuditAction, string>> = {
  [AuditAction.CREATE]: "bg-emerald-500/10 text-emerald-400 border-0",
  [AuditAction.UPDATE]: "bg-sky-500/10 text-sky-400 border-0",
  [AuditAction.DELETE]: "bg-red-500/10 text-red-400 border-0",
  [AuditAction.VIEW]: "bg-slate-500/10 text-slate-400 border-0",
  [AuditAction.APPROVE]: "bg-violet-500/10 text-violet-400 border-0",
  [AuditAction.REJECT]: "bg-orange-500/10 text-orange-400 border-0",
  [AuditAction.COMPLETE]: "bg-emerald-500/10 text-emerald-400 border-0",
  [AuditAction.SEND]: "bg-amber-500/10 text-amber-400 border-0",
  [AuditAction.IMPORT]: "bg-cyan-500/10 text-cyan-400 border-0",
  [AuditAction.EXPORT]: "bg-blue-500/10 text-blue-400 border-0",
  [AuditAction.PRINT]: "bg-pink-500/10 text-pink-400 border-0",
  [AuditAction.ADJUST]: "bg-pink-500/10 text-pink-400 border-0",
};

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  Product: <Package className="w-4 h-4 text-sky-400" />,
  PurchaseOrder: <ShoppingCart className="w-4 h-4 text-violet-400" />,
  GoodsReceipt: <ClipboardList className="w-4 h-4 text-emerald-400" />,
  GoodsIssue: <ClipboardList className="w-4 h-4 text-red-400" />,
  StocktakeSession: <ClipboardList className="w-4 h-4 text-amber-400" />,
  Supplier: <Truck className="w-4 h-4 text-amber-400" />,
  User: <User className="w-4 h-4 text-slate-400" />,
  InventoryItem: <Package className="w-4 h-4 text-cyan-400" />,
};

export function AuditLogPage() {
  const logs = useAuditLogs();

  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Filter logs
  const filteredLogs = useMemo(() => {
    let filtered = [...logs];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (log: any) =>
          log.entityName?.toLowerCase().includes(search) ||
          log.entityId?.toLowerCase().includes(search) ||
          log.userName?.toLowerCase().includes(search)
      );
    }

    if (actionFilter !== "all") {
      filtered = filtered.filter((log: any) => log.action === actionFilter);
    }

    if (entityFilter !== "all") {
      filtered = filtered.filter((log: any) => log.entity === entityFilter);
    }

    if (userFilter !== "all") {
      filtered = filtered.filter((log: any) => log.userId === userFilter);
    }

    if (dateFrom) {
      filtered = filtered.filter(
        (log: any) => new Date(log.createdAt) >= new Date(dateFrom)
      );
    }

    if (dateTo) {
      filtered = filtered.filter(
        (log: any) => new Date(log.createdAt) <= new Date(dateTo + "T23:59:59")
      );
    }

    return filtered.sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [logs, searchTerm, actionFilter, entityFilter, userFilter, dateFrom, dateTo]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  const paginatedLogs = filteredLogs.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Get unique values for filters
  const uniqueEntities = [...new Set(logs.map((l: any) => l.entity))];
  const uniqueUsers = [...new Set(logs.map((l: any) => l.userName).filter(Boolean))];

  const handleExport = () => {
    const csvContent = [
      ["Thời gian", "Người dùng", "Hành động", "Module", "Đối tượng", "ID", "Chi tiết"].join(","),
      ...filteredLogs.map((log: any) =>
        [
          formatDateTime(log.createdAt),
          log.userName || log.userId,
          ACTION_LABELS[log.action as AuditAction] || log.action,
          log.entity,
          log.entityName,
          log.entityId,
          JSON.stringify(log.newValue || {}),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Nhật ký hoạt động</h1>
          <p className="text-slate-400 mt-1">
            Theo dõi toàn bộ thao tác trên hệ thống
          </p>
        </div>
        <Button
          onClick={handleExport}
          className="bg-emerald-500 hover:bg-emerald-600"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Excel
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Tìm kiếm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700"
              />
            </div>

            <Select value={actionFilter} onValueChange={(v) => setActionFilter(v || "all")}>
              <SelectTrigger className="w-40 bg-slate-800 border-slate-700">
                <SelectValue placeholder="Hành động" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">Tất cả hành động</SelectItem>
                {Object.entries(ACTION_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={entityFilter} onValueChange={(v) => setEntityFilter(v || "all")}>
              <SelectTrigger className="w-40 bg-slate-800 border-slate-700">
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">Tất cả module</SelectItem>
                {uniqueEntities.map((entity) => (
                  <SelectItem key={entity} value={entity}>
                    {entity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={userFilter} onValueChange={(v) => setUserFilter(v || "all")}>
              <SelectTrigger className="w-40 bg-slate-800 border-slate-700">
                <SelectValue placeholder="Người dùng" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">Tất cả</SelectItem>
                {uniqueUsers.map((user) => (
                  <SelectItem key={user} value={user}>
                    {user}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-36 bg-slate-800 border-slate-700"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-36 bg-slate-800 border-slate-700"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400 w-44">Thời gian</TableHead>
                <TableHead className="text-slate-400">Người dùng</TableHead>
                <TableHead className="text-slate-400">Hành động</TableHead>
                <TableHead className="text-slate-400">Module</TableHead>
                <TableHead className="text-slate-400">Đối tượng</TableHead>
                <TableHead className="text-slate-400 w-20">Chi tiết</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLogs.map((log: any) => (
                <TableRow
                  key={log.id}
                  className="border-slate-800/50 hover:bg-slate-800/30 cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  <TableCell className="text-slate-400">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <span className="text-sm">{formatDateTime(log.createdAt)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-500" />
                      <span className="text-white">{log.userName || log.userId}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={ACTION_COLORS[log.action as AuditAction] || "bg-slate-500/10 text-slate-400 border-0"}>
                      {ACTION_LABELS[log.action as AuditAction] || log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {ENTITY_ICONS[log.entity] || <FileText className="w-4 h-4 text-slate-400" />}
                      <span className="text-slate-300">{log.entity}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-white">{log.entityName || log.entityId}</span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-sky-400">
                      Xem
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedLogs.length === 0 && (
                <TableRow className="border-slate-800/50">
                  <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                    Không có nhật ký nào
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-slate-800">
              <p className="text-slate-400 text-sm">
                Hiển thị {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredLogs.length)} của{" "}
                {filteredLogs.length} kết quả
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="border-slate-700"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-slate-400 text-sm">
                  Trang {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="border-slate-700"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <SheetContent className="bg-slate-900 border-slate-800 w-full sm:max-w-lg overflow-y-auto">
          {selectedLog && (
            <>
              <SheetHeader>
                <SheetTitle className="text-white">Chi tiết nhật ký</SheetTitle>
                <SheetDescription className="text-slate-400">
                  {formatDateTime(selectedLog.createdAt)}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Summary */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Hành động:</span>
                      <Badge className={ACTION_COLORS[selectedLog.action as AuditAction] || "bg-slate-500/10 text-slate-400 border-0"}>
                        {ACTION_LABELS[selectedLog.action as AuditAction] || selectedLog.action}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Module:</span>
                      <span className="text-white">{selectedLog.entity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Đối tượng:</span>
                      <span className="text-white">{selectedLog.entityName || selectedLog.entityId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ID:</span>
                      <span className="text-slate-300 font-mono text-sm">{selectedLog.entityId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Người thực hiện:</span>
                      <span className="text-white">{selectedLog.userName || selectedLog.userId}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Diff */}
                {(selectedLog.oldValue || selectedLog.newValue) && (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-slate-300">Thay đổi</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedLog.oldValue && (
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Giá trị cũ:</p>
                          <pre className="bg-slate-900 p-3 rounded-lg text-sm text-red-400 overflow-x-auto">
                            {JSON.stringify(selectedLog.oldValue, null, 2)}
                          </pre>
                        </div>
                      )}
                      {selectedLog.newValue && (
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Giá trị mới:</p>
                          <pre className="bg-slate-900 p-3 rounded-lg text-sm text-emerald-400 overflow-x-auto">
                            {JSON.stringify(selectedLog.newValue, null, 2)}
                          </pre>
                        </div>
                      )}
                      {selectedLog.reason && (
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Lý do:</p>
                          <p className="text-slate-300">{selectedLog.reason}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function formatDateTime(date: Date | string): string {
  if (!date) return "-";
  return new Date(date).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
