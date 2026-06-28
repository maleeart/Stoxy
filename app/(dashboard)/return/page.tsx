"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { getBorrowRecords, returnItem } from "@/services/borrow.service";
import { formatDate } from "@/lib/utils";
import { Undo2, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import type { BorrowRecord, ItemCondition } from "@/types";

const conditions: { value: ItemCondition; label: string }[] = [
  { value: "excellent", label: "ดีมาก" },
  { value: "good", label: "ดี" },
  { value: "fair", label: "พอใช้" },
  { value: "poor", label: "แย่" },
  { value: "broken", label: "เสีย" },
];

export default function ReturnPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<BorrowRecord | null>(null);
  const [condition, setCondition] = useState<ItemCondition>("good");
  const [notes, setNotes] = useState("");

  const { data: borrows = [], isLoading } = useQuery({
    queryKey: ["borrows_active"],
    queryFn: () => getBorrowRecords("borrowed"),
  });

  const returnMut = useMutation({
    mutationFn: () =>
      returnItem(selected!.id, { condition, notes, returnedBy: "current_user" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["borrows_active"] });
      toast.success("รับคืนสำเร็จ");
      setSelected(null);
      setNotes("");
      setCondition("good");
    },
    onError: () => toast.error("เกิดข้อผิดพลาด"),
  });

  const now = new Date();

  return (
    <AppShell title="รับคืน">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">รับคืนอุปกรณ์</h2>
          <p className="text-sm text-gray-500">{borrows.length} รายการที่ยืมอยู่</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* List */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
            ))
          ) : borrows.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
              <Undo2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">ไม่มีรายการที่ยืมอยู่</p>
            </div>
          ) : (
            borrows.map((b, i) => {
              const overdue = b.expectedReturnDate.toDate() < now;
              const isActive = selected?.id === b.id;
              return (
                <motion.button
                  key={b.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelected(b)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    isActive
                      ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-blue-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{b.itemName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        ผู้ยืม: {b.borrowerName} · จำนวน: {b.quantity}
                      </p>
                      <p className={`text-xs mt-0.5 ${overdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
                        {overdue && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                        กำหนดคืน: {formatDate(b.expectedReturnDate)}
                        {overdue && " (เกินกำหนด)"}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded shrink-0">
                      {b.itemCode}
                    </span>
                  </div>
                </motion.button>
              );
            })
          )}
        </div>

        {/* Return Form */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 h-fit"
            >
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                รับคืน: {selected.itemName}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    สภาพเมื่อคืน
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {conditions.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setCondition(c.value)}
                        className={`py-2 text-xs font-medium rounded-xl border transition-all ${
                          condition === c.value
                            ? "bg-[#0d2137] text-white border-[#0d2137]"
                            : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    หมายเหตุ
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="บันทึกเพิ่มเติม..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => returnMut.mutate()}
                    disabled={returnMut.isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {returnMut.isPending ? "กำลังบันทึก..." : "ยืนยันรับคืน"}
                  </button>
                  <button
                    onClick={() => setSelected(null)}
                    className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
