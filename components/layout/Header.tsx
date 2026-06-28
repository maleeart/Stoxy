"use client";

import { Bell, Search, Sun, Moon, Menu } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const { stoxyUser } = useAuth();
  const [dark, setDark] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const router = useRouter();

  function toggleDark() {
    setDark((d) => !d);
    document.documentElement.classList.toggle("dark");
  }

  return (
    <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center px-4 gap-3 shrink-0 z-40">
      {/* Mobile menu */}
      <button
        onClick={onMenuClick}
        className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>

      {/* Title */}
      {title && (
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 hidden md:block">
          {title}
        </h1>
      )}

      {/* Search */}
      <div
        className={cn(
          "flex-1 max-w-md transition-all duration-200",
          searchOpen ? "max-w-lg" : "max-w-xs"
        )}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="ค้นหาอุปกรณ์ รหัส หรือซีเรียล..."
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setSearchOpen(false)}
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1">
        {/* Dark mode */}
        <button
          onClick={toggleDark}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {dark ? (
            <Sun className="w-4 h-4 text-yellow-500" />
          ) : (
            <Moon className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {/* Notifications */}
        <button
          onClick={() => router.push("/notifications")}
          className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Bell className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-[#0d2137] flex items-center justify-center ml-1 cursor-pointer">
          <span className="text-xs font-bold text-yellow-400">
            {stoxyUser?.displayName?.charAt(0)?.toUpperCase() ?? "S"}
          </span>
        </div>
      </div>
    </header>
  );
}
