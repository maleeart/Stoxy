"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeftRight, PackageOpen, Package, History, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface StaffShellProps {
  children: React.ReactNode;
}

const STAFF_LEFT = [
  { label: "ยืม-คืน", icon: ArrowLeftRight, href: "/borrow" },
  { label: "เบิก", icon: PackageOpen, href: "/requisition" },
];
const STAFF_RIGHT = [
  { label: "คลัง", icon: Package, href: "/inventory" },
  { label: "ประวัติ", icon: History, href: "/history" },
];

const VIEWER_LEFT = [
  { label: "คลัง", icon: Package, href: "/inventory" },
];
const VIEWER_RIGHT = [
  { label: "ประวัติ", icon: History, href: "/history" },
];

const GUEST_LEFT = [
  { label: "ยืม-คืน", icon: ArrowLeftRight, href: "/borrow" },
];
const GUEST_RIGHT: typeof STAFF_RIGHT = [];

export function StaffShell({ children }: StaffShellProps) {
  const pathname = usePathname();
  const { stoxyUser } = useAuth();
  const role = stoxyUser?.role as string;
  const isGuest = role === "guest";
  const isViewer = role === "viewer";

  const sideItems = isGuest ? GUEST_LEFT : isViewer ? VIEWER_LEFT : STAFF_LEFT;
  const sideItemsRight = isGuest ? GUEST_RIGHT : isViewer ? VIEWER_RIGHT : STAFF_RIGHT;

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

  return (
    <div className="flex flex-col h-[100dvh] bg-[#F8FAFC] dark:bg-gray-900">
      <main className="flex-1 overflow-y-auto min-h-0">{children}</main>

      <nav className="shrink-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 safe-area-bottom z-50">
        <div className="flex items-end h-16">
          {sideItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 h-full transition-colors",
                  active ? "text-[#1D4ED8]" : "text-gray-400 dark:text-gray-500"
                )}
              >
                <item.icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
                <span className="text-[10px] font-semibold tracking-wide">{item.label}</span>
              </Link>
            );
          })}

          {/* Center Home */}
          <Link href="/dashboard" prefetch className="flex flex-col items-center justify-center gap-1 px-4 mb-2">
            <div className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95",
              "bg-[#1D4ED8]",
              homeActive ? "shadow-[#1D4ED8]/40" : "shadow-[#1D4ED8]/30"
            )}>
              <Home className={cn("w-6 h-6 text-white", homeActive && "stroke-[2.5]")} />
            </div>
            <span className={cn(
              "text-[10px] font-semibold tracking-wide -mt-0.5",
              homeActive ? "text-[#1D4ED8]" : "text-gray-400 dark:text-gray-500"
            )}>หน้าหลัก</span>
          </Link>

          {sideItemsRight.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 h-full transition-colors",
                  active ? "text-[#1D4ED8]" : "text-gray-400 dark:text-gray-500"
                )}
              >
                <item.icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
                <span className="text-[10px] font-semibold tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
