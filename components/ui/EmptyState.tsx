"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
  iconColor?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className, iconColor = "text-gray-300 dark:text-gray-600" }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-14 text-center px-4", className)}>
      <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Icon className={cn("w-8 h-8", iconColor)} />
      </div>
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</p>
      {description && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-[200px] leading-relaxed">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-5 py-2 bg-[#1D4ED8] text-white text-xs font-semibold rounded-xl active:scale-95 transition-transform shadow-sm shadow-blue-500/30"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
