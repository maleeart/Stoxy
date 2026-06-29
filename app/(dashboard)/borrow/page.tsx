"use client";

import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Plus, Search, CheckCircle, XCircle, X, ArrowLeftRight,
  Camera, Clock, RotateCcw,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useInventoryItems } from "@/hooks/useInventory";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeBorrows } from "@/hooks/useRealtimeBorrows";
import {
  createBorrowRequest, approveBorrowRequest, rejectBorrowRequest, acknowledgeReturn,
} from "@/services/borrow.service";
import { uploadImages } from "@/lib/upload";
import { formatDate, cn } from "@/lib/utils";
import type { BorrowRecord, BorrowStatus } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";

const tabs: { label: string; value: BorrowStatus | "all" }[] = [
  { label: "ทั้งหมด", value: "all" },
  { label: "รออนุมัติ", value: "pending_approval" },
  { label: "ยืมอยู่", value: "borrowed" },
  { label: "รอรับทราบ", value: "return_pending" },
  { label: "คืนแล้ว", value: "returned" },
  { label: "ปฏิเสธ", value: "rejected" },
];

const statusBadge: Partial<Record<BorrowStatus, string>> = {
  pending_approval: "bg-yellow-100 text-yellow-700",
  borrowed: "bg-blue-100 text-blue-700",
  return_pending: "bg-purple-100 text-purple-700",
  returned: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  overdue: "bg-red-100 text-red-700",
  lost: "bg-gray-100 text-gray-700",
};
const statusLabel: Partial<Record<BorrowStatus, string>> = {
  pending_approval: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  borrowed: "ยืมอยู่",
  return_pending: "รอรับทราบ",
  returned: "คืนแล้ว",
  rejected: "ปฏิเสธ",
  overdue: "เกินกำหนด",
  lost: "สูญหาย",
};

