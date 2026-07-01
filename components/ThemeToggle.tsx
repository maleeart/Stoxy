"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title="สลับธีม"
      className={cn(
        "w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95",
        "hover:bg-gray-100 dark:hover:bg-gray-700",
        className
      )}
    >
      <Sun className="w-5 h-5 text-gray-500 dark:hidden" />
      <Moon className="w-5 h-5 hidden dark:block dark:text-gray-400" />
    </button>
  );
}
