import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
  increment,
  deleteField,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { recordStockMovement } from "./inventory.service";
import { notifyLine } from "@/lib/notifyLine";
import type { FMWorkOrder, FMWorkOrderItem, FMWorkOrderStatus, InventoryItem } from "@/types";

const COL = "fm_workorders";

export async function getFMWorkOrders(): Promise<FMWorkOrder[]> {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"), limit(500));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FMWorkOrder));
}

export async function getFMWorkOrder(id: string): Promise<FMWorkOrder | null> {
  const ref = doc(db, COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as FMWorkOrder;
}

function cleanUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      cleaned[k] = v;
    }
  }
  return cleaned as Partial<T>;
}

export async function createFMWorkOrder(data: {
  workOrderNumber: string;
  workType?: string;
  requestDate: Timestamp;
  useDate?: Timestamp;
  requesterName: string;
  requesterDepartment: string;
  requesterEmail?: string;
  requesterPhone?: string;
  coordinatorName?: string;
  coordinatorPhone?: string;
  title: string;
  description?: string;
  location: string;
  attachmentUrl?: string;
  attachmentName?: string;
  images?: string[];
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  assignedDepartment?: string;
  assignedPhone?: string;
  assignedEmail?: string;
  assignorName?: string;
  assignedDate?: Timestamp;
  createdBy: string;
  notes?: string;
}): Promise<string> {
  const now = Timestamp.now();
  const cleaned = cleanUndefined(data);
  const ref = await addDoc(collection(db, COL), {
    ...cleaned,
    status: "pending",
    items: [],
    createdAt: now,
    updatedAt: now,
  });

  notifyLine(
    `📋 ใบแจ้งงานซ่อม (FM) ใหม่\nเลขที่: ${data.workOrderNumber}\nเรื่อง: ${data.title}\nสถานที่: ${data.location}\nผู้ดำเนินการ: ${data.assignedTechnicianName || "ยังไม่ระบุ"}`
  );

  return ref.id;
}

export async function updateFMWorkOrder(
  id: string,
  data: Partial<Omit<FMWorkOrder, "id" | "createdAt">>
): Promise<void> {
  const ref = doc(db, COL, id);
  const cleaned = cleanUndefined(data);
  await updateDoc(ref, {
    ...cleaned,
    updatedAt: Timestamp.now(),
  });
}