export default function BorrowPage() {
  const { stoxyUser } = useAuth();
  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager";

  const [tab, setTab] = useState<BorrowStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [viewPhotos, setViewPhotos] = useState<string[] | null>(null);

  // Create form state
  const [itemId, setItemId] = useState("");
  const [quantityStr, setQuantityStr] = useState("1");
  const [borrowerName, setBorrowerName] = useState("");
  const [borrowerDept, setBorrowerDept] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [purpose, setPurpose] = useState("");
  const [borrowPhotos, setBorrowPhotos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: items = [] } = useInventoryItems();
  const { records, isLoading } = useRealtimeBorrows(tab);

  const filtered = search
    ? records.filter(
        (r) =>
          r.itemName.toLowerCase().includes(search.toLowerCase()) ||
          r.borrowerName.toLowerCase().includes(search.toLowerCase())
      )
    : records;

  const selected = items.find((i) => i.id === itemId);

  function resetForm() {
    setItemId(""); setQuantityStr("1"); setBorrowerName("");
    setBorrowerDept(""); setReturnDate(""); setPurpose(""); setBorrowPhotos([]);
  }

  const createMut = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("กรุณาเลือกอุปกรณ์");
      if (!borrowerName.trim()) throw new Error("กรุณาระบุชื่อผู้ยืม");
      if (!returnDate) throw new Error("กรุณาระบุวันกำหนดคืน");
      if (!purpose.trim()) throw new Error("กรุณาระบุวัตถุประสงค์");

      setUploading(true);
      let photoUrls: string[] = [];
      if (borrowPhotos.length > 0) {
        photoUrls = await uploadImages(borrowPhotos, "borrow-photos");
      }
      setUploading(false);

      return createBorrowRequest({
        itemId: selected.id,
        itemCode: selected.code,
        itemName: selected.name,
        quantity: Math.max(1, parseInt(quantityStr) || 1),
        borrowerName,
        borrowerDepartment: borrowerDept,
        borrowerId: stoxyUser?.uid ?? "",
        expectedReturnDate: Timestamp.fromDate(new Date(returnDate)),
        purpose,
        status: "pending_approval",
        borrowPhotos: photoUrls,
        createdBy: stoxyUser?.uid ?? "",
      } as any);
    },
    onSuccess: () => {
      toast.success("ส่งคำขอยืมสำเร็จ รอการอนุมัติ");
      setShowForm(false); resetForm();
    },
    onError: (e: any) => { setUploading(false); toast.error(e.message ?? "เกิดข้อผิดพลาด"); },
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => approveBorrowRequest(id, stoxyUser?.uid ?? ""),
    onSuccess: () => toast.success("อนุมัติแล้ว"),
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  const rejectMut = useMutation({
    mutationFn: () => rejectBorrowRequest(rejectId!, stoxyUser?.uid ?? "", rejectReason),
    onSuccess: () => { toast.success("ปฏิเสธแล้ว"); setRejectId(null); setRejectReason(""); },
    onError: () => toast.error("เกิดข้อผิดพลาด"),
  });

  const acknowledgeMut = useMutation({
    mutationFn: (id: string) => acknowledgeReturn(id, stoxyUser?.uid ?? ""),
    onSuccess: () => toast.success("รับทราบการคืนแล้ว"),
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  return (
    <AppShell title="ยืม-คืน">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">บันทึกการยืม-คืน</h2>
          <p className="text-sm text-gray-500">{filtered.length} รายการ</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[#0d2137] text-white rounded-xl hover:bg-[#1a3a5c] transition-colors"
        >
          <Plus className="w-4 h-4" />
          สร้างคำขอยืม
        </button>
      </div>

      {/* Create Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => { setShowForm(false); resetForm(); }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
              transition={{ duration: 0.15 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">สร้างคำขอยืม</h3>
                <button onClick={() => { setShowForm(false); resetForm(); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">อุปกรณ์ที่ต้องการยืม</label>
                  <select value={itemId} onChange={(e) => setItemId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="">-- เลือกอุปกรณ์ --</option>
                    {items.filter((i) => i.quantityAvailable > 0).map((i) => (
                      <option key={i.id} value={i.id}>[{i.code}] {i.name} (คงเหลือ {i.quantityAvailable})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">จำนวน</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={quantityStr}
                    onChange={(e) => setQuantityStr(e.target.value)}
                    onBlur={() => {
                      const n = parseInt(quantityStr);
                      const max = selected?.quantityAvailable ?? 99;
                      setQuantityStr(String(Math.min(Math.max(1, isNaN(n) ? 1 : n), max)));
                    }}
                    min={1}
                    max={selected?.quantityAvailable ?? 99}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">ชื่อผู้ยืม</label>
                  <input value={borrowerName} onChange={(e) => setBorrowerName(e.target.value)}
                    placeholder="ชื่อ-นามสกุล"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">แผนก/หน่วยงาน</label>
                  <input value={borrowerDept} onChange={(e) => setBorrowerDept(e.target.value)}
                    placeholder="เช่น แผนกไฟฟ้า"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">กำหนดคืน</label>
                  <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} min={minDate}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">วัตถุประสงค์</label>
                  <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={2}
                    placeholder="ระบุเหตุผลที่ยืม..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                  />
                </div>

                {/* Photo upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    รูปภาพสภาพอุปกรณ์ก่อนยืม
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer px-3 py-2.5 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-400 transition-colors">
                    <Camera className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">เลือกรูปภาพ (ไม่บังคับ)</span>
                    <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                      onChange={(e) => setBorrowPhotos(Array.from(e.target.files ?? []))}
                    />
                  </label>
                  {borrowPhotos.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {borrowPhotos.map((f, i) => (
                        <img key={i} src={URL.createObjectURL(f)} alt=""
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                        />
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => createMut.mutate()}
                  disabled={!itemId || !borrowerName.trim() || !returnDate || !purpose.trim() || createMut.isPending}
                  className="w-full py-2.5 text-sm font-medium bg-[#0d2137] text-white rounded-xl disabled:opacity-50 hover:bg-[#1a3a5c] transition-colors"
                >
                  {uploading ? "กำลังอัพโหลดรูป..." : createMut.isPending ? "กำลังส่ง..." : "ส่งคำขอยืม"}
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
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setRejectId(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">เหตุผลที่ปฏิเสธ</h3>
              <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3}
                placeholder="ระบุเหตุผล..."
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none mb-3"
              />
              <div className="flex gap-2">
                <button onClick={() => rejectMut.mutate()} disabled={!rejectReason.trim() || rejectMut.isPending}
                  className="flex-1 py-2 text-sm font-medium bg-red-600 text-white rounded-xl disabled:opacity-50 hover:bg-red-700 transition-colors"
                >ยืนยัน</button>
                <button onClick={() => setRejectId(null)} className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">
                  ยกเลิก
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo Viewer Modal */}
      <AnimatePresence>
        {viewPhotos && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            onClick={() => setViewPhotos(null)}
          >
            <div className="flex gap-3 flex-wrap justify-center max-w-2xl" onClick={(e) => e.stopPropagation()}>
              {viewPhotos.map((url, i) => (
                <img key={i} src={url} alt="" className="max-h-[70vh] max-w-full rounded-xl object-contain" />
              ))}
              <button onClick={() => setViewPhotos(null)} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.value} onClick={() => setTab(t.value)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap",
              tab === t.value
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาอุปกรณ์หรือผู้ยืม..."
          className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
          <ArrowLeftRight className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">ไม่พบรายการ</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((record, i) => {
            const overdue = record.status === "borrowed" && record.expectedReturnDate.toDate() < new Date();
            const isReturnPending = record.status === "return_pending";
            return (
              <motion.div key={record.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={cn(
                  "bg-white dark:bg-gray-900 rounded-2xl border p-4",
                  overdue ? "border-red-200 dark:border-red-900"
                    : isReturnPending ? "border-purple-200 dark:border-purple-900"
                    : "border-gray-100 dark:border-gray-800"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[record.status] ?? "bg-gray-100 text-gray-700"}`}>
                        {overdue ? "เกินกำหนด" : (statusLabel[record.status] ?? record.status)}
                      </span>
                      <span className="font-mono text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                        {record.itemCode}
                      </span>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white">{record.itemName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      ผู้ยืม: {record.borrowerName} · {record.borrowerDepartment} · จำนวน: {record.quantity}
                    </p>

                    {/* Timestamps */}
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {record.borrowDate && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          ยืม: {formatDate(record.borrowDate)}
                        </span>
                      )}
                      {record.actualReturnDate && (
                        <span className="flex items-center gap-1 text-xs text-emerald-600">
                          <RotateCcw className="w-3 h-3" />
                          คืน: {formatDate(record.actualReturnDate)}
                        </span>
                      )}
                    </div>

                    {record.rejectionReason && (
                      <p className="text-xs text-red-500 mt-0.5">เหตุผล: {record.rejectionReason}</p>
                    )}

                    {/* Return info for return_pending */}
                    {isReturnPending && (
                      <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-xs text-purple-700 dark:text-purple-400">
                        <p>สภาพเมื่อคืน: {record.returnCondition ?? "-"}</p>
                        {record.returnNotes && <p>หมายเหตุ: {record.returnNotes}</p>}
                      </div>
                    )}

                    {/* Photo buttons */}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {(record.borrowPhotos?.length ?? 0) > 0 && (
                        <button onClick={() => setViewPhotos(record.borrowPhotos!)}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        >
                          <Camera className="w-3 h-3" />
                          รูปก่อนยืม ({record.borrowPhotos!.length})
                        </button>
                      )}
                      {(record.returnPhotos?.length ?? 0) > 0 && (
                        <button onClick={() => setViewPhotos(record.returnPhotos!)}
                          className="flex items-center gap-1 text-xs text-emerald-600 hover:underline"
                        >
                          <Camera className="w-3 h-3" />
                          รูปหลังคืน ({record.returnPhotos!.length})
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0 space-y-1.5">
                    <p className="text-xs text-gray-400">กำหนดคืน</p>
                    <p className={`text-sm font-semibold ${overdue ? "text-red-600" : "text-gray-800 dark:text-gray-200"}`}>
                      {formatDate(record.expectedReturnDate)}
                    </p>

                    {/* Admin actions */}
                    {isAdmin && record.status === "pending_approval" && (
                      <div className="flex gap-1.5">
                        <button onClick={() => approveMut.mutate(record.id)} disabled={approveMut.isPending}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> อนุมัติ
                        </button>
                        <button onClick={() => setRejectId(record.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" /> ปฏิเสธ
                        </button>
                      </div>
                    )}

                    {isAdmin && record.status === "return_pending" && (
                      <button onClick={() => acknowledgeMut.mutate(record.id)} disabled={acknowledgeMut.isPending}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> รับทราบ
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
