"use client";

import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, PackageOpen, Package, History, Home, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeBorrows } from "@/hooks/useRealtimeBorrows";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRequisitions } from "@/services/requisition.service";

interface StaffShellProps {
  children: React.ReactNode;
}

const STAFF_LEFT = [
  { label: "ยืม-คืน", icon: ArrowLeftRight, href: "/borrow", badgeKey: "borrow" as const },
  { label: "เบิก", icon: PackageOpen, href: "/requisition", badgeKey: "req" as const },
];
const STAFF_RIGHT = [
  { label: "คลัง", icon: Package, href: "/inventory" },
  { label: "ประวัติ", icon: History, href: "/history" },
];
const VIEWER_LEFT = [{ label: "คลัง", icon: Package, href: "/inventory" }];
const VIEWER_RIGHT = [{ label: "ประวัติ", icon: History, href: "/history" }];
const GUEST_LEFT = [{ label: "ยืม-คืน", icon: ArrowLeftRight, href: "/borrow" }];

export function StaffShell({ children }: StaffShellProps) {
  const pathname = usePathname();
  const { stoxyUser } = useAuth();
  const role = stoxyUser?.role as string;
  const uid = stoxyUser?.uid ?? "";
  const isGuest = role === "guest";
  const isViewer = role === "viewer";

  const qc = useQueryClient();
  const touchStartY = useRef(0);
  const [pulling, setPulling] = useState(false);
  const [pullY, setPullY] = useState(0);
  const mainRef = useRef<HTMLElement>(null);

  function onTouchStart(e: React.TouchEvent) {
    if (mainRef.current && mainRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!mainRef.current || mainRef.current.scrollTop > 0) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0) { setPulling(true); setPullY(Math.min(dy * 0.4, 60)); }
  }
  function onTouchEnd() {
    if (pullY >= 50) { qc.invalidateQueries(); }
    setPulling(false); setPullY(0);
  }

  const { allRecords } = useRealtimeBorrows();
  const { data: reqs = [] } = useQuery({
    queryKey: ["requisitions"],
    queryFn: getRequisitions,
    staleTime: 1000 * 60,
  });

  const myPendingBorrow = allRecords.filter(
    (b) => b.borrowerId === uid && b.status === "pending_approval"
  ).length;
  const myPendingReq = reqs.filter(
    (r) => r.requesterId === uid && r.status === "pending"
  ).length;

  const badges: Record<string, number> = { borrow: myPendingBorrow, req: myPendingReq };

  const sideItems = isGuest ? GUEST_LEFT : isViewer ? VIEWER_LEFT : STAFF_LEFT;
  const sideItemsRight = isGuest ? [] : isViewer ? VIEWER_RIGHT : STAFF_RIGHT;

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  const homeActive = pathname === "/dashboard";

  if (isGuest) {
    return (
      <div className="flex flex-col h-[100dvh] bg-[#F8FAFC] dark:bg-gray-900">
        <main className="flex-1 overflow-y-auto min-h-0">{children}</main>
      </div>
    );
  }

  function NavItem({ item, active }: { item: { label: string; icon: React.ElementType; href: string; badgeKey?: "borrow" | "req" }, active: boolean }) {
    const badge = item.badgeKey ? badges[item.badgeKey] : 0;
    return (
      <Link
        href={item.href}
        prefetch
        className="flex-1 flex flex-col items-center justify-center gap-1 h-full relative"
      >
        <div className={cn(
          "relative w-10 h-7 rounded-full flex items-center justify-center transition-all",
          active ? "bg-blue-100 dark:bg-blue-900/50" : ""
        )}>
          <item.icon className={cn(
            "w-5 h-5 transition-all",
            active ? "text-[#1D4ED8] stroke-[2.5]" : "text-gray-400 dark:text-gray-500"
          )} />
          {badge > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
              {badge > 9 ? "9+" : badge}
            </span>
          )}
        </div>
        <span className={cn(
          "text-[10px] font-semibold tracking-wide transition-colors",
          active ? "text-[#1D4ED8]" : "text-gray-400 dark:text-gray-500"
        )}>{item.label}</span>
        {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-[#1D4ED8]" />}
      </Link>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-[#F8FAFC] dark:bg-gray-900">
      {/* Pull-to-refresh indicator */}
      <div className={cn(
        "flex items-center justify-center overflow-hidden transition-all duration-200",
        pullY > 0 ? "bg-blue-50 dark:bg-blue-950/30" : ""
      )} style={{ height: pullY }}>
        <RefreshCw className={cn("w-4 h-4 text-[#1D4ED8]", pullY >= 50 ? "animate-spin" : "")} />
      </div>
      <main
        ref={mainRef}
        className="flex-1 overflow-y-auto min-h-0"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >{children}</main>

      <nav className="shrink-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 safe-area-bottom z-50">
        {/* subtle top gradient accent */}
        <div className="h-px bg-gradient-to-r from-transparent via-blue-200/60 dark:via-blue-500/20 to-transparent" />
        <div className="flex items-end h-16">
          {sideItems.map((item) => (
            <NavItem key={item.href} item={item} active={isActive(item.href)} />
          ))}

          {/* Center Home FAB */}
          <Link href="/dashboard" prefetch className="flex flex-col items-center justify-center gap-1 px-4 mb-2 shrink-0">
            <div className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95",
              "bg-gradient-to-br from-[#1D4ED8] to-blue-400",
              homeActive
                ? "shadow-lg shadow-[#1D4ED8]/50"
                : "shadow-md shadow-[#1D4ED8]/30"
            )}>
              <Home className={cn("w-6 h-6 text-white", homeActive && "stroke-[2.5]")} />
            </div>
            <span className={cn(
              "text-[10px] font-semibold tracking-wide -mt-0.5",
              homeActive ? "text-[#1D4ED8]" : "text-gray-400 dark:text-gray-500"
            )}>หน้าหลัก</span>
          </Link>

          {sideItemsRight.map((item) => (
            <NavItem key={item.href} item={{ ...item, badgeKey: undefined }} active={isActive(item.href)} />
          ))}
        </div>
      </nav>
    </div>
  );
}
