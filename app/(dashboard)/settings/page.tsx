"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <AppShell title="ตั้งค่า">
      <div className="text-center py-20">
        <Settings className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">การตั้งค่าระบบ</p>
        <p className="text-sm text-gray-400 mt-1">อยู่ระหว่างพัฒนา</p>
      </div>
    </AppShell>
  );
}