export async function submitFMWorkOrderItems(
  id: string,
  items: FMWorkOrderItem[],
  submitterId: string,
  submitterName: string,
  submitterDepartment?: string
): Promise<void> {
  const ref = doc(db, COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("ไม่พบใบแจ้งงาน FM");
  const wo = snap.data() as FMWorkOrder;

  const now = Timestamp.now();
  const updateData: Record<string, any> = {
    items,
    status: "pending_review",
    submittedBy: submitterId,
    submittedByName: submitterName,
    submittedAt: now,
    updatedAt: now,
  };
  if (!wo.assignedTechnicianName) {
    updateData.assignedTechnicianName = submitterName;
    updateData.assignedTechnicianId = submitterId;
    if (submitterDepartment) {
      updateData.assignedDepartment = submitterDepartment;
    }
    updateData.assignedDate = now;
  }
  await updateDoc(ref, updateData);

  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  notifyLine(
    `🔔 ส่งรายการอุปกรณ์ใบงาน FM-${wo.workOrderNumber} รอตรวจสอบ\nเรื่อง: ${wo.title}\nผู้ดำเนินการ: ${wo.assignedTechnicianName || submitterName}\nอุปกรณ์: ${items.length} รายการ (${itemCount} ชิ้น)\nกรุณาเข้าตรวจสอบและอนุมัติในระบบ`
  );
}

export async function updateFMWorkOrderItems(
  id: string,
  items: FMWorkOrderItem[],
  updaterId?: string,
  updaterName?: string,
  updaterDepartment?: string
): Promise<void> {
  const ref = doc(db, COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("ไม่พบใบแจ้งงาน FM");
  const wo = snap.data() as FMWorkOrder;

  const now = Timestamp.now();
  const updateData: Record<string, any> = {
    items,
    updatedAt: now,
  };
  if (!wo.assignedTechnicianName && updaterName) {
    updateData.assignedTechnicianName = updaterName;
    if (updaterId) updateData.assignedTechnicianId = updaterId;
    if (updaterDepartment) updateData.assignedDepartment = updaterDepartment;
    updateData.assignedDate = now;
  }
  await updateDoc(ref, updateData);
}

export async function approveFMWorkOrder(
  id: string,
  approverId: string,
  approverName?: string,
  customItems?: FMWorkOrderItem[]
): Promise<void> {
  const ref = doc(db, COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("ไม่พบใบแจ้งงาน FM");
  const wo = snap.data() as FMWorkOrder;

  const items = customItems !== undefined ? customItems : (wo.items || []);
  if (items.length === 0) {
    // If no items, simply approve
    await updateDoc(ref, {
      items: [],
      status: "completed",
      completedWithoutItems: true,
      approvedBy: approverId,
      approvedByName: approverName || approverId,
      approvedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    notifyLine(
      `✅ อนุมัติใบงาน FM-${wo.workOrderNumber} (ไม่เบิกของ)\nเรื่อง: ${wo.title}\nอนุมัติโดย: ${approverName || approverId}\nสถานะ: เสร็จสิ้น`
    );
    return;
  }

  // Check inventory availability for all items
  const itemSnaps = await Promise.all(
    items.map((i) => getDoc(doc(db, "inventory_items", i.itemId)))
  );

  for (let idx = 0; idx < items.length; idx++) {
    const itemData = items[idx];
    const snapItem = itemSnaps[idx];
    if (!snapItem.exists()) {
      throw new Error(`ไม่พบอุปกรณ์รหัส ${itemData.itemCode} ในระบบ`);
    }
    const inv = snapItem.data() as InventoryItem;
    if (inv.quantityAvailable < itemData.quantity) {
      throw new Error(
        `อุปกรณ์ ${itemData.itemName} (${itemData.itemCode}) คงเหลือไม่พอ (คงเหลือ ${inv.quantityAvailable}, ต้องการ ${itemData.quantity})`
      );
    }
  }

  const now = Timestamp.now();
  const batch = writeBatch(db);

  // Update FM status and items
  batch.update(ref, {
    items,
    status: "completed",
    completedWithoutItems: false,
    approvedBy: approverId,
    approvedByName: approverName || approverId,
    approvedAt: now,
    updatedAt: now,
  });

  // Decrement stock for each item
  for (let idx = 0; idx < items.length; idx++) {
    const itemData = items[idx];
    const itemRef = doc(db, "inventory_items", itemData.itemId);
    batch.update(itemRef, {
      quantityAvailable: increment(-itemData.quantity),
      quantity: increment(-itemData.quantity),
      updatedAt: now,
    });
  }

  await batch.commit();

  // Record stock movements
  for (let idx = 0; idx < items.length; idx++) {
    const itemData = items[idx];
    const inv = itemSnaps[idx].data() as InventoryItem;
    await recordStockMovement({
      itemId: itemData.itemId,
      itemCode: itemData.itemCode,
      itemName: itemData.itemName,
      type: "requisition",
      quantityBefore: inv.quantityAvailable,
      quantityChange: -itemData.quantity,
      quantityAfter: inv.quantityAvailable - itemData.quantity,
      unit: itemData.unit || inv.unit || "ชิ้น",
      referenceId: id,
      referenceType: "fm_workorder",
      reason: `เบิกใช้ในใบงาน FM ${wo.workOrderNumber}: ${wo.title}${itemData.notes ? ` (${itemData.notes})` : ""}`,
      performedBy: approverId,
      performedByName: approverName || approverId,
      subjectName: wo.assignedTechnicianName || wo.submittedByName || wo.requesterName,
    });
  }

  notifyLine(
    `✅ อนุมัติตัดสต็อกใบงาน FM-${wo.workOrderNumber} เรียบร้อยแล้ว\nเรื่อง: ${wo.title}\nอนุมัติโดย: ${approverName || approverId}\nตัดสต็อก ${items.length} รายการ`
  );
}

export async function rejectFMWorkOrder(
  id: string,
  rejectorId: string,
  reason: string
): Promise<void> {
  const ref = doc(db, COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("ไม่พบใบแจ้งงาน FM");
  const wo = snap.data() as FMWorkOrder;

  await updateDoc(ref, {
    status: "rejected",
    rejectedReason: reason,
    updatedAt: Timestamp.now(),
  });

  notifyLine(
    `⚠️ ส่งกลับแก้ไขใบงาน FM-${wo.workOrderNumber}\nเรื่อง: ${wo.title}\nเหตุผล: ${reason}`
  );
}

export async function setFMWorkOrderWaitingParts(
  id: string,
  userId: string,
  userName: string,
  reason?: string,
  repDocNumber?: string
): Promise<void> {
  const ref = doc(db, COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("ไม่พบใบแจ้งงาน FM");
  const wo = snap.data() as FMWorkOrder;

  const now = Timestamp.now();
  await updateDoc(ref, {
    status: "waiting_parts",
    waitingPartsReason: reason || "รอจัดซื้อ/หาอุปกรณ์เพื่อดำเนินการ",
    repDocNumber: repDocNumber?.trim() || deleteField(),
    waitingPartsBy: userId,
    waitingPartsByName: userName,
    waitingPartsAt: now,
    updatedAt: now,
  });

  notifyLine(
    `⏳ ใบงาน FM-${wo.workOrderNumber} เปลี่ยนสถานะเป็น "รอจัดซื้อ/หาอุปกรณ์"\nเรื่อง: ${wo.title}\nผู้แจ้ง: ${userName}${repDocNumber ? `\nเลขที่ REP: ${repDocNumber}` : ""}${reason ? `\nรายละเอียด: ${reason}` : ""}`
  );
}

export async function resumeFMWorkOrderToPending(id: string): Promise<void> {
  const ref = doc(db, COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("ไม่พบใบแจ้งงาน FM");
  const wo = snap.data() as FMWorkOrder;

  const now = Timestamp.now();
  await updateDoc(ref, {
    status: "pending",
    updatedAt: now,
  });

  notifyLine(
    `🔄 ใบงาน FM-${wo.workOrderNumber} เปลี่ยนสถานะกลับเป็น "รอดำเนินการ"\nเรื่อง: ${wo.title}`
  );
}

export async function completeFMWorkOrderWithoutItems(
  id: string,
  userId: string,
  userName: string,
  notes?: string,
  userDepartment?: string
): Promise<void> {
  const ref = doc(db, COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("ไม่พบใบแจ้งงาน FM");
  const wo = snap.data() as FMWorkOrder;

  const now = Timestamp.now();
  const updateData: Record<string, any> = {
    items: [],
    status: "pending_review",
    completedWithoutItems: true,
    submittedBy: userId,
    submittedByName: userName,
    submittedAt: now,
    updatedAt: now,
    ...(notes ? { notes: wo.notes ? `${wo.notes}\n[ดำเนินการแล้ว (ไม่เบิกของ)]: ${notes}` : `[ดำเนินการแล้ว (ไม่เบิกของ)]: ${notes}` } : {}),
  };
  if (!wo.assignedTechnicianName) {
    updateData.assignedTechnicianName = userName;
    updateData.assignedTechnicianId = userId;
    if (userDepartment) {
      updateData.assignedDepartment = userDepartment;
    }
    updateData.assignedDate = now;
  }
  await updateDoc(ref, updateData);

  notifyLine(
    `🔔 ดำเนินการแล้ว (ไม่เบิกของ) ใบงาน FM-${wo.workOrderNumber} รอตรวจสอบ\nเรื่อง: ${wo.title}\nผู้ดำเนินการ: ${wo.assignedTechnicianName || userName}\nสถานะ: ช่างดำเนินการแล้วโดยไม่ใช้อุปกรณ์ รอผู้ดูแลตรวจสอบและอนุมัติ`
  );
}

export const submitFMWorkOrderWithoutItems = completeFMWorkOrderWithoutItems;

export async function claimFMWorkOrder(
  id: string,
  technicianId: string,
  technicianName: string,
  department?: string
): Promise<void> {
  const ref = doc(db, COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("ไม่พบใบแจ้งงาน FM");
  const wo = snap.data() as FMWorkOrder;
  const now = Timestamp.now();
  await updateDoc(ref, {
    assignedTechnicianId: technicianId,
    assignedTechnicianName: technicianName,
    ...(department ? { assignedDepartment: department } : {}),
    assignedDate: now,
    updatedAt: now,
  });
  notifyLine(
    `👤 ช่างรับดำเนินการใบงาน FM-${wo.workOrderNumber}\nเรื่อง: ${wo.title}\nผู้ดำเนินการ: ${technicianName}${department ? ` (${department})` : ""}`
  );
}

export async function adminUpdateFMWorkOrderStatus(
  id: string,
  newStatus: FMWorkOrderStatus,
  adminId: string,
  adminName: string,
  note?: string,
  returnStock: boolean = true
): Promise<void> {
  const ref = doc(db, COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("ไม่พบใบแจ้งงาน FM");
  const wo = snap.data() as FMWorkOrder;

  const now = Timestamp.now();
  const hadDeductedStock =
    wo.status === "completed" &&
    !wo.completedWithoutItems &&
    (wo.items?.length || 0) > 0 &&
    !wo.stockReturned;

  // Case A: Work order was completed with deducted stock, now changing to another status (e.g. cancelled, pending, etc.)
  if (hadDeductedStock && newStatus !== "completed") {
    if (returnStock) {
      // 1. Fetch current inventory items to calculate stock movements
      const itemSnaps = await Promise.all(
        wo.items.map((i) => getDoc(doc(db, "inventory_items", i.itemId)))
      );

      const batch = writeBatch(db);

      // Re-increment quantity & quantityAvailable in inventory
      for (let idx = 0; idx < wo.items.length; idx++) {
        const itemData = wo.items[idx];
        const itemRef = doc(db, "inventory_items", itemData.itemId);
        batch.update(itemRef, {
          quantityAvailable: increment(itemData.quantity),
          quantity: increment(itemData.quantity),
          updatedAt: now,
        });
      }

      // Update work order
      const updateData: Record<string, any> = {
        status: newStatus,
        stockReturned: true,
        stockReturnedAt: now,
        stockReturnedBy: adminId,
        stockReturnedByName: adminName,
        updatedAt: now,
      };

      if (note && note.trim()) {
        updateData.notes = wo.notes
          ? `${wo.notes}\n[Admin ปรับสถานะเป็น "${newStatus}" และคืนสต็อก ${wo.items.length} รายการ โดย ${adminName}]: ${note.trim()}`
          : `[Admin ปรับสถานะเป็น "${newStatus}" และคืนสต็อก ${wo.items.length} รายการ โดย ${adminName}]: ${note.trim()}`;
      } else {
        updateData.notes = wo.notes
          ? `${wo.notes}\n[Admin ปรับสถานะเป็น "${newStatus}" และคืนสต็อก ${wo.items.length} รายการ โดย ${adminName}]`
          : `[Admin ปรับสถานะเป็น "${newStatus}" และคืนสต็อก ${wo.items.length} รายการ โดย ${adminName}]`;
      }

      batch.update(ref, updateData);
      await batch.commit();

      // Record stock movements (type: return)
      for (let idx = 0; idx < wo.items.length; idx++) {
        const itemData = wo.items[idx];
        const itemSnap = itemSnaps[idx];
        const currentQty = itemSnap.exists()
          ? (itemSnap.data() as InventoryItem).quantityAvailable
          : 0;
        await recordStockMovement({
          itemId: itemData.itemId,
          itemCode: itemData.itemCode,
          itemName: itemData.itemName,
          type: "return",
          quantityBefore: currentQty,
          quantityChange: itemData.quantity,
          quantityAfter: currentQty + itemData.quantity,
          unit: itemData.unit || "ชิ้น",
          referenceId: id,
          referenceType: "fm_workorder",
          reason: `รับคืนพัสดุจากการยกเลิก/เปลี่ยนสถานะใบงาน FM ${wo.workOrderNumber}: ${wo.title} เป็น "${newStatus}" โดย ${adminName}${note ? ` [${note}]` : ""}`,
          performedBy: adminId,
          performedByName: adminName,
          subjectName: wo.assignedTechnicianName || wo.submittedByName || wo.requesterName,
        });
      }

      notifyLine(
        `🔄 ผู้ดูแลระบบปรับเปลี่ยนสถานะใบงาน FM-${wo.workOrderNumber}\nเรื่อง: ${wo.title}\nสถานะใหม่: ${newStatus}\nคืนสต็อกพัสดุ: ${wo.items.length} รายการ (${wo.items.reduce((s, i) => s + i.quantity, 0)} ชิ้น) เรียบร้อยแล้ว\nปรับโดย: ${adminName}${note ? `\nหมายเหตุ: ${note}` : ""}`
      );
      return;
    } else {
      // Admin opted out of returning stock
      const updateData: Record<string, any> = {
        status: newStatus,
        stockReturned: false,
        updatedAt: now,
      };
      if (note && note.trim()) {
        updateData.notes = wo.notes
          ? `${wo.notes}\n[Admin ปรับสถานะเป็น "${newStatus}" (ไม่คืนสต็อก) โดย ${adminName}]: ${note.trim()}`
          : `[Admin ปรับสถานะเป็น "${newStatus}" (ไม่คืนสต็อก) โดย ${adminName}]: ${note.trim()}`;
      }
      await updateDoc(ref, updateData);
      notifyLine(
        `⚙️ ผู้ดูแลระบบปรับเปลี่ยนสถานะใบงาน FM-${wo.workOrderNumber} (ไม่คืนสต็อก)\nเรื่อง: ${wo.title}\nสถานะใหม่: ${newStatus}\nปรับโดย: ${adminName}${note ? `\nหมายเหตุ: ${note}` : ""}`
      );
      return;
    }
  }

  // Case B: Work order was previously NOT completed (or was returned before), and now admin sets it to "completed"
  const needsStockDeduction =
    newStatus === "completed" &&
    !wo.completedWithoutItems &&
    (wo.items?.length || 0) > 0 &&
    (wo.stockReturned || wo.status !== "completed");

  if (needsStockDeduction) {
    const itemSnaps = await Promise.all(
      wo.items.map((i) => getDoc(doc(db, "inventory_items", i.itemId)))
    );

    // Verify stock availability
    for (let idx = 0; idx < wo.items.length; idx++) {
      const itemData = wo.items[idx];
      const snapItem = itemSnaps[idx];
      if (!snapItem.exists()) {
        throw new Error(`ไม่พบอุปกรณ์รหัส ${itemData.itemCode} ในระบบ`);
      }
      const inv = snapItem.data() as InventoryItem;
      if (inv.quantityAvailable < itemData.quantity) {
        throw new Error(
          `อุปกรณ์ ${itemData.itemName} (${itemData.itemCode}) คงเหลือไม่พอตัดสต็อก (คงเหลือ ${inv.quantityAvailable}, ต้องการ ${itemData.quantity})`
        );
      }
    }

    const batch = writeBatch(db);
    for (let idx = 0; idx < wo.items.length; idx++) {
      const itemData = wo.items[idx];
      const itemRef = doc(db, "inventory_items", itemData.itemId);
      batch.update(itemRef, {
        quantityAvailable: increment(-itemData.quantity),
        quantity: increment(-itemData.quantity),
        updatedAt: now,
      });
    }

    const updateData: Record<string, any> = {
      status: "completed",
      approvedBy: adminId,
      approvedByName: adminName,
      approvedAt: now,
      stockReturned: false,
      stockReturnedAt: deleteField(),
      stockReturnedBy: deleteField(),
      stockReturnedByName: deleteField(),
      updatedAt: now,
    };

    if (note && note.trim()) {
      updateData.notes = wo.notes
        ? `${wo.notes}\n[Admin ปรับสถานะเป็น "completed" และตัดสต็อก โดย ${adminName}]: ${note.trim()}`
        : `[Admin ปรับสถานะเป็น "completed" และตัดสต็อก โดย ${adminName}]: ${note.trim()}`;
    }

    batch.update(ref, updateData);
    await batch.commit();

    for (let idx = 0; idx < wo.items.length; idx++) {
      const itemData = wo.items[idx];
      const inv = itemSnaps[idx].data() as InventoryItem;
      await recordStockMovement({
        itemId: itemData.itemId,
        itemCode: itemData.itemCode,
        itemName: itemData.itemName,
        type: "requisition",
        quantityBefore: inv.quantityAvailable,
        quantityChange: -itemData.quantity,
        quantityAfter: inv.quantityAvailable - itemData.quantity,
        unit: itemData.unit || inv.unit || "ชิ้น",
        referenceId: id,
        referenceType: "fm_workorder",
        reason: `เบิกใช้ในใบงาน FM ${wo.workOrderNumber}: ${wo.title}${itemData.notes ? ` (${itemData.notes})` : ""}`,
        performedBy: adminId,
        performedByName: adminName,
        subjectName: wo.assignedTechnicianName || wo.submittedByName || wo.requesterName,
      });
    }

    notifyLine(
      `✅ ผู้ดูแลระบบอนุมัติและตัดสต็อกใบงาน FM-${wo.workOrderNumber}\nเรื่อง: ${wo.title}\nสถานะใหม่: เสร็จสิ้น\nปรับโดย: ${adminName}\nตัดสต็อก ${wo.items.length} รายการ`
    );
    return;
  }

  // Case C: Standard status transition without item stock impact
  const updateData: Record<string, any> = {
    status: newStatus,
    updatedAt: now,
  };

  if (newStatus === "completed") {
    updateData.approvedBy = adminId;
    updateData.approvedByName = adminName;
    updateData.approvedAt = now;
  }

  if (note && note.trim()) {
    updateData.notes = wo.notes
      ? `${wo.notes}\n[Admin ปรับสถานะเป็น "${newStatus}" โดย ${adminName}]: ${note.trim()}`
      : `[Admin ปรับสถานะเป็น "${newStatus}" โดย ${adminName}]: ${note.trim()}`;
  }

  await updateDoc(ref, updateData);

  notifyLine(
    `⚙️ ผู้ดูแลระบบปรับเปลี่ยนสถานะใบงาน FM-${wo.workOrderNumber}\nเรื่อง: ${wo.title}\nสถานะใหม่: ${newStatus}\nปรับโดย: ${adminName}${note ? `\nหมายเหตุ: ${note}` : ""}`
  );
}

export async function clearFMWorkOrdersPerformer(onlyUncompleted: boolean = true): Promise<number> {
  const snap = await getDocs(collection(db, COL));
  const batch = writeBatch(db);
  let count = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as FMWorkOrder;
    if (onlyUncompleted && (data.status === "completed" || data.status === "cancelled")) {
      continue;
    }
    if (data.assignedTechnicianName || data.assignedDepartment || data.assignedTechnicianId) {
      batch.update(doc(db, COL, docSnap.id), {
        assignedTechnicianName: deleteField(),
        assignedTechnicianId: deleteField(),
        assignedDepartment: deleteField(),
        updatedAt: Timestamp.now(),
      });
      count++;
    }
  }

  if (count > 0) {
    await batch.commit();
  }
  return count;
}

export async function clearSingleFMWorkOrderPerformer(id: string): Promise<void> {
  const ref = doc(db, COL, id);
  await updateDoc(ref, {
    assignedTechnicianName: deleteField(),
    assignedTechnicianId: deleteField(),
    assignedDepartment: deleteField(),
    updatedAt: Timestamp.now(),
  });
}

export async function saveFMWorkOrderRequesterSignature(
  id: string,
  data: {
    signatureUrl: string;
    signedName: string;
    employeeId?: string;
  }
): Promise<void> {
  const ref = doc(db, COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("ไม่พบใบแจ้งงาน FM");
  const wo = snap.data() as FMWorkOrder;

  const now = Timestamp.now();
  const updateData: Record<string, any> = {
    requesterSignatureUrl: data.signatureUrl,
    requesterSignedName: data.signedName.trim(),
    requesterSignedAt: now,
    updatedAt: now,
  };

  if (data.employeeId && data.employeeId.trim()) {
    updateData.requesterEmployeeId = data.employeeId.trim();
  } else {
    updateData.requesterEmployeeId = deleteField();
  }

  await updateDoc(ref, updateData);

  notifyLine(
    `✍️ ผู้แจ้งงานลงนามรับทราบใบงาน FM-${wo.workOrderNumber}\nเรื่อง: ${wo.title}\nผู้ลงนาม: ${data.signedName.trim()}${data.employeeId && data.employeeId.trim() ? ` (รหัส: ${data.employeeId.trim()})` : ""}`
  );
}

export async function clearFMWorkOrderRequesterSignature(id: string): Promise<void> {
  const ref = doc(db, COL, id);
  await updateDoc(ref, {
    requesterSignatureUrl: deleteField(),
    requesterSignedName: deleteField(),
    requesterEmployeeId: deleteField(),
    requesterSignedAt: deleteField(),
    updatedAt: Timestamp.now(),
  });
}

export async function adminUpdateFMWorkOrderDetails(
  id: string,
  data: {
    workOrderNumber?: string;
    workType?: string;
    requestDate?: Timestamp;
    useDate?: Timestamp | null;
    title?: string;
    description?: string;
    location?: string;
    images?: string[];
    requesterName?: string;
    requesterDepartment?: string;
    requesterPhone?: string;
    requesterEmail?: string;
    coordinatorName?: string;
    coordinatorPhone?: string;
    assignorName?: string;
    assignedTechnicianName?: string;
    assignedDepartment?: string;
    repDocNumber?: string;
    waitingPartsReason?: string;
    notes?: string;
  },
  adminName: string
): Promise<void> {
  const ref = doc(db, COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("ไม่พบใบแจ้งงาน FM");
  const wo = snap.data() as FMWorkOrder;

  const now = Timestamp.now();
  const updateData: Record<string, any> = {
    updatedAt: now,
  };

  if (data.workOrderNumber !== undefined) updateData.workOrderNumber = data.workOrderNumber.trim();
  if (data.workType !== undefined) updateData.workType = data.workType.trim() || deleteField();
  if (data.requestDate !== undefined) updateData.requestDate = data.requestDate;
  if (data.useDate !== undefined) updateData.useDate = data.useDate ?? deleteField();
  if (data.title !== undefined) updateData.title = data.title.trim();
  if (data.description !== undefined) updateData.description = data.description.trim() || deleteField();
  if (data.location !== undefined) updateData.location = data.location.trim();
  if (data.images !== undefined) updateData.images = data.images;
  if (data.requesterName !== undefined) updateData.requesterName = data.requesterName.trim();
  if (data.requesterDepartment !== undefined) updateData.requesterDepartment = data.requesterDepartment.trim();
  if (data.requesterPhone !== undefined) updateData.requesterPhone = data.requesterPhone.trim() || deleteField();
  if (data.requesterEmail !== undefined) updateData.requesterEmail = data.requesterEmail.trim() || deleteField();
  if (data.coordinatorName !== undefined) updateData.coordinatorName = data.coordinatorName.trim() || deleteField();
  if (data.coordinatorPhone !== undefined) updateData.coordinatorPhone = data.coordinatorPhone.trim() || deleteField();
  if (data.assignorName !== undefined) updateData.assignorName = data.assignorName.trim() || deleteField();
  if (data.assignedTechnicianName !== undefined) {
    if (data.assignedTechnicianName.trim()) {
      updateData.assignedTechnicianName = data.assignedTechnicianName.trim();
    } else {
      updateData.assignedTechnicianName = deleteField();
      updateData.assignedTechnicianId = deleteField();
    }
  }
  if (data.assignedDepartment !== undefined) {
    updateData.assignedDepartment = data.assignedDepartment.trim() || deleteField();
  }
  if (data.notes !== undefined) updateData.notes = data.notes.trim() || deleteField();
  if (data.repDocNumber !== undefined) updateData.repDocNumber = data.repDocNumber.trim() || deleteField();
  if (data.waitingPartsReason !== undefined) updateData.waitingPartsReason = data.waitingPartsReason.trim() || deleteField();

  await updateDoc(ref, updateData);

  notifyLine(
    `✏️ แก้ไขข้อมูลใบงาน FM-${wo.workOrderNumber}\nเรื่อง: ${data.title || wo.title}\nแก้ไขโดย: ${adminName}`
  );
}

export async function deleteFMWorkOrder(
  id: string,
  adminId?: string,
  adminName?: string
): Promise<void> {
  const ref = doc(db, COL, id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const wo = snap.data() as FMWorkOrder;
    if (
      wo.status === "completed" &&
      !wo.completedWithoutItems &&
      (wo.items?.length || 0) > 0 &&
      !wo.stockReturned
    ) {
      const itemSnaps = await Promise.all(
        wo.items.map((i) => getDoc(doc(db, "inventory_items", i.itemId)))
      );
      const batch = writeBatch(db);
      const now = Timestamp.now();
      for (let idx = 0; idx < wo.items.length; idx++) {
        const itemData = wo.items[idx];
        const itemRef = doc(db, "inventory_items", itemData.itemId);
        batch.update(itemRef, {
          quantityAvailable: increment(itemData.quantity),
          quantity: increment(itemData.quantity),
          updatedAt: now,
        });
      }
      batch.delete(ref);
      await batch.commit();

      for (let idx = 0; idx < wo.items.length; idx++) {
        const itemData = wo.items[idx];
        const itemSnap = itemSnaps[idx];
        const currentQty = itemSnap.exists()
          ? (itemSnap.data() as InventoryItem).quantityAvailable
          : 0;
        await recordStockMovement({
          itemId: itemData.itemId,
          itemCode: itemData.itemCode,
          itemName: itemData.itemName,
          type: "return",
          quantityBefore: currentQty,
          quantityChange: itemData.quantity,
          quantityAfter: currentQty + itemData.quantity,
          unit: itemData.unit || "ชิ้น",
          referenceId: id,
          referenceType: "fm_workorder",
          reason: `รับคืนพัสดุอัตโนมัติจากการลบใบงาน FM ${wo.workOrderNumber}: ${wo.title} โดย ${adminName || adminId || "ผู้ดูแลระบบ"}`,
          performedBy: adminId || "admin",
          performedByName: adminName || "ผู้ดูแลระบบ",
          subjectName: wo.assignedTechnicianName || wo.submittedByName || wo.requesterName,
        });
      }
      return;
    }
  }
  await deleteDoc(ref);
}


