"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { getAuditSessions, createAuditSession } from "@/services/audit.service";
import { useAuth } from "@/hooks/useAuth";
import { ShieldCheck, Plus, Clock, CheckCircle, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";
import Link from "next/link";
import type { AuditSession } from "@/types";

const statusBadge: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-600",
};
const statusLabel: Record<string, string> = {
  draft: "ร่าง",
  in_progress: "กำลังดำเนินการ",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
};

export default function AuditPage() {
  const { stoxyUser } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["audit_sessions"],
    queryFn: getAuditSessions,
  });

  const createMut = useMutation({
    mutationFn: () =>
      createAuditSession({
        name,
        description,
        assignedUsers: [stoxyUser?.uid ?? ""],
        createdBy: stoxyUser?.uid ?? "unknown",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit_sessions"] });
      toast.success("สร้างรอบตรวจนับสำเร็จ");
      setShowForm(false);
      setName("");
      setDescription("");
    },
    onError: () => toast.error("เกิดข้อผิดพลาด"),
  });

  return (
    <AppShell title="ตรวจนับ">
      {/* Last count banner */}
      {(() => {
        const last = sessions.find(s => s.status === "completed");
        return last ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 mb-5 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">นับสต็อกล่าสุด: {formatDate(last.endDate ?? last.startDate)}</p>
              <p className="text-xs text-emerald-600">{last.name}</p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-5 flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700">ยังไม่เคยตรวจนับสต็อก</p>
          </div>
        );
      })()}

      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900">ตรวจนับสต็อก</h2>
          <p className="text-sm text-gray-500">{sessions.length} รอบตรวจนับ</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[#1D4ED8] text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          สร้างรอบตรวจนับ
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 mb-4"
        >
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">สร้างรอบตรวจนับใหม่</h3>
          <div className="space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ชื่อรอบตรวจนับ เช่น ตรวจนับประจำเดือน มิ.ย."
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="รายละเอียด (ไม่บังคับ)"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => createMut.mutate()}
                disabled={!name.trim() || createMut.isPending}
                className="px-4 py-2 text-sm font-medium bg-[#1D4ED8] text-white rounded-xl disabled:opacity-50 hover:bg-blue-700 transition-colors"
              >
                {createMut.isPending ? "กำลังสร้าง..." : "สร้าง"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Sessions List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))
        ) : sessions.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">ยังไม่มีรอบตรวจนับ</p>
          </div>
        ) : (
          sessions.map((session, i) => (
            <AuditCard key={session.id} session={session} delay={i * 0.05} />
          ))
        )}
      </div>
    </AppShell>
  );
}

function AuditCard({ session, delay }: { session: AuditSession; delay: number }) {
  const total = session.summary?.totalItems ?? 0;
  const scanned = session.summary?.scannedItems ?? 0;
  const pct = total > 0 ? (scanned / total) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
    <Link href={`/audit/${session.id}`}
      className="block bg-white rounded-2xl border border-gray-100 p-4 hover:border-blue-200 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[session.status]}`}>
              {statusLabel[session.status]}
            </span>
          </div>
          <p className="font-semibold text-gray-900 truncate">{session.name}</p>
          {session.description && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{session.description}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            เริ่ม: {formatDate(session.startDate)}
            {session.endDate && ` · เสร็จ: ${formatDate(session.endDate)}`}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {total > 0 && (
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">{scanned}/{total}</p>
              <p className="text-xs text-gray-400">รายการ</p>
            </div>
          )}
          <ChevronRight className="w-4 h-4 text-gray-300" />
        </div>
      </div>

      {total > 0 && (
        <div className="mt-3">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex gap-3 mt-1.5 text-xs text-gray-400">
            <span className="text-emerald-600">✓ {session.summary?.matchedItems ?? 0} ตรงกัน</span>
            <span className="text-amber-600">⚠ {session.summary?.mismatchItems ?? 0} ต่างกัน</span>
            <span className="text-gray-400">○ {session.summary?.missingItems ?? 0} ยังไม่นับ</span>
          </div>
        </div>
      )}
    </Link>
    </motion.div>
  );
}
