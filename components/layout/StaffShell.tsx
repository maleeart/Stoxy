"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeftRight, PackageOpen, Package, History, Home, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useHasActiveAudit } from "@/hooks/useMyAuditSessions";

interface StaffShellProps {
  children: React.ReactNode;
}

const STAFF_LEFT = [
  { label: "ยืม-คืน", icon: ArrowLeftRight, href: "/borrow" },
  { label: "เบิก", icon: PackageOpen, href: "/requisition" },
];
const STAFF_RIGHT = [
  { label: "คลัง", icon: Package, href: "/inventory" },
  { label: "ประวัติ", icon: History, href: "/movements" },
];

// Guest เห็นแค่ยืม-คืน — ซ่อนแถบอื่น
const GUEST_LEFT = [
  { label: "ยืม-คืน", icon: ArrowLeftRight, href: "/borrow" },
];
const GUEST_RIGHT: typeof STAFF_RIGHT = [];

export function StaffShell({ children }: StaffShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { stoxyUser } = useAuth();
  const isGuest = (stoxyUser?.role as string) === "guest";
  const { data: hasActiveAudit = false } = useHasActiveAudit(!isGuest ? stoxyUser?.uid : undefined);

  const auditItem = { label: "ตรวจนับ", icon: ShieldCheck, href: "/audit" };
  const sideItems = isGuest ? GUEST_LEFT : STAFF_LEFT;
  const sideItemsRight = isGuest ? GUEST_RIGHT :
    hasActiveAudit ? [...STAFF_RIGHT, auditItem] : STAFF_RIGHT;

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);

  const homeActive = pathname === "/dashboard";

  return (
    // ใช้ flex column แทน fixed nav — ป้องกัน nav หายเพราะ framer-motion stacking context
    <div className="flex flex-col h-[100dvh] bg-[#F8FAFC]">
      <main className="flex-1 overflow-y-auto min-h-0">
        {children}
      </main>

      <nav className="shrink-0 bg-white border-t border-gray-100 safe-area-bottom z-50">
        <div className="flex items-end h-16">
          {sideItems.map((item) => {
            const active = isActive(item.href);
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 h-full transition-colors",
                  active ? "text-[#1D4ED8]" : "text-gray-400"
                )}
              >
                <item.icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
                <span className="text-[10px] font-semibold tracking-wide">{item.label}</span>
              </button>
            );
          })}

          {/* Center Home */}
          <button
            onClick={() => router.push("/dashboard")}
            className="flex flex-col items-center justify-center gap-1 px-4 mb-2"
          >
            <div className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95",
              "bg-[#1D4ED8]",
              homeActive ? "shadow-[#1D4ED8]/40" : "shadow-[#1D4ED8]/30"
            )}>
              <Home className={cn("w-6 h-6 text-white", homeActive && "stroke-[2.5]")} />
            </div>
            <span className={cn(
              "text-[10px] font-semibold tracking-wide -mt-0.5",
              homeActive ? "text-[#1D4ED8]" : "text-gray-400"
            )}>หน้าหลัก</span>
          </button>

          {sideItemsRight.map((item) => {
            const active = isActive(item.href);
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 h-full transition-colors",
                  active ? "text-[#1D4ED8]" : "text-gray-400"
                )}
              >
                <item.icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
                <span className="text-[10px] font-semibold tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
