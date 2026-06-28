"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useInventoryItems } from "@/hooks/useInventory";
import { createAdjustment } from "@/services/adjustment.service";
import { useAuth } from "@/hooks/useAuth";
import { ClipboardList, Plus, Minus, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import type { AdjustmentType } from "@/types";

export default function AdjustmentPage() {
  const { stoxyUser } = useAuth();
  const { data: items = [] } = useInventoryItems();
  const [itemId, setItemId] = useState("");
  const [type, setType] = useState<AdjustmentType>("addition");
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const selected = items.find((i) => i.id === itemId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !reason.trim()) return;
    setLoading(true);
    try {
      await createAdjustment({
        itemId: selected.id,
        itemCode: selected.code,
        itemName: selected.name,
        type,
        quantityAdjusted: qty,
        reason,
        createdBy: stoxyUser?.uid ?? "unknown",
      });
      setDone(true);
      toast.success("ปรับสต็อกสำเร็จ");
      setTimeout(() => {
        setDone(false);
        setItemId("");
        setQty(1);
        setReason("");
      }, 2000);
    } catch (err: any) {
      toast.error(err.message ?? "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="ปรับสต็อก">
      <div className="max-w-lg mx-auto">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">ปรับสต็อกอุปกรณ์</h2>
          <p className="text-sm text-gray-500">รับเข้า จ่ายออก หรือปรับปริมาณ</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <AnimatePresence>
            {done ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 text-center"
              >
                <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
                <p className="font-semibold text-gray-900 dark:text-white">ปรับสต็อกสำเร็จ</p>
              </motion.div>
            ) : (
              <motion.form onSubmit={handleSubmit} className="space-y-4">
                {/* Item Select */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    อุปกรณ์
                  </label>
                  <select
                    value={itemId}
                    onChange={(e) => setItemId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="">-- เลือกอุปกรณ์ --</option>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        [{i.code}] {i.name}
                      </option>
                    ))}
                  </select>
                  {selected && (
                    <p className="text-xs text-gray-400 mt-1">
                      คงเหลือปัจจุบัน: <span className="font-medium text-gray-700 dark:text-gray-300">{selected.quantityAvailable}</span> ชิ้น
                    </p>
                  )}
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    ประเภทการปรับ
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setType("addition")}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        type === "addition"
                          ? "bg-emerald-50 border-emerald-400 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      รับเข้า
                    </button>
                    <button
                      type="button"
                      onClick={() => setType("reduction")}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        type === "reduction"
                          ? "bg-red-50 border-red-400 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      <Minus className="w-4 h-4" />
                      จ่ายออก
                    </button>
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    จำนวน
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      value={qty}
                      onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                      min={1}
                      className="w-20 text-center px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                    <button
                      type="button"
                      onClick={() => setQty(qty + 1)}
                      className="w-9 h-9 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    เหตุผล <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    rows={3}
                    placeholder="ระบุเหตุผลในการปรับสต็อก..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                  />
                </div>

                {/* Preview */}
                {selected && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-sm">
                    <span className="text-gray-500">สต็อกหลังปรับ: </span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {type === "addition"
                        ? selected.quantityAvailable + qty
                        : Math.max(0, selected.quantityAvailable - qty)}
                    </span>
                    <span className="text-gray-500"> ชิ้น</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !itemId || !reason.trim()}
                  className="w-full py-2.5 text-sm font-medium bg-[#0d2137] text-white rounded-xl hover:bg-[#1a3a5c] disabled:opacity-50 transition-colors"
                >
                  {loading ? "กำลังบันทึก..." : "บันทึกการปรับสต็อก"}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppShell>
  );
}
