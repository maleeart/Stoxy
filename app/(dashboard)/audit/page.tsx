"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { getAuditSessions, createAuditSession } from "@/services/audit.service";
import { getAllUsers } from "@/services/auth.service";
import { useAuth } from "@/hooks/useAuth";
import { ShieldCheck, Plus, Clock, CheckCircle, ChevronRight, AlertTriangle, X } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { MobileHeader } from "@/components/layout/MobileHeader";
import type { AuditSession } from "@/types";

const statusBadge: Record<string, string> = {
  in_progress: "bg-blue-100 text-blue-700",
  pending_approval: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-600",
  draft: "bg-gray-100 text-gray-600",
};
const statusLabel: Record<string, string> = {
  in_progress: "กำลังนับ",
  pending_approval: "รออนุมัติ",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
  draft: "ร่าง",
};

export default function AuditPage() {
  const { stoxyUser } = useAuth();
  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager";

  if (stoxyUser?.role === "supervisor") {
    return <AppShell title="ตรวจนับ"><div className="text-center py-24 text-gray-400">ไม่มีสิทธิ์เข้าถึงหน้านี้</div></AppShell>;
  }
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["audit_sessions"],
    queryFn: getAuditSessions,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["all_users"],
    queryFn: getAllUsers,
    enabled: isAdmin && showForm,
  });

  const staffUsers = allUsers.filter(u => u.role === "staff" || u.role === "admin" || u.role === "manager");

  const createMut = useMutation({
    mutationFn: () => createAuditSession({
      name,
      description,
      assignedUsers: selectedUsers.length > 0 ? selectedUsers : ["all"],
      createdBy: stoxyUser?.uid ?? "",
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["audit_sessions"] });
      qc.invalidateQueries({ queryKey: ["my_active_audit"] });
      toast.success("สร้างรอบตรวจนับสำเร็จ");
      setShowForm(false);
      setName(""); setDescription(""); setSelectedUsers([]);
    },
    onError: () => toast.error("เกิดข้อผิดพลาด"),
  });

  const lastCompleted = sessions.find(s => s.status === "completed");
  const pendingApproval = sessions.filter(s => s.status === "pending_approval");

  // Staff sees only their assigned sessions
  const visibleSessions = isAdmin
    ? sessions
    : sessions.filter(s =>
        (s.assignedUsers?.includes(stoxyUser?.uid ?? "") || s.assignedUsers?.includes("all")) &&
        s.status === "in_progress"
      );

  return (
    <AppShell title="ตรวจนับ">
      {/* Mobile header for staff */}
      {!isAdmin && <MobileHeader title="ตรวจนับสต็อก" back />}

      {/* Last count / pending banner */}
      {isAdmin && pendingApproval.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">รออนุมัติ {pendingApproval.length} รอบ</p>
            <p className="text-xs text-amber-600">ช่างส่งผลตรวจนับรอการยืนยัน</p>
          </div>
        </div>
      )}

      {isAdmin && lastCompleted && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 mb-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">นับสต็อกล่าสุด: {formatDate(lastCompleted.endDate ?? lastCompleted.startDate)}</p>
            <p className="text-xs text-emerald-600">{lastCompleted.name}</p>
          </div>
        </div>
      )}

      {!isAdmin && visibleSessions.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <ShieldCheck className="w-10 h-10 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">ไม่มีรอบตรวจนับที่ได้รับมอบหมาย</p>
        </div>
      )}

      {/* Header + create button (admin only) */}
      {isAdmin && (
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">ตรวจนับสต็อก</h2>
            <p className="text-sm text-gray-500">{sessions.length} รอบทั้งหมด</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[#1D4ED8] text-white rounded-xl hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> สร้างรอบใหม่
          </button>
        </div>
      )}

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">สร้างรอบตรวจนับใหม่</h3>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="ชื่อรอบ เช่น ตรวจนับประจำเดือน มิ.ย."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="หมายเหตุ (ไม่บังคับ)" rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
            />
            {/* Assign users */}
            {staffUsers.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">มอบหมายให้ (ไม่เลือก = ทุกคน)</p>
                <div className="flex flex-wrap gap-2">
                  {staffUsers.map(u => (
                    <button key={u.uid}
                      onClick={() => setSelectedUsers(prev =>
                        prev.includes(u.uid) ? prev.filter(id => id !== u.uid) : [...prev, u.uid]
                      )}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                        selectedUsers.includes(u.uid)
                          ? "bg-[#1D4ED8] text-white border-[#1D4ED8]"
                          : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                      }`}
                    >
                      {u.displayName || u.email}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => createMut.mutate()} disabled={!name.trim() || createMut.isPending}
                className="px-4 py-2 text-sm font-medium bg-[#1D4ED8] text-white rounded-xl disabled:opacity-50 hover:bg-blue-700 transition-colors">
                {createMut.isPending ? "กำลังสร้าง..." : "สร้าง"}
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                ยกเลิก
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sessions list */}
      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)
          : visibleSessions.map((session, i) => (
              <AuditCard key={session.id} session={session} delay={i * 0.05} />
            ))
        }
      </div>
    </AppShell>
  );
}

function AuditCard({ session, delay }: { session: AuditSession; delay: number }) {
  const total = session.summary?.totalItems ?? 0;
  const scanned = session.summary?.scannedItems ?? 0;
  const pct = total > 0 ? (scanned / total) * 100 : 0;
  const isPending = session.status === "pending_approval";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Link href={`/audit/${session.id}`}
        className={`block bg-white rounded-2xl border p-4 hover:border-blue-200 transition-colors ${isPending ? "border-amber-200" : "border-gray-100"}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[session.status]}`}>
                {statusLabel[session.status]}
              </span>
              {isPending && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
            </div>
            <p className="font-semibold text-gray-900 truncate">{session.name}</p>
            {session.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{session.description}</p>}
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {session.status === "completed"
                ? `เสร็จ: ${formatDate(session.endDate ?? session.startDate)}`
                : `เริ่ม: ${formatDate(session.startDate)}`}
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
            <div className="flex gap-3 mt-1.5 text-xs">
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
