"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, deleteDoc, doc, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { Trash2, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { Timestamp } from "firebase/firestore";

type Tab = "borrows" | "requisitions" | "audits" | "movements";

interface Row {
  id: string;
  label: string;
  sub: string;
  date: string;
}

const TABS: { key: Tab; label: string; col: string }[] = [
  { key: "borrows",     label: "ยืม/คืน",  col: "borrow_records" },
  { key: "requisitions",label: "เบิก",      col: "requisitions" },
  { key: "audits",      label: "Audit",     col: "audit_sessions" },
  { key: "movements",   label: "เคลื่อนไหว", col: "stock_movements" },
];

function toDateStr(ts: Timestamp | undefined): string {
  if (!ts) return "-";
  try { return ts.toDate().toLocaleDateString("th-TH"); } catch { return "-"; }
}

function mapRow(col: string, d: { id: string } & Record<string, any>): Row {
  if (col === "borrow_records") return {
    id: d.id,
    label: `${d.itemName ?? "-"} (${d.itemCode ?? "-"})`,
    sub: `${d.borrowerName ?? "-"} · ${d.status ?? "-"}`,
    date: toDateStr(d.createdAt),
  };
  if (col === "requisitions") return {
    id: d.id,
    label: `${d.itemName ?? "-"} (${d.itemCode ?? "-"})`,
    sub: `${d.requesterName ?? "-"} · ${d.status ?? "-"} · จำนวน ${d.quantity ?? "-"}`,
    date: toDateStr(d.createdAt),
  };
  if (col === "audit_sessions") return {
    id: d.id,
    label: d.name ?? "(ไม่มีชื่อ)",
    sub: `สถานะ: ${d.status ?? "-"}`,
    date: toDateStr(d.createdAt),
  };
  // stock_movements
  return {
    id: d.id,
    label: `${d.itemName ?? "-"} (${d.itemCode ?? "-"})`,
    sub: `${d.type ?? "-"} · ${d.performedByName ?? d.performedBy ?? "-"} · ${d.quantityChange > 0 ? "+" : ""}${d.quantityChange ?? 0}`,
    date: toDateStr(d.createdAt),
  };
}

export default function CleanupPage() {
  const { stoxyUser } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("borrows");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager";

  const colName = TABS.find((t) => t.key === tab)!.col;

  const load = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const q = query(collection(db, colName), orderBy("createdAt", "desc"), limit(200));
      const snap = await getDocs(q);
      setRows(snap.docs.map((d) => mapRow(colName, { id: d.id, ...d.data() })));
    } catch {
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [colName]);

  useEffect(() => { load(); }, [load]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)));
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`ลบ ${selected.size} รายการ? ไม่สามารถกู้คืนได้`)) return;
    const ids = Array.from(selected);
    setDeleting(new Set(ids));
    try {
      await Promise.all(ids.map((id) => deleteDoc(doc(db, colName, id))));
      toast.success(`ลบ ${ids.length} รายการแล้ว`);
      await load();
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setDeleting(new Set());
    }
  }

  async function deleteOne(id: string) {
    if (!confirm("ลบรายการนี้?")) return;
    setDeleting((prev) => new Set([...prev, id]));
    try {
      await deleteDoc(doc(db, colName, id));
      toast.success("ลบแล้ว");
      setRows((prev) => prev.filter((r) => r.id !== id));
      setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setDeleting((prev) => { const n = new Set(prev); n.delete(id); return n; });
    }
  }

  if (!isAdmin) {
    return (
      <AppShell title="ไม่มีสิทธิ์">
        <p className="text-center text-gray-500 py-20">เฉพาะผู้ดูแลระบบ</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="จัดการประวัติ">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => router.push("/settings")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5">
          <ArrowLeft className="w-4 h-4" /> ตั้งค่า
        </button>

        <div className="mb-5">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">ล้างข้อมูลทดสอบ</h2>
          <p className="text-sm text-gray-500">เลือกและลบรายการที่ไม่ต้องการออกจากระบบ</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === t.key
                  ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={rows.length > 0 && selected.size === rows.length}
              onChange={toggleAll}
              className="w-4 h-4 rounded accent-[#1D4ED8]"
            />
            <span className="text-xs text-gray-500">{rows.length} รายการ{selected.size > 0 ? ` · เลือก ${selected.size}` : ""}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            {selected.size > 0 && (
              <button
                onClick={deleteSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                ลบที่เลือก ({selected.size})
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="space-y-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
            ))
          ) : rows.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
              <p className="text-sm text-gray-400">ไม่มีข้อมูล</p>
            </div>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className={`flex items-center gap-3 bg-white dark:bg-gray-900 border rounded-2xl px-4 py-3 transition-colors ${
                  selected.has(row.id) ? "border-red-300 bg-red-50 dark:bg-red-950/20" : "border-gray-100 dark:border-gray-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(row.id)}
                  onChange={() => toggleSelect(row.id)}
                  className="w-4 h-4 rounded accent-[#1D4ED8] shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{row.label}</p>
                  <p className="text-xs text-gray-400 truncate">{row.sub} · {row.date}</p>
                </div>
                <button
                  onClick={() => deleteOne(row.id)}
                  disabled={deleting.has(row.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 text-gray-300 transition-colors disabled:opacity-40 shrink-0"
                >
                  {deleting.has(row.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
