"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { useRealtimeBorrows } from "@/hooks/useRealtimeBorrows";
import { submitReturn, acknowledgeReturn } from "@/services/borrow.service";
import { uploadImages } from "@/lib/upload";
import { formatDate, cn } from "@/lib/utils";
import { Undo2, CheckCircle, AlertTriangle, Camera, Clock } from "lucide-react";
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
  const { stoxyUser } = useAuth();
  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager";

  const [selected, setSelected] = useState<BorrowRecord | null>(null);
  const [condition, setCondition] = useState<ItemCondition>("good");
  const [notes, setNotes] = useState("");
  const [returnPhotos, setReturnPhotos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const { allRecords, isLoading } = useRealtimeBorrows();

  const borrowed = allRecords.filter((b) => b.status === "borrowed").filter(
    (b) => isAdmin || b.borrowerId === stoxyUser?.uid
  );
  const returnPending = allRecords.filter((b) => b.status === "return_pending");

  const submitMut = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      setUploading(true);
      let photoUrls: string[] = [];
      if (returnPhotos.length > 0) {
        photoUrls = await uploadImages(returnPhotos, `return-photos/${selected.id}`);
      }
      setUploading(false);
      return submitReturn(selected.id, {
        condition,
        notes,
        returnPhotos: photoUrls,
        returnedBy: stoxyUser?.uid ?? "",
      });
    },
    onSuccess: () => {
      toast.success("แจ้งคืนสำเร็จ รอแอดมินรับทราบ");
      setSelected(null);
      setNotes("");
      setCondition("good");
      setReturnPhotos([]);
    },
    onError: (e: any) => { setUploading(false); toast.error(e.message ?? "เกิดข้อผิดพลาด"); },
  });

  const acknowledgeMut = useMutation({
    mutationFn: (id: string) => acknowledgeReturn(id, stoxyUser?.uid ?? ""),
    onSuccess: () => toast.success("รับทราบการคืนแล้ว ปิดรายการสำเร็จ"),
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  const now = new Date();

  return (
    <AppShell title="รับคืน">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">รับคืนอุปกรณ์</h2>
          <p className="text-sm text-gray-500">
            ยืมอยู่ {borrowed.length} รายการ · รอรับทราบ {returnPending.length} รายการ
          </p>
        </div>
      </div>

      {/* ── Section 1: ยืมอยู่ ── */}
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">รายการที่ยืมอยู่</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {/* List */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
            ))
          ) : borrowed.length === 0 ? (
            <div className="text-center py-10 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
              <Undo2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">ไม่มีรายการที่ยืมอยู่</p>
            </div>
          ) : (
            borrowed.map((b, i) => {
              const overdue = b.expectedReturnDate.toDate() < now;
              const isActive = selected?.id === b.id;
              return (
                <motion.button key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }} onClick={() => { setSelected(b); setCondition("good"); setNotes(""); setReturnPhotos([]); }}
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
                      {b.borrowDate && (
                        <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                          <Clock className="w-3 h-3" />
                          ยืมเมื่อ: {formatDate(b.borrowDate)}
                        </p>
                      )}
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
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 h-fit"
            >
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                แจ้งคืน: {selected.itemName}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">สภาพเมื่อคืน</label>
                  <div className="grid grid-cols-3 gap-2">
                    {conditions.map((c) => (
                      <button key={c.value} type="button" onClick={() => setCondition(c.value)}
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">หมายเหตุ</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                    placeholder="บันทึกเพิ่มเติม..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                  />
                </div>

                {/* Photo upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    รูปภาพสภาพอุปกรณ์หลังคืน
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer px-3 py-2.5 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-400 transition-colors">
                    <Camera className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">เลือกรูปภาพ (ไม่บังคับ)</span>
                    <input type="file" accept="image/*" multiple className="hidden"
                      onChange={(e) => setReturnPhotos(Array.from(e.target.files ?? []))}
                    />
                  </label>
                  {returnPhotos.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {returnPhotos.map((f, i) => (
                        <img key={i} src={URL.createObjectURL(f)} alt=""
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => submitMut.mutate()} disabled={submitMut.isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {uploading ? "กำลังอัพโหลดรูป..." : submitMut.isPending ? "กำลังบันทึก..." : "แจ้งคืน"}
                  </button>
                  <button onClick={() => setSelected(null)}
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

      {/* ── Section 2: รอรับทราบ (admin) ── */}
      {(isAdmin || returnPending.length > 0) && (
        <>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            รายการรอการรับทราบ
            {returnPending.length > 0 && (
              <span className="ml-2 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                {returnPending.length}
              </span>
            )}
          </h3>
          {returnPending.length === 0 ? (
            <div className="text-center py-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
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
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">
                          รอรับทราบ
                        </span>
                        <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {b.itemCode}
                        </span>
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white">{b.itemName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        ผู้ยืม: {b.borrowerName} · {b.borrowerDepartment} · จำนวน: {b.quantity}
                      </p>
                      <div className="flex gap-3 mt-1 flex-wrap">
                        {b.borrowDate && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            ยืม: {formatDate(b.borrowDate)}
                          </span>
                        )}
                        {b.actualReturnDate && (
                          <span className="flex items-center gap-1 text-xs text-emerald-600">
                            <Undo2 className="w-3 h-3" />
                            แจ้งคืน: {formatDate(b.actualReturnDate)}
                          </span>
                        )}
                      </div>
                      {b.returnCondition && (
                        <p className="text-xs text-gray-500 mt-1">
                          สภาพ: {conditions.find((c) => c.value === b.returnCondition)?.label ?? b.returnCondition}
                          {b.returnNotes && ` · ${b.returnNotes}`}
                        </p>
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
                    {isAdmin && (
                      <button onClick={() => acknowledgeMut.mutate(b.id)} disabled={acknowledgeMut.isPending}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors shrink-0"
                      >
                        <CheckCircle className="w-4 h-4" />
                        รับทราบ
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
