"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Undo2,
  ClipboardList,
  Bell,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  FileBarChart,
  ScanLine,
  History,
  ShieldCheck,
  ShoppingCart,
  PackageOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/services/auth.service";
import { usePendingCount } from "@/hooks/usePendingCount";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  section?: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  // Main
  { label: "แดชบอร์ด", href: "/dashboard", icon: LayoutDashboard, section: "หลัก" },
  { label: "คลังอุปกรณ์", href: "/inventory", icon: Package, section: "หลัก" },
  { label: "สแกน QR", href: "/scan", icon: ScanLine, section: "หลัก" },
  // Workflow
  { label: "เบิกของ", href: "/requisition", icon: PackageOpen, section: "ดำเนินการ" },
  { label: "ยืม-คืน", href: "/borrow", icon: ArrowLeftRight, section: "ดำเนินการ" },
  { label: "รับคืน", href: "/return", icon: Undo2, section: "ดำเนินการ", adminOnly: true },
  { label: "เติมสต็อก", href: "/adjustment", icon: ClipboardList, section: "ดำเนินการ", adminOnly: true },
  { label: "ต้องสั่งซื้อ", href: "/purchase", icon: ShoppingCart, section: "ดำเนินการ", adminOnly: true },
  { label: "ประวัติ", href: "/movements", icon: History, section: "ดำเนินการ" },
  // System
  { label: "ตรวจนับ", href: "/audit", icon: ShieldCheck, section: "ระบบ", adminOnly: true },
  { label: "รายงาน", href: "/reports", icon: FileBarChart, section: "ระบบ", adminOnly: true },
  { label: "แจ้งเตือน", href: "/notifications", icon: Bell, section: "ระบบ", adminOnly: true },
  { label: "ผู้ใช้งาน", href: "/users", icon: Users, section: "ระบบ", adminOnly: true },
  { label: "ตั้งค่า", href: "/settings", icon: Settings, section: "ระบบ", adminOnly: true },
];

const sections = ["หลัก", "ดำเนินการ", "ระบบ"];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { stoxyUser } = useAuth();
  const router = useRouter();
  const { total: pendingTotal } = usePendingCount();
  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager";
  const [qrPopup, setQrPopup] = useState(false);

  async function handleLogout() {
    try {
      await logout();
      router.push("/login");
    } catch {
      toast.error("ออกจากระบบไม่สำเร็จ");
    }
  }

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-[#0d2137] text-white transition-all duration-300 relative shrink-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <img src="/logo.png" alt="Stoxy" className="w-9 h-9 rounded-xl shrink-0 object-cover" />
        {!collapsed && (
          <div className="flex items-baseline gap-0.5 overflow-hidden">
            <span className="text-xl font-bold tracking-tight text-white">sto</span>
            <span className="text-xl font-bold tracking-tight text-yellow-400">xy</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1 scrollbar-none">
        {sections.map((section) => {
          const items = navItems.filter((i) => i.section === section && (!i.adminOnly || isAdmin));
          return (
            <div key={section}>
              {!collapsed && (
                <p className="px-3 py-1.5 text-xs font-semibold text-white/40 uppercase tracking-widest">
                  {section}
                </p>
              )}
              {items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const isQR = item.href === "/scan";
                const cls = cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative w-full text-left",
                  isActive
                    ? "bg-yellow-400 text-[#0d2137] shadow-lg shadow-yellow-400/20"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                );
                const inner = (
                  <>
                    <item.icon
                      className={cn(
                        "shrink-0 transition-none",
                        collapsed ? "w-5 h-5 mx-auto" : "w-4 h-4",
                        isActive ? "text-[#0d2137]" : ""
                      )}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && item.href === "/notifications" && pendingTotal > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {pendingTotal > 99 ? "99+" : pendingTotal}
                      </span>
                    )}
                    {collapsed && item.href === "/notifications" && pendingTotal > 0 && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
                    )}
                    {collapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
                        {item.label}
                      </div>
                    )}
                  </>
                );
                return isQR ? (
                  <button key={item.href} title={collapsed ? item.label : undefined} onClick={() => setQrPopup(true)} className={cls}>
                    {inner}
                  </button>
                ) : (
                  <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined} className={cls}>
                    {inner}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-white/10 p-3 space-y-1">
        {!collapsed && stoxyUser && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl">
            <div className="w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center text-[#0d2137] font-bold text-sm shrink-0">
              {stoxyUser.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">
                {stoxyUser.displayName}
              </p>
              <p className="text-xs text-white/50 truncate">{stoxyUser.department}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white transition-all",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && "ออกจากระบบ"}
        </button>
      </div>

      {/* QR popup */}
      {qrPopup && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={() => setQrPopup(false)}>
          <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-3 shadow-2xl mx-4" onClick={(e) => e.stopPropagation()}>
            <ScanLine className="w-12 h-12 text-[#0d2137]" />
            <p className="text-lg font-bold text-[#0d2137]">สแกน QR Code</p>
            <p className="text-sm text-gray-500 text-center">อยู่ระหว่างพัฒนา<br/>จะเปิดให้ใช้งานเร็วๆ นี้</p>
            <button onClick={() => setQrPopup(false)} className="mt-2 px-6 py-2 bg-[#0d2137] text-white rounded-xl text-sm font-medium hover:opacity-90">
              ตกลง
            </button>
          </div>
        </div>
      )}

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-8 w-6 h-6 bg-[#0d2137] border border-white/20 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors z-50"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-white/60" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-white/60" />
        )}
      </button>
    </aside>
  );
}
