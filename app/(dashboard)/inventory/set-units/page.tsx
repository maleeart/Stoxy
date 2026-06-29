"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getInventoryItems, updateInventoryItem } from "@/services/inventory.service";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Save, Loader2, CheckCircle2, Ruler } from "lucide-react";
import { toast } from "sonner";
import type { InventoryItem } from "@/types";

const UNIT_OPTIONS = ["ชิ้น", "อัน", "ม้วน", "เมตร", "กล่อง", "ชุด", "แผ่น", "ขด", "โหล", "ถุง"];

// Try to detect unit from notes text
function detectUnit(notes?: string): string {
  if (!notes) return "";
  const lower = notes.toLowerCase();
  const matchers: [RegExp, string][] = [
    [/\bม้วน\b/, "ม้วน"],
    [/\bเมตร\b|meter|metre/, "เมตร"],
    [/\bชุด\b/, "ชุด"],
    [/\bกล่อง\b/, "กล่อง"],
    [/\bแผ่น\b/, "แผ่น"],
    [/\bขด\b/, "ขด"],
    [/\bโหล\b/, "โหล"],
    [/\bถุง\b/, "ถุง"],
    [/\bอัน\b/, "อัน"],
    [/\bชิ้น\b|piece|pcs/, "ชิ้น"],
  ];
  for (const [re, unit] of matchers) {
    if (re.test(lower)) return unit;
  }
  return "";
}

type Row = { item: InventoryItem; unit: string; custom: string; dirty: boolean };

export default function SetUnitsPage() {
  const router = useRouter();
  const { stoxyUser } = useAuth();
  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager";

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    getInventoryItems().then(({ items }) => {
      setRows(
        items.map((item) => {
          const existing = item.unit ?? "";
          const detected = existing || detectUnit(item.notes);
          return { item, unit: detected, custom: detected && !UNIT_OPTIONS.includes(detected) ? detected : "", dirty: !!detected && !existing };
        })
      );
      setLoading(false);
    });
  }, [isAdmin]);

  function setUnit(id: string, val: string) {
    setRows((prev) =>
      prev.map((r) => r.item.id === id ? { ...r, unit: val, dirty: true } : r)
    );
  }

  function setCustom(id: string, val: string) {
    setRows((prev) =>
      prev.map((r) => r.item.id === id ? { ...r, custom: val, dirty: true } : r)
    );
  }

  function resolveUnit(row: Row) {
    if (row.unit === "__custom__") return row.custom.trim();
    return row.unit;
  }

  async function handleSave() {
    const toUpdate = rows.filter((r) => r.dirty && resolveUnit(r));
    if (toUpdate.length === 0) { toast("ไม่มีรายการที่ต้องบันทึก"); return; }
    setSaving(true);
    let ok = 0;
    for (const row of toUpdate) {
      try {
        await updateInventoryItem(row.item.id, { unit: resolveUnit(row) });
        ok++;
      } catch {
        toast.error(`บันทึก ${row.item.name} ไม่สำเร็จ`);
      }
    }
    setSaving(false);
    setSavedCount(ok);
    toast.success(`บันทึกหน่วยแล้ว ${ok} รายการ`);
    // Mark as no longer dirty
    setRows((prev) =>
      prev.map((r) => {
        const u = resolveUnit(r);
        return r.dirty && u ? { ...r, item: { ...r.item, unit: u }, dirty: false } : r;
      })
    );
  }

  const dirtyCount = rows.filter((r) => r.dirty && resolveUnit(r)).length;
  const noUnitCount = rows.filter((r) => !r.item.unit && !resolveUnit(r)).length;

  if (!isAdmin) {
    return (
      <AppShell title="กำหนดหน่วย">
        <p className="text-center text-gray-400 py-20">เฉพาะ Admin เท่านั้น</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="กำหนดหน่วยอุปกรณ์">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => router.push("/inventory")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-4 h-4" /> กลับ
        </button>
      </div>

      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Ruler className="w-5 h-5 text-[#1D4ED8]" />
            กำหนดหน่วยอุปกรณ์ทั้งหมด
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? "กำลังโหลด..." : (
              <>
                {rows.length} รายการ
                {noUnitCount > 0 && <span className="ml-2 text-amber-500 font-medium">· ยังไม่มีหน่วย {noUnitCount} รายการ</span>}
                {dirtyCount > 0 && <span className="ml-2 text-blue-600 font-medium">· รอบันทึก {dirtyCount} รายการ</span>}
              </>
            )}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || dirtyCount === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#1D4ED8] text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          บันทึกทั้งหมด {dirtyCount > 0 ? `(${dirtyCount})` : ""}
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* Legend */}
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> มีหน่วยแล้ว</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" /> ตรวจพบจากหมายเหตุ (รอบันทึก)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> ยังไม่ได้ระบุ</span>
          </div>

          <div className="divide-y divide-gray-50">
            {rows.map((row) => {
              const resolved = resolveUnit(row);
              const hasUnit = !!row.item.unit;
              const dotColor = hasUnit ? "bg-emerald-400" : row.dirty && resolved ? "bg-blue-400" : "bg-amber-300";

              return (
                <div key={row.item.id} className={`flex items-center gap-3 px-4 py-3 ${row.dirty && resolved ? "bg-blue-50/40" : ""}`}>
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />

                  {/* Item info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{row.item.name}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                      <span className="font-mono">{row.item.code}</span>
                      {row.item.notes && (
                        <span className="truncate max-w-[200px]" title={row.item.notes}>
                          หมายเหตุ: {row.item.notes}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Unit selector */}
                  <div className="flex items-center gap-2 shrink-0">
                    {hasUnit && !row.dirty && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    )}
                    <select
                      value={row.unit && UNIT_OPTIONS.includes(row.unit) ? row.unit : row.unit ? "__custom__" : ""}
                      onChange={(e) => setUnit(row.item.id, e.target.value)}
                      className="text-sm border border-gray-200 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                    >
                      <option value="">— ไม่ระบุ —</option>
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                      <option value="__custom__">อื่นๆ (พิมพ์เอง)</option>
                    </select>

                    {(row.unit === "__custom__" || (row.unit && !UNIT_OPTIONS.includes(row.unit))) && (
                      <input
                        value={row.custom}
                        onChange={(e) => setCustom(row.item.id, e.target.value)}
                        placeholder="หน่วย..."
                        className="w-24 text-sm border border-gray-200 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AppShell>
  );
}
