"use client";

import {
  Package, CheckCircle, ArrowLeftRight, AlertTriangle,
  Clock, ShieldAlert, Activity, TrendingUp,
  PackageOpen, History, Bell, Search, ChevronRight,
} from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { useDashboardStats, useRecentMovements } from "@/hooks/useInventory";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { formatRelative } from "@/lib/utils";
import { AppShell } from "@/components/layout/AppShell";
import { getBorrowRecords } from "@/services/borrow.service";
import { getRequisitions } from "@/services/requisition.service";
import { useRealtimeBorrows } from "@/hooks/useRealtimeBorrows";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
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

// ── Staff home ─────────────────────────────────────────────────────────────────
function StaffHome() {
  const { stoxyUser } = useAuth();
  const router = useRouter();
  const { allRecords } = useRealtimeBorrows();

  const myBorrowed = allRecords.filter(
    (b) => b.status === "borrowed" && b.borrowerId === stoxyUser?.uid
  );
  const myPending = allRecords.filter(
    (b) => b.status === "pending_approval" && b.borrowerId === stoxyUser?.uid
  ).length;
  const myReturnPending = allRecords.filter(
    (b) => b.status === "return_pending" && b.borrowerId === stoxyUser?.uid
  ).length;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "อรุณสวัสดิ์";
    if (h < 17) return "สวัสดีตอนบ่าย";
    return "สวัสดีตอนเย็น";
  };

  const quickItems = [
    { label: "ยืม-คืน", desc: "ยืมและแจ้งคืนอุปกรณ์", icon: ArrowLeftRight, href: "/borrow", bg: "bg-[#1D4ED8]", text: "text-white" },
    { label: "เบิกของ", desc: "เบิกอุปกรณ์สำหรับงาน", icon: PackageOpen, href: "/requisition", bg: "bg-[#FBBF24]", text: "text-[#1D4ED8]" },
    { label: "คลัง", desc: "ดูรายการอุปกรณ์ทั้งหมด", icon: Package, href: "/inventory", bg: "bg-white", text: "text-[#1D4ED8]", border: true },
    { label: "ประวัติ", desc: "ประวัติการใช้งาน", icon: History, href: "/movements", bg: "bg-white", text: "text-[#1D4ED8]", border: true },
  ];

  const now = new Date();

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Unified header */}
      <MobileHeader
        title="หน้าหลัก"
        actions={
          <>
            <button onClick={() => router.push("/inventory")}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all">
              <Search className="w-5 h-5 text-gray-500" />
            </button>
            <button className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-50 relative">
              <Bell className="w-5 h-5 text-gray-500" />
              {(myPending + myReturnPending) > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              )}
            </button>
          </>
        }
      />

      {/* Greeting strip */}
      <div className="px-5 py-4 bg-white border-b border-gray-50">
        <p className="text-xs text-gray-400 font-medium">{greeting()}</p>
        <h2 className="text-lg font-bold text-gray-900 leading-tight">{stoxyUser?.displayName ?? "ผู้ใช้งาน"}</h2>
        {stoxyUser?.department && <p className="text-xs text-gray-400 mt-0.5">{stoxyUser.department}</p>}

        {/* Stats strip */}
        {(myBorrowed.length > 0 || myPending > 0) && (
          <div className="flex gap-3 mt-4 pt-4 border-t border-gray-50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                <ArrowLeftRight className="w-4 h-4 text-[#1D4ED8]" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 leading-none">{myBorrowed.length}</p>
                <p className="text-xs text-gray-400">ยืมอยู่</p>
              </div>
            </div>
            {myPending > 0 && (
              <>
                <div className="w-px bg-gray-100" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-yellow-50 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900 leading-none">{myPending}</p>
                    <p className="text-xs text-gray-400">รออนุมัติ</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="px-5 py-5 space-y-6">
        {/* Quick Menu 2x2 */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">เมนูด่วน</p>
          <div className="grid grid-cols-2 gap-3">
            {quickItems.map((item, i) => (
              <motion.button
                key={item.href}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => router.push(item.href)}
                className={`${item.bg} ${item.text} ${item.border ? "border border-gray-100 shadow-sm" : "shadow-md"} rounded-3xl p-5 flex flex-col items-start gap-3 active:scale-95 transition-all text-left relative overflow-hidden`}
              >
                <div className={`w-10 h-10 rounded-2xl ${item.border ? "bg-blue-50" : "bg-white/20"} flex items-center justify-center`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm leading-tight">{item.label}</p>
                  <p className={`text-xs mt-0.5 leading-tight ${item.border ? "text-gray-400" : "opacity-60"}`}>{item.desc}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* My Borrowed Items */}
        {myBorrowed.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">อุปกรณ์ที่ยืมอยู่</p>
              <button
                onClick={() => router.push("/borrow")}
                className="flex items-center gap-1 text-xs font-semibold text-[#1D4ED8]"
              >
                ดูทั้งหมด <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-3">
              {myBorrowed.slice(0, 3).map((b) => {
                const returnDate = b.expectedReturnDate.toDate();
                const daysLeft = Math.ceil((returnDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const overdue = daysLeft < 0;
                const urgent = daysLeft >= 0 && daysLeft <= 2;
                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-gray-50"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                      <Package className="w-6 h-6 text-gray-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{b.itemName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        คืนก่อน {returnDate.toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <div>
                      {overdue ? (
                        <span className="text-xs font-bold text-white bg-red-500 px-2.5 py-1 rounded-full">เกินกำหนด</span>
                      ) : urgent ? (
                        <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">อีก {daysLeft} วัน</span>
                      ) : (
                        <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">อีก {daysLeft} วัน</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {myBorrowed.length === 0 && myPending === 0 && (
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
              <Package className="w-8 h-8 text-[#1D4ED8]" />
            </div>
            <p className="text-sm font-semibold text-gray-700">ไม่มีรายการยืมอยู่</p>
            <p className="text-xs text-gray-400 mt-1">กด ยืม-คืน เพื่อเริ่มต้นใช้งาน</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Admin dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { stoxyUser } = useAuth();
  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager";
  const router = useRouter();
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

  // Staff renders its own full-screen layout via StaffShell
  if (!isAdmin) {
    return (
      <AppShell title="หน้าหลัก">
        <StaffHome />
      </AppShell>
    );
  }

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="อุปกรณ์ทั้งหมด" value={statsLoading ? "—" : stats?.totalItems ?? 0} icon={Package} color="blue" href="/inventory" index={0} />
        <StatCard title="พร้อมใช้งาน" value={statsLoading ? "—" : stats?.availableQuantity ?? 0} icon={CheckCircle} color="green" href="/inventory" index={1} />
        <StatCard title="ถูกยืมออก" value={statsLoading ? "—" : stats?.borrowedQuantity ?? 0} icon={ArrowLeftRight} color="yellow" href="/borrow" index={2} />
        <StatCard title="สต็อกต่ำ" value={statsLoading ? "—" : stats?.lowStockCount ?? 0} icon={AlertTriangle} color="red" href="/purchase" index={3} />
        <StatCard title="เกินกำหนดคืน" value={overdueCount} icon={Clock} color="red" href="/return" index={4} />
        <StatCard title="รออนุมัติทั้งหมด" value={pendingCount} icon={ShieldAlert} color="yellow" href="/notifications" index={5} />
      </div>

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
              <Bar dataKey="ยืม" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="คืน" fill="#FBBF24" radius={[4, 4, 0, 0]} />
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
