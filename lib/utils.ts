import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isAfter, isBefore, addDays } from "date-fns";
import { Timestamp } from "firebase/firestore";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Date Utilities ────────────────────────────────────────────
export function toDate(ts: Timestamp | Date | undefined): Date | undefined {
  if (!ts) return undefined;
  if (ts instanceof Date) return ts;
  return ts.toDate();
}

export function formatDate(ts: Timestamp | Date | undefined, fmt = "dd/MM/yyyy"): string {
  const d = toDate(ts);
  if (!d) return "-";
  return format(d, fmt);
}

export function formatDateTime(ts: Timestamp | Date | undefined): string {
  return formatDate(ts, "dd/MM/yyyy HH:mm");
}

export function formatRelative(ts: Timestamp | Date | undefined): string {
  const d = toDate(ts);
  if (!d) return "-";
  return formatDistanceToNow(d, { addSuffix: true });
}

export function isDueSoon(ts: Timestamp | Date | undefined, days = 30): boolean {
  const d = toDate(ts);
  if (!d) return false;
  const threshold = addDays(new Date(), days);
  return isBefore(d, threshold) && isAfter(d, new Date());
}

export function isOverdue(ts: Timestamp | Date | undefined): boolean {
  const d = toDate(ts);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(d);
  due.setHours(0, 0, 0, 0);
  return isBefore(due, today);
}

// ── Number Utilities ──────────────────────────────────────────
export function formatCurrency(amount: number, currency = "THB"): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("th-TH").format(n);
}

// ── String Utilities ──────────────────────────────────────────
const CATEGORY_PREFIX: Record<string, string> = {
  meter: "MTR",
  tools: "TLS",
  safety: "SFT",
  electrical_parts: "ELP",
  cable: "CBL",
  spareparts: "SPR",
  // legacy — kept so old codes still resolve
  electrical: "ELP",
  others: "SPR",
};

export function getCategoryPrefix(categoryId: string): string {
  return CATEGORY_PREFIX[categoryId] ?? "ITEM";
}

export function generateItemCode(categoryId: string, existingCodes: string[]): string {
  const prefix = getCategoryPrefix(categoryId);
  const same = existingCodes.filter((c) => c.startsWith(prefix + "-"));
  const next = same.length + 1;
  return `${prefix}-${next.toString().padStart(4, "0")}`;
}

export function truncate(str: string, length = 50): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// ── File Utilities ────────────────────────────────────────────
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

export function isImageFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext);
}

// ── Status Utilities ──────────────────────────────────────────
export const statusConfig = {
  available: { label: "พร้อมใช้งาน", color: "text-emerald-600", bg: "bg-emerald-50", badge: "bg-emerald-100 text-emerald-700" },
  borrowed: { label: "ถูกยืม", color: "text-blue-600", bg: "bg-blue-50", badge: "bg-blue-100 text-blue-700" },
  under_repair: { label: "ซ่อมแซม", color: "text-orange-600", bg: "bg-orange-50", badge: "bg-orange-100 text-orange-700" },
  calibrating: { label: "สอบเทียบ", color: "text-purple-600", bg: "bg-purple-50", badge: "bg-purple-100 text-purple-700" },
  disposed: { label: "จำหน่ายออก", color: "text-gray-600", bg: "bg-gray-50", badge: "bg-gray-100 text-gray-700" },
  lost: { label: "สูญหาย", color: "text-red-600", bg: "bg-red-50", badge: "bg-red-100 text-red-700" },
} as const;

export const conditionConfig = {
  excellent: { label: "ดีมาก", badge: "bg-emerald-100 text-emerald-700" },
  good: { label: "ดี", badge: "bg-green-100 text-green-700" },
  fair: { label: "พอใช้", badge: "bg-yellow-100 text-yellow-700" },
  poor: { label: "แย่", badge: "bg-orange-100 text-orange-700" },
  broken: { label: "เสีย", badge: "bg-red-100 text-red-700" },
} as const;

export const borrowStatusConfig = {
  pending_approval: { label: "รออนุมัติ", badge: "bg-yellow-100 text-yellow-700" },
  approved: { label: "อนุมัติแล้ว", badge: "bg-blue-100 text-blue-700" },
  rejected: { label: "ปฏิเสธ", badge: "bg-red-100 text-red-700" },
  borrowed: { label: "ยืมอยู่", badge: "bg-indigo-100 text-indigo-700" },
  returned: { label: "คืนแล้ว", badge: "bg-emerald-100 text-emerald-700" },
  overdue: { label: "เกินกำหนด", badge: "bg-red-100 text-red-700" },
  lost: { label: "สูญหาย", badge: "bg-gray-100 text-gray-700" },
} as const;

// ── QR Code ───────────────────────────────────────────────────
export function generateQRData(itemId: string, itemCode: string): string {
  return JSON.stringify({ type: "stoxy_item", id: itemId, code: itemCode });
}

// Which workflow an item belongs to, by category.
// ponytail: mirrors BORROWABLE/WITHDRAWABLE in borrow/requisition pages; anything
// not borrowable is treated as requisition. Consolidate those two if they drift.
const BORROWABLE_CATEGORIES = new Set(["tools", "meter", "safety"]);
export function getItemMode(categoryId: string): "borrow" | "requisition" {
  return BORROWABLE_CATEGORIES.has(categoryId) ? "borrow" : "requisition";
}
