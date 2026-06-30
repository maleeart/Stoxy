"use client";

import {
  Package, CheckCircle, ArrowLeftRight, AlertTriangle,
  Clock, Activity, TrendingUp, PackageOpen, History,
  Search, ChevronRight, UserCircle, ShieldCheck,
} from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { useDashboardStats, useRecentMovements } from "@/hooks/useInventory";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { formatRelative, cn } from "@/lib/utils";
import { AppShell } from "@/components/layout/AppShell";
import { getBorrowRecords } from "@/services/borrow.service";
import { getRequisitions } from "@/services/requisition.service";
import { getAuditSessions } from "@/services/audit.service";
import { useRealtimeBorrows } from "@/hooks/useRealtimeBorrows";
import { useInventoryItems } from "@/hooks/useInventory";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useHasActiveAudit } from "@/hooks/useMyAuditSessions";
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
    const day = movements.filter((m) => m.createdAt?.toDate().toDateString() === dateStr);
    return {
      day: dayNames[d.getDay()],
      ยืม: day.filter((m) => m.type === "borrow" || m.type === "adjustment_out").length,
      คืน: day.filter((m) => m.type === "return" || m.type === "adjustment_in").length,
    };
  });
}

// ── Staff home ──────────────────────────────────────────────────────────────────
function StaffHome() {
  const { stoxyUser } = useAuth();
  const router = useRouter();
  const { data: hasActiveAudit = false } = useHasActiveAudit(stoxyUser?.uid);
  const { allRecords } = useRealtimeBorrows();

  const myBorrowed = allRecords.filter(
    (b) => b.status === "borrowed" && b.borrowerId === stoxyUser?.uid
  );
  const myPending = allRecords.filter(
    (b) => b.status === "pending_approval" && b.borrowerId === stoxyUser?.uid
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
      <MobileHeader
        title="หน้าหลัก"
        actions={
          <>
            <button onClick={() => router.push("/inventory")}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all">
              <Search className="w-5 h-5 text-gray-500" />
            </button>
            <button onClick={() => router.push("/profile")}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all">
              <UserCircle className="w-5 h-5 text-gray-500" />
            </button>
          </>
        }
      />

      {/* Greeting strip */}
      <div className="px-5 py-4 bg-white border-b border-gray-50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 font-medium">{greeting()}</p>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">
              {stoxyUser?.nickname || stoxyUser?.displayName || "ผู้ใช้งาน"}
            </h2>
            {stoxyUser?.department && <p className="text-xs text-gray-400 mt-0.5">{stoxyUser.department}</p>}
          </div>
          {hasActiveAudit && (
            <button onClick={() => router.push("/audit")}
              className="shrink-0 flex flex-col items-center justify-center gap-1.5 bg-red-500 text-white rounded-2xl px-4 py-2.5 active:scale-95 transition-all shadow-lg shadow-red-500/40 animate-pulse">
              <div className="relative">
                <ShieldCheck className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full" />
              </div>
              <span className="text-[10px] font-bold tracking-wide">ตรวจนับ</span>
            </button>
          )}
        </div>

        {(myBorrowed.length > 0 || myPending > 0) && (
          <div className="flex gap-3 mt-4 pt-4 border-t border-gray-50">
            {myBorrowed.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                  <ArrowLeftRight className="w-4 h-4 text-[#1D4ED8]" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 leading-none">{myBorrowed.length}</p>
                  <p className="text-xs text-gray-400">ยืมอยู่</p>
                </div>
              </div>
            )}
            {myPending > 0 && (
              <>
                {myBorrowed.length > 0 && <div className="w-px bg-gray-100" />}
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
                className={`${item.bg} ${item.text} ${item.border ? "border border-gray-100 shadow-sm" : "shadow-md"} rounded-3xl p-4 flex flex-col items-start gap-2 active:scale-95 transition-all text-left overflow-hidden w-full`}
              >
                <div className={`w-9 h-9 rounded-2xl ${item.border ? "bg-blue-50" : "bg-white/20"} flex items-center justify-center shrink-0`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 w-full">
                  <p className="font-bold text-sm leading-tight truncate">{item.label}</p>
                  <p className={`text-xs mt-0.5 leading-tight line-clamp-2 ${item.border ? "text-gray-400" : "opacity-60"}`}>{item.desc}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {myBorrowed.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">อุปกรณ์ที่ยืมอยู่</p>
              <button onClick={() => router.push("/borrow")}
                className="flex items-center gap-1 text-xs font-semibold text-[#1D4ED8]">
                ดูทั้งหมด <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-3">
              {myBorrowed.slice(0, 3).map((b) => {
                const returnDate = b.expectedReturnDate.toDate();
                const daysLeft = Math.ceil((returnDate.getTime() - now.getTime()) / 86400000);
                const overdue = daysLeft < 0;
                const urgent = daysLeft >= 0 && daysLeft <= 2;
                return (
                  <motion.div key={b.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-gray-50">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                      <Package className="w-6 h-6 text-gray-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{b.itemName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        คืนก่อน {returnDate.toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    {overdue ? (
                      <span className="text-xs font-bold text-white bg-red-500 px-2.5 py-1 rounded-full shrink-0">เกินกำหนด</span>
                    ) : urgent ? (
                      <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full shrink-0">อีก {daysLeft} วัน</span>
                    ) : (
                      <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full shrink-0">อีก {daysLeft} วัน</span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

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

// ── Admin dashboard ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { stoxyUser } = useAuth();
  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager" || stoxyUser?.role === "supervisor";
  const router = useRouter();

  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: movements = [], isLoading: movementsLoading } = useRecentMovements(100);
  const { data: items = [] } = useInventoryItems();

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
  const { data: auditSessions = [] } = useQuery({
    queryKey: ["audit_sessions"],
    queryFn: getAuditSessions,
    staleTime: 1000 * 60 * 2,
  });

  const now = new Date();

  const pendingBorrows = borrows.filter((b) => b.status === "pending_approval");
  const pendingReqs = requisitions.filter((r) => r.status === "pending");
  const approvedReqsThisMonth = requisitions.filter((r) => {
    if (r.status !== "approved") return false;
    const d = (r as any).approvedAt?.toDate?.() ?? (r as any).updatedAt?.toDate?.();
    return d && d.getFullYear() === now.getFullYear();
  });
  const pendingAudits = auditSessions.filter((s) => s.status === "pending_approval");
  const overdueBorrows = borrows.filter(
    (b) => b.status === "borrowed" && b.expectedReturnDate.toDate() < now
  );
  const lowStockItems = items.filter(
    (i) => i.quantityAvailable <= (i.minStockLevel ?? 0) && (i.minStockLevel ?? 0) > 0
  );

  const totalPending = pendingBorrows.length + pendingReqs.length + pendingAudits.length;
  const totalUrgent = overdueBorrows.length + pendingAudits.length;

  const weeklyData = buildWeeklyData(movements);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "อรุณสวัสดิ์";
    if (h < 17) return "สวัสดีตอนบ่าย";
    return "สวัสดีตอนเย็น";
  };

  if (!isAdmin) {
    return (
      <AppShell title="หน้าหลัก">
        <StaffHome />
      </AppShell>
    );
  }

  return (
    <AppShell title="แดชบอร์ด">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <p className="text-sm text-gray-400">{greeting()}</p>
        <h2 className="text-xl font-bold text-gray-900">
          {stoxyUser?.nickname || stoxyUser?.displayName || "ผู้ดูแลระบบ"}
          {totalUrgent > 0 && (
            <span className="ml-2 text-sm font-semibold text-red-500 bg-red-50 px-2.5 py-0.5 rounded-full align-middle">
              {totalUrgent} เร่งด่วน
            </span>
          )}
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">ภาพรวมระบบคลังไฟฟ้า</p>
      </motion.div>

      {/* ── Pending actions ── */}
      {totalPending + overdueBorrows.length + lowStockItems.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">รอดำเนินการ</h3>
            <button onClick={() => router.push("/notifications")}
              className="flex items-center gap-1 text-xs font-semibold text-[#1D4ED8]">
              ดูทั้งหมด <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">

            {/* Audit pending */}
            {pendingAudits.length > 0 && (
              <ActionCard
                icon={<ShieldCheck className="w-5 h-5" />}
                label="รอตรวจสอบตรวจนับ"
                count={pendingAudits.length}
                bg="bg-red-500"
                urgent
                onClick={() => router.push("/audit")}
              />
            )}

            {/* Overdue borrows */}
            {overdueBorrows.length > 0 && (
              <ActionCard
                icon={<Clock className="w-5 h-5" />}
                label="เกินกำหนดคืน"
                count={overdueBorrows.length}
                bg="bg-orange-500"
                urgent
                onClick={() => router.push("/operations")}
              />
            )}

            {/* Pending borrows */}
            {pendingBorrows.length > 0 && (
              <ActionCard
                icon={<ArrowLeftRight className="w-5 h-5" />}
                label="รออนุมัติยืม"
                count={pendingBorrows.length}
                bg="bg-[#1D4ED8]"
                onClick={() => router.push("/borrow")}
              />
            )}

            {/* Pending reqs */}
            {pendingReqs.length > 0 && (
              <ActionCard
                icon={<PackageOpen className="w-5 h-5" />}
                label="รออนุมัติเบิก"
                count={pendingReqs.length}
                bg="bg-amber-500"
                onClick={() => router.push("/requisition")}
              />
            )}

            {/* Low stock */}
            {lowStockItems.length > 0 && (
              <ActionCard
                icon={<AlertTriangle className="w-5 h-5" />}
                label="สต็อกต่ำ"
                count={lowStockItems.length}
                bg="bg-rose-400"
                onClick={() => router.push("/purchase")}
              />
            )}
          </div>
        </section>
      )}

      {/* ── Stock summary ── */}
      <section className="mb-6">
        <div className="flex items-baseline gap-2 mb-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">ภาพรวมสต็อก</h3>
          <span className="text-xs text-gray-400">ปีนี้</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SummaryTile
            label="ถูกยืมออก"
            value={statsLoading ? "—" : String(stats?.borrowedQuantity ?? 0)}
            icon={<ArrowLeftRight className="w-4 h-4 text-amber-500" />}
            bg="bg-amber-50"
            onClick={() => router.push("/borrow")}
          />
          <SummaryTile
            label="ยอดเบิกแล้ว"
            value={statsLoading ? "—" : String(approvedReqsThisMonth.length)}
            icon={<CheckCircle className="w-4 h-4 text-green-500" />}
            bg="bg-green-50"
            onClick={() => router.push("/requisition")}
          />
          <SummaryTile
            label="เกินกำหนดคืน"
            value={String(overdueBorrows.length)}
            icon={<Clock className="w-4 h-4 text-orange-500" />}
            bg="bg-orange-50"
            urgent={overdueBorrows.length > 0}
            onClick={() => router.push("/operations")}
          />
          <SummaryTile
            label="ต้องสั่งซื้อ"
            value={String(lowStockItems.length)}
            icon={<AlertTriangle className="w-4 h-4 text-rose-500" />}
            bg="bg-rose-50"
            urgent={lowStockItems.length > 0}
            onClick={() => router.push("/purchase")}
          />
        </div>
      </section>

      {/* ── Chart + Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#1D4ED8]" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">การเคลื่อนไหว 7 วันล่าสุด</h3>
              <p className="text-xs text-gray-400 mt-0.5">ยืม/เบิก vs คืน/รับเข้า</p>
            </div>
            <button onClick={() => router.push("/movements")}
              className="ml-auto flex items-center gap-1 text-xs font-semibold text-[#1D4ED8]">
              ดูทั้งหมด <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e5e7eb", fontSize: "12px" }} />
              <Bar dataKey="ยืม" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="คืน" fill="#FBBF24" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-900">กิจกรรมล่าสุด</h3>
          </div>
          <div className="space-y-3">
            {movementsLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse flex gap-3">
                    <div className="w-12 h-5 bg-gray-100 rounded" />
                    <div className="flex-1 h-5 bg-gray-100 rounded" />
                  </div>
                ))
              : movements.length > 0
              ? movements.slice(0, 8).map((m) => (
                  <div key={m.id} className="flex items-start gap-2.5">
                    <span className={cn("shrink-0 text-xs px-1.5 py-0.5 rounded-md font-medium", movementTypeColor[m.type] ?? "bg-gray-100 text-gray-600")}>
                      {movementTypeLabel[m.type] ?? m.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{m.itemName}</p>
                      <p className="text-xs text-gray-400">{formatRelative(m.createdAt)}</p>
                    </div>
                    <span className={cn("text-xs font-semibold shrink-0", m.quantityChange >= 0 ? "text-emerald-600" : "text-red-500")}>
                      {m.quantityChange >= 0 ? "+" : ""}{m.quantityChange}
                    </span>
                  </div>
                ))
              : <p className="text-sm text-gray-400 text-center py-8">ยังไม่มีกิจกรรม</p>
            }
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ── Reusable sub-components ─────────────────────────────────────────────────────
function ActionCard({
  icon, label, count, bg, urgent, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  bg: string;
  urgent?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      className={`${bg} text-white rounded-2xl p-4 flex flex-col gap-2 active:scale-95 transition-all text-left w-full shadow-sm ${urgent ? "ring-2 ring-offset-1 ring-red-300" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
          {icon}
        </div>
        {urgent && <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />}
      </div>
      <div>
        <p className="text-2xl font-bold leading-none">{count}</p>
        <p className="text-xs font-medium opacity-80 mt-0.5 leading-tight">{label}</p>
      </div>
    </motion.button>
  );
}

function SummaryTile({
  label, value, icon, bg, onClick, urgent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  bg: string;
  onClick: () => void;
  urgent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`bg-white border rounded-2xl p-3.5 flex flex-col gap-2 active:scale-95 transition-all text-left w-full shadow-sm hover:border-gray-200 ${urgent && value !== "0" ? "border-red-100" : "border-gray-100"}`}
    >
      <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{label}</p>
      </div>
    </button>
  );
}
