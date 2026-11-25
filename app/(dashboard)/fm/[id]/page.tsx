"use client";

import { useState, useRef, useEffect } from "react";
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
  claimFMWorkOrder,
  clearSingleFMWorkOrderPerformer,
  adminUpdateFMWorkOrderStatus,
  saveFMWorkOrderRequesterSignature,
  clearFMWorkOrderRequesterSignature,
  saveFMWorkOrderCompletion,
  adminUpdateFMWorkOrderDetails,
} from "@/services/fm.service";
import { useInventoryItems } from "@/hooks/useInventory";
import { useAuth } from "@/hooks/useAuth";
import {
  Wrench, ArrowLeft, Calendar, MapPin, User, Building, Phone,
  Mail, FileText, CheckCircle2, AlertTriangle, Clock, Plus,
  Trash2, X, Search, Check, Ban, ExternalLink, Printer, Download, Save,
  PackageSearch, Edit3, PenTool, RotateCcw, Image as ImageIcon, Camera, ZoomIn,
} from "lucide-react";
import { formatDate, formatDateTime, toDate } from "@/lib/utils";
import { openAttachmentInNewTab, downloadAttachmentFile } from "@/services/fm-storage.service";
import { compressImages } from "@/lib/compress";
import { Timestamp } from "firebase/firestore";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { TECHNICIAN_TEAMS, type FMWorkOrderItem, type FMWorkOrderStatus, type InventoryItem } from "@/types";

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

  // Rejection modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Waiting parts modal
  const [showWaitingPartsModal, setShowWaitingPartsModal] = useState(false);
  const [waitingPartsReason, setWaitingPartsReason] = useState("");
  const [waitingPartsRepNumber, setWaitingPartsRepNumber] = useState("");

  // Admin status override modal
  const [showAdminStatusModal, setShowAdminStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<FMWorkOrderStatus>("pending");
  const [statusChangeNote, setStatusChangeNote] = useState("");

  // Sync loaded items whenever server items change
  const serverItemsJson = JSON.stringify(workOrder?.items || []);
  useEffect(() => {
    if (workOrder) {
      setWorkingItems(workOrder.items || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrder?.id, serverItemsJson]);

  const hasUnsavedItemChanges = JSON.stringify(workingItems) !== serverItemsJson;

  // Mutations
  const submitItemsMut = useMutation({
    mutationFn: async () => {
      if (completionDetails.trim() || completionNewImageFiles.length > 0) {
        let finalImages = [...completionExistingImages];
        if (completionNewImageFiles.length > 0) {
          const compressed = await compressImages(completionNewImageFiles);
          finalImages = [...finalImages, ...compressed];
        }
        await saveFMWorkOrderCompletion(id, {
          completionDetails: completionDetails.trim(),
          completionImages: finalImages,
          completedBy: stoxyUser?.uid,
          completedByName: stoxyUser?.displayName || stoxyUser?.nickname || "ช่างผู้ดำเนินการ",
        });
      }
      await submitFMWorkOrderItems(
        id,
        workingItems,
        stoxyUser?.uid ?? "",
        stoxyUser?.displayName || stoxyUser?.nickname || "ช่างผู้ดำเนินการ",
        stoxyUser?.department
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fm_workorder", id] });
      qc.invalidateQueries({ queryKey: ["fm_workorders"] });
      qc.invalidateQueries({ queryKey: ["fm_active_count"] });
      toast.success("ส่งรายการอุปกรณ์รอตรวจสอบสำเร็จแล้ว");
    },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  const updateItemsMut = useMutation({
    mutationFn: (customItems?: FMWorkOrderItem[]) =>
      updateFMWorkOrderItems(
        id,
        customItems ?? workingItems,
        isAdmin ? undefined : stoxyUser?.uid,
        isAdmin ? undefined : (stoxyUser?.displayName || stoxyUser?.nickname || "ช่างผู้ดำเนินการ"),
        isAdmin ? undefined : stoxyUser?.department
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fm_workorder", id] });
      qc.invalidateQueries({ queryKey: ["fm_workorders"] });
      toast.success("บันทึกรายการอุปกรณ์เรียบร้อยแล้ว");
    },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาดในการบันทึก"),
  });

  const clearPerformerMut = useMutation({
    mutationFn: () => clearSingleFMWorkOrderPerformer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fm_workorder", id] });
      qc.invalidateQueries({ queryKey: ["fm_workorders"] });
      toast.success("ล้างข้อมูลผู้ดำเนินการเรียบร้อยแล้ว");
    },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาดในการล้างผู้ดำเนินการ"),
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
    mutationFn: () =>
      deleteFMWorkOrder(
        id,
        stoxyUser?.uid ?? "",
        stoxyUser?.displayName || stoxyUser?.nickname || "ผู้ดูแลระบบ"
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fm_workorders"] });
      qc.invalidateQueries({ queryKey: ["fm_active_count"] });
      qc.invalidateQueries({ queryKey: ["inventory_items"] });
      qc.invalidateQueries({ queryKey: ["stock_movements"] });
      toast.success("ลบใบแจ้งงาน FM สำเร็จ");
      router.push("/fm");
    },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาดในการลบ"),
  });

  const waitingPartsMut = useMutation({
    mutationFn: ({ reason, repNumber }: { reason: string; repNumber?: string }) =>
      setFMWorkOrderWaitingParts(
        id,
        stoxyUser?.uid ?? "",
        stoxyUser?.displayName || stoxyUser?.nickname || "ช่างผู้รับผิดชอบ",
        reason,
        repNumber
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fm_workorder", id] });
      qc.invalidateQueries({ queryKey: ["fm_workorders"] });
      qc.invalidateQueries({ queryKey: ["fm_active_count"] });
      toast.success("บันทึกสถานะรอจัดซื้อ/หาอุปกรณ์แล้ว");
      setShowWaitingPartsModal(false);
      setWaitingPartsReason("");
      setWaitingPartsRepNumber("");
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
    mutationFn: async () => {
      if (completionDetails.trim() || completionNewImageFiles.length > 0) {
        let finalImages = [...completionExistingImages];
        if (completionNewImageFiles.length > 0) {
          const compressed = await compressImages(completionNewImageFiles);
          finalImages = [...finalImages, ...compressed];
        }
        await saveFMWorkOrderCompletion(id, {
          completionDetails: completionDetails.trim(),
          completionImages: finalImages,
          completedBy: stoxyUser?.uid,
          completedByName: stoxyUser?.displayName || stoxyUser?.nickname || "ผู้ดำเนินการ",
        });
      }
      await completeFMWorkOrderWithoutItems(
        id,
        stoxyUser?.uid ?? "",
        stoxyUser?.displayName || stoxyUser?.nickname || "ผู้ดำเนินการ",
        undefined,
        stoxyUser?.department
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fm_workorder", id] });
      qc.invalidateQueries({ queryKey: ["fm_workorders"] });
      qc.invalidateQueries({ queryKey: ["fm_active_count"] });
      toast.success("ส่งดำเนินการแล้ว (ไม่เบิกของ) รอผู้ดูแลอนุมัติเรียบร้อยแล้ว");
    },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  const claimWorkOrderMut = useMutation({
    mutationFn: () =>
      claimFMWorkOrder(
        id,
        stoxyUser?.uid ?? "",
        stoxyUser?.displayName || stoxyUser?.nickname || "ผู้ใช้งานระบบ",
        stoxyUser?.department
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fm_workorder", id] });
      qc.invalidateQueries({ queryKey: ["fm_workorders"] });
      toast.success("บันทึกชื่อคุณเป็นผู้ดำเนินการใบงานนี้เรียบร้อยแล้ว");
    },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  const [returnStockOnStatusChange, setReturnStockOnStatusChange] = useState(true);

  const adminStatusMut = useMutation({
    mutationFn: () =>
      adminUpdateFMWorkOrderStatus(
        id,
        targetStatus,
        stoxyUser?.uid ?? "",
        stoxyUser?.displayName || stoxyUser?.nickname || "ผู้ดูแลระบบ",
        statusChangeNote,
        returnStockOnStatusChange
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fm_workorder", id] });
      qc.invalidateQueries({ queryKey: ["fm_workorders"] });
      qc.invalidateQueries({ queryKey: ["fm_active_count"] });
      qc.invalidateQueries({ queryKey: ["inventory_items"] });
      qc.invalidateQueries({ queryKey: ["stock_movements"] });
      toast.success(
        `เปลี่ยนสถานะเป็น "${statusConfig[targetStatus]?.label || targetStatus}" สำเร็จ`
      );
      setShowAdminStatusModal(false);
      setStatusChangeNote("");
      setReturnStockOnStatusChange(true);
    },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาดในการเปลี่ยนสถานะ"),
  });

  // Requester Signature Pad State
  const [showSignModal, setShowSignModal] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerEmployeeId, setSignerEmployeeId] = useState("");
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize signature modal canvas when opened
  useEffect(() => {
    if (!showSignModal) return;
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width) || 400;
      canvas.height = 180;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#0f172a";
      }
      setHasDrawnSignature(false);
    }, 60);
    return () => clearTimeout(timer);
  }, [showSignModal]);

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {}
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawnSignature(true);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {}
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawnSignature(false);
  };

  const saveSignatureMut = useMutation({
    mutationFn: (data: { signatureUrl: string; signedName: string; employeeId?: string }) =>
      saveFMWorkOrderRequesterSignature(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fm_workorder", id] });
      qc.invalidateQueries({ queryKey: ["fm_workorders"] });
      toast.success("บันทึกการลงนามรับทราบเรียบร้อยแล้ว");
      setShowSignModal(false);
    },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาดในการบันทึกลายเซ็น"),
  });

  const clearSignatureMut = useMutation({
    mutationFn: () => clearFMWorkOrderRequesterSignature(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fm_workorder", id] });
      qc.invalidateQueries({ queryKey: ["fm_workorders"] });
      toast.success("ลบลายเซ็นเรียบร้อยแล้ว");
    },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  const handleSaveSignature = () => {
    if (!signerName.trim()) {
      toast.error("กรุณาระบุชื่อผู้ลงนาม");
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawnSignature) {
      toast.error("กรุณาลงลายมือชื่อในช่องก่อนบันทึก");
      return;
    }
    const signatureUrl = canvas.toDataURL("image/png");
    saveSignatureMut.mutate({
      signatureUrl,
      signedName: signerName.trim(),
      employeeId: signerEmployeeId.trim() || undefined,
    });
  };

  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `SFM-${workOrder?.workOrderNumber || id}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1500);
  };

  // Admin Edit Work Order Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editWorkOrderNumber, setEditWorkOrderNumber] = useState("");
  const [editWorkType, setEditWorkType] = useState("");
  const [editIsCustomWorkType, setEditIsCustomWorkType] = useState(false);
  const [editCustomWorkTypeText, setEditCustomWorkTypeText] = useState("");
  const [editRequestDateStr, setEditRequestDateStr] = useState("");
  const [editUseDateStr, setEditUseDateStr] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editRequesterName, setEditRequesterName] = useState("");
  const [editRequesterDepartment, setEditRequesterDepartment] = useState("");
  const [editRequesterPhone, setEditRequesterPhone] = useState("");
  const [editRequesterEmail, setEditRequesterEmail] = useState("");
  const [editCoordinatorName, setEditCoordinatorName] = useState("");
  const [editCoordinatorPhone, setEditCoordinatorPhone] = useState("");
  const [editAssignorName, setEditAssignorName] = useState("");
  const [editAssignedTechnicianName, setEditAssignedTechnicianName] = useState("");
  const [editAssignedDepartment, setEditAssignedDepartment] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editRepDocNumber, setEditRepDocNumber] = useState("");
  const [editWaitingPartsReason, setEditWaitingPartsReason] = useState("");

  const [editExistingImages, setEditExistingImages] = useState<string[]>([]);
  const [editNewImageFiles, setEditNewImageFiles] = useState<File[]>([]);
  const [editNewImagePreviews, setEditNewImagePreviews] = useState<string[]>([]);
  const [isCompressingEditImages, setIsCompressingEditImages] = useState(false);

  const openEditModal = () => {
    if (!workOrder) return;
    setEditWorkOrderNumber(workOrder.workOrderNumber || "");
    const currentWt = workOrder.workType || "ทีมช่างไฟฟ้า";
    setEditWorkType(currentWt);
    const inPreset = (TECHNICIAN_TEAMS as readonly string[]).includes(currentWt);
    setEditIsCustomWorkType(!inPreset);
    setEditCustomWorkTypeText(!inPreset ? currentWt : "");
    const rDate = workOrder.requestDate ? toDate(workOrder.requestDate) : new Date();
    setEditRequestDateStr(rDate ? rDate.toISOString().slice(0, 10) : "");
    const uDate = workOrder.useDate ? toDate(workOrder.useDate) : null;
    setEditUseDateStr(uDate ? uDate.toISOString().slice(0, 10) : "");
    setEditTitle(workOrder.title || "");
    setEditDescription(workOrder.description || "");
    setEditLocation(workOrder.location || "");
    setEditRequesterName(workOrder.requesterName || "");
    setEditRequesterDepartment(workOrder.requesterDepartment || "");
    setEditRequesterPhone(workOrder.requesterPhone || "");
    setEditRequesterEmail(workOrder.requesterEmail || "");
    setEditCoordinatorName(workOrder.coordinatorName || "");
    setEditCoordinatorPhone(workOrder.coordinatorPhone || "");
    setEditAssignorName(workOrder.assignorName || "");
    setEditAssignedTechnicianName(workOrder.assignedTechnicianName || "");
    setEditAssignedDepartment(workOrder.assignedDepartment || "");
    setEditNotes(workOrder.notes || "");
    setEditRepDocNumber(workOrder.repDocNumber || "");
    setEditWaitingPartsReason(workOrder.waitingPartsReason || "");

    setEditExistingImages(workOrder.images || []);
    editNewImagePreviews.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    });
    setEditNewImageFiles([]);
    setEditNewImagePreviews([]);
    setIsCompressingEditImages(false);
    setShowEditModal(true);
  };

  const handleEditImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentTotal = editExistingImages.length + editNewImageFiles.length;
    const availableSlots = 3 - currentTotal;
    if (availableSlots <= 0) {
      toast.error("แนบรูปประกอบรวมทั้งหมดได้ไม่เกิน 3 รูป");
      e.target.value = "";
      return;
    }

    const filesToAdd = files.slice(0, availableSlots);
    if (files.length > availableSlots) {
      toast.info(`เลือกได้สูงสุด 3 รูป (เพิ่ม ${filesToAdd.length} รูป)`);
    }

    const newPreviews = filesToAdd.map((f) => URL.createObjectURL(f));
    setEditNewImageFiles((prev) => [...prev, ...filesToAdd]);
    setEditNewImagePreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = "";
  };

  const handleRemoveExistingImage = (index: number) => {
    setEditExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveNewImage = (index: number) => {
    setEditNewImageFiles((prev) => prev.filter((_, i) => i !== index));
    setEditNewImagePreviews((prev) => {
      const toRemove = prev[index];
      if (toRemove) {
        try {
          URL.revokeObjectURL(toRemove);
        } catch {}
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const adminUpdateDetailsMut = useMutation({
    mutationFn: async () => {
      if (!editWorkOrderNumber.trim()) throw new Error("กรุณากรอกเลขที่ใบงาน");
      if (!editRequesterName.trim()) throw new Error("กรุณากรอกชื่อผู้แจ้งงาน");
      if (!editTitle.trim()) throw new Error("กรุณากรอกเรื่อง/หัวข้องาน");
      if (!editLocation.trim()) throw new Error("กรุณากรอกสถานที่");

      let finalImages = [...editExistingImages];
      if (editNewImageFiles.length > 0) {
        setIsCompressingEditImages(true);
        try {
          const compressed = await compressImages(editNewImageFiles);
          finalImages = [...finalImages, ...compressed];
        } finally {
          setIsCompressingEditImages(false);
        }
      }

      const reqDate = editRequestDateStr ? new Date(editRequestDateStr) : new Date();
      let uDate: Timestamp | null = null;
      if (editUseDateStr && editUseDateStr.trim()) {
        const parsed = new Date(editUseDateStr);
        if (!isNaN(parsed.getTime())) {
          uDate = Timestamp.fromDate(parsed);
        }
      }

      await adminUpdateFMWorkOrderDetails(
        id,
        {
          workOrderNumber: editWorkOrderNumber.trim(),
          workType: editWorkType.trim(),
          requestDate: Timestamp.fromDate(reqDate),
          useDate: uDate,
          title: editTitle.trim(),
          description: editDescription.trim(),
          location: editLocation.trim(),
          images: finalImages,
          requesterName: editRequesterName.trim(),
          requesterDepartment: editRequesterDepartment.trim(),
          requesterPhone: editRequesterPhone.trim(),
          requesterEmail: editRequesterEmail.trim(),
          coordinatorName: editCoordinatorName.trim(),
          coordinatorPhone: editCoordinatorPhone.trim(),
          assignorName: editAssignorName.trim(),
          assignedTechnicianName: editAssignedTechnicianName.trim(),
          assignedDepartment: editAssignedDepartment.trim(),
          repDocNumber: editRepDocNumber.trim(),
          waitingPartsReason: editWaitingPartsReason.trim(),
          notes: editNotes.trim(),
        },
        stoxyUser?.displayName || stoxyUser?.nickname || "ผู้ดูแลระบบ"
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fm_workorder", id] });
      qc.invalidateQueries({ queryKey: ["fm_workorders"] });
      toast.success("บันทึกการแก้ไขข้อมูลใบงานเรียบร้อยแล้ว");
      setShowEditModal(false);
    },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาดในการแก้ไขใบงาน"),
  });

  // ── Completion Details & Photos State (ผลการดำเนินงาน) ──
  const [completionDetails, setCompletionDetails] = useState("");
  const [completionExistingImages, setCompletionExistingImages] = useState<string[]>([]);
  const [completionNewImageFiles, setCompletionNewImageFiles] = useState<File[]>([]);
  const [completionNewImagePreviews, setCompletionNewImagePreviews] = useState<string[]>([]);
  const [isCompressingCompletionImages, setIsCompressingCompletionImages] = useState(false);
  const [isEditingCompletion, setIsEditingCompletion] = useState(false);

  useEffect(() => {
    if (workOrder) {
      setCompletionDetails(workOrder.completionDetails || "");
      setCompletionExistingImages(workOrder.completionImages || []);
    }
  }, [workOrder?.id, workOrder?.completionDetails, JSON.stringify(workOrder?.completionImages || [])]);

  const handleCompletionImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentTotal = completionExistingImages.length + completionNewImageFiles.length;
    const availableSlots = 3 - currentTotal;
    if (availableSlots <= 0) {
      toast.error("แนบรูปผลการดำเนินงานได้สูงสุด 3 รูปเท่านั้น");
      return;
    }

    const filesToAdd = files.slice(0, availableSlots);
    if (files.length > availableSlots) {
      toast.info(`เลือกได้สูงสุด 3 รูป (เพิ่ม ${filesToAdd.length} รูป)`);
    }

    const newPreviews = filesToAdd.map((f) => URL.createObjectURL(f));
    setCompletionNewImageFiles((prev) => [...prev, ...filesToAdd]);
    setCompletionNewImagePreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = "";
  };

  const handleRemoveCompletionExistingImage = (index: number) => {
    setCompletionExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveCompletionNewImage = (index: number) => {
    setCompletionNewImageFiles((prev) => prev.filter((_, i) => i !== index));
    setCompletionNewImagePreviews((prev) => {
      const toRemove = prev[index];
      if (toRemove) {
        try {
          URL.revokeObjectURL(toRemove);
        } catch {}
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const saveCompletionMut = useMutation({
    mutationFn: async () => {
      let finalImages = [...completionExistingImages];
      if (completionNewImageFiles.length > 0) {
        setIsCompressingCompletionImages(true);
        try {
          const compressed = await compressImages(completionNewImageFiles);
          finalImages = [...finalImages, ...compressed];
        } finally {
          setIsCompressingCompletionImages(false);
        }
      }

      await saveFMWorkOrderCompletion(id, {
        completionDetails: completionDetails.trim(),
        completionImages: finalImages,
        completedBy: stoxyUser?.uid,
        completedByName: stoxyUser?.displayName || stoxyUser?.nickname || "ผู้ดำเนินการ",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fm_workorder", id] });
      qc.invalidateQueries({ queryKey: ["fm_workorders"] });
      qc.invalidateQueries({ queryKey: ["fm_workorders_report"] });
      completionNewImagePreviews.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      });
      setCompletionNewImageFiles([]);
      setCompletionNewImagePreviews([]);
      setIsEditingCompletion(false);
      toast.success("บันทึกผลการดำเนินงานเรียบร้อยแล้ว");
    },
    onError: (e: any) => {
      setIsCompressingCompletionImages(false);
      toast.error(e.message ?? "เกิดข้อผิดพลาดในการบันทึกผลการดำเนินงาน");
    },
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
    const nextItems = workingItems.filter((i) => i.itemId !== itemId);
    setWorkingItems(nextItems);
    const existedOnServer = (workOrder?.items || []).some((i) => i.itemId === itemId);
    if (existedOnServer) {
      updateItemsMut.mutate(nextItems);
    }
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
      <div className="print:hidden">
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
          {isAdmin && (
            <button
              type="button"
              onClick={openEditModal}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-[#1D4ED8] dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl transition-all shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5" /> แก้ไขใบงาน
            </button>
          )}
          <button
            onClick={handlePrint}
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
                {workOrder.repDocNumber && (
                  <span className="font-semibold text-orange-950 dark:text-orange-100">
                    {" "}(ใบเสนอแจ้งซ่อม: {workOrder.repDocNumber})
                  </span>
                )}
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
                  ใบแจ้งงานซ่อม {workOrder.workOrderNumber}
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${cfg.badge}`}>
                  {workOrder.status === "completed"
                    ? `เสร็จสิ้น${(() => {
                        const compTs = workOrder.approvedAt || workOrder.updatedAt || workOrder.requesterSignedAt || workOrder.submittedAt;
                        const dStr = compTs ? formatDate(compTs) : "";
                        return dStr ? ` (${dStr})` : "";
                      })()}${workOrder.completedWithoutItems ? " (ไม่เบิกของ)" : ""}`
                    : workOrder.status === "waiting_parts"
                    ? `รอจัดซื้อ/หา${(() => {
                        const r = workOrder.waitingPartsReason?.trim();
                        const rep = workOrder.repDocNumber?.trim();
                        const pts: string[] = [];
                        if (r && r !== "รอจัดซื้อ/หาอุปกรณ์เพื่อดำเนินการ") pts.push(r);
                        if (rep) pts.push(rep);
                        return pts.length > 0 ? ` (${pts.join(" - ")})` : "";
                      })()}`
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
                    title="แก้ไขสถานะใบงาน"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>แก้ไขสถานะ</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                แบบฟอร์ม อบก-จ.-01
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
          {/* Attached Images Section */}
          {workOrder.images && workOrder.images.length > 0 && (
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-[#1D4ED8]" />
                  <span>รูปภาพประกอบ ({workOrder.images.length} รูป)</span>
                </p>
                <span className="text-[11px] text-gray-400">คลิกที่รูปเพื่อดูภาพขนาดใหญ่</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {workOrder.images.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedPreviewImage(imgUrl)}
                    className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 bg-black/5 dark:bg-gray-800 cursor-pointer group hover:ring-2 hover:ring-[#1D4ED8] transition-all"
                  >
                    <img
                      src={imgUrl}
                      alt={`รูปภาพประกอบที่ ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <ZoomIn className="w-5 h-5 drop-shadow" />
                    </div>
                    <span className="absolute bottom-1.5 left-1.5 text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-xs">
                      รูปที่ {idx + 1}
                    </span>
                  </div>
                ))}
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
            <div className="flex items-center justify-between gap-2 pb-1 border-b border-blue-200/60 dark:border-blue-800">
              <p className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5 whitespace-nowrap">
                <Wrench className="w-3.5 h-3.5 text-[#1D4ED8] shrink-0" /> ข้อมูลผู้ดำเนินการ
              </p>
              <div className="flex items-center gap-1.5 shrink-0">
                {!workOrder.assignedTechnicianName &&
                  workOrder.status !== "completed" &&
                  workOrder.status !== "cancelled" && (
                    <button
                      type="button"
                      onClick={() => claimWorkOrderMut.mutate()}
                      disabled={claimWorkOrderMut.isPending}
                      className="px-2.5 py-1 bg-[#1D4ED8] hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-all flex items-center gap-1 disabled:opacity-50 whitespace-nowrap"
                    >
                      ✋ รับงาน
                    </button>
                  )}
                {workOrder.assignedTechnicianName &&
                  (isAdmin || workOrder.status !== "completed") &&
                  workOrder.status !== "cancelled" && (
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          confirm(
                            `ต้องการล้างข้อมูลผู้ดำเนินการ (${workOrder.assignedTechnicianName}) ออกจากใบงานนี้หรือไม่?`
                          )
                        ) {
                          clearPerformerMut.mutate();
                        }
                      }}
                      disabled={clearPerformerMut.isPending}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-[11px] font-bold shadow-xs transition-all flex items-center gap-1 disabled:opacity-50 whitespace-nowrap"
                      title="ล้างข้อมูลผู้ดำเนินการ"
                    >
                      <X className="w-3 h-3" /> ล้างผู้ดำเนินการ
                    </button>
                  )}
              </div>
            </div>

            <p>
              <span className="text-gray-400">ผู้ดำเนินการ:</span>{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {workOrder.assignedTechnicianName || "-"}
              </span>
            </p>
            <p>
              <span className="text-gray-400">สังกัด:</span>{" "}
              <span className="text-gray-800 dark:text-gray-200">
                {workOrder.assignedDepartment || "-"}
              </span>
            </p>
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
            <p className="pt-1 border-t border-dashed border-blue-100 dark:border-blue-900/60">
              <span className="text-gray-400">ผู้มอบหมายงาน:</span>{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {workOrder.assignorName || "-"}
              </span>
            </p>
            {workOrder.assignedDate && (
              <p>
                <span className="text-gray-400">วันที่รับงาน:</span>{" "}
                <span className="text-gray-800 dark:text-gray-200">
                  {formatDate(workOrder.assignedDate)}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Section: รายการอุปกรณ์ที่ใช้ ── */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#1D4ED8]" />
              รายการอุปกรณ์ที่ใช้
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {workingItems.length} รายการ (รวม{" "}
              {workingItems.reduce((s, i) => s + i.quantity, 0)} ชิ้น)
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {canEditItems && hasUnsavedItemChanges && (
              <button
                type="button"
                onClick={() => updateItemsMut.mutate(undefined)}
                disabled={updateItemsMut.isPending}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-md shadow-purple-500/20"
              >
                <Save className="w-4 h-4" />
                <span>{updateItemsMut.isPending ? "กำลังบันทึก..." : "บันทึกอุปกรณ์"}</span>
              </button>
            )}
            {canEditItems && (
              <button
                onClick={() => setShowItemPicker(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#1D4ED8] hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold active:scale-95 transition-all shadow-md shadow-blue-500/20"
              >
                <Plus className="w-4 h-4" /> เลือกอุปกรณ์จากคลัง
              </button>
            )}
          </div>
        </div>

        {workOrder.stockReturned && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-200 shadow-xs">
            <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <span className="font-bold">พัสดุในใบงานนี้ถูกคืนเข้าคลังแล้ว</span>
              {workOrder.stockReturnedAt && (
                <span className="text-amber-700 dark:text-amber-300 ml-1.5">
                  ({formatDateTime(workOrder.stockReturnedAt)}
                  {workOrder.stockReturnedByName ? ` โดย ${workOrder.stockReturnedByName}` : ""})
                </span>
              )}
            </div>
          </div>
        )}

        {/* Items Table / Cards */}
        {workingItems.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            <Wrench className="w-7 h-7 text-gray-300 dark:text-gray-600 mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              ไม่มีรายการอุปกรณ์
            </p>
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
                  <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 flex items-center justify-center shrink-0 overflow-hidden shadow-xs mt-0.5 sm:mt-0">
                      {inv?.images?.[0] ? (
                        <img
                          src={inv.images[0]}
                          alt={item.itemName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Wrench className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
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

      </div>

      {/* ── Section: ผลการดำเนินงานและภาพถ่ายผลงาน (Execution Details & Result Photos) ── */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                <span>ผลการดำเนินงาน</span>
                {workOrder.completionDetails || (workOrder.completionImages && workOrder.completionImages.length > 0) ? (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 flex items-center gap-1 whitespace-nowrap">
                    <CheckCircle2 className="w-3 h-3" /> บันทึกผลแล้ว
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 whitespace-nowrap">
                    รอดำเนินการ
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                รายละเอียดการปฏิบัติงานและรูปถ่ายผลการซ่อม/ดำเนินการ (สูงสุด 3 รูป)
              </p>
            </div>
          </div>

          {canEditItems && !isEditingCompletion && (workOrder.completionDetails || (workOrder.completionImages && workOrder.completionImages.length > 0)) && (
            <button
              type="button"
              onClick={() => setIsEditingCompletion(true)}
              className="w-full sm:w-auto px-3.5 py-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>แก้ไขผลการดำเนินงาน</span>
            </button>
          )}
        </div>

        {/* View Mode */}
        {!isEditingCompletion && (workOrder.completionDetails || (workOrder.completionImages && workOrder.completionImages.length > 0)) ? (
          <div className="space-y-4 pt-1">
            {workOrder.completionDetails ? (
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/60">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                  รายละเอียดการปฏิบัติงาน:
                </p>
                <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line leading-relaxed">
                  {workOrder.completionDetails}
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">ไม่มีการระบุข้อความรายละเอียดการดำเนินการ</p>
            )}

            {workOrder.completionImages && workOrder.completionImages.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>รูปถ่ายผลการดำเนินงาน ({workOrder.completionImages.length} รูป)</span>
                  </p>
                  <span className="text-[11px] text-gray-400">คลิกที่รูปเพื่อดูภาพขนาดใหญ่</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {workOrder.completionImages.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedPreviewImage(imgUrl)}
                      className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 bg-black/5 dark:bg-gray-800 cursor-pointer group hover:ring-2 hover:ring-emerald-500 transition-all shadow-xs"
                    >
                      <img
                        src={imgUrl}
                        alt={`รูปผลงานที่ ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <ZoomIn className="w-5 h-5 drop-shadow" />
                      </div>
                      <span className="absolute bottom-1.5 left-1.5 text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-xs">
                        รูปที่ {idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(workOrder.completedByName || workOrder.completedAt) && (
              <div className="text-xs text-gray-400 flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/60">
                {workOrder.completedByName && (
                  <span>
                    ผู้บันทึก: <strong className="text-gray-700 dark:text-gray-300">{workOrder.completedByName}</strong>
                  </span>
                )}
                {workOrder.completedAt && (
                  <span>({formatDateTime(workOrder.completedAt)})</span>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Edit / Input Mode */
          <div className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                รายละเอียดการดำเนินการ
              </label>
              <textarea
                value={completionDetails}
                onChange={(e) => setCompletionDetails(e.target.value)}
                disabled={!canEditItems}
                placeholder="พิมพ์รายละเอียดการดำเนินงาน เช่น ตรวจสอบระบบแล้วพบสาเหตุ... ได้ทำการเปลี่ยนอุปกรณ์... ทดสอบการใช้งานแล้วเรียบร้อย"
                rows={3}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600 rounded-2xl text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <span>แนบรูปภาพผลการดำเนินงาน (สูงสุด 3 รูป)</span>
                  <span className="text-gray-400 font-normal">
                    ({completionExistingImages.length + completionNewImageFiles.length}/3)
                  </span>
                </label>
                {canEditItems && completionExistingImages.length + completionNewImageFiles.length < 3 && (
                  <label className="cursor-pointer text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> เพิ่มรูปภาพ
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleCompletionImageSelect}
                    />
                  </label>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Existing Images */}
                {completionExistingImages.map((imgUrl, idx) => (
                  <div
                    key={`exist-${idx}`}
                    className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 group shadow-xs"
                  >
                    <img
                      src={imgUrl}
                      alt={`ผลงานเดิม ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {canEditItems && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCompletionExistingImage(idx)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-rose-700 transition-colors"
                        title="ลบรูปภาพ"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span className="absolute bottom-1.5 left-1.5 text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-xs">
                      รูปที่ {idx + 1}
                    </span>
                  </div>
                ))}

                {/* New Image Previews */}
                {completionNewImagePreviews.map((previewUrl, idx) => (
                  <div
                    key={`new-${idx}`}
                    className="relative aspect-video rounded-xl overflow-hidden border border-emerald-300 dark:border-emerald-700 bg-gray-100 dark:bg-gray-800 group shadow-xs"
                  >
                    <img
                      src={previewUrl}
                      alt={`ผลงานใหม่ ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveCompletionNewImage(idx)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-rose-700 transition-colors"
                      title="ลบรูปภาพ"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-1.5 left-1.5 text-[10px] font-bold text-white bg-emerald-600/90 px-1.5 py-0.5 rounded backdrop-blur-xs">
                      รูปใหม่
                    </span>
                  </div>
                ))}

                {/* Add Photo tile */}
                {canEditItems && completionExistingImages.length + completionNewImageFiles.length < 3 && (
                  <label className="cursor-pointer border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500 rounded-xl aspect-video flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:text-emerald-600 bg-gray-50/50 dark:bg-gray-800/40 transition-colors">
                    <Camera className="w-5 h-5 text-gray-400" />
                    <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                      แตะเพื่อถ่ายรูป / แนบรูป
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleCompletionImageSelect}
                    />
                  </label>
                )}
              </div>
            </div>

            {canEditItems && (
              <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                {(workOrder.completionDetails || (workOrder.completionImages && workOrder.completionImages.length > 0)) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCompletionDetails(workOrder.completionDetails || "");
                      setCompletionExistingImages(workOrder.completionImages || []);
                      completionNewImagePreviews.forEach((url) => {
                        try { URL.revokeObjectURL(url); } catch {}
                      });
                      setCompletionNewImageFiles([]);
                      setCompletionNewImagePreviews([]);
                      setIsEditingCompletion(false);
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all text-center"
                  >
                    ยกเลิก
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => saveCompletionMut.mutate()}
                  disabled={saveCompletionMut.isPending || isCompressingCompletionImages}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4 shrink-0" />
                  <span>
                    {saveCompletionMut.isPending || isCompressingCompletionImages
                      ? "กำลังบันทึก..."
                      : "บันทึกผลการดำเนินงาน"}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Section: ผู้แจ้งงานลงนาม (Requester Signature) ── */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4 mb-6">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-gray-50 to-teal-50/30 dark:from-gray-700/30 dark:to-teal-950/20 border border-gray-100 dark:border-gray-700/60">
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${workOrder.requesterSignatureUrl ? "pb-3 border-b border-gray-200/60 dark:border-gray-700" : ""}`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                <PenTool className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                <span className="whitespace-nowrap">ผู้แจ้งงานลงนาม</span>
                {workOrder.requesterSignatureUrl ? (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 flex items-center gap-1 whitespace-nowrap">
                    <CheckCircle2 className="w-3 h-3" /> ลงนามแล้ว
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 whitespace-nowrap">
                    รอลงนาม
                  </span>
                )}
              </h4>
            </div>

            <button
              type="button"
              onClick={() => {
                setSignerName(workOrder.requesterSignedName || "");
                setSignerEmployeeId(workOrder.requesterEmployeeId || "");
                setShowSignModal(true);
              }}
              className="w-full sm:w-auto px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-teal-600/20 transition-all flex items-center justify-center gap-1.5 active:scale-95 whitespace-nowrap shrink-0"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>
                {workOrder.requesterSignatureUrl ? "ลงนามใหม่" : "✍️ ลงนาม"}
              </span>
            </button>
          </div>

          {/* Signature Content */}
          {workOrder.requesterSignatureUrl && (
            <div className="pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="p-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 shadow-xs max-w-[220px]">
                  <img
                    src={workOrder.requesterSignatureUrl}
                    alt="ลายเซ็นผู้แจ้งงาน"
                    className="max-h-20 w-auto object-contain mx-auto"
                  />
                </div>
                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                  <p>
                    <span className="text-gray-400">ผู้ลงนาม:</span>{" "}
                    <strong className="text-gray-900 dark:text-white">
                      {workOrder.requesterSignedName || workOrder.requesterName}
                    </strong>
                  </p>
                  <p>
                    <span className="text-gray-400">รหัสพนักงาน:</span>{" "}
                    <span className="font-mono text-gray-800 dark:text-gray-200">
                      {workOrder.requesterEmployeeId || "-"}
                    </span>
                  </p>
                  <p>
                    <span className="text-gray-400">วันเวลาที่ลงนาม:</span>{" "}
                    <span className="text-gray-800 dark:text-gray-200 font-medium">
                      {formatDateTime(workOrder.requesterSignedAt)}
                    </span>
                  </p>
                </div>
              </div>

              {(isAdmin || workOrder.status === "pending") && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("ต้องการลบลายเซ็นนี้หรือไม่?")) {
                      clearSignatureMut.mutate();
                    }
                  }}
                  disabled={clearSignatureMut.isPending}
                  className="text-[11px] text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> ลบลายเซ็น
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Section: การส่งและดำเนินการใบงาน (Workflow & Submission Action Bar) ── */}
      {canEditItems && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-6 border border-gray-100 dark:border-gray-700 shadow-sm mb-20 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-gray-700/60">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-[#1D4ED8] dark:text-blue-300 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                การส่งและดำเนินการใบงาน
              </h3>
              <p className="text-xs text-gray-400">
                เลือกขั้นตอนการดำเนินงานสำหรับใบงานนี้
              </p>
            </div>
          </div>

          {/* If in pending / waiting_parts / rejected */}
          {(workOrder.status === "pending" ||
            workOrder.status === "waiting_parts" ||
            workOrder.status === "rejected") && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Secondary actions: รอของ หรือ เปลี่ยนสถานะ หรือ Admin */}
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
                {hasUnsavedItemChanges && (
                  <button
                    type="button"
                    onClick={() => updateItemsMut.mutate(undefined)}
                    disabled={updateItemsMut.isPending}
                    className="w-full sm:w-auto px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-purple-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4 shrink-0" />
                    <span>
                      {updateItemsMut.isPending
                        ? "กำลังบันทึก..."
                        : "บันทึกรายการอุปกรณ์"}
                    </span>
                  </button>
                )}

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
                    updateItemsMut.mutate(undefined);
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
                  updateItemsMut.mutate(undefined);
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

      {/* ── DEDICATED CLEAN PRINT DOCUMENT (Visible ONLY when printing) ── */}
      <div
        id="fm-print-document"
        className="hidden print:block text-black bg-white p-6 font-sans"
      >
        {/* Header */}
        <div className="border-b-2 border-black pb-3 mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-black tracking-tight">
              ใบแจ้งงานซ่อม / บริการ (FM)
            </h1>
            <p className="text-xs text-gray-700 mt-0.5">
              ระบบบริหารจัดการพัสดุและงานซ่อมบำรุง Stoxy
            </p>
          </div>
          <div className="text-right">
            <span className="text-base font-extrabold font-mono border-2 border-black px-2.5 py-1 inline-block">
              SFM-{workOrder.workOrderNumber}
            </span>
            <p className="text-[11px] text-gray-600 mt-1">
              สถานะ:{" "}
              {workOrder.status === "completed"
                ? `เสร็จสิ้น${(() => {
                    const compTs = workOrder.approvedAt || workOrder.updatedAt || workOrder.requesterSignedAt || workOrder.submittedAt;
                    const dStr = compTs ? formatDate(compTs) : "";
                    return dStr ? ` (${dStr})` : "";
                  })()}`
                : workOrder.status === "waiting_parts"
                ? `รอจัดซื้อ/หา${(() => {
                    const r = workOrder.waitingPartsReason?.trim();
                    const rep = workOrder.repDocNumber?.trim();
                    const pts: string[] = [];
                    if (r && r !== "รอจัดซื้อ/หาอุปกรณ์เพื่อดำเนินการ") pts.push(r);
                    if (rep) pts.push(rep);
                    return pts.length > 0 ? ` (${pts.join(" - ")})` : "";
                  })()}`
                : statusConfig[workOrder.status]?.label || workOrder.status}
            </p>
          </div>
        </div>

        {/* General Info Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-4 border border-gray-400 p-3 rounded">
          <div>
            <span className="font-bold">วันที่แจ้งงาน:</span> {formatDate(workOrder.requestDate)}
          </div>
          <div>
            <span className="font-bold">วันที่ต้องการใช้งาน:</span> {formatDate(workOrder.useDate)}
          </div>
          <div>
            <span className="font-bold">ประเภทงาน:</span> {workOrder.workType || "-"}
          </div>
          <div>
            <span className="font-bold">สถานที่ดำเนินการ:</span> {workOrder.location}
          </div>
          <div className="col-span-2 pt-1 border-t border-gray-300">
            <span className="font-bold">เรื่อง / หัวข้องาน:</span> {workOrder.title}
          </div>
          {workOrder.description && (
            <div className="col-span-2">
              <span className="font-bold">รายละเอียด:</span> {workOrder.description}
            </div>
          )}
        </div>

        {/* Requester & Technician Info Grid */}
        <div className="grid grid-cols-2 gap-4 text-xs mb-4">
          <div className="border border-gray-400 p-3 rounded">
            <p className="font-bold border-b border-gray-300 pb-1 mb-1.5">ข้อมูลผู้แจ้งงาน</p>
            <p>
              <span className="text-gray-600">ชื่อผู้แจ้ง:</span> {workOrder.requesterName}
            </p>
            <p>
              <span className="text-gray-600">สังกัด / แผนก:</span> {workOrder.requesterDepartment}
            </p>
            {workOrder.requesterPhone && (
              <p>
                <span className="text-gray-600">โทรศัพท์:</span> {workOrder.requesterPhone}
              </p>
            )}
            {workOrder.coordinatorName && (
              <p className="mt-1 pt-1 border-t border-dashed border-gray-300">
                <span className="text-gray-600">ผู้ประสานงาน:</span> {workOrder.coordinatorName}{" "}
                {workOrder.coordinatorPhone ? `(${workOrder.coordinatorPhone})` : ""}
              </p>
            )}
          </div>

          <div className="border border-gray-400 p-3 rounded">
            <p className="font-bold border-b border-gray-300 pb-1 mb-1.5">ข้อมูลผู้ดำเนินการ & ผู้มอบหมาย</p>
            <p>
              <span className="text-gray-600">ผู้ดำเนินการ:</span>{" "}
              {workOrder.assignedTechnicianName || "-"}
            </p>
            <p>
              <span className="text-gray-600">สังกัด / แผนกช่าง:</span>{" "}
              {workOrder.assignedDepartment || "-"}
            </p>
            <p className="mt-1 pt-1 border-t border-dashed border-gray-300">
              <span className="text-gray-600">ผู้มอบหมายงาน:</span> {workOrder.assignorName || "-"}
            </p>
            {workOrder.assignedDate && (
              <p>
                <span className="text-gray-600">วันที่มอบหมาย:</span>{" "}
                {formatDate(workOrder.assignedDate)}
              </p>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-4">
          <p className="text-xs font-bold mb-1.5">รายการอุปกรณ์ที่ใช้สำหรับใบงานนี้</p>
          <table className="w-full text-xs border-collapse border border-black">
            <thead>
              <tr className="bg-gray-100 border-b border-black text-center">
                <th className="border border-black px-2 py-1.5 w-10">ลำดับ</th>
                <th className="border border-black px-2 py-1.5 w-24">รหัสอุปกรณ์</th>
                <th className="border border-black px-2 py-1.5 text-left">ชื่ออุปกรณ์ / รายการ</th>
                <th className="border border-black px-2 py-1.5 text-left">จุดติดตั้ง / หมายเหตุ</th>
                <th className="border border-black px-2 py-1.5 w-16 text-right">จำนวน</th>
                <th className="border border-black px-2 py-1.5 w-16 text-center">หน่วยนับ</th>
              </tr>
            </thead>
            <tbody>
              {!workOrder.items || workOrder.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="border border-black px-3 py-3 text-center text-gray-600 italic"
                  >
                    {workOrder.completedWithoutItems
                      ? "ดำเนินการโดยไม่เบิกใช้อุปกรณ์จากคลัง"
                      : "ไม่มีการเบิกอุปกรณ์จากคลัง"}
                  </td>
                </tr>
              ) : (
                workOrder.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-300">
                    <td className="border border-black px-2 py-1 text-center">{idx + 1}</td>
                    <td className="border border-black px-2 py-1 font-mono text-center">
                      {item.itemCode}
                    </td>
                    <td className="border border-black px-2 py-1 font-medium">{item.itemName}</td>
                    <td className="border border-black px-2 py-1 text-gray-700">
                      {item.notes || "-"}
                    </td>
                    <td className="border border-black px-2 py-1 text-right font-bold">
                      {item.quantity}
                    </td>
                    <td className="border border-black px-2 py-1 text-center">
                      {item.unit || "ชิ้น"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Attached Photos (If any) */}
        {workOrder.images && workOrder.images.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-bold mb-1.5">
              รูปภาพประกอบ ({workOrder.images.length} รูป)
            </p>
            <div className="grid grid-cols-3 gap-2">
              {workOrder.images.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className="border border-gray-400 p-1 rounded aspect-video flex items-center justify-center overflow-hidden"
                >
                  <img
                    src={imgUrl}
                    alt={`รูปที่ ${idx + 1}`}
                    className="max-h-24 w-auto object-contain mx-auto"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completion Details & Result Photos (Print) */}
        {(workOrder.completionDetails || (workOrder.completionImages && workOrder.completionImages.length > 0)) && (
          <div className="mb-4 border border-gray-400 p-3 rounded">
            <p className="font-bold border-b border-gray-300 pb-1 mb-1.5 text-xs">
              ผลการดำเนินงาน / ภาพถ่ายผลงาน
            </p>
            {workOrder.completionDetails && (
              <p className="text-xs mb-2">
                <span className="font-bold text-gray-700">รายละเอียดผลการดำเนินงาน:</span>{" "}
                <span className="whitespace-pre-line">{workOrder.completionDetails}</span>
              </p>
            )}
            {workOrder.completionImages && workOrder.completionImages.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-gray-700 mb-1">
                  ภาพถ่ายผลการดำเนินงาน ({workOrder.completionImages.length} รูป):
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {workOrder.completionImages.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-400 p-1 rounded aspect-video flex items-center justify-center overflow-hidden"
                    >
                      <img
                        src={imgUrl}
                        alt={`ผลการดำเนินงานรูปที่ ${idx + 1}`}
                        className="max-h-24 w-auto object-contain mx-auto"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3-Column Signatures Block */}
        <div className="grid grid-cols-3 gap-3 text-xs pt-4 border-t-2 border-black">
          {/* Signer / Requester */}
          <div className="border border-black p-2.5 rounded text-center flex flex-col justify-between min-h-[140px]">
            <p className="font-bold border-b border-gray-300 pb-1">ผู้แจ้งงาน / ผู้รับทราบ</p>
            <div className="my-2 flex-1 flex flex-col items-center justify-center">
              {workOrder.requesterSignatureUrl ? (
                <img
                  src={workOrder.requesterSignatureUrl}
                  alt="ลายเซ็น"
                  className="max-h-12 w-auto object-contain mb-1"
                />
              ) : (
                <div className="h-10" />
              )}
              <p className="font-semibold text-center">
                ( {workOrder.requesterSignedName || ".................................................."} )
              </p>
              {workOrder.requesterEmployeeId && (
                <p className="text-[10px] text-gray-600">รหัส: {workOrder.requesterEmployeeId}</p>
              )}
            </div>
            <p className="text-[11px] text-gray-700 border-t border-dashed border-gray-300 pt-1">
              วันที่:{" "}
              {workOrder.requesterSignedAt
                ? formatDate(workOrder.requesterSignedAt)
                : "......./......./.........."}
            </p>
          </div>

          {/* Technician */}
          <div className="border border-black p-2.5 rounded text-center flex flex-col justify-between min-h-[140px]">
            <p className="font-bold border-b border-gray-300 pb-1">ผู้ดำเนินการ (ช่าง)</p>
            <div className="my-2 flex-1 flex flex-col items-center justify-center">
              <div className="h-10" />
              <p className="font-semibold text-center">
                ( {workOrder.assignedTechnicianName || ".................................................."} )
              </p>
              {workOrder.assignedDepartment && (
                <p className="text-[10px] text-gray-600">{workOrder.assignedDepartment}</p>
              )}
            </div>
            <p className="text-[11px] text-gray-700 border-t border-dashed border-gray-300 pt-1">
              วันที่:{" "}
              {workOrder.assignedDate
                ? formatDate(workOrder.assignedDate)
                : "......./......./.........."}
            </p>
          </div>

          {/* Approver / Admin */}
          <div className="border border-black p-2.5 rounded text-center flex flex-col justify-between min-h-[140px]">
            <p className="font-bold border-b border-gray-300 pb-1">ผู้ตรวจสอบ / อนุมัติ</p>
            <div className="my-2 flex-1 flex flex-col items-center justify-center">
              <div className="h-10" />
              <p className="font-semibold text-center">
                ( {workOrder.approvedByName || ".................................................."} )
              </p>
              <p className="text-[10px] text-gray-600">ผู้ดูแลระบบ</p>
            </div>
            <p className="text-[11px] text-gray-700 border-t border-dashed border-gray-300 pt-1">
              วันที่:{" "}
              {workOrder.approvedAt
                ? formatDate(workOrder.approvedAt)
                : "......./......./.........."}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          /* Hide all screen elements: AppShell sidebar, top header, etc. */
          body * {
            visibility: hidden !important;
          }
          #fm-print-document, #fm-print-document * {
            visibility: visible !important;
          }
          #fm-print-document {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            display: block !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>

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
                        {/* Image Thumbnail */}
                        <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                          {item.images?.[0] ? (
                            <img
                              src={item.images[0]}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <PackageSearch className="w-5 h-5 text-gray-400" />
                          )}
                        </div>

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
                  หมายเลขใบเสนอแจ้งซ่อมในระบบ veri (REP)
                </label>
                <input
                  type="text"
                  value={waitingPartsRepNumber}
                  onChange={(e) => setWaitingPartsRepNumber(e.target.value)}
                  placeholder="เช่น REP-2569-045 (ตามแบบฟอร์มในระบบ veri)"
                  className="w-full px-3.5 py-2 text-xs bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-mono font-medium"
                />
                <p className="text-[10.5px] text-gray-400 dark:text-gray-400 mt-1">
                  * หมายเลขใบเสนอแจ้งซ่อมตามแบบฟอร์มใน veri เพื่อใช้อ้างอิงและเชื่อมโยง 2 ระบบในอนาคต
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  ระบุรายการอุปกรณ์ที่ต้องจัดซื้อ หรือรายละเอียดเพิ่มเติม (ถ้ามี)
                </label>
                <textarea
                  value={waitingPartsReason}
                  onChange={(e) => setWaitingPartsReason(e.target.value)}
                  rows={3}
                  placeholder="เช่น รอซื้อพัดลมติดผนัง 30 นิ้ว 4 ตัว, มอเตอร์ประตูม้วน 1 HP..."
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowWaitingPartsModal(false);
                    setWaitingPartsReason("");
                    setWaitingPartsRepNumber("");
                  }}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    waitingPartsMut.mutate({
                      reason: waitingPartsReason.trim(),
                      repNumber: waitingPartsRepNumber.trim(),
                    });
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

              {/* Auto Stock Rollback or Re-deduction Alert */}
              {workOrder.status === "completed" &&
                !workOrder.completedWithoutItems &&
                (workOrder.items?.length || 0) > 0 &&
                !workOrder.stockReturned &&
                targetStatus !== "completed" && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="flex-1 text-xs">
                        <p className="font-bold text-amber-900 dark:text-amber-200">
                          การคืนพัสดุและอุปกรณ์เข้าคลังสต็อก
                        </p>
                        <p className="text-amber-700 dark:text-amber-300 text-[11px] mt-0.5">
                          ใบงานนี้เคยตัดสต็อกอุปกรณ์ไปแล้ว {workOrder.items?.length} รายการ (รวม{" "}
                          {workOrder.items?.reduce((s, i) => s + i.quantity, 0)} ชิ้น)
                        </p>
                      </div>
                    </div>

                    <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-700/60 cursor-pointer hover:bg-amber-100/40 dark:hover:bg-gray-700/60 transition-colors">
                      <input
                        type="checkbox"
                        checked={returnStockOnStatusChange}
                        onChange={(e) => setReturnStockOnStatusChange(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded text-[#1D4ED8] focus:ring-[#1D4ED8] border-gray-300"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-gray-900 dark:text-white">
                          คืนพัสดุกลับเข้าคลังสต็อกอัตโนมัติ (แนะนำ)
                        </span>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                          ระบบจะเพิ่มยอดคงเหลือกลับเข้าคลัง และบันทึกประวัติความเคลื่อนไหว (Stock Movement - Return) โดยอัตโนมัติ
                        </p>
                      </div>
                    </label>

                    {!returnStockOnStatusChange && (
                      <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 px-1">
                        ⚠️ คำเตือน: หากไม่เลือกคืนสต็อก ยอดอุปกรณ์ในคลังจะไม่กลับคืนมา และต้องปรับยอดด้วยตนเอง
                      </p>
                    )}
                  </div>
                )}

              {targetStatus === "completed" &&
                !workOrder.completedWithoutItems &&
                (workOrder.items?.length || 0) > 0 &&
                (workOrder.stockReturned || workOrder.status !== "completed") && (
                  <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
                    <CheckCircle2 className="w-4 h-4 text-[#1D4ED8] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">การตัดสต็อกอุปกรณ์</p>
                      <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                        ระบบจะตรวจสอบยอดคงเหลือและตัดสต็อกพัสดุ {workOrder.items?.length} รายการ (
                        {workOrder.items?.reduce((s, i) => s + i.quantity, 0)} ชิ้น)
                        ออกจากคลังอัตโนมัติ พร้อมบันทึกประวัติการเบิก
                      </p>
                    </div>
                  </div>
                )}

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

      {/* Requester Signature Pad Modal */}
      <AnimatePresence>
        {showSignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setShowSignModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 p-6 z-10 space-y-4 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/50 text-[#1D4ED8] dark:text-blue-300 flex items-center justify-center shrink-0">
                    <PenTool className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-gray-900 dark:text-white">
                      ลงนามรับทราบการดำเนินการ
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      ผู้แจ้งงานลงนามรับทราบใบงาน FM-{workOrder.workOrderNumber}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSignModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form fields */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Signer Name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      ชื่อผู้ลงนาม <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="กรอกชื่อ-นามสกุล ผู้ลงนาม (อาจเป็นท่านอื่นได้)"
                      className="w-full px-3.5 py-2 text-xs bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                    />
                  </div>

                  {/* Employee ID */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      รหัสประจำตัว <span className="text-gray-400 font-normal">(ถ้ามี)</span>
                    </label>
                    <input
                      type="text"
                      value={signerEmployeeId}
                      onChange={(e) => setSignerEmployeeId(e.target.value)}
                      placeholder="เช่น 591996"
                      className="w-full px-3.5 py-2 text-xs bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 font-mono"
                    />
                  </div>
                </div>

                {/* Signed At timestamp indicator */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-xs">
                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#1D4ED8]" />
                    วันที่และเวลาขณะลงนาม:
                  </span>
                  <span className="font-semibold text-[#1D4ED8] dark:text-blue-300">
                    {formatDateTime(new Date())}
                  </span>
                </div>

                {/* Canvas Drawing Area */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <span>ลงลายมือชื่อ</span>
                      <span className="text-rose-500">*</span>
                      <span className="text-[11px] text-gray-400 font-normal">
                        (ใช้นิ้วหรือปากกาเซ็นลงในกรอบ)
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 transition-colors px-2 py-0.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30"
                    >
                      <RotateCcw className="w-3 h-3" /> ล้างลายเซ็น
                    </button>
                  </div>

                  <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl bg-white overflow-hidden shadow-inner touch-none">
                    <canvas
                      ref={canvasRef}
                      className="w-full h-44 cursor-crosshair block"
                      style={{ touchAction: "none" }}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      onPointerLeave={handlePointerUp}
                    />
                    {!hasDrawnSignature && (
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-gray-300 text-xs select-none">
                        <PenTool className="w-6 h-6 mb-1 opacity-40" />
                        <span>เซ็นลายมือชื่อที่นี่</span>
                      </div>
                    )}
                    <div className="absolute bottom-4 left-6 right-6 border-b border-gray-200 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    * สามารถลงนามไว้ล่วงหน้าขณะรอดำเนินการได้ โดยระบบจะคงสถานะปัจจุบันของใบงานไว้ตามเดิม
                  </p>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowSignModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveSignature}
                  disabled={saveSignatureMut.isPending}
                  className="px-5 py-2.5 bg-[#1D4ED8] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {saveSignatureMut.isPending ? "กำลังบันทึก..." : "บันทึกการลงนาม"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {selectedPreviewImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-xs"
              onClick={() => setSelectedPreviewImage(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col"
            >
              <div className="px-4 py-3 bg-gray-100 dark:bg-gray-700/80 flex items-center justify-between border-b border-gray-200 dark:border-gray-600">
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-[#1D4ED8]" />
                  <span>รูปภาพประกอบใบงาน FM-{workOrder.workOrderNumber}</span>
                </p>
                <div className="flex items-center gap-2">
                  <a
                    href={selectedPreviewImage}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[#1D4ED8] hover:underline flex items-center gap-1 font-semibold mr-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> เปิดรูปเต็ม
                  </a>
                  <button
                    type="button"
                    onClick={() => setSelectedPreviewImage(null)}
                    className="p-1 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-3 overflow-auto max-h-[80vh] flex items-center justify-center bg-black/10 dark:bg-black/40">
                <img
                  src={selectedPreviewImage}
                  alt="รูปภาพขนาดใหญ่"
                  className="max-h-[75vh] w-auto object-contain rounded-xl"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Edit Work Order Details Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setShowEditModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 max-h-[92vh] flex flex-col z-10 overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-indigo-50/30 dark:from-gray-700/50 dark:to-gray-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/50 text-[#1D4ED8] dark:text-blue-300 flex items-center justify-center shrink-0">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-gray-900 dark:text-white">
                      แก้ไขข้อมูลใบงาน FM-{workOrder.workOrderNumber}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      สิทธิ์ผู้ดูแลระบบ (Admin) แก้ไขข้อความ รายละเอียด และจัดการรูปภาพประกอบ
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
                {/* Section: ข้อมูลทั่วไป */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700/60 space-y-3">
                  <p className="font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#1D4ED8]" /> ข้อมูลทั่วไปของใบงาน
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                        เลขที่ใบงาน <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editWorkOrderNumber}
                        onChange={(e) => setEditWorkOrderNumber(e.target.value)}
                        placeholder="เช่น 6090"
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                        ประเภทงาน
                      </label>
                      <select
                        value={editIsCustomWorkType ? "อื่นๆ" : editWorkType}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "อื่นๆ") {
                            setEditIsCustomWorkType(true);
                            setEditWorkType(editCustomWorkTypeText.trim() || "อื่นๆ");
                          } else {
                            setEditIsCustomWorkType(false);
                            setEditWorkType(val);
                          }
                        }}
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                      >
                        {TECHNICIAN_TEAMS.map((tm) => (
                          <option key={tm} value={tm}>{tm}</option>
                        ))}
                        <option value="อื่นๆ">อื่นๆ (กรอกเอง)</option>
                      </select>

                      {editIsCustomWorkType && (
                        <input
                          type="text"
                          value={editCustomWorkTypeText}
                          onChange={(e) => {
                            setEditCustomWorkTypeText(e.target.value);
                            setEditWorkType(e.target.value.trim() || "อื่นๆ");
                          }}
                          placeholder="ระบุชื่อทีม เช่น ทีมช่างอาคาร"
                          className="w-full mt-2 px-3 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                        วันที่แจ้งงาน
                      </label>
                      <input
                        type="date"
                        value={editRequestDateStr}
                        onChange={(e) => setEditRequestDateStr(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                        วันที่ต้องการใช้งาน
                      </label>
                      <input
                        type="date"
                        value={editUseDateStr}
                        onChange={(e) => setEditUseDateStr(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                      เรื่อง / หัวข้องาน <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="ระบุเรื่องหรือหัวข้องาน..."
                      className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                      สถานที่ดำเนินการ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      placeholder="ระบุสถานที่..."
                      className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                      รายละเอียดงาน
                    </label>
                    <textarea
                      rows={3}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="รายละเอียดงานเพิ่มเติม..."
                      className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 resize-none"
                    />
                  </div>
                </div>

                {/* Section: จัดการรูปภาพประกอบ (สูงสุด 3 รูป) */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-[#1D4ED8]" /> รูปภาพประกอบใบงาน
                      <span className="text-gray-400 font-normal">
                        ({editExistingImages.length + editNewImageFiles.length}/3 รูป)
                      </span>
                    </p>
                    {editExistingImages.length + editNewImageFiles.length < 3 && (
                      <label className="cursor-pointer text-[11px] font-bold text-[#1D4ED8] hover:text-blue-700 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800">
                        <Plus className="w-3 h-3" /> เพิ่มรูปภาพ
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleEditImageSelect}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {editExistingImages.length + editNewImagePreviews.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2.5">
                      {/* Existing Images */}
                      {editExistingImages.map((imgUrl, idx) => (
                        <div
                          key={`exist-${idx}`}
                          className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 bg-gray-100 group"
                        >
                          <img
                            src={imgUrl}
                            alt={`รูปเดิมที่ ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingImage(idx)}
                            className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors"
                            title="ลบรูปนี้"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <span className="absolute bottom-1 left-1.5 text-[9px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded">
                            รูปปัจจุบัน #{idx + 1}
                          </span>
                        </div>
                      ))}

                      {/* New Images */}
                      {editNewImagePreviews.map((previewUrl, idx) => (
                        <div
                          key={`new-${idx}`}
                          className="relative aspect-video rounded-xl overflow-hidden border-2 border-emerald-400 bg-emerald-50/30 group"
                        >
                          <img
                            src={previewUrl}
                            alt={`รูปใหม่ที่ ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveNewImage(idx)}
                            className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors"
                            title="ลบรูปใหม่นี้"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <span className="absolute bottom-1 left-1.5 text-[9px] font-bold text-white bg-emerald-600 px-1.5 py-0.5 rounded">
                            + เพิ่มใหม่
                          </span>
                        </div>
                      ))}

                      {editExistingImages.length + editNewImageFiles.length < 3 && (
                        <label className="aspect-video rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-[#1D4ED8] flex flex-col items-center justify-center cursor-pointer bg-white dark:bg-gray-700/30 transition-colors">
                          <Plus className="w-4 h-4 text-gray-400 mb-0.5" />
                          <span className="text-[10px] text-gray-500">เพิ่มรูป</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleEditImageSelect}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  ) : (
                    <label className="w-full py-4 border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-[#1D4ED8] rounded-xl flex items-center justify-center gap-2 cursor-pointer bg-white dark:bg-gray-700/20 text-gray-500 hover:text-[#1D4ED8] transition-colors">
                      <ImageIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-xs">
                        ยังไม่มีรูปภาพ · คลิกเพื่อแนบรูปประกอบ (สูงสุด 3 รูป)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleEditImageSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Section: รายละเอียดผู้แจ้งงาน & ผู้ประสานงาน */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700/60 space-y-3">
                  <p className="font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#1D4ED8]" /> ข้อมูลผู้แจ้งงาน & ผู้ประสานงาน
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                        ชื่อผู้แจ้งงาน <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editRequesterName}
                        onChange={(e) => setEditRequesterName(e.target.value)}
                        placeholder="ชื่อผู้แจ้งงาน"
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                        สังกัด / แผนกผู้แจ้ง <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editRequesterDepartment}
                        onChange={(e) => setEditRequesterDepartment(e.target.value)}
                        placeholder="สังกัดผู้แจ้ง"
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                        เบอร์โทรศัพท์ผู้แจ้ง
                      </label>
                      <input
                        type="text"
                        value={editRequesterPhone}
                        onChange={(e) => setEditRequesterPhone(e.target.value)}
                        placeholder="เบอร์โทรผู้แจ้ง"
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                        อีเมลผู้แจ้ง
                      </label>
                      <input
                        type="text"
                        value={editRequesterEmail}
                        onChange={(e) => setEditRequesterEmail(e.target.value)}
                        placeholder="อีเมลผู้แจ้ง"
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                        ชื่อผู้ประสานงาน
                      </label>
                      <input
                        type="text"
                        value={editCoordinatorName}
                        onChange={(e) => setEditCoordinatorName(e.target.value)}
                        placeholder="ชื่อผู้ประสานงาน"
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                        เบอร์โทรผู้ประสานงาน
                      </label>
                      <input
                        type="text"
                        value={editCoordinatorPhone}
                        onChange={(e) => setEditCoordinatorPhone(e.target.value)}
                        placeholder="เบอร์โทรผู้ประสานงาน"
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Section: ผู้มอบหมาย & ผู้ดำเนินการ */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700/60 space-y-3">
                  <p className="font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-[#1D4ED8]" /> ข้อมูลผู้มอบหมาย & ช่างผู้ดำเนินการ
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                        ผู้มอบหมายงาน
                      </label>
                      <input
                        type="text"
                        value={editAssignorName}
                        onChange={(e) => setEditAssignorName(e.target.value)}
                        placeholder="ชื่อผู้มอบหมายงาน"
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                        ผู้ดำเนินการ (ช่าง)
                      </label>
                      <input
                        type="text"
                        value={editAssignedTechnicianName}
                        onChange={(e) => setEditAssignedTechnicianName(e.target.value)}
                        placeholder="ระบุชื่อช่างผู้ดำเนินการ (หรือเว้นว่างได้)"
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                        สังกัด / หน่วยงานช่าง
                      </label>
                      <input
                        type="text"
                        value={editAssignedDepartment}
                        onChange={(e) => setEditAssignedDepartment(e.target.value)}
                        placeholder="สังกัดหรือหน่วยงานช่าง"
                        className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Section: หมายเหตุ */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    หมายเหตุเพิ่มเติม
                  </label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>

                {/* Section: ข้อมูลอ้างอิงใบเสนอแจ้งซ่อม (REP) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      หมายเลขใบเสนอแจ้งซ่อมในระบบ veri (REP)
                    </label>
                    <input
                      type="text"
                      value={editRepDocNumber}
                      onChange={(e) => setEditRepDocNumber(e.target.value)}
                      placeholder="เช่น REP-2569-045"
                      className="w-full px-3 py-1.5 text-xs font-mono border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      รายละเอียดรอจัดซื้อ/หาอุปกรณ์
                    </label>
                    <input
                      type="text"
                      value={editWaitingPartsReason}
                      onChange={(e) => setEditWaitingPartsReason(e.target.value)}
                      placeholder="เช่น รอซื้อพัดลมติดผนัง..."
                      className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => adminUpdateDetailsMut.mutate()}
                  disabled={adminUpdateDetailsMut.isPending || isCompressingEditImages}
                  className="px-5 py-2.5 bg-[#1D4ED8] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {adminUpdateDetailsMut.isPending || isCompressingEditImages
                    ? "กำลังบันทึก..."
                    : "บันทึกการแก้ไข"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
