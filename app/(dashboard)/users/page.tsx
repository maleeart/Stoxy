"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { getAllUsers, updateUserRole } from "@/services/auth.service";
import { useAuth } from "@/hooks/useAuth";
import { Users, Shield } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import type { UserRole } from "@/types";

const roles: { value: UserRole; label: string; color: string }[] = [
  { value: "admin",      label: "Admin",         color: "bg-red-100 text-red-700" },
  { value: "manager",    label: "ผู้จัดการ",     color: "bg-purple-100 text-purple-700" },
  { value: "supervisor", label: "ผู้บริหาร",     color: "bg-indigo-100 text-indigo-700" },
  { value: "staff",      label: "ช่าง",          color: "bg-blue-100 text-blue-700" },
  { value: "viewer",     label: "ผู้ดูข้อมูล",  color: "bg-gray-100 text-gray-700" },
];

export default function UsersPage() {
  const { stoxyUser } = useAuth();
  const qc = useQueryClient();
  const isAdmin = stoxyUser?.role === "admin";

  if (stoxyUser?.role === "supervisor") {
    return <AppShell title="ผู้ใช้งาน"><div className="text-center py-24 text-gray-400">ไม่มีสิทธิ์เข้าถึงหน้านี้</div></AppShell>;
  }

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: getAllUsers,
  });

  const roleMut = useMutation({
    mutationFn: ({ uid, role }: { uid: string; role: UserRole }) => updateUserRole(uid, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("อัพเดทสิทธิ์สำเร็จ");
    },
    onError: () => toast.error("เกิดข้อผิดพลาด"),
  });

  return (
    <AppShell title="ผู้ใช้งาน">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">ผู้ใช้งาน</h2>
        <p className="text-sm text-gray-500">{users.length} บัญชี</p>
      </div>

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
            const roleCfg = roles.find((r) => r.value === user.role) ?? roles[2];
            const isSelf = user.uid === stoxyUser?.uid;
            return (
              <motion.div
                key={user.uid}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1D4ED8] flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 dark:text-white">{user.displayName}</p>
                        {isSelf && <span className="text-xs text-gray-400">(คุณ)</span>}
                      </div>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isAdmin && !isSelf ? (
                      <select
                        value={user.role}
                        onChange={(e) => roleMut.mutate({ uid: user.uid, role: e.target.value as UserRole })}
                        disabled={roleMut.isPending}
                        className="text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      >
                        {roles.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleCfg.color}`}>
                        {roleCfg.label}
                      </span>
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
    </AppShell>
  );
}
