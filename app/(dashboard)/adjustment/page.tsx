"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { useInventoryItems } from "@/hooks/useInventory";
import { useAuth } from "@/hooks/useAuth";
import { adjustStock } from "@/services/inventory.service";
import { Search, ArrowDownCircle, ArrowUpCircle, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import type { InventoryItem } from "@/types";

type AdjType = "adjustment_in" | "adjustment_out";

function AdjustSheet({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const { stoxyUser } = useAuth();
  const qc = useQueryClient();
  const [type, setType] = useState<AdjType>("adjustment_in");
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState("");

  const mut = useMutation({
    mutationFn: () => adjustStock({
      itemId: item.id,
      type,
      quantity: qty,
      reason: reason.trim(),
      performedBy: stoxyUser?.uid ?? "",
      performedByName: stoxyUser?.displayName ?? "",
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success(type === "adjustment_in" ? `รับเข้า ${qty} รายการแล้ว` : `จ่ายออก ${qty} รายการแล้ว`);
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  const isOut = type === "adjustment_out";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}
    >
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 350 }}
        className="w-full bg-white rounded-t-3xl p-6 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />

        <div>
          <h3 className="font-bold text-gray-900 text-base">ปรับสต็อก</h3>
          <p className="text-sm text-gray-500 mt-0.5 truncate">{item.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            คงเหลือปัจจุบัน: <span className="font-semibold text-gray-700">{item.quantityAvailable}</span>
          </p>
        </div>

        {/* Type toggle */}
        <div className="flex bg-gray-100 rounded-2xl p-1">
          <button onClick={() => setType("adjustment_in")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              !isOut ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400"}`}
          >
            <ArrowDownCircle className="w-4 h-4" />รับเข้า
          </button>
          <button onClick={() => setType("adjustment_out")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              isOut ? "bg-white text-red-500 shadow-sm" : "text-gray-400"}`}
          >
            <ArrowUpCircle className="w-4 h-4" />จ่ายออก
          </button>
        </div>

        {/* Qty stepper */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 block">จำนวน</label>
          <div className="flex items-center gap-4">
            <button onClick={() => setQty(q => Math.max(1, q - 1))}
              className="w-11 h-11 rounded-2xl bg-gray-100 flex items-center justify-center active:scale-95 transition-transform">
              <Minus className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-2xl font-bold text-gray-900 min-w-[2.5rem] text-center">{qty}</span>
            <button onClick={() => setQty(q => isOut ? Math.min(item.quantityAvailable, q + 1) : q + 1)}
              className="w-11 h-11 rounded-2xl bg-gray-100 flex items-center justify-center active:scale-95 transition-transform">
              <Plus className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          {isOut && (
            <p className="text-xs text-gray-400 mt-1">จ่ายออกได้สูงสุด {item.quantityAvailable}</p>
          )}
        </div>

        {/* Reason */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 block">เหตุผล / หมายเหตุ *</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
            placeholder={isOut
              ? "เช่น คืนของเหลือจากการเบิก, ของเสียหาย..."
              : "เช่น รับของเข้าใหม่, ของที่คืนกลับมา..."}
            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-2xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
          />
        </div>

        <button onClick={() => mut.mutate()}
          disabled={!reason.trim() || mut.isPending}
          className={`w-full py-4 text-white font-bold rounded-2xl disabled:opacity-50 active:scale-[0.98] transition-transform ${
            isOut ? "bg-red-500" : "bg-emerald-500"}`}
        >
          {mut.isPending ? "กำลังบันทึก..." : isOut ? `จ่ายออก ${qty} ชิ้น` : `รับเข้า ${qty} ชิ้น`}
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function AdjustmentPage() {
  const { stoxyUser } = useAuth();
  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager";
  const { data: items = [], isLoading } = useInventoryItems();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<InventoryItem | null>(null);

  if (!isAdmin) {
    return (
      <AppShell title="ปรับสต็อก">
        <div className="text-center py-20 text-gray-400">ไม่มีสิทธิ์เข้าถึง</div>
      </AppShell>
    );
  }

  const filtered = items.filter(i =>
    !search ||
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell title="ปรับสต็อก">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">ปรับสต็อก</h2>
          <p className="text-sm text-gray-500">รับเข้า / จ่ายออก / คืนของเหลือ</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ค้นหาอุปกรณ์, รหัส..."
          className="w-full pl-11 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-500" />รับเข้า = สต็อกเพิ่ม
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <ArrowUpCircle className="w-3.5 h-3.5 text-red-500" />จ่ายออก = สต็อกลด
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">ไม่พบอุปกรณ์</div>
        ) : (
          filtered.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.01 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{item.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-xs text-blue-600 dark:text-blue-400">{item.code}</span>
                  <span className="text-xs text-gray-400">
                    คงเหลือ: <span className={`font-semibold ${
                      item.quantityAvailable <= item.minStockLevel
                        ? "text-red-500"
                        : "text-gray-700 dark:text-gray-300"
                    }`}>{item.quantityAvailable}</span>
                  </span>
                </div>
              </div>
              <button onClick={() => setSelected(item)}
                className="shrink-0 px-4 py-2 text-sm font-bold bg-[#1D4ED8] text-white rounded-xl hover:bg-blue-700 active:scale-95 transition-all"
              >
                ปรับ
              </button>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {selected && <AdjustSheet item={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </AppShell>
  );
}
