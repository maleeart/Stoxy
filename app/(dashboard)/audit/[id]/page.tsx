"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useInventoryItems } from "@/hooks/useInventory";
import { getAuditSession, submitAuditForReview, approveAudit, rejectAudit, updateAuditItem } from "@/services/audit.service";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft, CheckCircle, AlertTriangle, Clock,
  Search, ArrowUp, ArrowDown, Minus, XCircle, ScanLine,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import type { AuditItem } from "@/types";

function AuditDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { stoxyUser } = useAuth();
  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager";
  const isViewer = stoxyUser?.role === "viewer";
  const qc = useQueryClient();

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["audit_session", id],
    queryFn: () => getAuditSession(id),
  });

  const { data: allItems = [], isLoading: itemsLoading } = useInventoryItems();
  const storageKey = `audit_counts_${id}`;
  const [counts, setCountsRaw] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) ?? "{}"); } catch { return {}; }
  });
  function setCounts(fn: (prev: Record<string, string>) => Record<string, string>) {
    setCountsRaw(prev => {
      const next = fn(prev);
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [showDiffOnly, setShowDiffOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [countFilter, setCountFilter] = useState<"all" | "counted" | "uncounted">("all");

  // Hydrate from a previously saved draft (session.items) — covers a cleared
  // localStorage or picking the count back up on another device.
  useEffect(() => {
    if (!session?.items || session.items.length === 0) return;
    setCounts(prev => {
      const next = { ...prev };
      let changed = false;
      for (const it of session.items!) {
        if (next[it.itemId] === undefined && it.actualQuantity != null) {
          next[it.itemId] = String(it.actualQuantity);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [session?.items]);

  function buildAuditItems(): AuditItem[] {
    return allItems.map(item => {
      const counted = counts[item.id] !== undefined;
      const actual = counted ? Number(counts[item.id]) : undefined;
      const status: AuditItem["status"] = !counted ? "pending"
        : actual === item.quantityAvailable ? "scanned" : "mismatch";
      const entry: AuditItem = {
        itemId: item.id, itemCode: item.code, itemName: item.name,
        expectedQuantity: item.quantityAvailable, status,
      };
      if (actual !== undefined) entry.actualQuantity = actual;
      if (stoxyUser?.uid) entry.scannedBy = stoxyUser.uid;
      return entry;
    });
  }

  // Build item list from inventory (live system qty as expected)
  const items: AuditItem[] = useMemo(() => {
    // If session has saved items (pending_approval / completed), use those
    if (session?.items && session.items.length > 0) return session.items;
    // Otherwise build from live inventory
    return allItems.map(item => ({
      itemId: item.id,
      itemCode: item.code,
      itemName: item.name,
      expectedQuantity: item.quantityAvailable,
      actualQuantity: counts[item.id] !== undefined ? Number(counts[item.id]) : undefined,
      status: (counts[item.id] === undefined
        ? "pending"
        : Number(counts[item.id]) === item.quantityAvailable ? "scanned" : "mismatch") as AuditItem["status"],
    }));
  }, [allItems, counts, session?.items]);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    allItems.forEach(i => { if (i.categoryId) map.set(i.categoryId, i.categoryName ?? i.categoryId); });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allItems]);

  const filtered = items.filter(i => {
    if (showDiffOnly && i.status === "scanned") return false;
    if (countFilter === "counted" && i.actualQuantity == null) return false;
    if (countFilter === "uncounted" && i.actualQuantity != null) return false;
    if (selectedCategory !== "all") {
      const inv = allItems.find(a => a.id === i.itemId);
      if (inv?.categoryId !== selectedCategory) return false;
    }
    if (!search) return true;
    return i.itemName.toLowerCase().includes(search.toLowerCase()) ||
      i.itemCode.toLowerCase().includes(search.toLowerCase());
  });

  const totalCounted = items.filter(i => i.actualQuantity != null).length;
  const matched = items.filter(i => i.status === "scanned").length;
  const diffItems = items.filter(i => i.status === "mismatch");
  const pct = items.length > 0 ? Math.round((totalCounted / items.length) * 100) : 0;

  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const rejectMut = useMutation({
    mutationFn: () => rejectAudit(id, stoxyUser?.uid ?? "", stoxyUser?.displayName ?? "", rejectReason.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit_session", id] });
      qc.invalidateQueries({ queryKey: ["audit_sessions"] });
      toast.success("ส่งกลับให้แก้ไขแล้ว");
      setShowReject(false);
      setRejectReason("");
    },
    onError: () => toast.error("เกิดข้อผิดพลาด"),
  });

  const submitMut = useMutation({
    mutationFn: () => submitAuditForReview(id, buildAuditItems()),
    onSuccess: () => {
      localStorage.removeItem(storageKey);
      qc.invalidateQueries({ queryKey: ["audit_session", id] });
      qc.invalidateQueries({ queryKey: ["audit_sessions"] });
      toast.success("ส่งผลตรวจนับแล้ว รอ Admin อนุมัติ");
    },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  const draftMut = useMutation({
    mutationFn: () => updateAuditItem(id, buildAuditItems()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit_session", id] });
      qc.invalidateQueries({ queryKey: ["audit_sessions"] });
      toast.success("บันทึกร่างแล้ว กลับมานับต่อได้");
    },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  const approveMut = useMutation({
    mutationFn: async () => {
      // If admin is counting directly (in_progress), save items first then approve
      if (isInProgress) {
        await submitAuditForReview(id, buildAuditItems());
      }
      return approveAudit(id, stoxyUser?.uid ?? "", stoxyUser?.displayName ?? "");
    },
    onSuccess: () => {
      localStorage.removeItem(storageKey);
      qc.invalidateQueries({ queryKey: ["audit_sessions"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["my_active_audit"] });
      toast.success(`อนุมัติแล้ว ปรับสต็อก ${diffItems.length} รายการ`);
      router.push("/audit");
    },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  const isLoading = sessionLoading || itemsLoading;
  const status = session?.status;
  const isCompleted = status === "completed";
  const isPendingApproval = status === "pending_approval";
  const isInProgress = status === "in_progress";
  const canCount = isInProgress && !isViewer;
  const canApprove = isPendingApproval && isAdmin;

  if (isLoading) return (
    <AppShell title="ตรวจนับ">
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl" />)}
      </div>
    </AppShell>
  );

  if (!session) return (
    <AppShell title="ตรวจนับ">
      <p className="text-center text-gray-400 py-16">ไม่พบรอบตรวจนับนี้</p>
    </AppShell>
  );

  const statusLabel = isCompleted ? "เสร็จสิ้น" : isPendingApproval ? "รออนุมัติ" : "กำลังนับ";
  const statusColor = isCompleted ? "bg-emerald-100 text-emerald-700" :
    isPendingApproval ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700";

  return (
    <AppShell title="ตรวจนับ">
      {/* Mobile header for staff */}
      {!isAdmin && (
        <MobileHeader
          title={session.name}
          back
          actions={
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusColor}`}>
              {statusLabel}
            </span>
          }
        />
      )}

      {/* Desktop header for admin */}
      {isAdmin && (
      <div className="mb-5">
        <button onClick={() => router.push("/audit")}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-3">
          <ArrowLeft className="w-4 h-4" /> กลับ
        </button>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{session.name}</h2>
            {session.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{session.description}</p>}
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {isCompleted
                ? `เสร็จสิ้น: ${formatDate(session.endDate!)}`
                : `เริ่ม: ${formatDate(session.startDate)}`}
            </p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
      </div>
      )}

      <div className={!isAdmin ? "px-4 pt-4" : ""}>

      {/* Staff waiting banner */}
      {isPendingApproval && !isAdmin && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800 rounded-2xl px-4 py-3 mb-5 flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">ส่งผลแล้ว รอ Admin ตรวจสอบและอนุมัติ</p>
        </div>
      )}

      {/* Admin approve banner */}
      {canApprove && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-4 mb-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-200 mb-0.5">รอการอนุมัติจาก Admin</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ช่างส่งผลนับแล้ว มี <span className="font-bold">{diffItems.length} รายการ</span> ที่จำนวนต่างจากระบบ
                {diffItems.length > 0 && ` — สต็อกจะถูกปรับอัตโนมัติหลังอนุมัติ`}
              </p>
              <button
                onClick={() => setShowReject(true)}
                className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" /> ปฏิเสธและส่งกลับแก้ไข
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejected reason banner (for staff) */}
      {isInProgress && session?.rejectedReason && !isAdmin && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl px-4 py-3 mb-5">
          <div className="flex items-start gap-2">
            <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">ถูกส่งกลับให้แก้ไข</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">เหตุผล: {session.rejectedReason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {[
          { label: "ทั้งหมด", value: items.length, color: "text-gray-900 dark:text-white" },
          { label: "นับแล้ว", value: totalCounted, color: "text-blue-600" },
          { label: "ตรงกัน", value: matched, color: "text-emerald-600" },
          { label: "ต่างกัน", value: diffItems.length, color: diffItems.length > 0 ? "text-red-500" : "text-gray-400" },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {!isCompleted && (
        <div className="mb-5">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
            <span>ความคืบหน้า</span>
            <span>{totalCounted}/{items.length} ({pct}%)</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-[#1D4ED8] rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Diff summary (admin approve view) */}
      {(canApprove || isCompleted) && diffItems.length > 0 && (
        <div className="mb-5">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            รายการที่จำนวนต่างกัน ({diffItems.length})
          </h3>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-amber-100 dark:border-amber-900/40 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400">
              <span>รายการ</span>
              <span className="text-center w-14">ระบบ</span>
              <span className="text-center w-14">นับได้</span>
              <span className="text-center w-14">ส่วนต่าง</span>
            </div>
            {diffItems.map((item, i) => {
              const diff = (item.actualQuantity ?? 0) - item.expectedQuantity;
              return (
                <div key={item.itemId}
                  className={`grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-3 items-center ${i < diffItems.length - 1 ? "border-b border-gray-50 dark:border-gray-700" : ""}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.itemName}</p>
                    <p className="font-mono text-xs text-blue-600">{item.itemCode}</p>
                  </div>
                  <span className="w-14 text-center text-sm text-gray-500 dark:text-gray-400">{item.expectedQuantity}</span>
                  <span className="w-14 text-center text-sm font-bold text-gray-900 dark:text-white">{item.actualQuantity ?? "—"}</span>
                  <span className={`w-14 flex items-center justify-center gap-0.5 text-sm font-bold rounded-lg py-1 ${
                    diff > 0 ? "text-emerald-700 bg-emerald-50" : "text-red-600 bg-red-50"
                  }`}>
                    {diff > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    {Math.abs(diff)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters (counting mode) */}
      {(canCount || (isPendingApproval && !isAdmin)) && (
        <div className="space-y-3 mb-4">
          {/* Count status tabs */}
          <div className="flex gap-2">
            {([
              ["all", "ทั้งหมด", items.length],
              ["uncounted", "ยังไม่ได้นับ", items.filter(i => i.actualQuantity == null).length],
              ["counted", "นับแล้ว", items.filter(i => i.actualQuantity != null).length],
            ] as const).map(([val, label, count]) => (
              <button key={val} onClick={() => setCountFilter(val)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                  countFilter === val
                    ? "bg-[#1D4ED8] text-white border-[#1D4ED8]"
                    : "bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600"
                }`}>
                {label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${countFilter === val ? "bg-white/20" : "bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400"}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* Category tabs */}
          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                  selectedCategory === "all"
                    ? "bg-[#1D4ED8] text-white border-[#1D4ED8]"
                    : "bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600"
                }`}
              >
                ทั้งหมด ({items.length})
              </button>
              {categories.map(cat => {
                const count = items.filter(i => allItems.find(a => a.id === i.itemId)?.categoryId === cat.id).length;
                const diffInCat = items.filter(i =>
                  allItems.find(a => a.id === i.itemId)?.categoryId === cat.id && i.status === "mismatch"
                ).length;
                return (
                  <button key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                      selectedCategory === cat.id
                        ? "bg-[#1D4ED8] text-white border-[#1D4ED8]"
                        : "bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600"
                    }`}
                  >
                    {cat.name} ({count})
                    {diffInCat > 0 && (
                      <span className={`w-4 h-4 text-[10px] font-bold rounded-full flex items-center justify-center ${
                        selectedCategory === cat.id ? "bg-white/30 text-white" : "bg-red-100 text-red-600"
                      }`}>{diffInCat}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Search + diff filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อ, รหัส..."
                className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <button onClick={() => router.push(`/scan?mode=audit&session=${id}`)}
              className="p-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 hover:border-blue-400 hover:text-blue-600 transition-colors">
              <ScanLine className="w-4 h-4" />
            </button>
            <button onClick={() => setShowDiffOnly(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-xl border transition-colors ${
                showDiffOnly ? "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-600" : "bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300"
              }`}>
              <AlertTriangle className="w-4 h-4" />
              ต่างกัน
            </button>
          </div>
        </div>
      )}

      {/* Item list (counting) */}
      {(canCount || (isPendingApproval && !isAdmin)) && (
        <div className={`space-y-2 ${isAdmin ? "pb-28" : "pb-44"}`}>
          {filtered.length === 0
            ? <p className="text-center text-sm text-gray-400 py-10">ไม่พบรายการ</p>
            : filtered.map((item, i) => {
              const diff = item.actualQuantity != null ? item.actualQuantity - item.expectedQuantity : null;
              const inv = allItems.find(a => a.id === item.itemId);
              const location = inv?.locationName || inv?.locationId;
              const unit = inv?.unit;
              return (
                <motion.div key={item.itemId}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.015, 0.3) }}
                  className={`bg-white dark:bg-gray-800 rounded-2xl border p-4 ${
                    item.status === "mismatch" ? "border-red-100 dark:border-red-900/40" :
                    item.status === "scanned" ? "border-emerald-100 dark:border-emerald-900/40" : "border-gray-100 dark:border-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-xs text-blue-600">{item.itemCode}</span>
                        {item.status === "scanned" && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                        {item.status === "mismatch" && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.itemName}</p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ระบบ: <span className="font-semibold text-gray-800 dark:text-gray-100">{item.expectedQuantity}{unit ? ` ${unit}` : ""}</span>
                          {diff != null && diff !== 0 && (
                            <span className={`ml-2 font-bold ${diff > 0 ? "text-emerald-600" : "text-red-500"}`}>
                              {diff > 0 ? `+${diff}` : diff}
                            </span>
                          )}
                        </p>
                        {location && (
                          <span className="text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full truncate max-w-[140px]">
                            📍 {location}
                          </span>
                        )}
                      </div>
                    </div>
                    {isPendingApproval ? (
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{item.actualQuantity ?? "—"}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">นับได้</p>
                      </div>
                    ) : (
                      <input
                        type="number" min="0"
                        value={counts[item.itemId] ?? ""}
                        onChange={e => setCounts(c => ({ ...c, [item.itemId]: e.target.value }))}
                        placeholder={String(item.expectedQuantity)}
                        className={`w-20 text-center text-sm font-bold border rounded-xl px-2 py-2 focus:outline-none focus:ring-2 ${
                          item.status === "mismatch" ? "border-red-200 focus:ring-red-500/20 text-red-600" :
                          item.status === "scanned" ? "border-emerald-200 focus:ring-emerald-500/20 text-emerald-700" :
                          "border-gray-200 dark:border-gray-600 focus:ring-blue-500/20 text-gray-900 dark:text-white dark:bg-gray-700"
                        }`}
                      />
                    )}
                  </div>
                </motion.div>
              );
            })
          }
        </div>
      )}

      {/* Completed all-items view */}
      {isCompleted && diffItems.length === 0 && (
        <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">ทุกรายการตรงกับระบบ</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">ไม่มีการปรับสต็อก</p>
        </div>
      )}

      </div>

      {/* Sticky bottom: counting actions */}
      {canCount && (
        <div className={`fixed left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 p-4 z-40 ${isAdmin ? "bottom-0" : "bottom-16"}`}>
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                นับแล้ว {totalCounted}/{items.length}
                {diffItems.length > 0 && <span className="text-red-500 ml-1">· ต่างกัน {diffItems.length} รายการ</span>}
              </p>
            </div>
            {totalCounted > 0 && totalCounted < items.length && (
              <button
                onClick={() => draftMut.mutate()}
                disabled={draftMut.isPending}
                className="px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                {draftMut.isPending ? "กำลังบันทึก..." : "บันทึกร่าง"}
              </button>
            )}
            {isAdmin ? (
              <button
                onClick={() => {
                  if (totalCounted === 0) { toast.error("กรุณานับอย่างน้อย 1 รายการ"); return; }
                  approveMut.mutate();
                }}
                disabled={approveMut.isPending}
                className="flex items-center gap-2 px-5 py-3 bg-emerald-500 text-white text-sm font-bold rounded-2xl hover:bg-emerald-600 disabled:opacity-50 active:scale-[0.98] transition-all"
              >
                <CheckCircle className="w-4 h-4" />
                {approveMut.isPending ? "กำลังบันทึก..." : "อนุมัติและปรับสต็อก"}
              </button>
            ) : (
              <button
                onClick={() => {
                  if (totalCounted === 0) { toast.error("กรุณานับอย่างน้อย 1 รายการ"); return; }
                  if (totalCounted < items.length) { setConfirmSubmit(true); return; }
                  submitMut.mutate();
                }}
                disabled={submitMut.isPending}
                className="flex items-center gap-2 px-5 py-3 bg-[#1D4ED8] text-white text-sm font-bold rounded-2xl hover:bg-blue-700 disabled:opacity-50 active:scale-[0.98] transition-all"
              >
                <CheckCircle className="w-4 h-4" />
                {submitMut.isPending ? "กำลังส่ง..." : "ส่งให้ Admin ตรวจสอบ"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Confirm submit with incomplete count */}
      <AnimatePresence>
        {confirmSubmit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setConfirmSubmit(false)}
          >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 rounded-2xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">นับยังไม่ครบ</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  นับแล้ว <span className="font-bold text-gray-900">{totalCounted}</span> จาก <span className="font-bold text-gray-900">{items.length}</span> รายการ
                  — ยังเหลืออีก <span className="font-bold text-red-500">{items.length - totalCounted}</span> รายการที่ยังไม่ได้นับ
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">ส่งตอนนี้ได้ รายการที่ยังไม่นับจะถูกบันทึกเป็น "ยังไม่นับ"</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setConfirmSubmit(false)}
                  className="flex-1 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  นับต่อก่อน
                </button>
                <button onClick={() => { setConfirmSubmit(false); submitMut.mutate(); }}
                  disabled={submitMut.isPending}
                  className="flex-1 py-3 text-sm font-semibold text-white bg-[#1D4ED8] rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  ส่งเลย
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {showReject && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowReject(false)}
          >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">ปฏิเสธและส่งกลับแก้ไข</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ระบุเหตุผลเพื่อให้ช่างแก้ไขและส่งใหม่</p>
              </div>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="เช่น จำนวนไม่ตรงกับที่ตรวจสอบ กรุณานับใหม่อีกครั้ง"
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 resize-none"
              />
              <div className="flex gap-2">
                <button onClick={() => setShowReject(false)}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-200 transition-colors">
                  ยกเลิก
                </button>
                <button onClick={() => rejectMut.mutate()} disabled={!rejectReason.trim() || rejectMut.isPending}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                  {rejectMut.isPending && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  ส่งกลับแก้ไข
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky bottom: admin approve */}
      {canApprove && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 p-4 z-40">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {diffItems.length === 0 ? "ทุกรายการตรงกัน ไม่มีการปรับสต็อก" : `ปรับสต็อก ${diffItems.length} รายการหลังอนุมัติ`}
              </p>
            </div>
            <button
              onClick={() => approveMut.mutate()}
              disabled={approveMut.isPending}
              className="flex items-center gap-2 px-5 py-3 bg-emerald-500 text-white text-sm font-bold rounded-2xl hover:bg-emerald-600 disabled:opacity-50 active:scale-[0.98] transition-all"
            >
              <CheckCircle className="w-4 h-4" />
              {approveMut.isPending ? "กำลังบันทึก..." : "อนุมัติและปรับสต็อก"}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function AuditDetailPage() {
  return <Suspense><AuditDetailContent /></Suspense>;
}
