"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { useAuth } from "@/hooks/useAuth";
import { logout, updateStoxyUser } from "@/services/auth.service";
import { LogOut, Building2, Shield, Mail, SmilePlus, Edit2, Check, X, User, Briefcase, Hash, Wrench } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TECHNICIAN_TEAMS } from "@/types";

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
  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager" || stoxyUser?.role === "supervisor";

  const [editingDept, setEditingDept] = useState(false);
  const [dept, setDept] = useState(stoxyUser?.department ?? "");
  const [editingNickname, setEditingNickname] = useState(false);
  const [nickname, setNickname] = useState(stoxyUser?.nickname ?? "");
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(stoxyUser?.displayName ?? "");
  const [editingEmpId, setEditingEmpId] = useState(false);
  const [empId, setEmpId] = useState(stoxyUser?.employeeId ?? "");
  const [editingTeam, setEditingTeam] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string>(stoxyUser?.technicianTeam ?? "");
  const [customTeam, setCustomTeam] = useState("");
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!editingDept) setDept(stoxyUser?.department ?? "");
  }, [stoxyUser?.department, editingDept]);

  useEffect(() => {
    if (!editingNickname) setNickname(stoxyUser?.nickname ?? "");
  }, [stoxyUser?.nickname, editingNickname]);

  useEffect(() => {
    if (!editingTeam) {
      const current = stoxyUser?.technicianTeam ?? "";
      if (TECHNICIAN_TEAMS.includes(current as any)) {
        setSelectedTeam(current);
        setCustomTeam("");
      } else if (current) {
        setSelectedTeam("อื่นๆ");
        setCustomTeam(current);
      } else {
        setSelectedTeam("");
        setCustomTeam("");
      }
    }
  }, [stoxyUser?.technicianTeam, editingTeam]);

  if (loading) return null;
  if (!stoxyUser) { router.replace("/login"); return null; }

  async function saveDisplayName() {
    if (!displayName.trim()) { toast.error("กรุณากรอกชื่อ-สกุล"); return; }
    setSaving(true);
    try {
      await updateStoxyUser(stoxyUser!.uid, { displayName: displayName.trim() });
      await refreshUser();
      toast.success("บันทึกชื่อ-สกุลแล้ว");
      setEditingName(false);
    } catch { toast.error("เกิดข้อผิดพลาด"); } finally { setSaving(false); }
  }

  async function saveEmpId() {
    setSaving(true);
    try {
      await updateStoxyUser(stoxyUser!.uid, { employeeId: empId.trim() || undefined });
      await refreshUser();
      toast.success("บันทึกรหัสพนักงานแล้ว");
      setEditingEmpId(false);
    } catch { toast.error("เกิดข้อผิดพลาด"); } finally { setSaving(false); }
  }

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

  async function saveTeam() {
    setSaving(true);
    try {
      let finalVal: string | undefined = undefined;
      if (selectedTeam === "อื่นๆ") {
        finalVal = customTeam.trim() || undefined;
      } else if (selectedTeam) {
        finalVal = selectedTeam;
      }
      await updateStoxyUser(stoxyUser!.uid, { technicianTeam: finalVal });
      await refreshUser();
      toast.success("บันทึกข้อมูลทีมช่างเรียบร้อยแล้ว");
      setEditingTeam(false);
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
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 flex flex-col items-center gap-3 border border-gray-100 dark:border-gray-700 shadow-sm">
        {stoxyUser.photoURL ? (
          <img src={stoxyUser.photoURL} referrerPolicy="no-referrer" alt="" className="w-20 h-20 rounded-full object-cover shadow-lg shadow-black/20" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-[#1D4ED8] flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-[#1D4ED8]/20">
            {avatar}
          </div>
        )}
        <div className="text-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{stoxyUser.displayName}</h2>
          <span className={cn("text-xs px-2.5 py-1 rounded-full font-semibold mt-1 inline-block",
            ROLE_COLOR[stoxyUser.role] ?? "bg-gray-100 text-gray-600")}>
            {ROLE_LABEL[stoxyUser.role] ?? stoxyUser.role}
          </span>
        </div>
      </div>

      {/* Info rows */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm divide-y divide-gray-50 dark:divide-gray-700">
        {/* ชื่อ-สกุล (editable) */}
        <div className="flex items-center gap-3 px-5 py-4">
          <User className="w-4 h-4 text-gray-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">ชื่อ-สกุล</p>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveDisplayName()} autoFocus
                  className="flex-1 text-sm border border-[#1D4ED8]/30 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20" />
                <button onClick={saveDisplayName} disabled={saving} className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center"><Check className="w-3.5 h-3.5 text-white" /></button>
                <button onClick={() => { setEditingName(false); setDisplayName(stoxyUser.displayName ?? ""); }} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center"><X className="w-3.5 h-3.5 text-gray-500" /></button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{stoxyUser.displayName || "ไม่ระบุ"}</p>
                <button onClick={() => { setEditingName(true); setDisplayName(stoxyUser.displayName ?? ""); }} className="p-1.5 rounded-lg hover:bg-gray-50 transition-all"><Edit2 className="w-3.5 h-3.5 text-gray-400" /></button>
              </div>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="flex items-center gap-3 px-5 py-4">
          <Mail className="w-4 h-4 text-gray-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">อีเมล</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate">{stoxyUser.email}</p>
          </div>
        </div>

        {/* Nickname (editable) */}
        <div className="flex items-center gap-3 px-5 py-4">
          <SmilePlus className="w-4 h-4 text-gray-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">ชื่อเล่น</p>
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
                <p className="text-sm font-medium text-gray-900 dark:text-white">{stoxyUser.nickname || "ไม่ระบุ"}</p>
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
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">แผนก</p>
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
                <p className="text-sm font-medium text-gray-900 dark:text-white">{stoxyUser.department || "ไม่ระบุ"}</p>
                <button onClick={() => { setEditingDept(true); setDept(stoxyUser.department ?? ""); }}
                  className="p-1.5 rounded-lg hover:bg-gray-50 active:scale-95 transition-all">
                  <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ทีมช่าง / ประเภทงาน (editable) */}
        <div className="flex items-start gap-3 px-5 py-4">
          <Wrench className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">ทีมช่าง / ประเภทงาน</p>
            {editingTeam ? (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-1.5">
                  {TECHNICIAN_TEAMS.map((tm) => (
                    <button
                      key={tm}
                      type="button"
                      onClick={() => {
                        setSelectedTeam(tm);
                        setCustomTeam("");
                      }}
                      className={cn(
                        "px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all text-left truncate",
                        selectedTeam === tm
                          ? "bg-[#1D4ED8] text-white border-[#1D4ED8] shadow-xs"
                          : "bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-[#1D4ED8]/40"
                      )}
                    >
                      {tm}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedTeam("อื่นๆ")}
                    className={cn(
                      "px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all text-left truncate",
                      selectedTeam === "อื่นๆ"
                        ? "bg-[#1D4ED8] text-white border-[#1D4ED8] shadow-xs"
                        : "bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-[#1D4ED8]/40"
                    )}
                  >
                    อื่นๆ (ระบุเอง)
                  </button>
                </div>

                {selectedTeam === "อื่นๆ" && (
                  <input
                    value={customTeam}
                    onChange={(e) => setCustomTeam(e.target.value)}
                    placeholder="กรอกชื่อทีม เช่น ทีมช่างอาคาร"
                    autoFocus
                    className="w-full text-xs border border-[#1D4ED8]/30 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={saveTeam}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" /> บันทึก
                  </button>
                  <button
                    onClick={() => {
                      setEditingTeam(false);
                      const current = stoxyUser.technicianTeam ?? "";
                      if (TECHNICIAN_TEAMS.includes(current as any)) {
                        setSelectedTeam(current);
                        setCustomTeam("");
                      } else if (current) {
                        setSelectedTeam("อื่นๆ");
                        setCustomTeam(current);
                      } else {
                        setSelectedTeam("");
                        setCustomTeam("");
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all"
                  >
                    <X className="w-3.5 h-3.5" /> ยกเลิก
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {stoxyUser.technicianTeam ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#1D4ED8] dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                        ⚡ {stoxyUser.technicianTeam}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">ยังไม่ได้ระบุทีม</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setEditingTeam(true)}
                  className="p-1.5 rounded-lg hover:bg-gray-50 active:scale-95 transition-all"
                  title="แก้ไขทีมช่าง"
                >
                  <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ประเภท (editable toggle) */}
        <div className="flex items-center gap-3 px-5 py-4">
          <Briefcase className="w-4 h-4 text-gray-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">ประเภท</p>
            <div className="flex gap-2">
              {(["employee", "contractor"] as const).map((t) => (
                <button key={t}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      await updateStoxyUser(stoxyUser!.uid, { employeeType: t });
                      await refreshUser();
                      toast.success("บันทึกประเภทแล้ว");
                    } catch { toast.error("เกิดข้อผิดพลาด"); } finally { setSaving(false); }
                  }}
                  disabled={saving}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold border transition-all active:scale-95",
                    stoxyUser.employeeType === t
                      ? "bg-[#1D4ED8] text-white border-[#1D4ED8]"
                      : "bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-[#1D4ED8]/40"
                  )}
                >
                  {t === "employee" ? "พนักงาน" : "ลูกจ้าง"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* รหัสพนักงาน (editable) */}
        <div className="flex items-center gap-3 px-5 py-4">
          <Hash className="w-4 h-4 text-gray-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">รหัสพนักงาน</p>
            {editingEmpId ? (
              <div className="flex items-center gap-2">
                <input value={empId} onChange={e => setEmpId(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveEmpId()} autoFocus placeholder="เช่น 123456"
                  className="flex-1 text-sm border border-[#1D4ED8]/30 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20" />
                <button onClick={saveEmpId} disabled={saving} className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center"><Check className="w-3.5 h-3.5 text-white" /></button>
                <button onClick={() => { setEditingEmpId(false); setEmpId(stoxyUser.employeeId ?? ""); }} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center"><X className="w-3.5 h-3.5 text-gray-500" /></button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{stoxyUser.employeeId || "ไม่ระบุ"}</p>
                <button onClick={() => { setEditingEmpId(true); setEmpId(stoxyUser.employeeId ?? ""); }} className="p-1.5 rounded-lg hover:bg-gray-50 transition-all"><Edit2 className="w-3.5 h-3.5 text-gray-400" /></button>
              </div>
            )}
          </div>
        </div>

        {/* Role */}
        <div className="flex items-center gap-3 px-5 py-4">
          <Shield className="w-4 h-4 text-gray-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">สิทธิ์การใช้งาน</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{ROLE_LABEL[stoxyUser.role] ?? stoxyUser.role}</p>
          </div>
        </div>
      </div>

      {/* Logout */}
      <button onClick={handleLogout} disabled={loggingOut}
        className="w-full flex items-center justify-center gap-2 py-4 bg-white dark:bg-gray-800 border border-red-100 dark:border-red-900/40 text-red-500 font-bold rounded-3xl active:scale-[0.98] transition-all shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
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
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          ← กลับ
        </button>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">โปรไฟล์</h2>
      </div>
      {content}
    </AppShell>
  );
}
