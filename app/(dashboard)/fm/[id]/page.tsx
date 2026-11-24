"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { MobileHeader } from "@/components/layout/MobileHeader";
import {
  getFMWorkOrder,
  submitFMWorkOrderItems,
  updateFMWorkOrderItems,
  approveFMWorkOrder,
  rejectFMWorkOrder,
  deleteFMWorkOrder,
  setFMWorkOrderWaitingParts,
  resumeFMWorkOrderToPending,
  completeFMWorkOrderWithoutItems,
  adminUpdateFMWorkOrderStatus,
} from "@/services/fm.service";
import { useInventoryItems } from "@/hooks/useInventory";
import { useAuth } from "@/hooks/useAuth";
import {
  Wrench, ArrowLeft, Calendar, MapPin, User, Building, Phone,
  Mail, FileText, CheckCircle2, AlertTriangle, Clock, Plus,
  Trash2, X, Search, Check, Ban, ExternalLink, Printer, Download, Save,
  PackageSearch, Edit3,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { openAttachmentInNewTab, downloadAttachmentFile } from "@/services/fm-storage.service";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import type { FMWorkOrderItem, FMWorkOrderStatus, InventoryItem } from "@/types";

const statusConfig: Record<FMWorkOrderStatus, { label: string; badge: string; bg: string }> = {
  pending: {
    label: "รอดำเนินการ",
    badge: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    bg: "border-amber-200 dark:border-amber-800",
  },
  waiting_parts: {
    label: "รอจัดซื้อ/หาอุปกรณ์",
    badge: "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
    bg: "border-orange-200 dark:border-orange-800",
  },
  pending_review: {
    label: "รอตรวจสอบ",
    badge: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
    bg: "border-purple-200 dark:border-purple-800",
  },
  completed: {
    label: "เสร็จสิ้น",
    badge: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
    bg: "border-emerald-200 dark:border-emerald-800",
  },
  rejected: {
    label: "ส่งกลับแก้ไข",
    badge: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
    bg: "border-rose-200 dark:border-rose-800",
  },
  cancelled: {
    label: "ยกเลิก",
    badge: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400",
    bg: "border-gray-200 dark:border-gray-700",
  },
};

export default function FMWorkOrderDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { stoxyUser } = useAuth();
  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager";
  const qc = useQueryClient();

  const { data: workOrder, isLoading } = useQuery({
    queryKey: ["fm_workorder", id],
    queryFn: () => getFMWorkOrder(id),
    enabled: !!id,
  });

  const { data: inventory = [] } = useInventoryItems();

  // Item Picker State
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [workingItems, setWorkingItems] = useState<FMWorkOrderItem[]>([]);
  const [hasInitializedItems, setHasInitializedItems] = useState(false);

  // Rejection modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Waiting parts modal
  const [showWaitingPartsModal, setShowWaitingPartsModal] = useState(false);
  const [waitingPartsReason, setWaitingPartsReason] = useState("");

  // Admin status override modal
  const [showAdminStatusModal, setShowAdminStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<FMWorkOrderStatus>("pending");
  const [statusChangeNote, setStatusChangeNote] = useState("");

  // Sync loaded items once
  if (workOrder && !hasInitializedItems) {
    setWorkingItems(workOrder.items || []);
    setHasInitializedItems(true);
  }

  // Mutations
  const submitItemsMut = useMutation({
    mutationFn: () =>
      submitFMWorkOrderItems(
        id,
        workingItems,
        stoxyUser?.uid ?? "",
        stoxyUser?.displayName || stoxyUser?.nickname || "ช่างผู้ดำเนินการ"
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fm_workorder", id] });
      qc.invalidateQueries({ queryKey: ["fm_workorders"] });
      qc.invalidateQueries({ queryKey: ["fm_active_count"] });
      toast.success("ส่งรายการอุปกรณ์รอตรวจสอบสำเร็จแล้ว");
    },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  const updateItemsMut = useMutation({
    mutationFn: () => updateFMWorkOrderItems(id, workingItems),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fm_workorder", id] });
      qc.invalidateQueries({ queryKey: ["fm_workorders"] });
      toast.success("บันทึกการแก้ไขรายการอุปกรณ์เรียบร้อยแล้ว");
    },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาดในการบันทึก"),
  });

  const approveMut = useMutation({
    mutationFn: () =>
      approveFMWorkOrder(
        id,
        stoxyUser?.uid ?? "",
        stoxyUser?.displayName || stoxyUser?.nickname || "ผู้ดูแลระบบ",
        workingItems
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fm_workorder", id] });
      qc.invalidateQueries({ queryKey: ["fm_workorders"] });
      qc.invalidateQueries({ queryKey: ["fm_active_count"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["movements_all"] });
      toast.success("อนุมัติและตัดสต็อกเรียบร้อยแล้ว");
    },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาดในการตัดสต็อก"),
  });

  const rejectMut = useMutation({
    mutationFn: () =>
      rejectFMWorkOrder(id, stoxyUser?.uid ?? "", rejectReason || "ข้อมูลไม่ถูกต้อง"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fm_workorder", id] });
      qc.invalidateQueries({ queryKey: ["fm_workorders"] });
      qc.invalidateQueries({ queryKey: ["fm_active_count"] });
      toast.success("ส่งกลับแก้ไขเรียบร้อยแล้ว");
      setShowRejectModal(false);
      setRejectReason("");
    },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteFMWorkOrder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fm_workorders"] });
      qc.invalidateQueries({ queryKey: ["fm_active_count"] });
      toast.success("ลบใบแจ้งงาน FM สำเร็จ");
      router.push("/fm");
    },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาดในการลบ"),
  });

  const waitingPartsMut = useMutation({
    mutationFn: (reason: string) =>
      setFMWorkOrderWaitingParts(
        id,
        stoxyUser?.uid ?? "",
        stoxyUser?.displayName || stoxyUser?.nickname || "ช่างผู้รับผิดชอบ",
        reason
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fm_workorder", id] });
      qc.invalidateQueries({ queryKey: ["fm_workorders"] });
      qc.invalidateQueries({ queryKey: ["fm_active_count"] });
      toast.success("บันทึกสถานะรอจัดซื้อ/หาอุปกรณ์แล้ว");
      setShowWaitingPartsModal(false);
      setWaitingPartsReason("");
    },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  const resumePendingMut = useMutation({
    mutationFn: () => resumeFMWorkOrderToPending(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fm_workorder", id] });
      qc.invalidateQueries({ queryKey: ["fm_workorders"] });
      qc.invalidateQueries({ queryKey: ["fm_active_count"] });
      toast.success("เปลี่ยนสถานะกลับเป็นรอดำเนินการเรียบร้อยแล้ว");
    },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  const completeWithoutItemsMut = useMutation({
    mutationFn: () =>
      completeFMWorkOrderWithoutItems(
        id,
        stoxyUser?.uid ?? "",
        stoxyUser?.displayName || stoxyUser?.nickname || "ผู้ดำเนินการ"
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fm_workorder", id] });
      qc.invalidateQueries({ queryKey: ["fm_workorders"] });
      qc.invalidateQueries({ queryKey: ["fm_active_count"] });
      toast.success("ส่งดำเนินการแล้ว (ไม่เบิกของ) รอผู้ดูแลอนุมัติเรียบร้อยแล้ว");
    },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  const adminStatusMut = useMutation({
    mutationFn: () =>
      adminUpdateFMWorkOrderStatus(
        id,
        targetStatus,
        stoxyUser?.uid ?? "",
        stoxyUser?.displayName || stoxyUser?.nickname || "ผู้ดูแลระบบ",
        statusChangeNote
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fm_workorder", id] });
      qc.invalidateQueries({ queryKey: ["fm_workorders"] });
      qc.invalidateQueries({ queryKey: ["fm_active_count"] });
      toast.success(
        `เปลี่ยนสถานะเป็น "${statusConfig[targetStatus]?.label || targetStatus}" สำเร็จ`
      );
      setShowAdminStatusModal(false);
      setStatusChangeNote("");
    },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาดในการเปลี่ยนสถานะ"),
  });

  if (isLoading) {
    return (
      <AppShell title="ใบแจ้งงานซ่อม (FM)">
        <div className="text-center py-24 text-gray-400">กำลังโหลดข้อมูล...</div>
      </AppShell>
    );
  }

  if (!workOrder) {
    return (
      <AppShell title="ใบแจ้งงานซ่อม (FM)">
        <div className="text-center py-24">
          <p className="text-gray-500 mb-3">ไม่พบใบแจ้งงาน FM นี้</p>
          <button
            onClick={() => router.push("/fm")}
            className="px-4 py-2 bg-[#1D4ED8] text-white rounded-xl text-sm font-semibold"
          >
            กลับหน้ารายการ
          </button>
        </div>
      </AppShell>
    );
  }

  const cfg = statusConfig[workOrder.status] || statusConfig.pending;
  const canEditItems =
    isAdmin ||
    workOrder.status === "pending" ||
    workOrder.status === "waiting_parts" ||
    workOrder.status === "rejected" ||
    workOrder.status === "pending_review";

  const addItemToWorkOrder = (inv: InventoryItem) => {
    setWorkingItems((prev) => {
      const existing = prev.find((i) => i.itemId === inv.id);
      if (existing) {
        return prev.map((i) =>
          i.itemId === inv.id
            ? { ...i, quantity: Math.min(i.quantity + 1, inv.quantityAvailable) }
            : i
        );
      }
      return [
        ...prev,
        {
          itemId: inv.id,
          itemCode: inv.code,
          itemName: inv.name,
          quantity: 1,
          unit: inv.unit || "ชิ้น",
        },
      ];
    });
    toast.success(`เพิ่ม ${inv.name} ลงในรายการแล้ว`);
  };

  const updateItemQty = (itemId: string, qty: number, maxQty?: number) => {
    if (qty <= 0) {
      setWorkingItems((prev) => prev.filter((i) => i.itemId !== itemId));
      return;
    }
    const finalQty = maxQty != null ? Math.min(qty, maxQty) : qty;
    setWorkingItems((prev) =>
      prev.map((i) => (i.itemId === itemId ? { ...i, quantity: finalQty } : i))
    );
  };

  const updateItemNotes = (itemId: string, notes: string) => {
    setWorkingItems((prev) =>
      prev.map((i) => (i.itemId === itemId ? { ...i, notes } : i))
    );
  };

  const removeItem = (itemId: string) => {
    setWorkingItems((prev) => prev.filter((i) => i.itemId !== itemId));
  };

  const filteredInventory = inventory.filter((item) => {
    if (item.quantityAvailable <= 0) return false;
    if (!itemSearch.trim()) return true;
    const q = itemSearch.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q) ||
      item.categoryName?.toLowerCase().includes(q)
    );
  });

  return (
    <AppShell title={`FM-${workOrder.workOrderNumber}`}>
      <MobileHeader title={`ใบงาน FM-${workOrder.workOrderNumber}`} back />

      {/* Top action bar */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <button
          onClick={() => router.push("/fm")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> ย้อนกลับ
        </button>

        <div className="flex items-center gap-2">
          {workOrder.attachmentUrl && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => openAttachmentInNewTab(workOrder.attachmentUrl!, workOrder.attachmentName)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-rose-500" /> ดูเอกสารแนบ <ExternalLink className="w-3 h-3 opacity-60" />
              </button>
              <button
                type="button"
                onClick={() => downloadAttachmentFile(workOrder.attachmentUrl!, workOrder.attachmentName)}
                className="p-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 transition-colors"
                title="ดาวน์โหลดไฟล์เอกสารแนบ"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> พิมพ์
          </button>
          {isAdmin && (
            <button
              onClick={() => {
                if (confirm("คุณแน่ใจว่าต้องการลบใบแจ้งงาน FM นี้?")) {
                  deleteMut.mutate();
                }
              }}
              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-colors"
              title="ลบใบงาน"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Status Alert Banners */}
      {workOrder.status === "waiting_parts" && (
        <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5 sm:mt-0">
              <PackageSearch className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-orange-950 dark:text-orange-200">
                สถานะ: อยู่ระหว่างรอจัดซื้อ / จัดหาอุปกรณ์
              </p>
              <p className="text-xs text-orange-800 dark:text-orange-300 mt-0.5">
                {workOrder.waitingPartsReason
                  ? `รายการที่รอ: ${workOrder.waitingPartsReason}`
                  : "รออุปกรณ์เพื่อนำไปดำเนินการต่อ"}
                {workOrder.waitingPartsByName && ` · บันทึกโดย ${workOrder.waitingPartsByName}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => {
                if (confirm("เปลี่ยนสถานะกลับเป็น 'รอดำเนินการ'?")) {
                  resumePendingMut.mutate();
                }
              }}
              disabled={resumePendingMut.isPending}
              className="w-full sm:w-auto px-3.5 py-2 bg-white dark:bg-gray-800 hover:bg-orange-100/50 dark:hover:bg-gray-700 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 text-center"
            >
              เปลี่ยนกลับเป็นรอดำเนินการ
            </button>
          </div>
        </div>
      )}

      {workOrder.status === "pending_review" && (
        <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5 sm:mt-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-purple-900 dark:text-purple-200">
                {workOrder.completedWithoutItems
                  ? "รอผู้ดูแลตรวจสอบและอนุมัติ (ดำเนินการแล้ว ไม่เบิกของ)"
                  : "รอผู้ดูแลตรวจสอบและอนุมัติตัดสต็อก"}
              </p>
              <p className="text-xs text-purple-700 dark:text-purple-400 mt-0.5">
                ส่งโดย {workOrder.submittedByName || "ช่าง"} เมื่อ{" "}
                {formatDate(workOrder.submittedAt)}
              </p>
              <p className="text-[11px] text-purple-600 dark:text-purple-300 mt-1 font-medium">
                {workOrder.completedWithoutItems
                  ? "💡 ช่างแจ้งว่าดำเนินการเรียบร้อยแล้วโดยไม่ใช้อุปกรณ์ หากต้องการเบิกอุปกรณ์เพิ่มเติม สามารถเลือกเพิ่มด้านล่างก่อนอนุมัติได้"
                  : "💡 สามารถแก้ไข ปรับจำนวน หรือเพิ่ม/ลบรายการอุปกรณ์ด้านล่างได้ก่อนอนุมัติ"}
              </p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0">
              <button
                onClick={() => setShowRejectModal(true)}
                className="flex-1 sm:flex-none px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors text-center"
              >
                ส่งกลับแก้ไข
              </button>
              <button
                onClick={() => {
                  if (
                    confirm(
                      workOrder.completedWithoutItems || workingItems.length === 0
                        ? "ยืนยันการอนุมัติปิดใบงาน (ไม่เบิกของ)?"
                        : "ยืนยันการอนุมัติและตัดสต็อกตามรายการที่เลือก?"
                    )
                  ) {
                    approveMut.mutate();
                  }
                }}
                disabled={approveMut.isPending}
                className="flex-1 sm:flex-none px-4 py-2 bg-[#1D4ED8] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 text-center"
              >
                {approveMut.isPending
                  ? "กำลังบันทึก..."
                  : workOrder.completedWithoutItems || workingItems.length === 0
                  ? "อนุมัติปิดใบงาน"
                  : "อนุมัติตัดสต็อก"}
              </button>
            </div>
          )}
        </div>
      )}

      {workOrder.status === "completed" && (
        <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                {workOrder.completedWithoutItems
                  ? "ดำเนินการเสร็จสิ้นเรียบร้อยแล้ว (ไม่เบิกของ)"
                  : "อนุมัติและตัดสต็อกเรียบร้อยแล้ว"}
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                {workOrder.completedWithoutItems ? "บันทึกโดย" : "อนุมัติโดย"}{" "}
                {workOrder.approvedByName || "ผู้ดูแลระบบ"} เมื่อ{" "}
                {formatDate(workOrder.approvedAt)}
              </p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setTargetStatus(workOrder.status);
                  setStatusChangeNote("");
                  setShowAdminStatusModal(true);
                }}
                className="w-full sm:w-auto px-3.5 py-2 bg-white dark:bg-gray-800 hover:bg-emerald-100/50 dark:hover:bg-gray-700 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 text-center flex items-center justify-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>แก้ไขสถานะ (Admin)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {workOrder.status === "rejected" && (
        <div className="bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 mb-4 flex items-center gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-rose-900 dark:text-rose-200">
              ใบงานถูกส่งกลับแก้ไข
            </p>
            <p className="text-xs text-rose-700 dark:text-rose-400 mt-0.5">
              เหตุผล: {workOrder.rejectedReason || "กรุณาตรวจสอบและปรับปรุงรายการอุปกรณ์"}
            </p>
          </div>
        </div>
      )}

      {/* Main Document Card */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-6 mb-6">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/40 text-[#1D4ED8] flex items-center justify-center font-bold text-lg">
              FM
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-base font-black text-gray-900 dark:text-white">
                  ใบแจ้งงานซ่อม เลขที่ {workOrder.workOrderNumber}
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${cfg.badge}`}>
                  {workOrder.status === "completed" && workOrder.completedWithoutItems
                    ? "เสร็จสิ้น (ไม่เบิกของ)"
                    : cfg.label}
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setTargetStatus(workOrder.status);
                      setStatusChangeNote("");
                      setShowAdminStatusModal(true);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-[#1D4ED8] dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-all active:scale-95 shadow-sm"
                    title="ผู้ดูแลระบบ: แก้ไขสถานะใบงาน"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>แก้ไขสถานะ (Admin)</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Facility Management System (แบบฟอร์ม อบก-จ.-01)
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right space-y-0.5 text-xs text-gray-500 dark:text-gray-400">
            <p>
              <span className="font-semibold text-gray-700 dark:text-gray-300">วันที่แจ้งงาน:</span>{" "}
              {formatDate(workOrder.requestDate)}
            </p>
            {workOrder.useDate && (
              <p>
                <span className="font-semibold text-gray-700 dark:text-gray-300">วันที่ใช้งาน:</span>{" "}
                {formatDate(workOrder.useDate)}
              </p>
            )}
            {workOrder.workType && (
              <p>
                <span className="font-semibold text-gray-700 dark:text-gray-300">ประเภทงาน:</span>{" "}
                {workOrder.workType}
              </p>
            )}
          </div>
        </div>

        {/* Work Description Section */}
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0 mt-0.5">
              เรื่อง:
            </span>
            <h1 className="text-base font-bold text-gray-900 dark:text-white leading-snug">
              {workOrder.title}
            </h1>
          </div>

          {workOrder.description && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-2xl text-xs text-gray-700 dark:text-gray-300 leading-relaxed border border-gray-100 dark:border-gray-700">
              <span className="font-semibold text-gray-900 dark:text-white block mb-1">
                รายละเอียดงาน:
              </span>
              {workOrder.description}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <MapPin className="w-4 h-4 text-[#1D4ED8] shrink-0" />
            <span className="font-semibold text-gray-700 dark:text-gray-300">สถานที่ดำเนินการ:</span>
            <span>{workOrder.location}</span>
          </div>

          {workOrder.attachmentUrl && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/70 to-indigo-50/70 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800/60 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 dark:bg-red-950/60 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {workOrder.attachmentName || "เอกสารแนบใบแจ้งงานซ่อม (PDF)"}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    เอกสารแนบต้นฉบับประจำใบแจ้งงานซ่อม
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openAttachmentInNewTab(workOrder.attachmentUrl!, workOrder.attachmentName)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-[#1D4ED8] text-white rounded-xl hover:bg-blue-800 shadow-sm transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> เปิดดูเอกสาร
                </button>
                <button
                  type="button"
                  onClick={() => downloadAttachmentFile(workOrder.attachmentUrl!, workOrder.attachmentName)}
                  className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 transition-all"
                >
                  <Download className="w-3.5 h-3.5" /> ดาวน์โหลด
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 2-Columns Grid: Requester & Technician */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          {/* Requester Info */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/60 space-y-2 text-xs">
            <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 pb-1 border-b border-gray-200/60 dark:border-gray-600">
              <User className="w-3.5 h-3.5 text-[#1D4ED8]" /> ข้อมูลผู้แจ้งงาน
            </p>
            <p>
              <span className="text-gray-400">ชื่อผู้แจ้ง:</span>{" "}
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {workOrder.requesterName}
              </span>
            </p>
            <p>
              <span className="text-gray-400">สังกัด:</span>{" "}
              <span className="text-gray-800 dark:text-gray-200">{workOrder.requesterDepartment}</span>
            </p>
            {workOrder.requesterPhone && (
              <p>
                <span className="text-gray-400">โทรศัพท์:</span>{" "}
                <span className="text-gray-800 dark:text-gray-200">{workOrder.requesterPhone}</span>
              </p>
            )}
            {workOrder.requesterEmail && (
              <p>
                <span className="text-gray-400">อีเมล:</span>{" "}
                <span className="text-gray-800 dark:text-gray-200">{workOrder.requesterEmail}</span>
              </p>
            )}
            {workOrder.coordinatorName && (
              <p className="pt-1 text-gray-600 dark:text-gray-300 border-t border-dashed border-gray-200 dark:border-gray-600">
                <span className="text-gray-400">ผู้ประสานงาน:</span> {workOrder.coordinatorName}{" "}
                {workOrder.coordinatorPhone ? `(โทร: ${workOrder.coordinatorPhone})` : ""}
              </p>
            )}
          </div>

          {/* Technician & Assignor */}
          <div className="p-4 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 space-y-2 text-xs">
            <p className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5 pb-1 border-b border-blue-200/60 dark:border-blue-800">
              <Wrench className="w-3.5 h-3.5 text-[#1D4ED8]" /> ข้อมูลผู้ดำเนินการ
            </p>
            <p>
              <span className="text-gray-400">ผู้ดำเนินการ:</span>{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {workOrder.assignedTechnicianName || "ผู้ใช้งานระบบ"}
              </span>
            </p>
            {workOrder.assignedDepartment && (
              <p>
                <span className="text-gray-400">สังกัด / หน่วยงาน:</span>{" "}
                <span className="text-gray-800 dark:text-gray-200">{workOrder.assignedDepartment}</span>
              </p>
            )}
            {workOrder.assignedPhone && (
              <p>
                <span className="text-gray-400">โทรศัพท์:</span>{" "}
                <span className="text-gray-800 dark:text-gray-200">{workOrder.assignedPhone}</span>
              </p>
            )}
            {workOrder.assignedEmail && (
              <p>
                <span className="text-gray-400">อีเมล:</span>{" "}
                <span className="text-gray-800 dark:text-gray-200">{workOrder.assignedEmail}</span>
              </p>
            )}
            {workOrder.assignorName && (
              <p>
                <span className="text-gray-400">ผู้มอบหมายงาน:</span>{" "}
                <span className="text-gray-800 dark:text-gray-200">{workOrder.assignorName}</span>
              </p>
            )}
            {workOrder.assignedDate && (
              <p>
                <span className="text-gray-400">วันที่มอบหมาย:</span>{" "}
                <span className="text-gray-800 dark:text-gray-200">
                  {formatDate(workOrder.assignedDate)}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Section: รายการอุปกรณ์ที่ใช้/เบิกสำหรับใบงานนี้ ── */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4 mb-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#1D4ED8]" />
              รายการอุปกรณ์ที่ใช้สำหรับใบงานนี้
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {workingItems.length} รายการ (รวม{" "}
              {workingItems.reduce((s, i) => s + i.quantity, 0)} ชิ้น)
            </p>
          </div>

          {canEditItems && (
            <button
              onClick={() => setShowItemPicker(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#1D4ED8] hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-md shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" /> เลือกอุปกรณ์จากคลัง
            </button>
          )}
        </div>

        {/* Items Table / Cards */}
        {workingItems.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            <Wrench className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              ยังไม่มีการระบุอุปกรณ์ที่ใช้
            </p>
            {canEditItems && (
              <p className="text-[11px] text-gray-400 mt-1">
                กดปุ่ม "เลือกอุปกรณ์จากคลัง" ด้านบนเพื่อระบุรายการอุปกรณ์ที่จะเบิกใช้สำหรับงานนี้
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {workingItems.map((item, idx) => {
              const inv = inventory.find((x) => x.id === item.itemId);
              const isStockEnough = inv ? inv.quantityAvailable >= item.quantity : true;

              return (
                <div
                  key={item.itemId || idx}
                  className="p-3.5 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-[#1D4ED8] bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-lg">
                        {item.itemCode}
                      </span>
                      <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                        {item.itemName}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        คงเหลือในคลัง:{" "}
                        <strong
                          className={isStockEnough ? "text-emerald-600" : "text-rose-600"}
                        >
                          {inv?.quantityAvailable ?? "-"} {item.unit || "ชิ้น"}
                        </strong>
                      </span>
                      {inv?.locationName && <span>ที่เก็บ: {inv.locationName}</span>}
                    </div>

                    {canEditItems && (
                      <input
                        type="text"
                        value={item.notes || ""}
                        onChange={(e) => updateItemNotes(item.itemId, e.target.value)}
                        placeholder="ระบุจุดติดตั้งหรือหมายเหตุ เช่น พัดลมตัวที่ 1 ด้านทิศเหนือ"
                        className="mt-2 w-full text-xs px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                      />
                    )}
                    {!canEditItems && item.notes && (
                      <p className="mt-1 text-xs text-gray-500 italic">หมายเหตุ: {item.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    {canEditItems ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateItemQty(item.itemId, item.quantity - 1)}
                          className="w-8 h-8 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-sm font-bold active:scale-95 text-gray-700 dark:text-gray-300"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={inv?.quantityAvailable}
                          value={item.quantity}
                          onChange={(e) =>
                            updateItemQty(
                              item.itemId,
                              parseInt(e.target.value) || 1,
                              inv?.quantityAvailable
                            )
                          }
                          className="w-12 text-center text-sm font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl py-1 text-gray-900 dark:text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateItemQty(
                              item.itemId,
                              item.quantity + 1,
                              inv?.quantityAvailable
                            )
                          }
                          disabled={inv && item.quantity >= inv.quantityAvailable}
                          className="w-8 h-8 rounded-xl bg-[#1D4ED8] text-white flex items-center justify-center text-sm font-bold active:scale-95 disabled:opacity-40"
                        >
                          +
                        </button>
                        <span className="text-xs text-gray-500 ml-1">{item.unit || "ชิ้น"}</span>

                        <button
                          type="button"
                          onClick={() => removeItem(item.itemId)}
                          className="ml-2 p-1.5 text-gray-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-right">
                        <span className="text-sm font-black text-gray-900 dark:text-white px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                          {item.quantity} {item.unit || "ชิ้น"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Action button bar */}
        {canEditItems && (
          <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
            {/* If in pending / waiting_parts / rejected */}
            {(workOrder.status === "pending" ||
              workOrder.status === "waiting_parts" ||
              workOrder.status === "rejected") && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                {/* Secondary actions: รอของ หรือ เปลี่ยนสถานะ */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  {(workOrder.status === "pending" || workOrder.status === "rejected") && (
                    <button
                      type="button"
                      onClick={() => setShowWaitingPartsModal(true)}
                      className="w-full sm:w-auto px-4 py-2.5 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/60 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                    >
                      <PackageSearch className="w-4 h-4 text-orange-500 shrink-0" />
                      <span>รอของ (จัดซื้อ/หาอุปกรณ์)</span>
                    </button>
                  )}

                  {workOrder.status === "waiting_parts" && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("เปลี่ยนสถานะกลับเป็น 'รอดำเนินการ'?")) {
                          resumePendingMut.mutate();
                        }
                      }}
                      disabled={resumePendingMut.isPending}
                      className="w-full sm:w-auto px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>เปลี่ยนเป็นรอดำเนินการ</span>
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setTargetStatus(workOrder.status);
                        setStatusChangeNote("");
                        setShowAdminStatusModal(true);
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-[#1D4ED8] dark:text-blue-300 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                    >
                      <Edit3 className="w-4 h-4 shrink-0" />
                      <span>แก้ไขสถานะ (Admin)</span>
                    </button>
                  )}
                </div>

                {/* Primary / Completion actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                  {/* ปุ่มดำเนินการแล้ว (ไม่เบิกของ) -> ส่งไปสถานะ รอตรวจสอบ */}
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        confirm(
                          "ยืนยันว่าดำเนินการงานนี้เสร็จสิ้นแล้ว โดยไม่เบิกใช้อุปกรณ์จากคลัง?\n\n(ระบบจะส่งไปที่สถานะ 'รอตรวจสอบ' เพื่อให้ผู้ดูแลตรวจสอบและอนุมัติ)"
                        )
                      ) {
                        completeWithoutItemsMut.mutate();
                      }
                    }}
                    disabled={completeWithoutItemsMut.isPending}
                    className="w-full sm:w-auto px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {completeWithoutItemsMut.isPending
                        ? "กำลังส่ง..."
                        : "ดำเนินการแล้ว (ไม่เบิกของ)"}
                    </span>
                  </button>

                  {/* ยืนยันและส่งรอตรวจสอบ (เมื่อมี workingItems > 0) */}
                  {workingItems.length > 0 && (
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            "ยืนยันส่งรายการอุปกรณ์สำหรับใบงานนี้เพื่อให้ผู้ดูแลอนุมัติ?"
                          )
                        ) {
                          submitItemsMut.mutate();
                        }
                      }}
                      disabled={submitItemsMut.isPending}
                      className="w-full sm:w-auto px-5 py-2.5 bg-[#1D4ED8] hover:bg-blue-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4 shrink-0" />
                      <span>
                        {submitItemsMut.isPending
                          ? "กำลังบันทึก..."
                          : `ยืนยันและส่งรอตรวจสอบ (${workingItems.length} รายการ)`}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* If in pending_review */}
            {workOrder.status === "pending_review" && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setTargetStatus(workOrder.status);
                      setStatusChangeNote("");
                      setShowAdminStatusModal(true);
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-[#1D4ED8] dark:text-blue-300 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                  >
                    <Edit3 className="w-4 h-4 shrink-0" />
                    <span>แก้ไขสถานะ (Admin)</span>
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
                  <button
                    onClick={() => {
                      updateItemsMut.mutate();
                    }}
                    disabled={updateItemsMut.isPending}
                    className="w-full sm:w-auto px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-purple-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4 shrink-0" />
                    <span>
                      {updateItemsMut.isPending
                        ? "กำลังบันทึก..."
                        : "บันทึกการแก้ไขรายการอุปกรณ์"}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* If in completed or cancelled (Admin override view) */}
            {(workOrder.status === "completed" || workOrder.status === "cancelled") && isAdmin && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setTargetStatus(workOrder.status);
                    setStatusChangeNote("");
                    setShowAdminStatusModal(true);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-[#1D4ED8] dark:text-blue-300 rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                >
                  <Edit3 className="w-4 h-4 shrink-0" />
                  <span>แก้ไขสถานะใบงาน (Admin)</span>
                </button>

                <button
                  onClick={() => {
                    updateItemsMut.mutate();
                  }}
                  disabled={updateItemsMut.isPending}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#1D4ED8] hover:bg-blue-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4 shrink-0" />
                  <span>
                    {updateItemsMut.isPending
                      ? "กำลังบันทึก..."
                      : "บันทึกการแก้ไขรายการอุปกรณ์"}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Item Picker Modal */}
      <AnimatePresence>
        {showItemPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowItemPicker(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-xl bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 max-h-[85vh] flex flex-col z-10 overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-white">
                    เลือกอุปกรณ์จากคลัง
                  </h3>
                  <p className="text-xs text-gray-400">ค้นหาและกดเพิ่มลงในใบงาน FM</p>
                </div>
                <button
                  onClick={() => setShowItemPicker(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="ค้นหาชื่ออุปกรณ์, รหัส, หมวดหมู่..."
                    className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                    autoFocus
                  />
                </div>
              </div>

              <div className="p-4 overflow-y-auto space-y-2 flex-1">
                {filteredInventory.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-xs">
                    ไม่พบอุปกรณ์ที่พร้อมใช้งาน
                  </div>
                ) : (
                  filteredInventory.map((item) => {
                    const isAdded = workingItems.some((i) => i.itemId === item.id);
                    return (
                      <div
                        key={item.id}
                        className="p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-300">
                              {item.code}
                            </span>
                            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                              {item.name}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span>คงเหลือ {item.quantityAvailable} {item.unit || "ชิ้น"}</span>
                            {item.locationName && <span>{item.locationName}</span>}
                          </div>
                        </div>

                        <button
                          onClick={() => addItemToWorkOrder(item)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                            isAdded
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : "bg-[#1D4ED8] text-white hover:bg-blue-700 shadow-sm"
                          }`}
                        >
                          {isAdded ? "เพิ่มอีก (+1)" : "+ เลือก"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  เลือกแล้ว {workingItems.length} รายการ
                </span>
                <button
                  onClick={() => setShowItemPicker(false)}
                  className="px-4 py-2 bg-[#1D4ED8] text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  เสร็จสิ้น
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Waiting Parts Modal */}
      <AnimatePresence>
        {showWaitingPartsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowWaitingPartsModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 p-6 z-10 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center shrink-0">
                  <PackageSearch className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-white">
                    ระบุสถานะ: รอของ / จัดซื้ออุปกรณ์
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    กรณีไม่มีของในคลังเพื่อนำไปดำเนินการ
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  ระบุรายการอุปกรณ์ที่ต้องจัดซื้อ หรือรายละเอียด (ถ้ามี)
                </label>
                <textarea
                  value={waitingPartsReason}
                  onChange={(e) => setWaitingPartsReason(e.target.value)}
                  rows={3}
                  placeholder="เช่น รอซื้อพัดลมติดผนัง 30 นิ้ว 4 ตัว, รออะไหล่เบรกเกอร์..."
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowWaitingPartsModal(false);
                    setWaitingPartsReason("");
                  }}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    waitingPartsMut.mutate(waitingPartsReason.trim());
                  }}
                  disabled={waitingPartsMut.isPending}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/20 disabled:opacity-50"
                >
                  {waitingPartsMut.isPending ? "กำลังบันทึก..." : "ยืนยันเปลี่ยนเป็นรอของ"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Status Override Modal */}
      <AnimatePresence>
        {showAdminStatusModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowAdminStatusModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 p-6 z-10 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/50 text-[#1D4ED8] dark:text-blue-300 flex items-center justify-center shrink-0">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-white">
                    แก้ไขสถานะใบงาน (สิทธิ์ผู้ดูแลระบบ)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    FM-{workOrder.workOrderNumber}: {workOrder.title.slice(0, 40)}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  เลือกสถานะที่ต้องการเปลี่ยน:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["pending", "รอดำเนินการ", "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300"],
                      ["waiting_parts", "รอจัดซื้อ/หาอุปกรณ์", "bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-300"],
                      ["pending_review", "รอตรวจสอบ", "bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-300"],
                      ["completed", "เสร็จสิ้น", "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"],
                      ["rejected", "ส่งกลับแก้ไข", "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300"],
                      ["cancelled", "ยกเลิก", "bg-gray-100 border-gray-300 text-gray-800 dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-300"],
                    ] as const
                  ).map(([statusKey, label, colorCls]) => {
                    const isSelected = targetStatus === statusKey;
                    return (
                      <button
                        key={statusKey}
                        type="button"
                        onClick={() => setTargetStatus(statusKey as FMWorkOrderStatus)}
                        className={`p-3 rounded-2xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                          isSelected
                            ? "ring-2 ring-[#1D4ED8] border-blue-500 shadow-sm " + colorCls
                            : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        <span>{label}</span>
                        {isSelected && <Check className="w-4 h-4 text-[#1D4ED8]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  หมายเหตุ / เหตุผลในการปรับเปลี่ยนสถานะ (จะบันทึกลงประวัติใบงาน)
                </label>
                <textarea
                  value={statusChangeNote}
                  onChange={(e) => setStatusChangeNote(e.target.value)}
                  rows={2}
                  placeholder="เช่น ปรับกลับเป็นรอดำเนินการเนื่องจากต้องแก้ไขรายการอุปกรณ์..."
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminStatusModal(false);
                    setStatusChangeNote("");
                  }}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    adminStatusMut.mutate();
                  }}
                  disabled={adminStatusMut.isPending}
                  className="px-5 py-2 bg-[#1D4ED8] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {adminStatusMut.isPending ? "กำลังบันทึก..." : "ยืนยันเปลี่ยนสถานะ"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rejection Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowRejectModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 p-5 z-10 space-y-4"
            >
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-500" />
                ส่งกลับแก้ไขใบงาน FM
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ระบุเหตุผลที่ไม่อนุมัติหรือสิ่งที่ต้องการให้ช่างแก้ไข
              </p>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="เช่น จำนวนอุปกรณ์ที่เบิกเกินความจำเป็น หรือเลือกอุปกรณ์ผิดรุ่น..."
                className="w-full p-3 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-transparent dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => rejectMut.mutate()}
                  disabled={rejectMut.isPending}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold active:scale-95 transition-all disabled:opacity-50"
                >
                  {rejectMut.isPending ? "กำลังบันทึก..." : "ยืนยันส่งกลับแก้ไข"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
