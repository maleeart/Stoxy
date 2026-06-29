"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useInventoryItems } from "@/hooks/useInventory";
import { useRealtimeBorrows } from "@/hooks/useRealtimeBorrows";
import { approveBorrowRequest, rejectBorrowRequest, acknowledgeReturn, adminReceiveReturn } from "@/services/borrow.service";
import { getRequisitions, approveRequisition, rejectRequisition } from "@/services/requisition.service";
import { adjustStock } from "@/services/inventory.service";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeftRight, PackageOpen, BarChart3,
  CheckCircle, XCircle, Undo2, Search,
  ArrowDownCircle, ArrowUpCircle, Plus, Minus, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import type { InventoryItem } from "@/types";

type Tab = "borrow" | "requisition" | "adjustment";

// ── Adjustment Sheet ──────────────────────────────────────────────────────────
type AdjType = "adjustment_in" | "adjustment_out";

function AdjustSheet({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const { stoxyUser } = useAuth();
  const qc = useQueryClient();
  const [type, setType] = useState<AdjType>("adjustment_in");
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState("");

  const mut = useMutation({
    mutationFn: () => adjustStock({
      itemId: item.id, type, quantity: qty,
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
        <div className="flex bg-gray-100 rounded-2xl p-1">
          <button onClick={() => setType("adjustment_in")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${!isOut ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400"}`}
          >
            <ArrowDownCircle className="w-4 h-4" />รับเข้า
          </button>
          <button onClick={() => setType("adjustment_out")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${isOut ? "bg-white text-red-500 shadow-sm" : "text-gray-400"}`}
          >
            <ArrowUpCircle className="w-4 h-4" />จ่ายออก
          </button>
        </div>
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
          {isOut && <p className="text-xs text-gray-400 mt-1">จ่ายออกได้สูงสุด {item.quantityAvailable}</p>}
        </div>
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 block">เหตุผล / หมายเหตุ *</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
            placeholder={isOut ? "เช่น คืนของเหลือจากการเบิก, ของเสียหาย..." : "เช่น รับของเข้าใหม่, ของที่คืนกลับมา..."}
            className="w-full px-4 py-3 text-sm border border-gray-200 rounded-2xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
          />
        </div>
        <button onClick={() => mut.mutate()} disabled={!reason.trim() || mut.isPending}
          className={`w-full py-4 text-white font-bold rounded-2xl disabled:opacity-50 active:scale-[0.98] transition-transform ${isOut ? "bg-red-500" : "bg-emerald-500"}`}
        >
          {mut.isPending ? "กำลังบันทึก..." : isOut ? `จ่ายออก ${qty} ชิ้น` : `รับเข้า ${qty} ชิ้น`}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Reject Modal ──────────────────────────────────────────────────────────────
function RejectModal({ onConfirm, onCancel, isPending }: {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancel}
    >
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-bold text-gray-900 text-base">ระบุเหตุผลการปฏิเสธ</h3>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
          placeholder="เช่น สต็อกไม่เพียงพอ, ไม่ถูกต้องตามขั้นตอน..."
          className="w-full px-4 py-3 text-sm border border-gray-200 rounded-2xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/20 resize-none"
        />
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 text-sm font-semibold text-gray-600 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-colors">
            ยกเลิก
          </button>
          <button onClick={() => reason.trim() && onConfirm(reason.trim())} disabled={!reason.trim() || isPending}
            className="flex-1 py-3 text-sm font-semibold text-white bg-red-500 rounded-2xl hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {isPending ? "กำลังบันทึก..." : "ปฏิเสธ"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function OperationsPage() {
  const { stoxyUser } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("borrow");
  const [rejectTarget, setRejectTarget] = useState<{ id: string; type: "borrow" | "req" } | null>(null);
  const [adjItem, setAdjItem] = useState<InventoryItem | null>(null);
  const [search, setSearch] = useState("");

  // Data
  const { allRecords: borrows, isLoading: borrowsLoading } = useRealtimeBorrows();
  const { data: requisitions = [], isLoading: reqLoading } = useQuery({
    queryKey: ["requisitions", "all"],
    queryFn: getRequisitions,
  });
  const { data: items = [], isLoading: itemsLoading } = useInventoryItems();

  const pendingBorrows = borrows.filter(b => b.status === "pending_approval");
  const returnPending = borrows.filter(b => b.status === "return_pending");
  const activeBorrows = borrows.filter(b => b.status === "borrowed");
  const pendingReqs = requisitions.filter(r => r.status === "pending");

  const filteredItems = items.filter(i =>
    !search ||
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.code.toLowerCase().includes(search.toLowerCase())
  );

  // Mutations
  const approveBorrow = useMutation({
    mutationFn: (id: string) => approveBorrowRequest(id, stoxyUser?.uid ?? ""),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["borrows"] }); toast.success("อนุมัติการยืมแล้ว"); },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  const rejectBorrow = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectBorrowRequest(id, stoxyUser?.uid ?? "", reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["borrows"] }); toast.success("ปฏิเสธคำขอแล้ว"); setRejectTarget(null); },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  const acknowledgeRet = useMutation({
    mutationFn: (id: string) => acknowledgeReturn(id, stoxyUser?.uid ?? ""),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["borrows"] }); toast.success("รับทราบการคืนแล้ว"); },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  const adminReceive = useMutation({
    mutationFn: (id: string) => adminReceiveReturn(id, stoxyUser?.uid ?? ""),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["borrows"] }); toast.success("รับของคืนเรียบร้อย"); },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  const approveReq = useMutation({
    mutationFn: (id: string) => approveRequisition(id, stoxyUser?.uid ?? ""),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["requisitions"] }); toast.success("อนุมัติการเบิกแล้ว"); },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  const rejectReq = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectRequisition(id, stoxyUser?.uid ?? "", reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["requisitions"] }); toast.success("ปฏิเสธคำขอแล้ว"); setRejectTarget(null); },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "borrow", label: "ยืม-คืน", icon: <ArrowLeftRight className="w-4 h-4" />, count: pendingBorrows.length + returnPending.length + activeBorrows.length },
    { id: "requisition", label: "เบิก", icon: <PackageOpen className="w-4 h-4" />, count: pendingReqs.length },
    { id: "adjustment", label: "ปรับสต็อก", icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <AppShell title="จัดการคำขอ">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900">จัดการคำขอ & สต็อก</h2>
        <p className="text-sm text-gray-500">อนุมัติ/ปฏิเสธคำขอ และปรับปรุงสต็อก</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-2xl">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === t.id ? "bg-white text-[#1D4ED8] shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
            {t.count != null && t.count > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB: ยืม-คืน ── */}
      {tab === "borrow" && (
        <div className="space-y-6">
          {/* Pending approval */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              รออนุมัติ ({pendingBorrows.length})
            </h3>
            {borrowsLoading ? <Skeleton /> :
              pendingBorrows.length === 0 ? <Empty label="ไม่มีคำขอยืมรออนุมัติ" /> :
              <div className="space-y-3">
                {pendingBorrows.map((b, i) => (
                  <motion.div key={b.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-white rounded-2xl border border-blue-100 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">รออนุมัติ</span>
                          <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{b.itemCode}</span>
                        </div>
                        <p className="font-semibold text-sm text-gray-900 truncate">{b.itemName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {b.borrowerName} · {b.borrowerDepartment} · จำนวน {b.quantity}
                        </p>
                        {b.borrowDate && (
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatDate(b.borrowDate)}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => setRejectTarget({ id: b.id, type: "borrow" })}
                          className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                          <XCircle className="w-5 h-5" />
                        </button>
                        <button onClick={() => approveBorrow.mutate(b.id)} disabled={approveBorrow.isPending}
                          className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-50">
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            }
          </div>

          {/* Return pending */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Undo2 className="w-4 h-4 text-purple-500" />
              รอรับทราบการคืน ({returnPending.length})
            </h3>
            {returnPending.length === 0 ? <Empty label="ไม่มีรายการรอรับทราบ" /> :
              <div className="space-y-3">
                {returnPending.map((b, i) => (
                  <motion.div key={b.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-white rounded-2xl border border-purple-100 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">รอรับทราบ</span>
                          <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{b.itemCode}</span>
                        </div>
                        <p className="font-semibold text-sm text-gray-900 truncate">{b.itemName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {b.borrowerName} · {b.borrowerDepartment} · จำนวน {b.quantity}
                        </p>
                        {b.actualReturnDate && (
                          <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
                            <Undo2 className="w-3 h-3" /> แจ้งคืน: {formatDate(b.actualReturnDate)}
                          </p>
                        )}
                        {b.returnNotes && (
                          <p className="text-xs text-gray-500 mt-1">หมายเหตุ: {b.returnNotes}</p>
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
                      <button onClick={() => acknowledgeRet.mutate(b.id)} disabled={acknowledgeRet.isPending}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors shrink-0"
                      >
                        <CheckCircle className="w-4 h-4" /> รับทราบ
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            }
          </div>

          {/* Active borrows — admin รับของคืนโดยตรง */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-orange-500" />
              ยืมอยู่ ({activeBorrows.length})
            </h3>
            {activeBorrows.length === 0 ? <Empty label="ไม่มีรายการยืมอยู่" /> :
              <div className="space-y-3">
                {activeBorrows.map((b, i) => (
                  <motion.div key={b.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-white rounded-2xl border border-orange-100 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700">ยืมอยู่</span>
                          <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{b.itemCode}</span>
                        </div>
                        <p className="font-semibold text-sm text-gray-900 truncate">{b.itemName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {b.borrowerName} · {b.borrowerDepartment} · จำนวน {b.quantity}
                        </p>
                        {b.borrowDate && (
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> ยืมเมื่อ: {formatDate(b.borrowDate)}
                          </p>
                        )}
                      </div>
                      <button onClick={() => adminReceive.mutate(b.id)} disabled={adminReceive.isPending}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors shrink-0"
                      >
                        <Undo2 className="w-4 h-4" /> รับคืน
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            }
          </div>
        </div>
      )}

      {/* ── TAB: เบิก ── */}
      {tab === "requisition" && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <PackageOpen className="w-4 h-4 text-amber-500" />
            คำขอเบิกรออนุมัติ ({pendingReqs.length})
          </h3>
          {reqLoading ? <Skeleton /> :
            pendingReqs.length === 0 ? <Empty label="ไม่มีคำขอเบิกรออนุมัติ" /> :
            <div className="space-y-3">
              {pendingReqs.map((req, i) => (
                <motion.div key={req.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-white rounded-2xl border border-amber-100 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">รออนุมัติ</span>
                        {req.itemCode && (
                          <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{req.itemCode}</span>
                        )}
                      </div>
                      <p className="font-semibold text-sm text-gray-900 truncate">{req.itemName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {req.requesterName} · จำนวน: {req.quantity}
                      </p>
                      {req.purpose && (
                        <p className="text-xs text-gray-500 mt-1">วัตถุประสงค์: {req.purpose}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => setRejectTarget({ id: req.id, type: "req" })}
                        className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                        <XCircle className="w-5 h-5" />
                      </button>
                      <button onClick={() => approveReq.mutate(req.id)} disabled={approveReq.isPending}
                        className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-50">
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          }
        </div>
      )}

      {/* ── TAB: ปรับสต็อก ── */}
      {tab === "adjustment" && (
        <div>
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาอุปกรณ์, รหัส..."
              className="w-full pl-11 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-500" />รับเข้า = สต็อกเพิ่ม
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <ArrowUpCircle className="w-3.5 h-3.5 text-red-500" />จ่ายออก = สต็อกลด
            </div>
          </div>
          <div className="space-y-2">
            {itemsLoading ? <Skeleton /> :
              filteredItems.length === 0 ? <div className="text-center py-16 text-gray-400 text-sm">ไม่พบอุปกรณ์</div> :
              filteredItems.map((item, i) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.01 }}
                  className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{item.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-xs text-blue-600">{item.code}</span>
                      <span className="text-xs text-gray-400">
                        คงเหลือ: <span className={`font-semibold ${item.quantityAvailable <= item.minStockLevel ? "text-red-500" : "text-gray-700"}`}>
                          {item.quantityAvailable}
                        </span>
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setAdjItem(item)}
                    className="shrink-0 px-4 py-2 text-sm font-bold bg-[#1D4ED8] text-white rounded-xl hover:bg-blue-700 active:scale-95 transition-all"
                  >
                    ปรับ
                  </button>
                </motion.div>
              ))
            }
          </div>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {adjItem && <AdjustSheet item={adjItem} onClose={() => setAdjItem(null)} />}
        {rejectTarget && (
          <RejectModal
            isPending={rejectTarget.type === "borrow" ? rejectBorrow.isPending : rejectReq.isPending}
            onCancel={() => setRejectTarget(null)}
            onConfirm={(reason) => {
              if (rejectTarget.type === "borrow") rejectBorrow.mutate({ id: rejectTarget.id, reason });
              else rejectReq.mutate({ id: rejectTarget.id, reason });
            }}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
      ))}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
}
