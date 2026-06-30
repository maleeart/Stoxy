"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import {
  MapPin, Camera, Tag, RefreshCw, UserCheck, Wrench,
  History, Scale, Hash, Binary,
} from "lucide-react";

const REF_ITEMS = [
  { href: "/settings/locations", icon: <MapPin className="w-4 h-4" />, label: "สถานที่จัดเก็บ", desc: "จัดการรายการสถานที่สำหรับเลือกตอนเพิ่มอุปกรณ์", color: "bg-blue-50 text-blue-500" },
  { href: "/settings/units",     icon: <Scale className="w-4 h-4" />,  label: "หน่วยนับ",        desc: "จัดการหน่วยนับ เช่น อัน ชุด ม้วน สำหรับ dropdown", color: "bg-blue-50 text-blue-500" },
  { href: "/settings/prefixes",  icon: <Hash className="w-4 h-4" />,   label: "รหัสอุปกรณ์",    desc: "แก้ไขรหัสนำหน้าแต่ละหมวดหมู่ เช่น MTR-001", color: "bg-blue-50 text-blue-500" },
];

const ADMIN_TOOLS = [
  { href: "/inventory/add-photos",         icon: <Camera className="w-4 h-4" />,    label: "เพิ่มรูปอุปกรณ์",              desc: "อัปโหลดรูปภาพให้แต่ละรายการในคลัง" },
  { href: "/inventory/set-categories",     icon: <Tag className="w-4 h-4" />,       label: "ตั้งหมวดหมู่รายการ",           desc: "กำหนดหมวดหมู่ใหม่ทีละรายการ" },
  { href: "/inventory/migrate-categories", icon: <RefreshCw className="w-4 h-4" />, label: "Migrate หมวดหมู่",             desc: "อัปเดตหมวดหมู่เก่าให้เป็นโครงสร้างใหม่" },
  { href: "/inventory/migrate-names",      icon: <UserCheck className="w-4 h-4" />, label: "Migrate ชื่อผู้ดำเนินการ",     desc: "แปลง UID เป็น display name ในประวัติ" },
  { href: "/inventory/recode",             icon: <Binary className="w-4 h-4" />,    label: "จัดเรียงรหัสอุปกรณ์ใหม่",     desc: "กำหนด MTR-001, TLS-001 ใหม่ตามหมวดหมู่ปัจจุบัน" },
  { href: "/settings/cleanup",             icon: <History className="w-4 h-4" />,   label: "จัดการและล้างประวัติ",         desc: "ลบประวัติยืม/คืน, เบิก, เคลื่อนไหว, audit ที่ไม่ต้องการ" },
];

function NavCard({ href, icon, label, desc, color = "bg-orange-50 text-orange-500" }: {
  href: string; icon: React.ReactNode; label: string; desc: string; color?: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 group-hover:opacity-80 transition-opacity ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        <p className="text-xs text-gray-400 truncate">{desc}</p>
      </div>
      <span className="text-gray-300 text-xs shrink-0">→</span>
    </Link>
  );
}

export default function SettingsPage() {
  const { stoxyUser } = useAuth();
  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager";

  if (stoxyUser?.role === "supervisor") {
    return <AppShell title="ตั้งค่า"><div className="text-center py-24 text-gray-400">ไม่มีสิทธิ์เข้าถึงหน้านี้</div></AppShell>;
  }

  return (
    <AppShell title="ตั้งค่า">
      <div className="max-w-lg space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">ตั้งค่าระบบ</h2>
          <p className="text-sm text-gray-500">จัดการข้อมูลอ้างอิงและเครื่องมือสำหรับผู้ดูแล</p>
        </div>

        {/* Reference data — visible to all roles but editable only by admin */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">ข้อมูลอ้างอิง</h3>
          <div className="space-y-1">
            {REF_ITEMS.map((item) => (
              <NavCard key={item.href} {...item} />
            ))}
          </div>
        </div>

        {/* Admin tools */}
        {isAdmin && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="w-4 h-4 text-orange-500" />
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">เครื่องมือ Admin</h3>
            </div>
            <div className="space-y-1">
              {ADMIN_TOOLS.map((tool) => (
                <NavCard key={tool.href} {...tool} />
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
