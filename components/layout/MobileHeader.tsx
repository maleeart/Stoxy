"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface MobileHeaderProps {
  title: string;
  back?: boolean;
  actions?: ReactNode;
  className?: string;
}

export function MobileHeader({ title, back, actions, className }: MobileHeaderProps) {
  const router = useRouter();

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 bg-white border-b border-gray-100 sticky top-0 z-30 safe-area-top",
      className
    )} style={{ minHeight: "56px" }}>
      {back ? (
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all shrink-0"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
      ) : (
        <div className="w-9 shrink-0" />
      )}

      <h1 className="flex-1 text-base font-bold text-gray-900 truncate">{title}</h1>

      {actions ? (
        <div className="flex items-center gap-1 shrink-0">{actions}</div>
      ) : (
        <div className="w-9 shrink-0" />
      )}
    </div>
  );
}
