"use client";

import { AppShell } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Bell, Palette, Database, Shield, Save } from "lucide-react";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Cài đặt</h1>
          <p className="text-slate-400 mt-1">Quản lý cấu hình hệ thống</p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="general" className="data-[state=active]:bg-sky-500 data-[state=active]:text-white">
              <User className="w-4 h-4 mr-2" />
              Tài khoản
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-sky-500 data-[state=active]:text-white">
              <Bell className="w-4 h-4 mr-2" />
              Thông báo
            </TabsTrigger>
            <TabsTrigger value="appearance" className="data-[state=active]:bg-sky-500 data-[state=active]:text-white">
              <Palette className="w-4 h-4 mr-2" />
              Giao diện
            </TabsTrigger>
            <TabsTrigger value="system" className="data-[state=active]:bg-sky-500 data-[state=active]:text-white">
              <Database className="w-4 h-4 mr-2" />
              Hệ thống
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Thông tin tài khoản</CardTitle>
                <CardDescription className="text-slate-400">
                  Cập nhật thông tin cá nhân của bạn
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-300">Họ và tên</Label>
                    <Input id="name" defaultValue="Nguyễn Văn Admin" className="bg-slate-800 border-slate-700 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-300">Email</Label>
                    <Input id="email" type="email" defaultValue="admin@warehouse.vn" className="bg-slate-800 border-slate-700 text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-slate-300">Số điện thoại</Label>
                    <Input id="phone" defaultValue="0901234567" className="bg-slate-800 border-slate-700 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-slate-300">Vai trò</Label>
                    <Input id="role" defaultValue="Quản trị viên" disabled className="bg-slate-800 border-slate-700 text-slate-400" />
                  </div>
                </div>
                <Separator className="bg-slate-800" />
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-300">Mật khẩu mới</Label>
                  <Input id="password" type="password" placeholder="Nhập mật khẩu mới" className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div className="flex justify-end">
                  <Button className="bg-sky-500 hover:bg-sky-600 text-white">
                    <Save className="w-4 h-4 mr-2" />
                    Lưu thay đổi
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Cài đặt thông báo</CardTitle>
                <CardDescription className="text-slate-400">
                  Quản lý các thông báo bạn nhận được
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-white">Thông báo sản phẩm sắp hết</Label>
                    <p className="text-sm text-slate-400">Nhận thông báo khi sản phẩm xuống dưới mức tối thiểu</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator className="bg-slate-800" />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-white">Thông báo đơn hàng mới</Label>
                    <p className="text-sm text-slate-400">Nhận thông báo khi có đơn đặt hàng mới</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator className="bg-slate-800" />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-white">Thông báo phiếu nhập/xuất</Label>
                    <p className="text-sm text-slate-400">Nhận thông báo khi có phiếu nhập kho hoặc xuất kho mới</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator className="bg-slate-800" />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-white">Email thông báo</Label>
                    <p className="text-sm text-slate-400">Gửi thông báo qua email thay vì trong ứng dụng</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Giao diện</CardTitle>
                <CardDescription className="text-slate-400">
                  Tùy chỉnh giao diện ứng dụng
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-white">Chế độ tối</Label>
                    <p className="text-sm text-slate-400">Sử dụng giao diện tối cho toàn bộ ứng dụng</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator className="bg-slate-800" />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-white">Compact mode</Label>
                    <p className="text-sm text-slate-400">Giảm khoảng cách giữa các phần tử</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Cấu hình hệ thống</CardTitle>
                <CardDescription className="text-slate-400">
                  Các cài đặt hệ thống nâng cao
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-slate-300">Tên công ty</Label>
                    <Input id="company" defaultValue="Công ty TNHH Kho hàng ABC" className="bg-slate-800 border-slate-700 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency" className="text-slate-300">Đơn vị tiền tệ</Label>
                    <Input id="currency" defaultValue="VND" disabled className="bg-slate-800 border-slate-700 text-slate-400" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="warehouse" className="text-slate-300">Tên kho mặc định</Label>
                    <Input id="warehouse" defaultValue="Kho trung tâm" className="bg-slate-800 border-slate-700 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone" className="text-slate-300">Múi giờ</Label>
                    <Input id="timezone" defaultValue="Asia/Ho_Chi_Minh (UTC+7)" disabled className="bg-slate-800 border-slate-700 text-slate-400" />
                  </div>
                </div>
                <Separator className="bg-slate-800" />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-white">Sao lưu tự động</Label>
                    <p className="text-sm text-slate-400">Tự động sao lưu dữ liệu mỗi ngày</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator className="bg-slate-800" />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-white">Nhật ký hoạt động</Label>
                    <p className="text-sm text-slate-400">Ghi lại tất cả hoạt động của người dùng</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}