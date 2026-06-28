"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import Link from "next/link";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: "blue" | "yellow" | "green" | "orange" | "red" | "purple" | "gray";
  href?: string;
  trend?: { value: number; label: string };
  className?: string;
  index?: number;
}

const colorMap = {
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    icon: "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400",
    value: "text-blue-700 dark:text-blue-300",
    border: "border-blue-100 dark:border-blue-900",
  },
  yellow: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    icon: "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400",
    value: "text-amber-700 dark:text-amber-300",
    border: "border-amber-100 dark:border-amber-900",
  },
  green: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    icon: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400",
    value: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-100 dark:border-emerald-900",
  },
  orange: {
    bg: "bg-orange-50 dark:bg-orange-950/30",
    icon: "bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400",
    value: "text-orange-700 dark:text-orange-300",
    border: "border-orange-100 dark:border-orange-900",
  },
  red: {
    bg: "bg-red-50 dark:bg-red-950/30",
    icon: "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400",
    value: "text-red-700 dark:text-red-300",
    border: "border-red-100 dark:border-red-900",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950/30",
    icon: "bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400",
    value: "text-purple-700 dark:text-purple-300",
    border: "border-purple-100 dark:border-purple-900",
  },
  gray: {
    bg: "bg-gray-50 dark:bg-gray-900/30",
    icon: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
    value: "text-gray-700 dark:text-gray-300",
    border: "border-gray-100 dark:border-gray-800",
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  color,
  href,
  trend,
  className,
  index = 0,
}: StatCardProps) {
  const colors = colorMap[color];

  const card = (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className={cn(
        "rounded-2xl border p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer",
        colors.bg,
        colors.border,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className={cn("text-3xl font-bold tracking-tight", colors.value)}>
            {typeof value === "number" ? value.toLocaleString("th-TH") : value}
          </p>
          {trend && (
            <p
              className={cn(
                "text-xs font-medium",
                trend.value >= 0 ? "text-emerald-600" : "text-red-500"
              )}
            >
              {trend.value >= 0 ? "+" : ""}
              {trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div className={cn("p-3 rounded-xl", colors.icon)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );

  if (href) return <Link href={href}>{card}</Link>;
  return card;
}
