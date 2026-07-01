"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

interface MobileHeaderProps {
  title: string;
  back?: boolean;
  actions?: ReactNode;
  className?: string;
}

export function MobileHeader({ title, back, actions, className }: MobileHeaderProps) {
  const router = useRouter();
  const { stoxyUser } = useAuth();
  const initial = stoxyUser?.displayName?.charAt(0)?.toUpperCase() ?? "S";

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-30 safe-area-top",
      className
    )} style={{ minHeight: "56px" }}>
      {back ? (
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all shrink-0"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
      ) : (
        <div className="w-9 shrink-0" />
      )}

      <h1 className="flex-1 text-base font-bold text-gray-900 dark:text-white truncate">{title}</h1>

      <div className="flex items-center gap-1 shrink-0">
        {actions}
        <ThemeToggle />
        <Link href="/profile" className="w-8 h-8 rounded-full bg-[#1D4ED8] flex items-center justify-center ml-0.5 hover:opacity-90 transition-opacity shrink-0">
          <span className="text-xs font-bold text-white">{initial}</span>
        </Link>
      </div>
    </div>
  );
}
