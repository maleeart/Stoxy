"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeftRight, PackageOpen, Package, History } from "lucide-react";
import { cn } from "@/lib/utils";

interface StaffShellProps {
  children: React.ReactNode;
}

const navItems = [
  { label: "ยืม-คืน", icon: ArrowLeftRight, href: "/borrow" },
  { label: "เบิก", icon: PackageOpen, href: "/requisition" },
  { label: "คลัง", icon: Package, href: "/inventory" },
  { label: "ประวัติ", icon: History, href: "/movements" },
];

export function StaffShell({ children }: StaffShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex flex-col h-[100dvh] bg-[#F8FAFC] overflow-hidden">
      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 safe-area-bottom">
        <div className="flex">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-3 transition-colors",
                  active ? "text-[#1D4ED8]" : "text-gray-400"
                )}
              >
                <item.icon className={cn("w-6 h-6", active && "stroke-[2.5]")} />
                <span className="text-[10px] font-semibold tracking-wide">{item.label}</span>
                {active && (
                  <span className="absolute bottom-0 w-8 h-0.5 bg-[#1D4ED8] rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
