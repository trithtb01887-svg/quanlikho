"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWarehouseStore } from "@/lib/store";
import { MOCK_USERS, ROLE_LABELS, ROLE_COLORS, ROLE_BG_COLORS } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Warehouse,
  User,
  Shield,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { UserRole } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const login = useWarehouseStore((state) => state.login);
  const isAuthenticated = useWarehouseStore((state) => state.isAuthenticated);

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const selectedUser = MOCK_USERS.find((u) => u.id === selectedUserId);

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsLoading(true);

      try {
        if (!selectedUser) {
          setError("Vui lòng chọn người dùng");
          return;
        }

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Remove password from user object
        const { password: _, ...userWithoutPassword } = selectedUser;
        login(userWithoutPassword);

        router.push("/dashboard");
      } catch (err) {
        setError("Đăng nhập thất bại. Vui lòng thử lại.");
      } finally {
        setIsLoading(false);
      }
    },
    [selectedUser, login, router]
  );

  if (isAuthenticated) {
    router.push("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 mb-4">
            <Warehouse className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Quản Lý Kho</h1>
          <p className="text-slate-400">Hệ thống quản lý kho hàng</p>
        </div>

        <Card className="bg-slate-900/80 border-slate-800 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-white">Đăng nhập Demo</CardTitle>
            <CardDescription className="text-slate-400">
              Chọn tài khoản để trải nghiệm hệ thống với các quyền hạn khác nhau
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              {/* User Selection */}
              <div className="space-y-2">
                <Label htmlFor="user">Chọn tài khoản</Label>
                <Select value={selectedUserId} onValueChange={(v) => setSelectedUserId(v || "")}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="-- Chọn người dùng --" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {MOCK_USERS.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <span>{user.fullName}</span>
                          <Badge
                            className={`${ROLE_BG_COLORS[user.role]} ${ROLE_COLORS[user.role]} border-0 text-xs`}
                          >
                            {ROLE_LABELS[user.role]}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* User Preview */}
              {selectedUser && (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white font-medium">{selectedUser.fullName}</p>
                          <Badge
                            className={`${ROLE_BG_COLORS[selectedUser.role]} ${ROLE_COLORS[selectedUser.role]} border-0 text-xs`}
                          >
                            {ROLE_LABELS[selectedUser.role]}
                          </Badge>
                        </div>
                        <p className="text-slate-400 text-sm">{selectedUser.email}</p>
                        <p className="text-slate-500 text-xs mt-1">Mã NV: {selectedUser.employeeId}</p>
                      </div>
                    </div>

                    {/* Permissions Preview */}
                    <div className="mt-4 pt-4 border-t border-slate-700">
                      <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Quyền hạn:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {selectedUser.role === UserRole.ADMIN && (
                          <>
                            <PermissionTag label="Full Access" />
                            <PermissionTag label="Cài đặt" />
                          </>
                        )}
                        {selectedUser.role === UserRole.WAREHOUSE_MANAGER && (
                          <>
                            <PermissionTag label="Xem tất cả" />
                            <PermissionTag label="Phê duyệt" />
                            <PermissionTag label="Báo cáo" />
                          </>
                        )}
                        {selectedUser.role === UserRole.WAREHOUSE_STAFF && (
                          <>
                            <PermissionTag label="Tạo GRN/GI" />
                            <PermissionTag label="Kiểm kê" />
                            <PermissionTag label="Read-only KH" />
                          </>
                        )}
                        {selectedUser.role === UserRole.PURCHASER && (
                          <>
                            <PermissionTag label="Quản lý PO" />
                            <PermissionTag label="Xem tồn kho" />
                            <PermissionTag label="NCC" />
                          </>
                        )}
                        {selectedUser.role === UserRole.ACCOUNTANT && (
                          <>
                            <PermissionTag label="Read-only" />
                            <PermissionTag label="Giá trị tồn" />
                            <PermissionTag label="Export" />
                          </>
                        )}
                        {selectedUser.role === UserRole.AUDITOR && (
                          <>
                            <PermissionTag label="Audit Log" />
                            <PermissionTag label="Spot Check" />
                            <PermissionTag label="View only" />
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={!selectedUserId || isLoading}
                className="w-full bg-sky-500 hover:bg-sky-600"
              >
                {isLoading ? (
                  "Đang đăng nhập..."
                ) : (
                  <>
                    Đăng nhập
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info Footer */}
        <div className="mt-6 text-center">
          <p className="text-slate-500 text-sm">
            Đây là chế độ demo. Tất cả dữ liệu là mẫu.
          </p>
          <p className="text-slate-600 text-xs mt-1">
            Không cần mật khẩu - chỉ cần chọn tài khoản
          </p>
        </div>

        {/* Role Quick Access */}
        <div className="mt-6 grid grid-cols-3 gap-2">
          {MOCK_USERS.slice(0, 3).map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => setSelectedUserId(user.id)}
              className={`p-2 rounded-lg border text-left transition-all ${
                selectedUserId === user.id
                  ? "border-sky-500 bg-sky-500/10"
                  : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
              }`}
            >
              <p className={`text-xs font-medium ${selectedUserId === user.id ? "text-sky-400" : "text-slate-400"}`}>
                {user.fullName?.split(" ").pop()}
              </p>
              <p className="text-[10px] text-slate-500 truncate">{ROLE_LABELS[user.role]}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PermissionTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-700/50 rounded text-xs text-slate-300">
      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
      {label}
    </span>
  );
}
