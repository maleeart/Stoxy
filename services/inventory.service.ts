import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  onSnapshot,
  writeBatch,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  InventoryItem,
  StockMovement,
  FilterState,
  MovementType,
} from "@/types";

const ITEMS_COLLECTION = "inventory_items";
const MOVEMENTS_COLLECTION = "stock_movements";

// ── Get Items ─────────────────────────────────────────────────
// ponytail: no orderBy to avoid composite index issues; sort client-side
export async function getInventoryItems(
  filter?: FilterState
): Promise<{ items: InventoryItem[]; lastDoc: null }> {
  const snap = await getDocs(collection(db, ITEMS_COLLECTION));
  let items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as InventoryItem));

  // client-side filter
  if (filter?.categoryId) items = items.filter((i) => i.categoryId === filter.categoryId);
  if (filter?.locationId) items = items.filter((i) => i.locationId === filter.locationId);
  if (filter?.status) items = items.filter((i) => i.status === filter.status);

  // sort newest first
  items.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));

  return { items, lastDoc: null };
}

// ── Get Single Item ───────────────────────────────────────────
export async function getInventoryItem(id: string): Promise<InventoryItem | null> {
  const snap = await getDoc(doc(db, ITEMS_COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as InventoryItem;
}

// ── Create Item ───────────────────────────────────────────────
export async function createInventoryItem(
  data: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const now = Timestamp.now();
  const ref = await addDoc(collection(db, ITEMS_COLLECTION), {
    ...data,
    quantityAvailable: data.quantity,
    quantityBorrowed: 0,
    quantityUnderRepair: 0,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

// ── Update Item ───────────────────────────────────────────────
export async function updateInventoryItem(
  id: string,
  data: Partial<InventoryItem>
): Promise<void> {
  await updateDoc(doc(db, ITEMS_COLLECTION, id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

// ── Delete Item ───────────────────────────────────────────────
export async function deleteInventoryItem(id: string): Promise<void> {
  await deleteDoc(doc(db, ITEMS_COLLECTION, id));
}

// ── Stock Adjustment ──────────────────────────────────────────
export async function adjustStock(data: {
  itemId: string;
  type: "adjustment_in" | "adjustment_out";
  quantity: number;
  reason: string;
  performedBy: string;
  performedByName: string;
}): Promise<void> {
  const itemRef = doc(db, ITEMS_COLLECTION, data.itemId);
  const snap = await getDoc(itemRef);
  if (!snap.exists()) throw new Error("ไม่พบอุปกรณ์");
  const item = snap.data() as InventoryItem;

  const delta = data.type === "adjustment_in" ? data.quantity : -data.quantity;
  const newAvailable = item.quantityAvailable + delta;
  const newTotal = item.quantity + delta;
  if (newAvailable < 0) throw new Error("จำนวนไม่เพียงพอ");

  const batch = writeBatch(db);
  batch.update(itemRef, {
    quantityAvailable: increment(delta),
    quantity: increment(delta),
    updatedAt: Timestamp.now(),
  });
  await batch.commit();

  await recordStockMovement({
    itemId: data.itemId,
    itemCode: item.code,
    itemName: item.name,
    type: data.type,
    quantityBefore: item.quantityAvailable,
    quantityChange: delta,
    quantityAfter: newAvailable,
    reason: data.reason,
    performedBy: data.performedBy,
    performedByName: data.performedByName,
  });
}

// ── Stock Movement ────────────────────────────────────────────
export async function recordStockMovement(
  data: Omit<StockMovement, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, MOVEMENTS_COLLECTION), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function getItemMovements(itemId: string): Promise<StockMovement[]> {
  const q = query(
    collection(db, MOVEMENTS_COLLECTION),
    where("itemId", "==", itemId),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as StockMovement));
}

export async function getRecentMovements(count = 10): Promise<StockMovement[]> {
  const q = query(
    collection(db, MOVEMENTS_COLLECTION),
    orderBy("createdAt", "desc"),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as StockMovement));
}

// ── Dashboard Stats ───────────────────────────────────────────
export async function getDashboardStats() {
  const snap = await getDocs(collection(db, ITEMS_COLLECTION));
  const items = snap.docs.map((d) => d.data() as InventoryItem);

  const today = new Date();
  const soon = new Date();
  soon.setDate(soon.getDate() + 30);

  return {
    totalItems: items.length,
    totalQuantity: items.reduce((s, i) => s + i.quantity, 0),
    availableQuantity: items.reduce((s, i) => s + i.quantityAvailable, 0),
    borrowedQuantity: items.reduce((s, i) => s + i.quantityBorrowed, 0),
    underRepairQuantity: items.reduce((s, i) => s + i.quantityUnderRepair, 0),
    lowStockCount: items.filter((i) => (i.minStockLevel ?? 0) > 0 && i.quantityAvailable <= i.minStockLevel!).length,
    calibrationDueCount: items.filter((i) => {
      if (!i.calibration?.nextDate) return false;
      const d = i.calibration.nextDate.toDate();
      return d <= soon;
    }).length,
    maintenanceDueCount: items.filter((i) => {
      if (!i.maintenance?.nextDate) return false;
      const d = i.maintenance.nextDate.toDate();
      return d <= soon;
    }).length,
    pendingApprovalsCount: 0,
    overdueCount: 0,
  };
}

// ── Real-time listener ────────────────────────────────────────
export function subscribeToLowStock(
  callback: (items: InventoryItem[]) => void
): () => void {
  const q = query(
    collection(db, ITEMS_COLLECTION),
    where("status", "==", "available")
  );
  return onSnapshot(q, (snap) => {
    const items = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as InventoryItem))
      .filter((i) => (i.minStockLevel ?? 0) > 0 && i.quantityAvailable <= i.minStockLevel!);
    callback(items);
  });
}

// ── Search Items (client-side filter) ─────────────────────────
export async function searchInventoryItems(searchText: string): Promise<InventoryItem[]> {
  const snap = await getDocs(
    query(collection(db, ITEMS_COLLECTION), orderBy("name"), limit(200))
  );
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as InventoryItem));
  const lower = searchText.toLowerCase();
  return all.filter(
    (i) =>
      i.name.toLowerCase().includes(lower) ||
      i.code.toLowerCase().includes(lower) ||
      i.serialNumber?.toLowerCase().includes(lower) ||
      i.brand?.toLowerCase().includes(lower)
  );
}
