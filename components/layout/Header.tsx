"use client";

import { Menu, RefreshCw, Home } from "lucide-react";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

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
    <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center px-4 gap-3 shrink-0 z-40">
      {/* Mobile menu */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>

      {/* Title */}
      {title && (
        <h1 className="text-base font-semibold text-gray-900 dark:text-white hidden md:block">
          {title}
        </h1>
      )}

      <div className="ml-auto flex items-center gap-1">
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
        <Link href="/profile" className="w-8 h-8 rounded-full bg-[#1D4ED8] flex items-center justify-center ml-1 cursor-pointer hover:opacity-90 transition-opacity">
          <span className="text-xs font-bold text-white">
            {stoxyUser?.displayName?.charAt(0)?.toUpperCase() ?? "S"}
          </span>
        </Link>
      </div>
    </header>
  );
}
