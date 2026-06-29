"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useInventoryItems } from "@/hooks/useInventory";
import { getAuditSession, submitAuditForReview, approveAudit } from "@/services/audit.service";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft, CheckCircle, AlertTriangle, Clock,
  Search, ArrowUp, ArrowDown, Minus,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import type { AuditItem } from "@/types";

export default function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { stoxyUser } = useAuth();
  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager";
  const qc = useQueryClient();

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["audit_session", id],
    queryFn: () => getAuditSession(id),
  });

  const { data: allItems = [], isLoading: itemsLoading } = useInventoryItems();
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [showDiffOnly, setShowDiffOnly] = useState(false);

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

  const filtered = items.filter(i => {
    if (showDiffOnly && i.status === "scanned") return false;
    if (!search) return true;
    return i.itemName.toLowerCase().includes(search.toLowerCase()) ||
      i.itemCode.toLowerCase().includes(search.toLowerCase());
  });

  const totalCounted = items.filter(i => i.actualQuantity != null).length;
  const matched = items.filter(i => i.status === "scanned").length;
  const diffItems = items.filter(i => i.status === "mismatch");
  const pct = items.length > 0 ? Math.round((totalCounted / items.length) * 100) : 0;

  const submitMut = useMutation({
    mutationFn: () => {
      const toSubmit: AuditItem[] = allItems.map(item => ({
        itemId: item.id,
        itemCode: item.code,
        itemName: item.name,
        expectedQuantity: item.quantityAvailable,
        actualQuantity: counts[item.id] !== undefined ? Number(counts[item.id]) : undefined,
        status: (counts[item.id] === undefined
          ? "pending"
          : Number(counts[item.id]) === item.quantityAvailable ? "scanned" : "mismatch") as AuditItem["status"],
        scannedBy: stoxyUser?.uid,
      }));
      return submitAuditForReview(id, toSubmit);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit_session", id] });
      qc.invalidateQueries({ queryKey: ["audit_sessions"] });
      toast.success("ส่งผลตรวจนับแล้ว รอ Admin อนุมัติ");
    },
    onError: (e: any) => toast.error(e.message ?? "เกิดข้อผิดพลาด"),
  });

  const approveMut = useMutation({
    mutationFn: () => approveAudit(id, stoxyUser?.uid ?? "", stoxyUser?.displayName ?? ""),
    onSuccess: () => {
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
  const canCount = isInProgress && !isAdmin;
  const canApprove = isPendingApproval && isAdmin;

  if (isLoading) return (
    <AppShell title="ตรวจนับ">
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-2xl" />)}
      </div>
    </AppShell>
  );

  if (!session) return (
    <AppShell title="ตรวจนับ">
      <p className="text-center text-gray-400 py-16">ไม่พบรอบตรวจนับนี้</p>
    </AppShell>
  );

  return (
    <AppShell title="ตรวจนับ">
      {/* Header */}
      <div className="mb-5">
        <button onClick={() => router.push("/audit")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-3">
          <ArrowLeft className="w-4 h-4" /> กลับ
        </button>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900">{session.name}</h2>
            {session.description && <p className="text-sm text-gray-500 mt-0.5">{session.description}</p>}
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {isCompleted
                ? `เสร็จสิ้น: ${formatDate(session.endDate!)}`
                : `เริ่ม: ${formatDate(session.startDate)}`}
            </p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${
            isCompleted ? "bg-emerald-100 text-emerald-700" :
            isPendingApproval ? "bg-amber-100 text-amber-700" :
            "bg-blue-100 text-blue-700"
          }`}>
            {isCompleted ? "เสร็จสิ้น" : isPendingApproval ? "รออนุมัติ" : "กำลังนับ"}
          </span>
        </div>
      </div>

      {/* Staff waiting banner */}
      {isPendingApproval && !isAdmin && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-5 flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">ส่งผลแล้ว รอ Admin ตรวจสอบและอนุมัติ</p>
        </div>
      )}

      {/* Admin approve banner */}
      {canApprove && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4 mb-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800 mb-0.5">รอการอนุมัติจาก Admin</p>
              <p className="text-xs text-amber-600">
                ช่างส่งผลนับแล้ว มี <span className="font-bold">{diffItems.length} รายการ</span> ที่จำนวนต่างจากระบบ
                {diffItems.length > 0 && ` — สต็อกจะถูกปรับอัตโนมัติหลังอนุมัติ`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {[
          { label: "ทั้งหมด", value: items.length, color: "text-gray-900" },
          { label: "นับแล้ว", value: totalCounted, color: "text-blue-600" },
          { label: "ตรงกัน", value: matched, color: "text-emerald-600" },
          { label: "ต่างกัน", value: diffItems.length, color: diffItems.length > 0 ? "text-red-500" : "text-gray-400" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {!isCompleted && (
        <div className="mb-5">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>ความคืบหน้า</span>
            <span>{totalCounted}/{items.length} ({pct}%)</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#1D4ED8] rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Diff summary (admin approve view) */}
      {(canApprove || isCompleted) && diffItems.length > 0 && (
        <div className="mb-5">
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            รายการที่จำนวนต่างกัน ({diffItems.length})
          </h3>
          <div className="bg-white rounded-2xl border border-amber-100 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500">
              <span>รายการ</span>
              <span className="text-center w-14">ระบบ</span>
              <span className="text-center w-14">นับได้</span>
              <span className="text-center w-14">ส่วนต่าง</span>
            </div>
            {diffItems.map((item, i) => {
              const diff = (item.actualQuantity ?? 0) - item.expectedQuantity;
              return (
                <div key={item.itemId}
                  className={`grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 py-3 items-center ${i < diffItems.length - 1 ? "border-b border-gray-50" : ""}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.itemName}</p>
                    <p className="font-mono text-xs text-blue-600">{item.itemCode}</p>
                  </div>
                  <span className="w-14 text-center text-sm text-gray-500">{item.expectedQuantity}</span>
                  <span className="w-14 text-center text-sm font-bold text-gray-900">{item.actualQuantity ?? "—"}</span>
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
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ, รหัส..."
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <button onClick={() => setShowDiffOnly(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-xl border transition-colors ${
              showDiffOnly ? "bg-red-50 border-red-200 text-red-600" : "bg-white border-gray-200 text-gray-600"
            }`}>
            <AlertTriangle className="w-4 h-4" />
            ต่างกัน
          </button>
        </div>
      )}

      {/* Item list (counting) */}
      {(canCount || (isPendingApproval && !isAdmin)) && (
        <div className="space-y-2 pb-28">
          {filtered.length === 0
            ? <p className="text-center text-sm text-gray-400 py-10">ไม่พบรายการ</p>
            : filtered.map((item, i) => {
              const diff = item.actualQuantity != null ? item.actualQuantity - item.expectedQuantity : null;
              return (
                <motion.div key={item.itemId}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.015, 0.3) }}
                  className={`bg-white rounded-2xl border p-4 ${
                    item.status === "mismatch" ? "border-red-100" :
                    item.status === "scanned" ? "border-emerald-100" : "border-gray-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-xs text-blue-600">{item.itemCode}</span>
                        {item.status === "scanned" && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                        {item.status === "mismatch" && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <p className="text-sm font-semibold text-gray-900 truncate">{item.itemName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        ระบบ: <span className="font-semibold text-gray-700">{item.expectedQuantity}</span>
                        {diff != null && diff !== 0 && (
                          <span className={`ml-2 font-bold ${diff > 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        )}
                      </p>
                    </div>
                    {isPendingApproval ? (
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-700">{item.actualQuantity ?? "—"}</p>
                        <p className="text-xs text-gray-400">นับได้</p>
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
                          "border-gray-200 focus:ring-blue-500/20 text-gray-900"
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
        <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-700">ทุกรายการตรงกับระบบ</p>
          <p className="text-xs text-gray-400 mt-1">ไม่มีการปรับสต็อก</p>
        </div>
      )}

      {/* Sticky bottom: staff submit */}
      {canCount && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-40">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-gray-500">
                นับแล้ว {totalCounted}/{items.length}
                {diffItems.length > 0 && <span className="text-red-500 ml-1">· ต่างกัน {diffItems.length} รายการ</span>}
              </p>
            </div>
            <button
              onClick={() => {
                if (totalCounted === 0) { toast.error("กรุณานับอย่างน้อย 1 รายการ"); return; }
                submitMut.mutate();
              }}
              disabled={submitMut.isPending}
              className="flex items-center gap-2 px-5 py-3 bg-[#1D4ED8] text-white text-sm font-bold rounded-2xl hover:bg-blue-700 disabled:opacity-50 active:scale-[0.98] transition-all"
            >
              <CheckCircle className="w-4 h-4" />
              {submitMut.isPending ? "กำลังส่ง..." : "ส่งให้ Admin ตรวจสอบ"}
            </button>
          </div>
        </div>
      )}

      {/* Sticky bottom: admin approve */}
      {canApprove && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-40">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-700">
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
