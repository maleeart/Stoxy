"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { useInventoryItems } from "@/hooks/useInventory";
import { useAuth } from "@/hooks/useAuth";
import {
  createRequisition, getRequisitions, getMyRequisitions,
  approveRequisition, rejectRequisition,
} from "@/services/requisition.service";
import { formatDateTime } from "@/lib/utils";
import { PackageOpen, Plus, CheckCircle, XCircle, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const statusBadge = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};
const statusLabel = { pending: "รออนุมัติ", approved: "อนุมัติแล้ว", rejected: "ปฏิเสธ" };

export default function RequisitionPage() {
  const { stoxyUser } = useAuth();
  const qc = useQueryClient();
  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager";

  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<"mine" | "all">(isAdmin ? "all" : "mine");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Form state
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [purpose, setPurpose] = useState("");

  const { data: items = [] } = useInventoryItems();

  const { data: allReqs = [], isLoading } = useQuery({
    queryKey: ["requisitions", tab, stoxyUser?.uid],
    queryFn: () =>
      tab === "all"
        ? getRequisitions()
        : getMyRequisitions(stoxyUser?.uid ?? ""),
    enabled: !!stoxyUser,
  });

  const createMut = useMutation({
    mutationFn: () => {
      const item = items.find((i) => i.id === itemId)!;
      return createRequisition({
        itemId,
        itemCode: item.code,
        itemName: item.name,
        quantity,
        purpose,
        requesterId: stoxyUser?.uid ?? "",
        requesterName: stoxyUser?.displayName ?? "ไม่ระบุ",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requisitions"] });
      toast.success("ส่งคำขอเบิกสำเร็จ รอการอนุมัติ");
      setShowForm(false);
      setItemId(""); setQuantity(1); setPurpose("");
    },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => approveRequisition(id, stoxyUser?.uid ?? ""),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requisitions"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("อนุมัติการเบิกแล้ว สต็อกถูกตัดออก");
    },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  const rejectMut = useMutation({
    mutationFn: () => rejectRequisition(rejectId!, stoxyUser?.uid ?? "", rejectReason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requisitions"] });
      toast.success("ปฏิเสธคำขอแล้ว");
      setRejectId(null); setRejectReason("");
    },
    onError: () => toast.error("เกิดข้อผิดพลาด"),
  });

  const selected = items.find((i) => i.id === itemId);

  return (
    <AppShell title="เบิกของ">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">เบิกของ</h2>
          <p className="text-sm text-gray-500">ขอเบิกวัสดุ/อุปกรณ์จากสต็อก</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[#0d2137] text-white rounded-xl hover:bg-[#1a3a5c] transition-colors"
        >
          <Plus className="w-4 h-4" />
          ขอเบิก
        </button>
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, pointerEvents: "none" }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12 }}
              transition={{ duration: 0.15 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">ขอเบิกของ</h3>
                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">รายการที่ต้องการเบิก</label>
                  <select
                    value={itemId}
                    onChange={(e) => setItemId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="">-- เลือกรายการ --</option>
                    {items.filter(i => i.quantityAvailable > 0).map((i) => (
                      <option key={i.id} value={i.id}>
                        [{i.code}] {i.name} (คงเหลือ {i.quantityAvailable})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">จำนวน</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                    max={selected?.quantityAvailable ?? 999}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  {selected && <p className="text-xs text-gray-400 mt-1">คงเหลือในสต็อก: {selected.quantityAvailable}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">วัตถุประสงค์ / งานที่ใช้</label>
                  <textarea
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    rows={3}
                    placeholder="ระบุงานหรือเหตุผลที่ต้องการเบิก..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                  />
                </div>

                <button
                  onClick={() => createMut.mutate()}
                  disabled={!itemId || !purpose.trim() || createMut.isPending}
                  className="w-full py-2.5 text-sm font-medium bg-[#0d2137] text-white rounded-xl disabled:opacity-50 hover:bg-[#1a3a5c] transition-colors"
                >
                  {createMut.isPending ? "กำลังส่ง..." : "ส่งคำขอเบิก"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, pointerEvents: "none" }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setRejectId(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">เหตุผลที่ปฏิเสธ</h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="ระบุเหตุผล..."
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none mb-3"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => rejectMut.mutate()}
                  disabled={!rejectReason.trim() || rejectMut.isPending}
                  className="flex-1 py-2 text-sm font-medium bg-red-600 text-white rounded-xl disabled:opacity-50 hover:bg-red-700 transition-colors"
                >
                  ยืนยันปฏิเสธ
                </button>
                <button
                  onClick={() => setRejectId(null)}
                  className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  ยกเลิก
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs (admin sees all) */}
      {isAdmin && (
        <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
          {([["all", "ทั้งหมด"], ["mine", "ของฉัน"]] as const).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${tab === v ? "bg-white dark:bg-gray-900 shadow text-gray-900 dark:text-white" : "text-gray-500"}`}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))
        ) : allReqs.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <PackageOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">ยังไม่มีรายการเบิก</p>
          </div>
        ) : (
          allReqs.map((req, i) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[req.status]}`}>
                      {statusLabel[req.status]}
                    </span>
                    <span className="font-mono text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                      {req.itemCode}
                    </span>
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white">{req.itemName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    จำนวน: <span className="font-semibold text-gray-700 dark:text-gray-300">{req.quantity}</span>
                    {" · "}ผู้ขอ: {req.requesterName}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">วัตถุประสงค์: {req.purpose}</p>
                  {req.rejectedReason && (
                    <p className="text-xs text-red-500 mt-0.5">เหตุผล: {req.rejectedReason}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">{formatDateTime(req.createdAt)}</p>
                  {isAdmin && req.status === "pending" && (
                    <div className="flex gap-1.5 mt-2">
                      <button
                        onClick={() => approveMut.mutate(req.id)}
                        disabled={approveMut.isPending}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        อนุมัติ
                      </button>
                      <button
                        onClick={() => setRejectId(req.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        ปฏิเสธ
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </AppShell>
  );
}
