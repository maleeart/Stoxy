// ============================================================
// STOXY - Core TypeScript Types
// ============================================================

import { Timestamp } from "firebase/firestore";

// ── User & Auth ──────────────────────────────────────────────
export type UserRole = "admin" | "manager" | "staff" | "viewer";

export interface StoxyUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  department: string;
  employeeId?: string;
  phone?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── Category ─────────────────────────────────────────────────
export interface Category {
  id: string;
  name: string;
  nameEn?: string;
  icon?: string;
  color?: string;
  parentId?: string;
  description?: string;
  createdAt: Timestamp;
}

// ── Location ─────────────────────────────────────────────────
export interface Location {
  id: string;
  name: string;
  code: string;
  description?: string;
  building?: string;
  floor?: string;
  zone?: string;
}

// ── Item Status ───────────────────────────────────────────────
export type ItemStatus =
  | "available"
  | "borrowed"
  | "under_repair"
  | "calibrating"
  | "disposed"
  | "lost";

export type ItemCondition = "excellent" | "good" | "fair" | "poor" | "broken";

// ── Inventory Item ────────────────────────────────────────────
export interface InventoryItem {
  id: string;
  // Identification
  code: string; // e.g. ELEC-001
  name: string;
  nameEn?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  qrCode?: string;
  barcode?: string;
  // Classification
  categoryId: string;
  categoryName?: string;
  tags?: string[];
  // Location
  locationId: string;
  locationName?: string;
  // Stock
  quantity: number;
  quantityAvailable: number;
  quantityBorrowed: number;
  quantityUnderRepair: number;
  minStockLevel: number;
  // Status
  status: ItemStatus;
  condition: ItemCondition;
  // Purchase
  purchaseDate?: Timestamp;
  purchasePrice?: number;
  supplier?: string;
  warranty?: {
    expiryDate: Timestamp;
    provider?: string;
    notes?: string;
  };
  // Specifications
  specifications?: Record<string, string>;
  // Media
  images?: string[]; // Firebase Storage URLs
  attachments?: Attachment[];
  // Calibration
  requiresCalibration: boolean;
  calibration?: {
    lastDate?: Timestamp;
    nextDate?: Timestamp;
    interval?: number; // days
    certificateUrl?: string;
  };
  // Maintenance
  requiresMaintenance: boolean;
  maintenance?: {
    lastDate?: Timestamp;
    nextDate?: Timestamp;
    interval?: number; // days
  };
  // Meta
  notes?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── Attachment ────────────────────────────────────────────────
export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Timestamp;
}

// ── Borrow / Return ───────────────────────────────────────────
export type BorrowStatus =
  | "pending_approval"
  | "approved"
  | "rejected"
  | "borrowed"
  | "return_pending"
  | "returned"
  | "overdue"
  | "lost";

export interface BorrowRecord {
  id: string;
  // Item
  itemId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  // Borrower
  borrowerId: string;
  borrowerName: string;
  borrowerDepartment: string;
  borrowerPhone?: string;
  // Purpose
  purpose: string;
  projectCode?: string;
  // Dates
  borrowDate: Timestamp;
  expectedReturnDate: Timestamp;
  actualReturnDate?: Timestamp;
  // Approval
  status: BorrowStatus;
  approvedBy?: string;
  approvedAt?: Timestamp;
  rejectionReason?: string;
  // Photos
  borrowPhotos?: string[];
  // Return condition
  returnCondition?: ItemCondition;
  returnNotes?: string;
  returnPhotos?: string[];
  // Documents
  signatureUrl?: string;
  pdfUrl?: string;
  // Meta
  notes?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── Stock Movement ────────────────────────────────────────────
export type MovementType =
  | "borrow"
  | "return"
  | "adjustment_in"
  | "adjustment_out"
  | "transfer"
  | "disposal"
  | "purchase"
  | "maintenance_out"
  | "maintenance_in"
  | "lost";

export interface StockMovement {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  type: MovementType;
  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;
  referenceId?: string; // borrowId, adjustmentId etc.
  referenceType?: string;
  reason?: string;
  performedBy: string;
  performedByName: string;
  createdAt: Timestamp;
}

// ── Stock Adjustment ──────────────────────────────────────────
export type AdjustmentType = "addition" | "reduction" | "write_off" | "transfer";

export interface StockAdjustment {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  type: AdjustmentType;
  quantityBefore: number;
  quantityAdjusted: number;
  quantityAfter: number;
  reason: string;
  attachments?: Attachment[];
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  approvedAt?: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
}

// ── Maintenance ───────────────────────────────────────────────
export type MaintenanceType = "preventive" | "corrective" | "inspection";
export type MaintenanceStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface MaintenanceRecord {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  scheduledDate: Timestamp;
  startDate?: Timestamp;
  completedDate?: Timestamp;
  technician?: string;
  description: string;
  workPerformed?: string;
  cost?: number;
  parts?: string[];
  photos?: string[];
  nextScheduledDate?: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── Calibration ───────────────────────────────────────────────
export type CalibrationStatus = "scheduled" | "in_progress" | "completed" | "overdue";

export interface CalibrationRecord {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  status: CalibrationStatus;
  scheduledDate: Timestamp;
  completedDate?: Timestamp;
  expiryDate?: Timestamp;
  calibratedBy?: string;
  lab?: string;
  certificateNumber?: string;
  certificateUrl?: string;
  result?: "pass" | "fail" | "conditional";
  notes?: string;
  cost?: number;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ── Audit ─────────────────────────────────────────────────────
export type AuditStatus = "draft" | "in_progress" | "completed" | "cancelled";

export interface AuditSession {
  id: string;
  name: string;
  description?: string;
  status: AuditStatus;
  locationIds: string[];
  categoryIds?: string[];
  assignedUsers: string[];
  startDate: Timestamp;
  endDate?: Timestamp;
  items?: AuditItem[];
  summary?: AuditSummary;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AuditItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  expectedQuantity: number;
  actualQuantity?: number;
  status: "pending" | "scanned" | "mismatch" | "missing";
  scannedBy?: string;
  scannedAt?: Timestamp;
  notes?: string;
}

export interface AuditSummary {
  totalItems: number;
  scannedItems: number;
  matchedItems: number;
  mismatchItems: number;
  missingItems: number;
}

// ── Notification ──────────────────────────────────────────────
export type NotificationType =
  | "low_stock"
  | "overdue_borrow"
  | "calibration_due"
  | "maintenance_due"
  | "approval_required"
  | "approval_result"
  | "return_reminder";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceId?: string;
  referenceType?: string;
  isRead: boolean;
  createdAt: Timestamp;
}

// ── Dashboard ─────────────────────────────────────────────────
export interface DashboardStats {
  totalItems: number;
  totalQuantity: number;
  availableQuantity: number;
  borrowedQuantity: number;
  underRepairQuantity: number;
  lowStockCount: number;
  calibrationDueCount: number;
  maintenanceDueCount: number;
  pendingApprovalsCount: number;
  overdueCount: number;
}

// ── Table / Filter ────────────────────────────────────────────
export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

export interface SortingState {
  id: string;
  desc: boolean;
}

export interface FilterState {
  search?: string;
  categoryId?: string;
  locationId?: string;
  status?: ItemStatus;
  condition?: ItemCondition;
  dateFrom?: Date;
  dateTo?: Date;
}

// ── API Response ──────────────────────────────────────────────
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
