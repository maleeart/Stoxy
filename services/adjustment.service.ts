import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, orderBy, limit, Timestamp, writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { recordStockMovement } from "./inventory.service";
import type { StockAdjustment, AdjustmentType } from "@/types";

const COL = "stock_adjustments";

export async function getAdjustments(): Promise<StockAdjustment[]> {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"), limit(100));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as StockAdjustment));
}

export async function createAdjustment(
  data: {
    itemId: string;
    itemCode: string;
    itemName: string;
    type: AdjustmentType;
    quantityAdjusted: number;
    reason: string;
    createdBy: string;
    createdByName?: string;
  }
): Promise<void> {
  const itemRef = doc(db, "inventory_items", data.itemId);
  const itemSnap = await getDoc(itemRef);
  if (!itemSnap.exists()) throw new Error("Item not found");
  const item = itemSnap.data();

  const before = item.quantityAvailable as number;
  const change = data.type === "addition" ? data.quantityAdjusted : -data.quantityAdjusted;
  const after = before + change;
  if (after < 0) throw new Error("จำนวนไม่เพียงพอ");

  const now = Timestamp.now();
  const batch = writeBatch(db);

  const adjRef = doc(collection(db, COL));
  batch.set(adjRef, {
    itemId: data.itemId,
    itemCode: data.itemCode,
    itemName: data.itemName,
    type: data.type,
    quantityBefore: before,
    quantityAdjusted: data.quantityAdjusted,
    quantityAfter: after,
    reason: data.reason,
    status: "approved",
    createdBy: data.createdBy,
    createdAt: now,
  });

  batch.update(itemRef, {
    quantityAvailable: after,
    quantity: item.quantity + change,
    updatedAt: now,
  });

  await batch.commit();

  await recordStockMovement({
    itemId: data.itemId,
    itemCode: data.itemCode,
    itemName: data.itemName,
    type: data.type === "addition" ? "adjustment_in" : "adjustment_out",
    quantityBefore: before,
    quantityChange: change,
    quantityAfter: after,
    referenceId: adjRef.id,
    referenceType: "adjustment",
    unit: item.unit,
    reason: data.reason,
    performedBy: data.createdBy,
    performedByName: data.createdByName || data.createdBy,
  });
}
