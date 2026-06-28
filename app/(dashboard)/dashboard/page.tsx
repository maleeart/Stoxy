"use client";

import {
  Package, CheckCircle, ArrowLeftRight, AlertTriangle,
  Clock, ShieldAlert, Activity, TrendingUp,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { useDashboardStats, useRecentMovements } from "@/hooks/useInventory";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { formatRelative } from "@/lib/utils";
import { AppShell } from "@/components/layout/AppShell";
import { getBorrowRecords } from "@/services/borrow.service";
import { getRequisitions } from "@/services/requisition.service";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import type { StockMovement } from "@/types";

const movementTypeLabel: Record<string, string> = {
  borrow: "ยืม", return: "คืน",
  adjustment_in: "รับเข้า", adjustment_out: "จ่ายออก",
  requisition: "เบิก",
};
const movementTypeColor: Record<string, string> = {
  borrow: "bg-blue-100 text-blue-700",
  return: "bg-emerald-100 text-emerald-700",
  adjustment_in: "bg-green-100 text-green-700",
  adjustment_out: "bg-orange-100 text-orange-700",
  requisition: "bg-purple-100 text-purple-700",
};

function buildWeeklyData(movements: StockMovement[]) {
  const dayNames = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const dateStr = d.toDateString();
    const day = movements.filter((m) => m.createdAt.toDate().toDateString() === dateStr);
    return {
      day: dayNames[d.getDay()],
      ยืม: day.filter((m) => m.type === "borrow" || m.type === "adjustment_out").length,
      คืน: day.filter((m) => m.type === "return" || m.type === "adjustment_in").length,
    };
  });
}

export default function DashboardPage() {
  const { stoxyUser } = useAuth();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: movements = [], isLoading: movementsLoading } = useRecentMovements(100);

  const { data: borrows = [] } = useQuery({
    queryKey: ["borrows", "dashboard"],
    queryFn: () => getBorrowRecords(),
    staleTime: 1000 * 60 * 2,
  });
  const { data: requisitions = [] } = useQuery({
    queryKey: ["requisitions", "dashboard"],
    queryFn: () => getRequisitions(),
    staleTime: 1000 * 60 * 2,
  });

  const now = new Date();
  const overdueCount = borrows.filter(
    (b) => b.status === "borrowed" && b.expectedReturnDate.toDate() < now
  ).length;
  const pendingCount =
    borrows.filter((b) => b.status === "pending_approval").length +
    requisitions.filter((r) => r.status === "pending").length;

  const weeklyData = buildWeeklyData(movements);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "อรุณสวัสดิ์";
    if (h < 17) return "สวัสดีตอนบ่าย";
    return "สวัสดีตอนเย็น";
  };

  return (
    <AppShell title="แดชบอร์ด">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {greeting()},{" "}
          <span className="text-[#0d2137] dark:text-yellow-400">
            {stoxyUser?.displayName ?? "ผู้ใช้งาน"}
          </span>{" "}
          👋
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">ภาพรวมระบบคลังไฟฟ้าวันนี้</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="อุปกรณ์ทั้งหมด" value={statsLoading ? "—" : stats?.totalItems ?? 0} icon={Package} color="blue" href="/inventory" index={0} />
        <StatCard title="พร้อมใช้งาน" value={statsLoading ? "—" : stats?.availableQuantity ?? 0} icon={CheckCircle} color="green" href="/inventory" index={1} />
        <StatCard title="ถูกยืมออก" value={statsLoading ? "—" : stats?.borrowedQuantity ?? 0} icon={ArrowLeftRight} color="yellow" href="/borrow" index={2} />
        <StatCard title="สต็อกต่ำ" value={statsLoading ? "—" : stats?.lowStockCount ?? 0} icon={AlertTriangle} color="red" href="/purchase" index={3} />
        <StatCard title="เกินกำหนดคืน" value={overdueCount} icon={Clock} color="red" href="/return" index={4} />
        <StatCard title="รออนุมัติทั้งหมด" value={pendingCount} icon={ShieldAlert} color="yellow" href="/notifications" index={5} />
      </div>

      {/* Chart + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              การเคลื่อนไหว 7 วันล่าสุด
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">ยืม/เบิก vs รับเข้า/คืน</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "13px" }} />
              <Bar dataKey="ยืม" fill="#1a3a5c" radius={[4, 4, 0, 0]} />
              <Bar dataKey="คืน" fill="#f5a623" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-yellow-500" />
            กิจกรรมล่าสุด
          </h3>
          <div className="space-y-3">
            {movementsLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse flex gap-3">
                  <div className="w-14 h-5 bg-gray-100 dark:bg-gray-800 rounded" />
                  <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded" />
                </div>
              ))
            ) : movements.length > 0 ? (
              movements.slice(0, 8).map((m) => (
                <div key={m.id} className="flex items-start gap-2.5">
                  <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded-md font-medium ${movementTypeColor[m.type] ?? "bg-gray-100 text-gray-600"}`}>
                    {movementTypeLabel[m.type] ?? m.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{m.itemName}</p>
                    <p className="text-xs text-gray-400">{formatRelative(m.createdAt)}</p>
                  </div>
                  <span className={`text-xs font-semibold shrink-0 ${m.quantityChange >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {m.quantityChange >= 0 ? "+" : ""}{m.quantityChange}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">ยังไม่มีกิจกรรม</p>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
