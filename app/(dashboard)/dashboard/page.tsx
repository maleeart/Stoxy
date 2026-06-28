"use client";

import {
  Package,
  CheckCircle,
  ArrowLeftRight,
  Wrench,
  Gauge,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Activity,
  TrendingUp,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { useDashboardStats, useRecentMovements } from "@/hooks/useInventory";
import { useAuth } from "@/hooks/useAuth";
import { formatRelative } from "@/lib/utils";
import { AppShell } from "@/components/layout/AppShell";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { motion } from "framer-motion";

// Placeholder chart data — replace with real Firestore aggregation
const weeklyData = [
  { day: "จ", borrowed: 4, returned: 2 },
  { day: "อ", borrowed: 7, returned: 5 },
  { day: "พ", borrowed: 3, returned: 6 },
  { day: "พฤ", borrowed: 8, returned: 4 },
  { day: "ศ", borrowed: 5, returned: 7 },
  { day: "ส", borrowed: 2, returned: 3 },
  { day: "อา", borrowed: 1, returned: 1 },
];

const movementTypeLabel: Record<string, string> = {
  borrow: "ยืม",
  return: "คืน",
  adjustment_in: "รับเข้า",
  adjustment_out: "จ่ายออก",
  transfer: "โอนย้าย",
  disposal: "จำหน่าย",
  purchase: "จัดซื้อ",
  maintenance_out: "ส่งซ่อม",
  maintenance_in: "รับคืนซ่อม",
  lost: "สูญหาย",
};

const movementTypeColor: Record<string, string> = {
  borrow: "bg-blue-100 text-blue-700",
  return: "bg-emerald-100 text-emerald-700",
  adjustment_in: "bg-green-100 text-green-700",
  adjustment_out: "bg-orange-100 text-orange-700",
  maintenance_out: "bg-red-100 text-red-700",
  maintenance_in: "bg-purple-100 text-purple-700",
  purchase: "bg-cyan-100 text-cyan-700",
  disposal: "bg-gray-100 text-gray-700",
  lost: "bg-red-100 text-red-700",
  transfer: "bg-yellow-100 text-yellow-700",
};

export default function DashboardPage() {
  const { stoxyUser } = useAuth();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: movements, isLoading: movementsLoading } = useRecentMovements(8);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "อรุณสวัสดิ์";
    if (h < 17) return "สวัสดีตอนบ่าย";
    return "สวัสดีตอนเย็น";
  };

  return (
    <AppShell title="แดชบอร์ด">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {greeting()},{" "}
          <span className="text-[#0d2137] dark:text-yellow-400">
            {stoxyUser?.displayName ?? "ผู้ใช้งาน"}
          </span>{" "}
          👋
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          ภาพรวมระบบคลังไฟฟ้าวันนี้
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="อุปกรณ์ทั้งหมด"
          value={statsLoading ? "—" : stats?.totalItems ?? 0}
          icon={Package}
          color="blue"
          href="/inventory"
          index={0}
        />
        <StatCard
          title="พร้อมใช้งาน"
          value={statsLoading ? "—" : stats?.availableQuantity ?? 0}
          icon={CheckCircle}
          color="green"
          href="/inventory?status=available"
          index={1}
        />
        <StatCard
          title="ถูกยืมออก"
          value={statsLoading ? "—" : stats?.borrowedQuantity ?? 0}
          icon={ArrowLeftRight}
          color="yellow"
          href="/borrow"
          index={2}
        />
        <StatCard
          title="อยู่ระหว่างซ่อม"
          value={statsLoading ? "—" : stats?.underRepairQuantity ?? 0}
          icon={Wrench}
          color="orange"
          href="/maintenance"
          index={3}
        />
        <StatCard
          title="สอบเทียบใกล้หมด"
          value={statsLoading ? "—" : stats?.calibrationDueCount ?? 0}
          icon={Gauge}
          color="purple"
          href="/calibration"
          index={4}
        />
        <StatCard
          title="สต็อกต่ำกว่ากำหนด"
          value={statsLoading ? "—" : stats?.lowStockCount ?? 0}
          icon={AlertTriangle}
          color="red"
          href="/inventory?filter=low_stock"
          index={5}
        />
        <StatCard
          title="เกินกำหนดคืน"
          value={statsLoading ? "—" : stats?.overdueCount ?? 0}
          icon={Clock}
          color="red"
          href="/borrow?status=overdue"
          index={6}
        />
        <StatCard
          title="รออนุมัติ"
          value={statsLoading ? "—" : stats?.pendingApprovalsCount ?? 0}
          icon={ShieldAlert}
          color="yellow"
          href="/borrow?status=pending"
          index={7}
        />
      </div>

      {/* Charts + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                การเคลื่อนไหวรายสัปดาห์
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">ยืม vs คืน 7 วันล่าสุด</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  fontSize: "13px",
                }}
              />
              <Bar dataKey="borrowed" name="ยืม" fill="#1a3a5c" radius={[4, 4, 0, 0]} />
              <Bar dataKey="returned" name="คืน" fill="#f5a623" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-yellow-500" />
            กิจกรรมล่าสุด
          </h3>
          <div className="space-y-3">
            {movementsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse flex gap-3">
                  <div className="w-16 h-5 bg-gray-100 dark:bg-gray-800 rounded" />
                  <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 rounded" />
                </div>
              ))
            ) : movements && movements.length > 0 ? (
              movements.map((m) => (
                <div key={m.id} className="flex items-start gap-2.5">
                  <span
                    className={`shrink-0 text-xs px-1.5 py-0.5 rounded-md font-medium ${
                      movementTypeColor[m.type] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {movementTypeLabel[m.type] ?? m.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                      {m.itemName}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {formatRelative(m.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold shrink-0 ${
                      m.quantityChange >= 0 ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {m.quantityChange >= 0 ? "+" : ""}
                    {m.quantityChange}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">
                ยังไม่มีกิจกรรม
              </p>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
