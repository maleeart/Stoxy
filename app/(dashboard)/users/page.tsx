"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Users } from "lucide-react";

export default function UsersPage() {
  return (
    <AppShell title="ผู้ใช้งาน">
      <div className="text-center py-20">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">การจัดการผู้ใช้งาน</p>
        <p className="text-sm text-gray-400 mt-1">อยู่ระหว่างพัฒนา</p>
      </div>
    </AppShell>
  );
}
