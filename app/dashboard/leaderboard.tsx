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
  Trophy,
  Medal,
  Star,
  Zap,
  Target,
  Clock,
  TrendingUp,
  Award,
  Crown,
  Sparkles,
  CheckCircle2,
  Flame,
} from "lucide-react";

interface Employee {
  id: string;
  name: string;
  role: string;
  avatar: string;
}

interface EmployeeStats {
  employee: Employee;
  monthlyReceipts: number;
  monthlyIssues: number;
  accuracy: number;
  avgProcessingTime: number;
  totalScore: number;
  rank: number;
  badges: Badge[];
  trend: "up" | "down" | "stable";
}

interface Badge {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

// Mock employees
const EMPLOYEES: Employee[] = [
  { id: "emp-001", name: "Nguyễn Văn Minh", role: "Nhân viên kho", avatar: "NVM" },
  { id: "emp-002", name: "Trần Thị Lan", role: "Nhân viên kho", avatar: "TTL" },
  { id: "emp-003", name: "Lê Văn Hùng", role: "Quản lý kho", avatar: "LVH" },
  { id: "emp-004", name: "Phạm Thị Mai", role: "Nhân viên kho", avatar: "PTM" },
  { id: "emp-005", name: "Hoàng Văn Tuấn", role: "Nhân viên kho", avatar: "HVT" },
  { id: "emp-006", name: "Đặng Thị Hương", role: "Nhân viên kho", avatar: "DTH" },
  { id: "emp-007", name: "Bùi Văn Nam", role: "Nhân viên kho", avatar: "BVN" },
  { id: "emp-008", name: "Ngô Thị Vân", role: "Nhân viên kho", avatar: "NTV" },
];

function generateBadges(stats: any): Badge[] {
  const badges: Badge[] = [];

  if (stats.monthlyReceipts + stats.monthlyIssues >= 100) {
    badges.push({
      id: "hundred",
      name: "100 Phiếu",
      icon: <Trophy className="w-4 h-4" />,
      color: "text-yellow-400",
      description: "Xử lý 100 phiếu trong tháng",
    });
  }

  if (stats.accuracy >= 99) {
    badges.push({
      id: "precision",
      name: "Siêu Chính Xác",
      icon: <Target className="w-4 h-4" />,
      color: "text-emerald-400",
      description: "Tỷ lệ chính xác trên 99%",
    });
  }

  if (stats.avgProcessingTime <= 5) {
    badges.push({
      id: "speed",
      name: "Tốc Độ Ánh Sáng",
      icon: <Zap className="w-4 h-4" />,
      color: "text-sky-400",
      description: "Thời gian xử lý dưới 5 phút",
    });
  }

  if (stats.monthlyReceipts + stats.monthlyIssues >= 200) {
    badges.push({
      id: "champion",
      name: "Vua Kho",
      icon: <Crown className="w-4 h-4" />,
      color: "text-violet-400",
      description: "Xử lý 200 phiếu trong tháng",
    });
  }

  if (stats.accuracy >= 95 && stats.avgProcessingTime <= 10) {
    badges.push({
      id: "efficient",
      name: "Hiệu Quả Cao",
      icon: <Award className="w-4 h-4" />,
      color: "text-amber-400",
      description: "Chính xác cao, nhanh chóng",
    });
  }

  return badges.slice(0, 3);
}

function calculateScore(stats: any): number {
  const receiptScore = stats.monthlyReceipts * 5;
  const issueScore = stats.monthlyIssues * 5;
  const accuracyScore = stats.accuracy * 2;
  const timeScore = Math.max(0, (30 - stats.avgProcessingTime) * 3);

  return receiptScore + issueScore + accuracyScore + timeScore;
}

export function Leaderboard() {
  const [selectedMonth, setSelectedMonth] = useState<string>("current");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Generate mock stats for employees
  const leaderboardData = useMemo((): EmployeeStats[] => {
    return EMPLOYEES.map((employee) => {
      // Generate random but consistent stats
      const seed = employee.id.charCodeAt(employee.id.length - 1);
      const baseReceipts = 30 + (seed % 50);
      const baseIssues = 40 + ((seed + 5) % 60);
      const baseAccuracy = 85 + (seed % 15);
      const baseTime = 5 + ((seed + 10) % 20);

      const stats = {
        monthlyReceipts: baseReceipts,
        monthlyIssues: baseIssues,
        accuracy: baseAccuracy,
        avgProcessingTime: baseTime,
      };

      const totalScore = calculateScore(stats);
      const badges = generateBadges(stats);

      // Determine trend
      const trend: "up" | "down" | "stable" =
        seed % 3 === 0 ? "up" : seed % 3 === 1 ? "down" : "stable";

      return {
        employee,
        ...stats,
        totalScore,
        rank: 0,
        badges,
        trend,
      };
    })
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));
  }, [selectedMonth]);

  // Top performers
  const top3 = leaderboardData.slice(0, 3);

  // Stats summary
  const summary = useMemo(() => {
    const totalTransactions = leaderboardData.reduce(
      (sum, e) => sum + e.monthlyReceipts + e.monthlyIssues,
      0
    );
    const avgAccuracy =
      leaderboardData.reduce((sum, e) => sum + e.accuracy, 0) /
      leaderboardData.length;
    const avgTime =
      leaderboardData.reduce((sum, e) => sum + e.avgProcessingTime, 0) /
      leaderboardData.length;

    return {
      totalTransactions,
      avgAccuracy: avgAccuracy.toFixed(1),
      avgTime: avgTime.toFixed(1),
    };
  }, [leaderboardData]);

  const getRankIcon = (rank: number) => {
    if (rank === 1)
      return <Crown className="w-6 h-6 text-yellow-400 fill-yellow-400" />;
    if (rank === 2)
      return <Medal className="w-6 h-6 text-slate-300 fill-slate-300" />;
    if (rank === 3)
      return <Medal className="w-6 h-6 text-amber-600 fill-amber-600" />;
    return <span className="text-lg font-bold text-slate-400">{rank}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20">
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Bảng xếp hạng</h2>
            <p className="text-slate-400 text-sm">Thành tích nhân viên kho tháng này</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
            className={viewMode === "table" ? "bg-sky-500" : "border-slate-700"}
          >
            Bảng
          </Button>
          <Button
            variant={viewMode === "cards" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("cards")}
            className={viewMode === "cards" ? "bg-sky-500" : "border-slate-700"}
          >
            Thẻ
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{summary.totalTransactions}</p>
            <p className="text-sm text-slate-400">Tổng giao dịch</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 text-center">
            <Target className="w-6 h-6 text-sky-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-sky-400">{summary.avgAccuracy}%</p>
            <p className="text-sm text-slate-400">Độ chính xác TB</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-amber-400">{summary.avgTime} phút</p>
            <p className="text-sm text-slate-400">Thời gian TB</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4 text-center">
            <Flame className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-amber-400">7</p>
            <p className="text-sm text-slate-400">Huy hiệu đạt được</p>
          </CardContent>
        </Card>
      </div>

      {/* Podium */}
      {top3.length >= 3 && (
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-end justify-center gap-4">
              {/* 2nd Place */}
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center mx-auto mb-2 ring-4 ring-slate-600">
                  <span className="text-2xl font-bold text-white">
                    {top3[1].employee.avatar}
                  </span>
                </div>
                <Badge className="bg-slate-500/20 text-slate-300 border-0 mb-1">
                  #{top3[1].rank}
                </Badge>
                <p className="text-white font-medium text-sm">{top3[1].employee.name}</p>
                <p className="text-slate-400 text-xs">{top3[1].totalScore} điểm</p>
                <div className="h-24 w-20 bg-gradient-to-t from-slate-600 to-slate-700 rounded-t-lg mt-2 flex items-center justify-center">
                  <Medal className="w-8 h-8 text-slate-300" />
                </div>
              </div>

              {/* 1st Place */}
              <div className="text-center">
                <Sparkles className="w-6 h-6 text-yellow-400 mx-auto mb-1 animate-pulse" />
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center mx-auto mb-2 ring-4 ring-yellow-500/50">
                  <span className="text-3xl font-bold text-white">
                    {top3[0].employee.avatar}
                  </span>
                </div>
                <Badge className="bg-yellow-500/20 text-yellow-400 border-0 mb-1">
                  #{top3[0].rank}
                </Badge>
                <p className="text-white font-bold">{top3[0].employee.name}</p>
                <p className="text-yellow-400 text-sm font-medium">{top3[0].totalScore} điểm</p>
                <div className="h-32 w-24 bg-gradient-to-t from-amber-600 to-yellow-500 rounded-t-lg mt-2 flex items-center justify-center">
                  <Crown className="w-10 h-10 text-white" />
                </div>
              </div>

              {/* 3rd Place */}
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center mx-auto mb-2 ring-4 ring-amber-700/50">
                  <span className="text-2xl font-bold text-white">
                    {top3[2].employee.avatar}
                  </span>
                </div>
                <Badge className="bg-amber-500/20 text-amber-400 border-0 mb-1">
                  #{top3[2].rank}
                </Badge>
                <p className="text-white font-medium text-sm">{top3[2].employee.name}</p>
                <p className="text-slate-400 text-xs">{top3[2].totalScore} điểm</p>
                <div className="h-16 w-20 bg-gradient-to-t from-amber-700 to-amber-800 rounded-t-lg mt-2 flex items-center justify-center">
                  <Medal className="w-8 h-8 text-amber-600" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard Table */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400" />
            Bảng xếp hạng chi tiết
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400 w-16">Hạng</TableHead>
                <TableHead className="text-slate-400">Nhân viên</TableHead>
                <TableHead className="text-right text-slate-400">Phiếu nhập</TableHead>
                <TableHead className="text-right text-slate-400">Phiếu xuất</TableHead>
                <TableHead className="text-center text-slate-400">Độ chính xác</TableHead>
                <TableHead className="text-center text-slate-400">Thời gian TB</TableHead>
                <TableHead className="text-center text-slate-400">Xu hướng</TableHead>
                <TableHead className="text-right text-slate-400">Tổng điểm</TableHead>
                <TableHead className="text-slate-400">Huy hiệu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboardData.map((item) => (
                <TableRow key={item.employee.id} className="border-slate-800/50">
                  <TableCell>
                    <div className="flex items-center justify-center w-10 h-10">
                      {getRankIcon(item.rank)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center">
                        <span className="text-sm font-bold text-white">{item.employee.avatar}</span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{item.employee.name}</p>
                        <p className="text-slate-400 text-sm">{item.employee.role}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-emerald-400 font-medium">{item.monthlyReceipts}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sky-400 font-medium">{item.monthlyIssues}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className={`font-medium ${
                        item.accuracy >= 95 ? "text-emerald-400" :
                        item.accuracy >= 90 ? "text-sky-400" : "text-amber-400"
                      }`}>
                        {item.accuracy}%
                      </span>
                      {item.accuracy >= 99 && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-medium ${
                      item.avgProcessingTime <= 10 ? "text-emerald-400" :
                      item.avgProcessingTime <= 15 ? "text-sky-400" : "text-amber-400"
                    }`}>
                      {item.avgProcessingTime} phút
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {item.trend === "up" && <TrendingUp className="w-5 h-5 text-emerald-400 inline" />}
                    {item.trend === "down" && <TrendingUp className="w-5 h-5 text-red-400 inline rotate-180" />}
                    {item.trend === "stable" && <span className="text-slate-400">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-amber-400 font-bold">{item.totalScore}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {item.badges.map((badge) => (
                        <div
                          key={badge.id}
                          className={`${badge.color} cursor-help`}
                          title={badge.description}
                        >
                          {badge.icon}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Achievement Badges */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-violet-400" />
            Huy hiệu thành tích
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 bg-slate-800/50 rounded-lg text-center">
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-2">
                <Trophy className="w-6 h-6 text-yellow-400" />
              </div>
              <p className="text-white font-medium text-sm">100 Phiếu</p>
              <p className="text-slate-400 text-xs mt-1">Xử lý 100 phiếu</p>
              <Badge className="mt-2 bg-yellow-500/10 text-yellow-400 border-0 text-xs">
                3 người đạt
              </Badge>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-lg text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-2">
                <Target className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-white font-medium text-sm">Siêu Chính Xác</p>
              <p className="text-slate-400 text-xs mt-1">Độ chính xác &gt;99%</p>
              <Badge className="mt-2 bg-emerald-500/10 text-emerald-400 border-0 text-xs">
                2 người đạt
              </Badge>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-lg text-center">
              <div className="w-12 h-12 rounded-full bg-sky-500/20 flex items-center justify-center mx-auto mb-2">
                <Zap className="w-6 h-6 text-sky-400" />
              </div>
              <p className="text-white font-medium text-sm">Tốc Độ Ánh Sáng</p>
              <p className="text-slate-400 text-xs mt-1">Dưới 5 phút/phiếu</p>
              <Badge className="mt-2 bg-sky-500/10 text-sky-400 border-0 text-xs">
                4 người đạt
              </Badge>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-lg text-center">
              <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center mx-auto mb-2">
                <Crown className="w-6 h-6 text-violet-400" />
              </div>
              <p className="text-white font-medium text-sm">Vua Kho</p>
              <p className="text-slate-400 text-xs mt-1">200+ phiếu/tháng</p>
              <Badge className="mt-2 bg-violet-500/10 text-violet-400 border-0 text-xs">
                1 người đạt
              </Badge>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-lg text-center">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-2">
                <Award className="w-6 h-6 text-amber-400" />
              </div>
              <p className="text-white font-medium text-sm">Hiệu Quả Cao</p>
              <p className="text-slate-400 text-xs mt-1">Nhanh + Chính xác</p>
              <Badge className="mt-2 bg-amber-500/10 text-amber-400 border-0 text-xs">
                5 người đạt
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
