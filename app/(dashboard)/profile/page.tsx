"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { useAuth } from "@/hooks/useAuth";
import { logout, updateStoxyUser } from "@/services/auth.service";
import { LogOut, Building2, Shield, Mail, SmilePlus, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  manager: "ผู้จัดการ",
  supervisor: "ผู้บริหาร",
  staff: "ช่าง",
  viewer: "ผู้ดูข้อมูล",
};
const ROLE_COLOR: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  manager: "bg-purple-100 text-purple-700",
  supervisor: "bg-indigo-100 text-indigo-700",
  staff: "bg-blue-100 text-blue-700",
  viewer: "bg-gray-100 text-gray-600",
};

export default function ProfilePage() {
  const { stoxyUser, loading, refreshUser } = useAuth();
  const router = useRouter();
  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager";

  const [editingDept, setEditingDept] = useState(false);
  const [dept, setDept] = useState(stoxyUser?.department ?? "");
  const [editingNickname, setEditingNickname] = useState(false);
  const [nickname, setNickname] = useState(stoxyUser?.nickname ?? "");
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!editingDept) setDept(stoxyUser?.department ?? "");
  }, [stoxyUser?.department, editingDept]);

  useEffect(() => {
    if (!editingNickname) setNickname(stoxyUser?.nickname ?? "");
  }, [stoxyUser?.nickname, editingNickname]);

  if (loading) return null;
  if (!stoxyUser) { router.replace("/login"); return null; }

  async function saveNickname() {
    setSaving(true);
    try {
      await updateStoxyUser(stoxyUser!.uid, { nickname: nickname.trim() || null as unknown as string });
      await refreshUser();
      toast.success("บันทึกชื่อเล่นแล้ว");
      setEditingNickname(false);
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  async function saveDept() {
    if (!dept.trim()) return;
    setSaving(true);
    try {
      await updateStoxyUser(stoxyUser!.uid, { department: dept.trim() });
      await refreshUser();
      toast.success("บันทึกแผนกแล้ว");
      setEditingDept(false);
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      router.replace("/login");
    } catch {
      toast.error("ออกจากระบบไม่สำเร็จ");
      setLoggingOut(false);
    }
  }

  const avatar = stoxyUser.displayName?.charAt(0).toUpperCase() ?? "?";

  const content = (
    <div className="max-w-md mx-auto px-4 py-6 space-y-4">
      {/* Avatar + name */}
      <div className="bg-white rounded-3xl p-6 flex flex-col items-center gap-3 border border-gray-100 shadow-sm">
        <div className="w-20 h-20 rounded-full bg-[#1D4ED8] flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-[#1D4ED8]/20">
          {avatar}
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-gray-900">{stoxyUser.displayName}</h2>
          <span className={cn("text-xs px-2.5 py-1 rounded-full font-semibold mt-1 inline-block",
            ROLE_COLOR[stoxyUser.role] ?? "bg-gray-100 text-gray-600")}>
            {ROLE_LABEL[stoxyUser.role] ?? stoxyUser.role}
          </span>
        </div>
      </div>

      {/* Info rows */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {/* Email */}
        <div className="flex items-center gap-3 px-5 py-4">
          <Mail className="w-4 h-4 text-gray-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 mb-0.5">อีเมล</p>
            <p className="text-sm font-medium text-gray-900 truncate">{stoxyUser.email}</p>
          </div>
        </div>

        {/* Nickname (editable) */}
        <div className="flex items-center gap-3 px-5 py-4">
          <SmilePlus className="w-4 h-4 text-gray-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 mb-0.5">ชื่อเล่น</p>
            {editingNickname ? (
              <div className="flex items-center gap-2">
                <input
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveNickname()}
                  autoFocus
                  placeholder="ใส่ชื่อเล่น"
                  className="flex-1 text-sm border border-[#1D4ED8]/30 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                />
                <button onClick={saveNickname} disabled={saving}
                  className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center active:scale-95">
                  <Check className="w-3.5 h-3.5 text-white" />
                </button>
                <button onClick={() => { setEditingNickname(false); setNickname(stoxyUser.nickname ?? ""); }}
                  className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center active:scale-95">
                  <X className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">{stoxyUser.nickname || "ไม่ระบุ"}</p>
                <button onClick={() => { setEditingNickname(true); setNickname(stoxyUser.nickname ?? ""); }}
                  className="p-1.5 rounded-lg hover:bg-gray-50 active:scale-95 transition-all">
                  <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Department (editable) */}
        <div className="flex items-center gap-3 px-5 py-4">
          <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 mb-0.5">แผนก</p>
            {editingDept ? (
              <div className="flex items-center gap-2">
                <input
                  value={dept}
                  onChange={e => setDept(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveDept()}
                  autoFocus
                  className="flex-1 text-sm border border-[#1D4ED8]/30 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                />
                <button onClick={saveDept} disabled={saving}
                  className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center active:scale-95">
                  <Check className="w-3.5 h-3.5 text-white" />
                </button>
                <button onClick={() => { setEditingDept(false); setDept(stoxyUser.department ?? ""); }}
                  className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center active:scale-95">
                  <X className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">{stoxyUser.department || "ไม่ระบุ"}</p>
                <button onClick={() => { setEditingDept(true); setDept(stoxyUser.department ?? ""); }}
                  className="p-1.5 rounded-lg hover:bg-gray-50 active:scale-95 transition-all">
                  <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Role */}
        <div className="flex items-center gap-3 px-5 py-4">
          <Shield className="w-4 h-4 text-gray-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 mb-0.5">สิทธิ์การใช้งาน</p>
            <p className="text-sm font-medium text-gray-900">{ROLE_LABEL[stoxyUser.role] ?? stoxyUser.role}</p>
          </div>
        </div>
      </div>

      {/* Logout */}
      <button onClick={handleLogout} disabled={loggingOut}
        className="w-full flex items-center justify-center gap-2 py-4 bg-white border border-red-100 text-red-500 font-bold rounded-3xl active:scale-[0.98] transition-all shadow-sm hover:bg-red-50 disabled:opacity-50"
      >
        <LogOut className="w-4 h-4" />
        {loggingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
      </button>
    </div>
  );

  // Staff: wrap in MobileHeader only (StaffShell provided by AppShell)
  if (!isAdmin) {
    return (
      <AppShell>
        <MobileHeader title="โปรไฟล์" back />
        {content}
      </AppShell>
    );
  }

  return (
    <AppShell title="โปรไฟล์">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          ← กลับ
        </button>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">โปรไฟล์</h2>
      </div>
      {content}
    </AppShell>
  );
}
