"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRealtimeBorrows } from "@/hooks/useRealtimeBorrows";
import { useQuery } from "@tanstack/react-query";
import { getMyRequisitions } from "@/services/requisition.service";
import { AppShell } from "@/components/layout/AppShell";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { formatDate, cn } from "@/lib/utils";
import { ArrowLeftRight, Package } from "lucide-react";
import { motion } from "framer-motion";
import type { BorrowStatus } from "@/types";

const statusBadge: Partial<Record<BorrowStatus, string>> = {
  pending_approval: "bg-yellow-100 text-yellow-700",
  borrowed: "bg-blue-100 text-blue-700",
  return_pending: "bg-purple-100 text-purple-700",
  returned: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  overdue: "bg-red-100 text-red-700",
};
const statusLabel: Partial<Record<BorrowStatus, string>> = {
  pending_approval: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  borrowed: "ยืมอยู่",
  return_pending: "รอรับทราบ",
  returned: "คืนแล้ว",
  rejected: "ปฏิเสธ",
  overdue: "เกินกำหนด",
};

export default function HistoryPage() {
  const { stoxyUser } = useAuth();
  const uid = stoxyUser?.uid ?? "";
  const role = stoxyUser?.role;
  const canRequisition = role !== "viewer" && role !== "supervisor";

  const { allRecords } = useRealtimeBorrows();
  const myBorrowHistory = allRecords.filter(b => b.borrowerId === uid);

  const { data: myReqs = [] } = useQuery({
    queryKey: ["requisitions", "mine", uid],
    queryFn: () => getMyRequisitions(uid),
    enabled: !!uid && canRequisition,
  });

  return (
    <AppShell title="ประวัติ">
      <MobileHeader title="ประวัติ" />
      <div className="px-4 py-4 space-y-5">
        {/* Borrow history */}
        <div>
          <p className="text-xs font-bold text-[#1D4ED8] uppercase tracking-wider mb-3">
            รายการยืม ({myBorrowHistory.length})
          </p>
          {myBorrowHistory.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">ไม่มีประวัติการยืม</p>
          ) : (
            <div className="space-y-2">
              {myBorrowHistory.slice().reverse().map((b, i) => (
                <motion.div key={b.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="bg-white rounded-2xl p-3.5 border border-gray-50 shadow-sm flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <ArrowLeftRight className="w-5 h-5 text-[#1D4ED8]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 line-clamp-1">{b.itemName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(b.createdAt)} · จำนวน {b.quantity}</p>
                  </div>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium shrink-0",
                    statusBadge[b.status] ?? "bg-gray-100 text-gray-600"
                  )}>
                    {statusLabel[b.status] ?? b.status}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Requisition history */}
        {canRequisition && (
          <div>
            <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-3">
              รายการเบิก ({myReqs.length})
            </p>
            {myReqs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">ไม่มีประวัติการเบิก</p>
            ) : (
              <div className="space-y-2">
                {[...myReqs].reverse().map((r, i) => (
                  <motion.div key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="bg-white rounded-2xl p-3.5 border border-gray-50 shadow-sm flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 line-clamp-1">{r.itemName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(r.createdAt)} · จำนวน {r.quantity}</p>
                    </div>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium shrink-0",
                      r.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                      r.status === "rejected" ? "bg-red-100 text-red-700" :
                      "bg-yellow-100 text-yellow-700"
                    )}>
                      {r.status === "approved" ? "อนุมัติแล้ว" : r.status === "rejected" ? "ปฏิเสธ" : "รออนุมัติ"}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
