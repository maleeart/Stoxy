"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { getFMWorkOrders, createFMWorkOrder, clearFMWorkOrdersPerformer } from "@/services/fm.service";
import { useAuth } from "@/hooks/useAuth";
import {
  Wrench, Plus, Search, Clock, CheckCircle2, AlertTriangle,
  ChevronRight, X, FileText, MapPin, User, Building, Calendar,
  Sparkles, UploadCloud, FileUp, Loader2, Trash2, ExternalLink, Users, Download, ClipboardPaste,
  Image as ImageIcon, Camera, ArrowUpDown, Filter, RotateCcw,
} from "lucide-react";
import { formatDate, toDate } from "@/lib/utils";
import { parseFMPdf, parseFMOcrText } from "@/services/fm-ocr.service";
import { compressImages } from "@/lib/compress";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Timestamp } from "firebase/firestore";
import type { FMWorkOrder, FMWorkOrderStatus } from "@/types";

const statusConfig: Record<FMWorkOrderStatus, { label: string; badge: string; border: string }> = {
  pending: {
    label: "รอดำเนินการ",
    badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
  },
  waiting_parts: {
    label: "รอจัดซื้อ/หาอุปกรณ์",
    badge: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-800",
  },
  pending_review: {
    label: "รอตรวจสอบ",
    badge: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
  },
  completed: {
    label: "เสร็จสิ้น",
    badge: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  rejected: {
    label: "ส่งกลับแก้ไข",
    badge: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-800",
  },
  cancelled: {
    label: "ยกเลิก",
    badge: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400",
    border: "border-gray-200 dark:border-gray-700",
  },
};

export default function FMWorkOrdersPage() {
  const { stoxyUser } = useAuth();
  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager";
  const qc = useQueryClient();

  type SortOption =
    | "number_desc"
    | "number_asc"
    | "requestDate_desc"
    | "requestDate_asc"
    | "useDate_asc"
    | "createdAt_desc";

  const [tab, setTab] = useState<"all" | FMWorkOrderStatus>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("number_desc");
  const [workTypeFilter, setWorkTypeFilter] = useState<string>("all");
  const [onlyMyTasks, setOnlyMyTasks] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create Form State
  const [workOrderNumber, setWorkOrderNumber] = useState("");
  const [workType, setWorkType] = useState("ระบบไฟฟ้า");
  const [requestDateStr, setRequestDateStr] = useState(new Date().toISOString().slice(0, 10));
  const [useDateStr, setUseDateStr] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [requesterDepartment, setRequesterDepartment] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [requesterPhone, setRequesterPhone] = useState("");
  const [coordinatorName, setCoordinatorName] = useState("");
  const [coordinatorPhone, setCoordinatorPhone] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [scannedFileName, setScannedFileName] = useState("");
  const [scannedFieldCount, setScannedFieldCount] = useState(0);
  const [isOcrScanning, setIsOcrScanning] = useState(false);
  const [ocrTab, setOcrTab] = useState<"file" | "text">("file");
  const [ocrTextInput, setOcrTextInput] = useState("");
  const [assignorName, setAssignorName] = useState("");
  // Attached photos state (max 3 images)
  const [attachedImages, setAttachedImages] = useState<File[]>([]);
  const [attachedImagePreviews, setAttachedImagePreviews] = useState<string[]>([]);
  const [isCompressingImages, setIsCompressingImages] = useState(false);

  const currentUserName =
    stoxyUser?.displayName || stoxyUser?.nickname || stoxyUser?.email || "ผู้ใช้งานระบบ";
  const currentUserDepartment = stoxyUser?.department || "";

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ["fm_workorders"],
    queryFn: getFMWorkOrders,
  });

  const resetForm = () => {
    setWorkOrderNumber("");
    setWorkType("ระบบไฟฟ้า");
    setRequestDateStr(new Date().toISOString().slice(0, 10));
    setUseDateStr("");
    setRequesterName("");
    setRequesterDepartment("");
    setRequesterEmail("");
    setRequesterPhone("");
    setCoordinatorName("");
    setCoordinatorPhone("");
    setTitle("");
    setDescription("");
    setLocation("");
    setAssignorName("");
    setScannedFileName("");
    setScannedFieldCount(0);
    setIsOcrScanning(false);
    attachedImagePreviews.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    });
    setAttachedImages([]);
    setAttachedImagePreviews([]);
    setIsCompressingImages(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const availableSlots = 3 - attachedImages.length;
    if (availableSlots <= 0) {
      toast.error("สามารถแนบรูปประกอบได้ไม่เกิน 3 รูป");
      e.target.value = "";
      return;
    }

    const filesToAdd = files.slice(0, availableSlots);
    if (files.length > availableSlots) {
      toast.info(`เลือกได้สูงสุด 3 รูป (เพิ่ม ${filesToAdd.length} รูป)`);
    }

    const newPreviews = filesToAdd.map((f) => URL.createObjectURL(f));
    setAttachedImages((prev) => [...prev, ...filesToAdd]);
    setAttachedImagePreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = "";
  };

  const handleRemoveImage = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
    setAttachedImagePreviews((prev) => {
      const toRemove = prev[index];
      if (toRemove) {
        try {
          URL.revokeObjectURL(toRemove);
        } catch {}
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handlePdfScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("กรุณาเลือกไฟล์เอกสาร PDF เท่านั้น");
      return;
    }

    try {
      setIsOcrScanning(true);
      const parsed = await parseFMPdf(file);

      if (parsed.workOrderNumber) setWorkOrderNumber(parsed.workOrderNumber);
      if (parsed.workType) setWorkType(parsed.workType);
      if (parsed.requestDateStr) setRequestDateStr(parsed.requestDateStr);
      if (parsed.useDateStr) setUseDateStr(parsed.useDateStr);
      if (parsed.requesterName) setRequesterName(parsed.requesterName);
      if (parsed.requesterDepartment) setRequesterDepartment(parsed.requesterDepartment);
      if (parsed.requesterEmail) setRequesterEmail(parsed.requesterEmail);
      if (parsed.requesterPhone) setRequesterPhone(parsed.requesterPhone);
      if (parsed.coordinatorName) setCoordinatorName(parsed.coordinatorName);
      if (parsed.coordinatorPhone) setCoordinatorPhone(parsed.coordinatorPhone);
      if (parsed.title) setTitle(parsed.title);
      if (parsed.description) setDescription(parsed.description);
      if (parsed.location) setLocation(parsed.location);
      if (parsed.assignorName) setAssignorName(parsed.assignorName);

      setScannedFileName(file.name);
      setScannedFieldCount(parsed.fieldsDetectedCount);
      toast.success(
        `⚡ ดึงข้อมูลสำเร็จ (${parsed.fieldsDetectedCount} รายการ) กรอกลงฟอร์มเรียบร้อยแล้ว`
      );
    } catch (err: any) {
      console.error("PDF scan error:", err);
      toast.error(err?.message || "สแกนไฟล์ PDF ไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setIsOcrScanning(false);
      e.target.value = "";
    }
  };

  const handleApplyOcrText = () => {
    if (!ocrTextInput.trim()) {
      toast.error("กรุณาวางข้อความก่อนกดดึงข้อมูล");
      return;
    }
    const parsed = parseFMOcrText(ocrTextInput);
    if (parsed.workOrderNumber) setWorkOrderNumber(parsed.workOrderNumber);
    if (parsed.workType) setWorkType(parsed.workType);
    if (parsed.requestDateStr) setRequestDateStr(parsed.requestDateStr);
    if (parsed.useDateStr) setUseDateStr(parsed.useDateStr);
    if (parsed.requesterName) setRequesterName(parsed.requesterName);
    if (parsed.requesterDepartment) setRequesterDepartment(parsed.requesterDepartment);
    if (parsed.requesterEmail) setRequesterEmail(parsed.requesterEmail);
    if (parsed.requesterPhone) setRequesterPhone(parsed.requesterPhone);
    if (parsed.coordinatorName) setCoordinatorName(parsed.coordinatorName);
    if (parsed.coordinatorPhone) setCoordinatorPhone(parsed.coordinatorPhone);
    if (parsed.title) setTitle(parsed.title);
    if (parsed.description) setDescription(parsed.description);
    if (parsed.location) setLocation(parsed.location);
    if (parsed.assignorName) setAssignorName(parsed.assignorName);

    setScannedFileName("ข้อความจาก FreeThaiOCR / dr-kana");
    setScannedFieldCount(parsed.fieldsDetectedCount);
    toast.success(
      `⚡ ดึงข้อมูลสำเร็จ (${parsed.fieldsDetectedCount} รายการ) กรอกลงฟอร์มเรียบร้อยแล้ว`
    );
  };

  // Prefill with Template FM 6090 sample data
  const handlePrefillTemplate = () => {
    setWorkOrderNumber("6090");
    setWorkType("ระบบไฟฟ้า");
    setRequestDateStr("2026-10-19");
    setUseDateStr("2026-10-26");
    setRequesterName("นายกรภพ กวินพลอาสา");
    setRequesterDepartment("รวห. ชหจ. อหข. กซย-ห. หจรซ-ห.");
    setRequesterEmail("591996@egat.co.th");
    setRequesterPhone("02-626-962");
    setCoordinatorName("งามพล จุมรี");
    setCoordinatorPhone("69605");
    setTitle("RQ-2026-000136 ประกอบและติดตั้งพัดลมติดผนังขนาด 30 นิ้ว จำนวน 4 ตัว");
    setDescription("RQ-2026-000136 ประกอบและติดตั้งพัดลมติดผนังขนาด 30 นิ้ว จำนวน 4 ตัว / โรงอาหาร อหข. / งามพล จุมรี ติดต่อ 69605");
    setLocation("โรงอาหาร อหข.");
    setAssignorName("นายตวงเพชร ชัยยานนท์");
    setScannedFileName("(ตัวอย่าง) ใบงาน FM 6090.pdf");
    setScannedFieldCount(15);
    toast.info("โหลดข้อมูลตัวอย่าง FM 6090 เรียบร้อยแล้ว");
  };

  const createMut = useMutation({
    mutationFn: async () => {
      if (!workOrderNumber.trim()) throw new Error("กรุณากรอกเลขที่ใบงาน");
      if (!requesterName.trim()) throw new Error("กรุณากรอกชื่อผู้แจ้งงาน");
      if (!title.trim()) throw new Error("กรุณากรอกเรื่อง/หัวข้องาน");
      if (!location.trim()) throw new Error("กรุณากรอกสถานที่");

      const reqDate = requestDateStr ? new Date(requestDateStr) : new Date();
      let uDate: Timestamp | undefined = undefined;
      if (useDateStr && useDateStr.trim()) {
        const parsed = new Date(useDateStr);
        if (!isNaN(parsed.getTime())) {
          uDate = Timestamp.fromDate(parsed);
        }
      }

      let compressedImages: string[] = [];
      if (attachedImages.length > 0) {
        setIsCompressingImages(true);
        try {
          compressedImages = await compressImages(attachedImages);
        } finally {
          setIsCompressingImages(false);
        }
      }

      await createFMWorkOrder({
        workOrderNumber: workOrderNumber.trim(),
        workType: workType.trim() || undefined,
        requestDate: Timestamp.fromDate(reqDate),
        useDate: uDate,
        requesterName: requesterName.trim(),
        requesterDepartment: requesterDepartment.trim(),
        requesterEmail: requesterEmail.trim() || undefined,
        requesterPhone: requesterPhone.trim() || undefined,
        coordinatorName: coordinatorName.trim() || undefined,
        coordinatorPhone: coordinatorPhone.trim() || undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim(),
        images: compressedImages.length > 0 ? compressedImages : undefined,
        assignorName: assignorName.trim() || undefined,
        // Leave technician & department empty initially until someone works on the ticket
        assignedTechnicianId: undefined,
        assignedTechnicianName: undefined,
        assignedDepartment: undefined,
        createdBy: stoxyUser?.uid ?? "",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fm_workorders"] });
      qc.invalidateQueries({ queryKey: ["fm_active_count"] });
      toast.success("สร้างใบแจ้งงาน FM สำเร็จแล้ว");
      setShowCreateModal(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาดในการสร้างใบงาน"),
  });

  // ponytail: One-time automatic cleanup to clear old performer & department from existing work orders
  useEffect(() => {
    const KEY = "fm_migration_performer_cleared_v1";
    if (typeof window === "undefined" || localStorage.getItem(KEY)) return;
    if (!stoxyUser) return;

    clearFMWorkOrdersPerformer(false)
      .then((count) => {
        localStorage.setItem(KEY, "true");
        if (count > 0) {
          qc.invalidateQueries({ queryKey: ["fm_workorders"] });
          qc.invalidateQueries({ queryKey: ["fm_active_count"] });
        }
      })
      .catch((err) => {
        console.error("Auto clear error:", err);
      });
  }, [stoxyUser, qc]);

  const pendingReviews = workOrders.filter((w) => w.status === "pending_review");
  const pendingStaffJobs = workOrders.filter(
    (w) =>
      w.status === "pending" &&
      (!w.assignedTechnicianId ||
        w.assignedTechnicianId === "all" ||
        w.assignedTechnicianId.startsWith("group:") ||
        w.assignedTechnicianId === stoxyUser?.uid)
  );

  // Distinct work types from work orders
  const defaultWorkTypes = [
    "ระบบไฟฟ้า",
    "ระบบประปา",
    "ระบบปรับอากาศ",
    "งานอาคารและสถานที่",
    "งานทั่วไป",
  ];
  const distinctWorkTypes = Array.from(
    new Set([
      ...defaultWorkTypes,
      ...workOrders
        .map((w) => w.workType?.trim())
        .filter((t): t is string => Boolean(t)),
    ])
  );

  const filteredOrders = workOrders
    .filter((w) => {
      // 1. Status Filter
      if (tab !== "all" && w.status !== tab) return false;

      // 2. Work Type Filter
      if (workTypeFilter !== "all" && w.workType !== workTypeFilter) return false;

      // 3. Only My Tasks Filter
      if (onlyMyTasks) {
        const uid = stoxyUser?.uid;
        const name = (stoxyUser?.displayName || stoxyUser?.nickname || "").toLowerCase();
        const isMyJob =
          (uid && w.assignedTechnicianId === uid) ||
          (name && w.assignedTechnicianName?.toLowerCase().includes(name));
        if (!isMyJob) return false;
      }

      // 4. Search Filter
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matches =
          (w.workOrderNumber && w.workOrderNumber.toLowerCase().includes(q)) ||
          (`fm-${w.workOrderNumber}`.toLowerCase().includes(q)) ||
          (w.title && w.title.toLowerCase().includes(q)) ||
          (w.description && w.description.toLowerCase().includes(q)) ||
          (w.location && w.location.toLowerCase().includes(q)) ||
          (w.requesterName && w.requesterName.toLowerCase().includes(q)) ||
          (w.requesterDepartment && w.requesterDepartment.toLowerCase().includes(q)) ||
          (w.assignedTechnicianName && w.assignedTechnicianName.toLowerCase().includes(q)) ||
          (w.assignedDepartment && w.assignedDepartment.toLowerCase().includes(q)) ||
          (w.workType && w.workType.toLowerCase().includes(q)) ||
          (w.coordinatorName && w.coordinatorName.toLowerCase().includes(q)) ||
          (w.notes && w.notes.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    })
    .sort((a, b) => {
      // Default: sort by work order number descending (จาก มาก ไป น้อย)
      if (sortBy === "number_desc") {
        const numA = a.workOrderNumber || "";
        const numB = b.workOrderNumber || "";
        return numB.localeCompare(numA, undefined, { numeric: true, sensitivity: "base" });
      }
      if (sortBy === "number_asc") {
        const numA = a.workOrderNumber || "";
        const numB = b.workOrderNumber || "";
        return numA.localeCompare(numB, undefined, { numeric: true, sensitivity: "base" });
      }
      if (sortBy === "requestDate_desc") {
        const timeA = toDate(a.requestDate)?.getTime() || 0;
        const timeB = toDate(b.requestDate)?.getTime() || 0;
        return timeB - timeA;
      }
      if (sortBy === "requestDate_asc") {
        const timeA = toDate(a.requestDate)?.getTime() || 0;
        const timeB = toDate(b.requestDate)?.getTime() || 0;
        return timeA - timeB;
      }
      if (sortBy === "useDate_asc") {
        const timeA = toDate(a.useDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const timeB = toDate(b.useDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return timeA - timeB;
      }
      if (sortBy === "createdAt_desc") {
        const timeA = toDate(a.createdAt)?.getTime() || 0;
        const timeB = toDate(b.createdAt)?.getTime() || 0;
        return timeB - timeA;
      }
      return 0;
    });

  const hasActiveFilters =
    Boolean(search.trim()) ||
    tab !== "all" ||
    workTypeFilter !== "all" ||
    onlyMyTasks ||
    sortBy !== "number_desc";

  const resetAllFilters = () => {
    setSearch("");
    setTab("all");
    setWorkTypeFilter("all");
    setOnlyMyTasks(false);
    setSortBy("number_desc");
  };

  const statusTabs: [string, string, number][] = [
    ["all", "ทั้งหมด", workOrders.length],
    ["pending", "รอดำเนินการ", workOrders.filter((w) => w.status === "pending").length],
    ["waiting_parts", "รอจัดซื้อ/หาอุปกรณ์", workOrders.filter((w) => w.status === "waiting_parts").length],
    ["pending_review", "รอตรวจสอบ", workOrders.filter((w) => w.status === "pending_review").length],
    ["completed", "เสร็จสิ้น", workOrders.filter((w) => w.status === "completed").length],
  ];
  const rejectedCount = workOrders.filter((w) => w.status === "rejected").length;
  if (rejectedCount > 0) {
    statusTabs.push(["rejected", "ส่งกลับแก้ไข", rejectedCount]);
  }
  const cancelledCount = workOrders.filter((w) => w.status === "cancelled").length;
  if (cancelledCount > 0) {
    statusTabs.push(["cancelled", "ยกเลิก", cancelledCount]);
  }

  return (
    <AppShell title="ใบแจ้งงานซ่อม (FM)">
      {!isAdmin && <MobileHeader title="ใบแจ้งงานซ่อม (FM)" back />}

      {/* Admin pending review banner */}
      {isAdmin && pendingReviews.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 mb-4 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                รอตรวจสอบและอนุมัติ {pendingReviews.length} ใบงาน
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                ช่างได้ระบุรายการอุปกรณ์ที่ใช้แล้ว รอการอนุมัติตัดสต็อก
              </p>
            </div>
          </div>
          <button
            onClick={() => setTab("pending_review")}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
          >
            ดูรายการ
          </button>
        </div>
      )}

      {/* Staff pending tasks banner */}
      {!isAdmin && pendingStaffJobs.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 mb-4 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 animate-pulse">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                มีใบงานที่รอดำเนินการ {pendingStaffJobs.length} งาน
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                กดเข้าดูรายละเอียดและระบุอุปกรณ์ที่ใช้เพื่อส่งเบิก
              </p>
            </div>
          </div>
          <button
            onClick={() => setTab("pending")}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
          >
            ดำเนินการ
          </button>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-[#1D4ED8]" />
            ใบแจ้งงานซ่อม Facility Management (FM)
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            ทั้งหมด {workOrders.length} ใบงาน
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#1D4ED8] hover:bg-blue-700 text-white rounded-xl text-sm font-semibold active:scale-95 transition-all shadow-md shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" /> สร้างใบงาน FM ใหม่
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="space-y-3 mb-5">
        {/* Search row with Sort By & Work Type controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาเลขที่ใบงาน (เช่น 6090), ชื่องาน, สถานที่, ผู้แจ้ง, ช่าง..."
              className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 transition-all shadow-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full transition-colors"
                title="ล้างข้อความค้นหา"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick controls: Sort By & Work Type Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none">
            {/* Sort By Select */}
            <div className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shrink-0 shadow-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#1D4ED8] shrink-0" />
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 shrink-0">
                เรียงตาม:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="text-xs font-bold text-gray-800 dark:text-gray-200 bg-transparent border-none outline-none cursor-pointer pr-1 focus:ring-0"
              >
                <option value="number_desc" className="text-gray-900 dark:text-gray-100">
                  เลขที่ใบงาน (มาก → น้อย)
                </option>
                <option value="number_asc" className="text-gray-900 dark:text-gray-100">
                  เลขที่ใบงาน (น้อย → มาก)
                </option>
                <option value="requestDate_desc" className="text-gray-900 dark:text-gray-100">
                  วันที่แจ้ง (ใหม่ล่าสุด)
                </option>
                <option value="requestDate_asc" className="text-gray-900 dark:text-gray-100">
                  วันที่แจ้ง (เก่าสุด)
                </option>
                <option value="useDate_asc" className="text-gray-900 dark:text-gray-100">
                  วันที่ต้องการใช้ (เร็วสุด)
                </option>
                <option value="createdAt_desc" className="text-gray-900 dark:text-gray-100">
                  วันที่สร้างใบงาน (ล่าสุด)
                </option>
              </select>
            </div>

            {/* Work Type Filter Select */}
            <div className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shrink-0 shadow-xs">
              <Filter className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 shrink-0" />
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 shrink-0">
                ประเภท:
              </span>
              <select
                value={workTypeFilter}
                onChange={(e) => setWorkTypeFilter(e.target.value)}
                className="text-xs font-semibold text-gray-800 dark:text-gray-200 bg-transparent border-none outline-none cursor-pointer pr-1 focus:ring-0"
              >
                <option value="all" className="text-gray-900 dark:text-gray-100">
                  ทุกประเภทงาน
                </option>
                {distinctWorkTypes.map((type) => (
                  <option key={type} value={type} className="text-gray-900 dark:text-gray-100">
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* My Tasks Toggle */}
            <button
              type="button"
              onClick={() => setOnlyMyTasks((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs border transition-all shrink-0 shadow-xs ${
                onlyMyTasks
                  ? "bg-blue-50 dark:bg-blue-900/40 text-[#1D4ED8] dark:text-blue-300 border-blue-200 dark:border-blue-800 font-bold"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
              }`}
              title="แสดงเฉพาะงานที่ฉันรับผิดชอบ"
            >
              <User className="w-3.5 h-3.5" />
              <span>งานของฉัน</span>
            </button>
          </div>
        </div>

        {/* Status Filter Tabs & Reset */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none flex-1">
            {statusTabs.map(([val, label, count]) => {
              const active = tab === val;
              return (
                <button
                  key={val}
                  onClick={() => setTab(val as any)}
                  className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    active
                      ? "bg-[#1D4ED8] text-white shadow-sm"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {label}
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      active ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Filter Indicators & Reset Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-rose-600 dark:hover:text-rose-400 px-2 py-1 rounded-lg transition-colors shrink-0"
              title="รีเซ็ตตัวกรองและการค้นหาทั้งหมด"
            >
              <RotateCcw className="w-3 h-3" />
              ล้างตัวกรอง
            </button>
          )}
        </div>

        {/* Results summary bar */}
        <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 px-1">
          <span>
            พบ <strong className="text-gray-900 dark:text-white font-bold">{filteredOrders.length}</strong> จาก ทั้งหมด {workOrders.length} ใบงาน
          </span>
          <span className="text-[10px] text-gray-400">
            {sortBy === "number_desc" && "เรียงตาม: เลขที่ใบงาน (มาก → น้อย)"}
            {sortBy === "number_asc" && "เรียงตาม: เลขที่ใบงาน (น้อย → มาก)"}
            {sortBy === "requestDate_desc" && "เรียงตาม: วันที่แจ้ง (ใหม่ล่าสุด)"}
            {sortBy === "requestDate_asc" && "เรียงตาม: วันที่แจ้ง (เก่าสุด)"}
            {sortBy === "useDate_asc" && "เรียงตาม: วันที่ต้องการใช้ (เร็วสุด)"}
            {sortBy === "createdAt_desc" && "เรียงตาม: วันที่สร้าง (ล่าสุด)"}
          </span>
        </div>
      </div>

      {/* Work Orders List */}
      <div className="space-y-3 pb-24">
        {isLoading ? (
          <div className="text-center py-20 text-gray-400">กำลังโหลดข้อมูล...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
            <Wrench className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              ไม่พบใบแจ้งงาน FM
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {hasActiveFilters
                ? "ไม่พบใบงานที่ตรงตามเงื่อนไขการค้นหาหรือตัวกรองที่เลือก"
                : "ยังไม่มีรายการใบงานในหมวดนี้"}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-[#1D4ED8] bg-blue-50 dark:bg-blue-900/30 rounded-xl hover:bg-blue-100 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                ล้างตัวกรองทั้งหมด
              </button>
            )}
          </div>
        ) : (
          filteredOrders.map((wo, i) => {
            const cfg = statusConfig[wo.status] || statusConfig.pending;
            const itemCount = (wo.items || []).reduce((s, it) => s + it.quantity, 0);
            const isAssignedToMe =
              wo.assignedTechnicianId === stoxyUser?.uid ||
              wo.assignedTechnicianId === "all" ||
              !wo.assignedTechnicianId;

            return (
              <motion.div
                key={wo.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border ${cfg.border} shadow-sm hover:shadow-md transition-all`}
              >
                <Link href={`/fm/${wo.id}`} className="block">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-black px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-[#1D4ED8] dark:text-blue-300">
                        FM-{wo.workOrderNumber}
                      </span>
                      {wo.workType && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          {wo.workType}
                        </span>
                      )}
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${cfg.badge}`}>
                        {wo.status === "completed"
                          ? `เสร็จสิ้น${(() => {
                              const compTs = wo.approvedAt || wo.updatedAt || wo.requesterSignedAt || wo.submittedAt;
                              const dStr = compTs ? formatDate(compTs) : "";
                              return dStr ? ` (${dStr})` : "";
                            })()}${wo.completedWithoutItems ? " (ไม่เบิกของ)" : ""}`
                          : wo.status === "waiting_parts"
                          ? `รอจัดซื้อ/หา${wo.waitingPartsReason && wo.waitingPartsReason.trim() !== "รอจัดซื้อ/หาอุปกรณ์เพื่อดำเนินการ" ? ` (${wo.waitingPartsReason.trim()})` : ""}`
                          : cfg.label}
                      </span>
                    </div>

                    <div className="text-xs text-gray-400 flex items-center gap-1 shrink-0">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(wo.requestDate)}
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-gray-900 dark:text-white leading-snug mb-1 line-clamp-2">
                    {wo.title}
                  </h3>

                  {wo.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                      {wo.description}
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-50 dark:border-gray-700/60">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{wo.location}</span>
                    </div>

                    <div className="flex items-center gap-1.5 truncate">
                      <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">ผู้แจ้ง: {wo.requesterName}</span>
                    </div>

                    {wo.assignedTechnicianName && (
                      <div className="flex items-center gap-1.5 truncate text-[#1D4ED8] dark:text-blue-400 font-medium">
                        <Wrench className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">ช่าง: {wo.assignedTechnicianName}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between sm:justify-end gap-2 text-gray-600 dark:text-gray-300 font-medium">
                      <span>{wo.items?.length || 0} รายการอุปกรณ์ ({itemCount} ชิ้น)</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Create FM Work Order Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowCreateModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 max-h-[90vh] flex flex-col z-10 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-[#1D4ED8]" />
                    สร้างใบแจ้งงานซ่อม (FM)
                  </h3>
                  <p className="text-xs text-gray-400">แบบฟอร์มตามเทมเพลตมาตรฐาน FM (อบก-จ.-01)</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrefillTemplate}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 rounded-xl font-medium hover:bg-amber-100 transition-colors"
                    title="ใส่ข้อมูลตัวอย่างจากไฟล์ FM 6090.pdf"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> ตัวอย่าง FM 6090
                  </button>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-4 overflow-y-auto space-y-4 flex-1">
                {/* ── Top Section: สแกนข้อมูลจากไฟล์เอกสารใบงาน PDF (OCR Auto-Fill) ── */}
                <div className="p-4 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-purple-50/60 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-purple-950/20 rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-800 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#1D4ED8] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                          สแกนข้อมูลจาก PDF เข้าฟอร์มอัตโนมัติ (OCR)
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                      🛡️ ไม่เปลือง Storage (Free Plan Safe)
                    </span>
                  </div>

                  {/* Mode Tabs */}
                  <div className="flex items-center gap-1.5 p-1 bg-white/70 dark:bg-gray-800/70 rounded-xl border border-gray-200/80 dark:border-gray-700/80 w-fit">
                    <button
                      type="button"
                      onClick={() => setOcrTab("file")}
                      className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all ${
                        ocrTab === "file"
                          ? "bg-[#1D4ED8] text-white shadow-xs"
                          : "text-gray-600 dark:text-gray-300 hover:text-gray-900"
                      }`}
                    >
                      📄 เลือกไฟล์ PDF สแกนทันที
                    </button>
                    <button
                      type="button"
                      onClick={() => setOcrTab("text")}
                      className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all ${
                        ocrTab === "text"
                          ? "bg-[#1D4ED8] text-white shadow-xs"
                          : "text-gray-600 dark:text-gray-300 hover:text-gray-900"
                      }`}
                    >
                      📋 วางข้อความจาก FreeThaiOCR / dr-kana
                    </button>
                  </div>

                  {/* Tab 1: File Upload */}
                  {ocrTab === "file" && (
                    <div>
                      {!scannedFileName ? (
                        <div>
                          <input
                            type="file"
                            id="pdf-scan-input"
                            accept="application/pdf,.pdf"
                            className="hidden"
                            onChange={handlePdfScan}
                            disabled={isOcrScanning}
                          />
                          <label
                            htmlFor="pdf-scan-input"
                            className={`w-full py-4 px-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/80 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center cursor-pointer transition-all shadow-sm active:scale-[0.99] ${
                              isOcrScanning ? "opacity-60 pointer-events-none" : ""
                            }`}
                          >
                            {isOcrScanning ? (
                              <div className="flex items-center gap-2 text-sm font-semibold text-[#1D4ED8]">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>กำลังอ่านและสแกนข้อมูลจากเอกสาร PDF...</span>
                              </div>
                            ) : (
                              <>
                                <FileText className="w-7 h-7 text-[#1D4ED8] mb-1" />
                                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                  คลิกเพื่อเลือกไฟล์ PDF ใบงาน FM เพื่อสแกนกรอกฟอร์ม
                                </span>
                                <span className="text-[11px] text-gray-400 mt-0.5">
                                  ระบบจะดึงข้อมูลลงช่องทั้งหมดทันที โดยไม่ต้องพิมพ์เอง
                                </span>
                              </>
                            )}
                          </label>
                        </div>
                      ) : (
                        <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3 shadow-sm">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                {scannedFileName}
                              </p>
                              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                                ✨ ดึงข้อมูลเข้าฟอร์มสำเร็จ ({scannedFieldCount} รายการ) • ปลอดภัย ไม่เก็บไฟล์
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              id="pdf-rescan-input"
                              accept="application/pdf,.pdf"
                              className="hidden"
                              onChange={handlePdfScan}
                              disabled={isOcrScanning}
                            />
                            <label
                              htmlFor="pdf-rescan-input"
                              className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg font-medium cursor-pointer transition-colors"
                            >
                              สแกนไฟล์อื่น
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 2: Text Paste from OCR */}
                  {ocrTab === "text" && (
                    <div className="space-y-2 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                        <span className="font-semibold flex items-center gap-1">
                          <ClipboardPaste className="w-3.5 h-3.5 text-[#1D4ED8]" />
                          วางข้อความที่ได้จาก FreeThaiOCR
                        </span>
                        <a
                          href="https://ocr.dr-kana.com"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-[#1D4ED8] hover:underline flex items-center gap-1 font-semibold"
                        >
                          🌐 เปิดเว็บ ocr.dr-kana.com (ฟรี) <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <textarea
                        value={ocrTextInput}
                        onChange={(e) => setOcrTextInput(e.target.value)}
                        rows={3}
                        placeholder="วางข้อความที่คัดลอกจาก FreeThaiOCR / LINE OCR ที่นี่ เช่น ใบแจ้งงานเลขที่ 6090..."
                        className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/60 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 font-mono"
                      />

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-[11px] text-gray-400">
                          ระบบจะค้นหาเลขที่ใบงาน, วันที่, ชื่อผู้แจ้ง, รายละเอียด, ฯลฯ และกรอกลงฟอร์มอัตโนมัติ
                        </span>
                        <button
                          type="button"
                          onClick={handleApplyOcrText}
                          className="px-3 py-1.5 bg-[#1D4ED8] hover:bg-blue-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-xs transition-colors shrink-0"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> ดึงข้อมูลลงฟอร์ม
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Row 1: FM Number & Work Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      ใบแจ้งงานเลขที่ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={workOrderNumber}
                      onChange={(e) => setWorkOrderNumber(e.target.value)}
                      placeholder="เช่น 6090 หรือ FM-6090"
                      className="w-full px-3.5 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      ประเภทงาน
                    </label>
                    <select
                      value={workType}
                      onChange={(e) => setWorkType(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                    >
                      <option value="ระบบไฟฟ้า">ระบบไฟฟ้า</option>
                      <option value="ระบบประปา">ระบบประปา</option>
                      <option value="ระบบปรับอากาศ">ระบบปรับอากาศ</option>
                      <option value="งานซ่อมบำรุงอาคาร">งานซ่อมบำรุงอาคาร</option>
                      <option value="งานทั่วไป">งานทั่วไป</option>
                    </select>
                  </div>
                </div>

                {/* Row 2: Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      วันที่แจ้งงาน
                    </label>
                    <input
                      type="date"
                      value={requestDateStr}
                      onChange={(e) => setRequestDateStr(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      วันที่ใช้งาน (ถ้ามี)
                    </label>
                    <input
                      type="date"
                      value={useDateStr}
                      onChange={(e) => setUseDateStr(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                    />
                  </div>
                </div>

                {/* Section: รายละเอียดการแจ้งงานบริการ */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      เรื่อง / หัวข้องาน <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="เช่น RQ-2026-000136 ประกอบและติดตั้งพัดลมติดผนังขนาด 30 นิ้ว จำนวน 4 ตัว"
                      className="w-full px-3.5 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      สถานที่ดำเนินการ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="เช่น โรงอาหาร อหข., อาคาร 2 ชั้น 3"
                      className="w-full px-3.5 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      รายละเอียดงาน
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="รายละเอียดงานเพิ่มเติมหรือข้อกำหนด..."
                      className="w-full px-3.5 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 resize-none"
                    />
                  </div>

                  {/* แนบรูปภาพประกอบ (ไม่เกิน 3 รูป) */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-[#1D4ED8]" />
                        <span>รูปภาพประกอบ</span>
                        <span className="text-[11px] text-gray-400 font-normal">
                          ({attachedImages.length}/3 รูป)
                        </span>
                      </label>
                      {attachedImages.length < 3 && (
                        <label className="cursor-pointer text-[11px] font-bold text-[#1D4ED8] hover:text-blue-700 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                          <Plus className="w-3 h-3" /> เพิ่มรูป
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageSelect}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    {attachedImagePreviews.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2.5">
                        {attachedImagePreviews.map((previewUrl, idx) => (
                          <div
                            key={idx}
                            className="relative aspect-video rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 bg-gray-100 group"
                          >
                            <img
                              src={previewUrl}
                              alt={`รูปประกอบที่ ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors"
                              title="ลบรูป"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <span className="absolute bottom-1 left-1.5 text-[10px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded">
                              รูปที่ {idx + 1}
                            </span>
                          </div>
                        ))}
                        {attachedImages.length < 3 && (
                          <label className="aspect-video rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-[#1D4ED8] dark:hover:border-blue-400 flex flex-col items-center justify-center cursor-pointer bg-gray-50/50 dark:bg-gray-700/30 transition-colors">
                            <Plus className="w-4 h-4 text-gray-400 mb-0.5" />
                            <span className="text-[10px] text-gray-500">เพิ่มรูป</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleImageSelect}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    ) : (
                      <label className="w-full py-3.5 px-3 border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-[#1D4ED8] dark:hover:border-blue-400 rounded-2xl flex items-center justify-center gap-2 cursor-pointer bg-gray-50/60 dark:bg-gray-700/20 text-gray-500 hover:text-[#1D4ED8] transition-colors">
                        <ImageIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-xs">
                          แนบรูปถ่ายหน้างานหรืออุปกรณ์ประกอบ (สูงสุด 3 รูป)
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Section: รายละเอียดผู้แจ้งงาน */}
                <div className="p-3.5 bg-gray-50 dark:bg-gray-700/50 rounded-2xl space-y-3 border border-gray-100 dark:border-gray-700">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#1D4ED8]" /> รายละเอียดผู้แจ้งงาน
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                        ชื่อผู้แจ้งงาน <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={requesterName}
                        onChange={(e) => setRequesterName(e.target.value)}
                        placeholder="ชื่อ-นามสกุล ผู้แจ้ง"
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                        สังกัด / แผนก <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={requesterDepartment}
                        onChange={(e) => setRequesterDepartment(e.target.value)}
                        placeholder="เช่น รวห. ชหจ. อหข."
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                        อีเมล
                      </label>
                      <input
                        type="email"
                        value={requesterEmail}
                        onChange={(e) => setRequesterEmail(e.target.value)}
                        placeholder="email@domain.com"
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                        โทรศัพท์ผู้แจ้ง
                      </label>
                      <input
                        type="text"
                        value={requesterPhone}
                        onChange={(e) => setRequesterPhone(e.target.value)}
                        placeholder="เบอร์โทร / ต่อภายใน"
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                        ผู้ประสานงาน
                      </label>
                      <input
                        type="text"
                        value={coordinatorName}
                        onChange={(e) => setCoordinatorName(e.target.value)}
                        placeholder="ชื่อผู้ประสานงานหน้างาน"
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                        โทรศัพท์ผู้ประสานงาน
                      </label>
                      <input
                        type="text"
                        value={coordinatorPhone}
                        onChange={(e) => setCoordinatorPhone(e.target.value)}
                        placeholder="เบอร์โทรติดต่อหน้างาน"
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Section: ผู้มอบหมายงาน (คงไว้ตามเดิม) */}
                <div className="p-3.5 bg-gray-50 dark:bg-gray-700/50 rounded-2xl space-y-2 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#1D4ED8]" /> ข้อมูลการมอบหมายงาน
                    </p>
                    <span className="text-[11px] text-gray-400">
                      (ผู้ดำเนินการจะระบุอัตโนมัติเมื่อมีผู้เข้ามาดำเนินการใบงาน)
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                      ผู้มอบหมายงาน
                    </label>
                    <input
                      type="text"
                      value={assignorName}
                      onChange={(e) => setAssignorName(e.target.value)}
                      placeholder="ระบุชื่อผู้มอบหมายงาน (ดึงจากเอกสาร หรือ พิมพ์เอง)..."
                      className="w-full px-3.5 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-2 bg-gray-50 dark:bg-gray-800/80">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => createMut.mutate()}
                  disabled={createMut.isPending || isCompressingImages}
                  className="px-5 py-2 bg-[#1D4ED8] hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {createMut.isPending || isCompressingImages ? "กำลังบันทึก..." : "บันทึกและสร้างใบงาน"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </AppShell>
  );
}
