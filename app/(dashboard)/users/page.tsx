"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { getAllUsers, updateUserRole, updateStoxyUser } from "@/services/auth.service";
import { getAccessRequests, approveAccessRequest, rejectAccessRequest } from "@/services/accessRequest.service";
import { useAuth } from "@/hooks/useAuth";
import { Users, Shield, Check, X, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import type { UserRole, StoxyUser, EmployeeType } from "@/types";

const roles: { value: UserRole; label: string; color: string }[] = [
  { value: "admin",      label: "Admin",         color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { value: "manager",    label: "ผู้จัดการ",     color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { value: "supervisor", label: "ผู้บริหาร",     color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  { value: "staff",      label: "ช่าง/พนักงาน", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "viewer",     label: "ผู้ดูข้อมูล",  color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
];

function EditUserModal({ user, onClose }: { user: StoxyUser; onClose: () => void }) {
  const qc = useQueryClient();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [nickname, setNickname] = useState(user.nickname ?? "");
  const [employeeType, setEmployeeType] = useState<EmployeeType>(user.employeeType ?? "employee");
  const [employeeId, setEmployeeId] = useState(user.employeeId ?? "");
  const [department, setDepartment] = useState(user.department ?? "");
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!displayName.trim()) { toast.error("กรุณากรอกชื่อ-สกุล"); return; }
    if (!department.trim()) { toast.error("กรุณากรอกหน่วยงาน"); return; }
    if (employeeType === "employee" && !employeeId.trim()) { toast.error("กรุณากรอกรหัสพนักงาน"); return; }
    try {
      setLoading(true);
      await updateStoxyUser(user.uid, {
        displayName: displayName.trim(),
        nickname: nickname.trim() || undefined,
        employeeType,
        employeeId: employeeType === "employee" ? employeeId.trim() : undefined,
        department: department.trim(),
      });
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("บันทึกข้อมูลสำเร็จ");
      onClose();
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[500] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 dark:text-white">แก้ไขข้อมูลผู้ใช้</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* ชื่อ-สกุล */}
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">ชื่อ-สกุล <span className="text-red-500">*</span></label>
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="ชื่อ-สกุล"
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>

        {/* ชื่อเล่น */}
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">ชื่อเล่น</label>
          <input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="ชื่อเล่น"
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>

        {/* ประเภท */}
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 block">ประเภท <span className="text-red-500">*</span></label>
          <div className="flex gap-2">
            {([["employee", "พนักงาน"], ["contractor", "ลูกจ้าง"]] as const).map(([val, label]) => (
              <button key={val} type="button" onClick={() => setEmployeeType(val)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${employeeType === val ? "bg-blue-600 border-blue-600 text-white" : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* รหัสพนักงาน */}
        {employeeType === "employee" && (
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">รหัสพนักงาน <span className="text-red-500">*</span></label>
            <input value={employeeId} onChange={e => setEmployeeId(e.target.value)} placeholder="เช่น 123456"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
        )}

        {/* หน่วยงาน */}
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 block">หน่วยงาน <span className="text-red-500">*</span></label>
          <input value={department} onChange={e => setDepartment(e.target.value)} placeholder="เช่น หบอว-ธ."
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>

        <button onClick={save} disabled={loading}
          className="w-full py-2.5 bg-[#1D4ED8] text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          บันทึก
        </button>
      </motion.div>
    </div>
  );
}

export default function UsersPage() {
  const { stoxyUser } = useAuth();
  const qc = useQueryClient();
  const isAdmin = stoxyUser?.role === "admin";
  const [tab, setTab] = useState<"users" | "requests">("users");
  const [editUser, setEditUser] = useState<StoxyUser | null>(null);

  const { data: users = [], isLoading } = useQuery({ queryKey: ["users"], queryFn: getAllUsers });
  const { data: requests = [] } = useQuery({
    queryKey: ["accessRequests"],
    queryFn: getAccessRequests,
    enabled: isAdmin,
  });

  const pendingCount = requests.filter(r => r.status === "pending").length;

  const roleMut = useMutation({
    mutationFn: ({ uid, role }: { uid: string; role: UserRole }) => updateUserRole(uid, role),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); toast.success("อัพเดทสิทธิ์สำเร็จ"); },
    onError: () => toast.error("เกิดข้อผิดพลาด"),
  });

  const approveMut = useMutation({
    mutationFn: ({ reqId, uid }: { reqId: string; uid: string }) =>
      approveAccessRequest(reqId, uid, stoxyUser!.uid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accessRequests"] });
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("อนุมัติสิทธิ์สำเร็จ");
    },
    onError: () => toast.error("เกิดข้อผิดพลาด"),
  });

  const rejectMut = useMutation({
    mutationFn: (reqId: string) => rejectAccessRequest(reqId, stoxyUser!.uid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accessRequests"] });
      toast.success("ปฏิเสธคำขอแล้ว");
    },
    onError: () => toast.error("เกิดข้อผิดพลาด"),
  });

  if (stoxyUser?.role === "supervisor") {
    return <AppShell title="ผู้ใช้งาน"><div className="text-center py-24 text-gray-400">ไม่มีสิทธิ์เข้าถึงหน้านี้</div></AppShell>;
  }

  return (
    <AppShell title="ผู้ใช้งาน">
      {/* Tabs */}
      {isAdmin && (
        <div className="flex gap-2 mb-5">
          {([["users", "ผู้ใช้งาน", users.length] as const, ["requests", "คำขอสิทธิ์", pendingCount] as const]).map(([key, label, count]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === key ? "bg-[#1D4ED8] text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`min-w-[20px] h-5 rounded-full text-xs font-bold flex items-center justify-center px-1 ${
                  tab === key ? "bg-white/20 text-white" : key === "requests" && count > 0 ? "bg-red-500 text-white" : "bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200"
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Users Tab */}
      {tab === "users" && (
        <>
          <p className="text-sm text-gray-500 mb-3">{users.length} บัญชี</p>
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
              ))
            ) : users.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">ยังไม่มีผู้ใช้งาน</p>
              </div>
            ) : (
              users.map((user, i) => {
                const roleCfg = roles.find(r => r.value === user.role) ?? roles[3];
                const isSelf = user.uid === stoxyUser?.uid;
                return (
                  <motion.div key={user.uid} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-[#1D4ED8] flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {user.displayName?.charAt(0)?.toUpperCase() ?? "?"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-medium text-gray-900 dark:text-white truncate">{user.displayName}</p>
                            {user.nickname && <span className="text-xs text-gray-400">({user.nickname})</span>}
                            {isSelf && <span className="text-xs text-gray-400">· คุณ</span>}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          {user.department && <p className="text-xs text-gray-400 truncate">{user.department}{user.employeeId ? ` · ${user.employeeId}` : ""}</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isAdmin && !isSelf && (
                          <button onClick={() => setEditUser(user)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <Pencil className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        )}
                        {isAdmin && !isSelf ? (
                          <select value={user.role}
                            onChange={e => roleMut.mutate({ uid: user.uid, role: e.target.value as UserRole })}
                            disabled={roleMut.isPending}
                            className="text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                          >
                            {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                        ) : (
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleCfg.color}`}>{roleCfg.label}</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
          {!isAdmin && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-2xl border border-yellow-100 dark:border-yellow-900/50">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-yellow-600" />
                <p className="text-sm text-yellow-700 dark:text-yellow-400">เฉพาะ Admin เท่านั้นที่สามารถเปลี่ยนสิทธิ์ได้</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Access Requests Tab */}
      {tab === "requests" && isAdmin && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
              <Check className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">ไม่มีคำขอสิทธิ์</p>
            </div>
          ) : (
            requests.map((req, i) => (
              <motion.div key={req.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white">{req.displayName}</p>
                    <p className="text-xs text-gray-500">{req.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{req.department}{req.employeeType === "employee" ? " · พนักงาน" : " · ลูกจ้าง"}</p>
                    <span className={`inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      req.status === "pending" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      : req.status === "approved" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}>
                      {req.status === "pending" ? "รอดำเนินการ" : req.status === "approved" ? "อนุมัติแล้ว" : "ปฏิเสธแล้ว"}
                    </span>
                  </div>
                  {req.status === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => approveMut.mutate({ reqId: req.id, uid: req.uid })}
                        disabled={approveMut.isPending}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-xl transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> อนุมัติ
                      </button>
                      <button onClick={() => rejectMut.mutate(req.id)}
                        disabled={rejectMut.isPending}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-600 dark:text-gray-300 hover:text-red-600 text-xs font-bold rounded-xl transition-colors"
                      >
                        <X className="w-3.5 h-3.5" /> ปฏิเสธ
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editUser && <EditUserModal user={editUser} onClose={() => setEditUser(null)} />}
      </AnimatePresence>
    </AppShell>
  );
}
