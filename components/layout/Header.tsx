"use client";

import { Menu, RefreshCw, Home } from "lucide-react";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GlobalSearch } from "@/components/ui/GlobalSearch";
import { HelpButton } from "@/components/ui/HelpModal";

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const { stoxyUser } = useAuth();
  const [spinning, setSpinning] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const onDashboard = pathname === "/dashboard";
  const qc = useQueryClient();

  function handleRefresh() {
    setSpinning(true);
    qc.invalidateQueries();
    router.refresh();
    setTimeout(() => setSpinning(false), 1000);
  }

  return (
    <header className="h-14 bg-gradient-to-r from-blue-50/70 via-white to-white dark:from-blue-950/25 dark:via-gray-800 dark:to-gray-800 border-b border-blue-100/60 dark:border-gray-700 flex items-center px-4 gap-3 shrink-0 z-40">
      {/* Mobile menu */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700"
      >
        <Menu className="w-5 h-5 text-blue-600 dark:text-gray-400" />
      </button>

      {/* Title */}
      {title && (
        <h1 className="text-base font-bold bg-gradient-to-r from-[#1D4ED8] to-blue-400 bg-clip-text text-transparent hidden md:block">
          {title}
        </h1>
      )}

      <div className="ml-auto flex items-center gap-2">
        <GlobalSearch />
        <HelpButton className="text-gray-400 hover:text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600" />
        {/* Home */}
        {!onDashboard && (
          <button
            onClick={() => router.push("/dashboard")}
            title="หน้าหลัก"
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Home className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        )}
        {/* Refresh */}
        <button
          onClick={handleRefresh}
          title="รีเฟรชข้อมูล"
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4 text-gray-500 dark:text-gray-400", spinning && "animate-spin")} />
        </button>

        <ThemeToggle />

        {/* Avatar */}
        <Link href="/profile" className="w-8 h-8 rounded-full overflow-hidden ml-1 hover:opacity-90 transition-opacity shrink-0">
          {stoxyUser?.photoURL ? (
            <img src={stoxyUser.photoURL} referrerPolicy="no-referrer" alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#1D4ED8] flex items-center justify-center">
              <span className="text-xs font-bold text-white">{stoxyUser?.displayName?.charAt(0)?.toUpperCase() ?? "S"}</span>
            </div>
          )}
        </Link>
      </div>
    </header>
  );
}
