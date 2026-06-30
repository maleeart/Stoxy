"use client";

import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { useAuth } from "@/hooks/useAuth";
import { getRecentMovements } from "@/services/inventory.service";
import { exportMovementsExcel } from "@/lib/export";
import { formatDateTime } from "@/lib/utils";
import { History, FileSpreadsheet } from "lucide-react";
import { motion } from "framer-motion";
import type { MovementType } from "@/types";

const typeLabel: Record<MovementType, string> = {
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

const typeBadge: Record<MovementType, string> = {
  borrow: "bg-blue-100 text-blue-700",
  return: "bg-emerald-100 text-emerald-700",
  adjustment_in: "bg-green-100 text-green-700",
  adjustment_out: "bg-orange-100 text-orange-700",
  transfer: "bg-yellow-100 text-yellow-700",
  disposal: "bg-gray-100 text-gray-700",
  purchase: "bg-cyan-100 text-cyan-700",
  maintenance_out: "bg-red-100 text-red-700",
  maintenance_in: "bg-purple-100 text-purple-700",
  lost: "bg-red-100 text-red-700",
};

function MovementsList() {
  const { data: movements = [], isLoading } = useQuery({
    queryKey: ["movements_all"],
    queryFn: () => getRecentMovements(200),
  });

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{movements.length} รายการล่าสุด</p>
        <button
          onClick={() => exportMovementsExcel(movements)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Excel
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-4 py-3 border-b border-gray-50 dark:border-gray-800">
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            </div>
          ))
        ) : movements.length === 0 ? (
          <div className="text-center py-16">
            <History className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">ยังไม่มีประวัติการเคลื่อนไหว</p>
          </div>
        ) : (
          movements.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
              className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
            >
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${typeBadge[m.type]}`}>
                {typeLabel[m.type]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{m.itemName}</p>
                <p className="text-xs text-gray-400 truncate">{m.performedByName || m.reason || m.itemCode}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-bold ${m.quantityChange > 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {m.quantityChange > 0 ? "+" : ""}{m.quantityChange}
                </p>
                <p className="text-xs text-gray-400">{m.quantityBefore} → {m.quantityAfter}</p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </>
  );
}

export default function MovementsPage() {
  const { stoxyUser } = useAuth();
  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager";

  // Staff: mobile-first layout with MobileHeader + padded content
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <MobileHeader title="ประวัติการเคลื่อนไหว" />
        <div className="px-4 py-4">
          <MovementsList />
        </div>
      </div>
    );
  }

  // Admin: AppShell handles header + padding
  return (
    <AppShell title="ประวัติเคลื่อนไหว">
      <div className="flex items-center gap-2 mb-5">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">ประวัติการเคลื่อนไหวสต็อก</h2>
      </div>
      <MovementsList />
    </AppShell>
  );
}
