"use client";

import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { useRealtimeBorrows } from "@/hooks/useRealtimeBorrows";
import { useInventoryItems } from "@/hooks/useInventory";
import { acknowledgeReturn } from "@/services/borrow.service";
import { formatDate } from "@/lib/utils";
import { Undo2, CheckCircle, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function ReturnPage() {
  const { stoxyUser } = useAuth();
  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager";
  const isSupervisor = stoxyUser?.role === "supervisor";
  const { allRecords, isLoading } = useRealtimeBorrows();
  const { data: items = [] } = useInventoryItems();
  const returnPending = allRecords.filter((b) => b.status === "return_pending");

  const acknowledgeMut = useMutation({
    mutationFn: (id: string) => acknowledgeReturn(id, stoxyUser?.uid ?? "", stoxyUser?.displayName),
    onSuccess: () => toast.success("รับทราบการคืนแล้ว ปิดรายการสำเร็จ"),
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  return (
    <AppShell title="รับคืน">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">รายการรอรับทราบ</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{returnPending.length} รายการ</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : returnPending.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
          <Undo2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">ไม่มีรายการที่รอรับทราบ</p>
        </div>
      ) : (
        <div className="space-y-3">
          {returnPending.map((b, i) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-purple-200 dark:border-purple-900 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">รอรับทราบ</span>
                    <span className="font-mono text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded">{b.itemCode}</span>
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white">{b.itemName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    ผู้ยืม: {b.borrowerName} · {b.borrowerDepartment} · จำนวน: {b.quantity}
                  </p>
                  {(() => { const inv = items.find(i => i.id === b.itemId); return inv ? (
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {inv.locationName && <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500"><MapPin className="w-3 h-3" />{inv.locationName}</span>}
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">คงเหลือ {inv.quantityAvailable}{inv.unit ? ` ${inv.unit}` : ""}</span>
                    </div>
                  ) : null; })()}
                  <div className="flex gap-3 mt-1 flex-wrap">
                    {b.borrowDate && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" /> ยืม: {formatDate(b.borrowDate)}
                      </span>
                    )}
                    {b.actualReturnDate && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <Undo2 className="w-3 h-3" /> แจ้งคืน: {formatDate(b.actualReturnDate)}
                      </span>
                    )}
                  </div>
                  {b.returnNotes && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">หมายเหตุ: {b.returnNotes}</p>
                  )}
                  {(b.returnPhotos?.length ?? 0) > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {b.returnPhotos!.map((url, j) => (
                        <a key={j} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt="" className="w-14 h-14 object-cover rounded-lg border border-gray-200 hover:opacity-90" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                {(isAdmin || isSupervisor) && (
                  <button
                    onClick={() => isSupervisor
                      ? toast.error("สำหรับ Admin / ผู้จัดการ เท่านั้น")
                      : acknowledgeMut.mutate(b.id)
                    }
                    disabled={acknowledgeMut.isPending}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors shrink-0"
                  >
                    <CheckCircle className="w-4 h-4" /> รับทราบ
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
