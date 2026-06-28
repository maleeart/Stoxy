"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { useInventoryItems } from "@/hooks/useInventory";
import { getRequisitions } from "@/services/requisition.service";
import { getBorrowRecords } from "@/services/borrow.service";
import { AlertTriangle, PackageOpen, Clock, Bell } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function NotificationsPage() {
  const { data: items = [] } = useInventoryItems();

  const { data: requisitions = [] } = useQuery({
    queryKey: ["requisitions", "all"],
    queryFn: () => getRequisitions(),
  });

  const { data: borrows = [] } = useQuery({
    queryKey: ["borrows", "all"],
    queryFn: () => getBorrowRecords(),
  });

  const lowStock = useMemo(
    () => items.filter((i) => i.quantityAvailable <= (i.minStockLevel ?? 0)),
    [items]
  );

  const pendingReqs = useMemo(
    () => requisitions.filter((r) => r.status === "pending"),
    [requisitions]
  );

  const pendingBorrows = useMemo(
    () => borrows.filter((b) => b.status === "pending_approval"),
    [borrows]
  );

  const overdueBorrows = useMemo(() => {
    const now = new Date();
    return borrows.filter(
      (b) => b.status === "borrowed" && b.expectedReturnDate.toDate() < now
    );
  }, [borrows]);

  const total = lowStock.length + pendingReqs.length + pendingBorrows.length + overdueBorrows.length;

  return (
    <AppShell title="แจ้งเตือน">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">การแจ้งเตือน</h2>
        <p className="text-sm text-gray-500">{total} รายการที่ต้องดำเนินการ</p>
      </div>

      {total === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
          <Bell className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">ไม่มีการแจ้งเตือน ทุกอย่างปกติดี</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Low Stock */}
          {lowStock.length > 0 && (
            <Section
              icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
              title={`สต็อกต่ำ (${lowStock.length} รายการ)`}
              color="border-red-100 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20"
            >
              {lowStock.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between py-2 border-b border-red-100 dark:border-red-900/30 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">เหลือ {item.quantityAvailable}</p>
                    <p className="text-xs text-gray-400">ขั้นต่ำ {item.minStockLevel ?? 0}</p>
                  </div>
                </motion.div>
              ))}
              <Link href="/purchase" className="block mt-2 text-xs text-center text-blue-600 hover:underline">
                ดูรายการต้องสั่งซื้อ →
              </Link>
            </Section>
          )}

          {/* Pending Requisitions */}
          {pendingReqs.length > 0 && (
            <Section
              icon={<PackageOpen className="w-4 h-4 text-yellow-500" />}
              title={`คำขอเบิกรออนุมัติ (${pendingReqs.length} รายการ)`}
              color="border-yellow-100 dark:border-yellow-900/50 bg-yellow-50/50 dark:bg-yellow-950/20"
            >
              {pendingReqs.map((req, i) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between py-2 border-b border-yellow-100 dark:border-yellow-900/30 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{req.itemName}</p>
                    <p className="text-xs text-gray-500">โดย: {req.requesterName} · จำนวน: {req.quantity}</p>
                  </div>
                </motion.div>
              ))}
              <Link href="/requisition" className="block mt-2 text-xs text-center text-blue-600 hover:underline">
                ไปอนุมัติ →
              </Link>
            </Section>
          )}

          {/* Pending Borrows */}
          {pendingBorrows.length > 0 && (
            <Section
              icon={<Clock className="w-4 h-4 text-blue-500" />}
              title={`คำขอยืมรออนุมัติ (${pendingBorrows.length} รายการ)`}
              color="border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20"
            >
              {pendingBorrows.map((b, i) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between py-2 border-b border-blue-100 dark:border-blue-900/30 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{b.itemName}</p>
                    <p className="text-xs text-gray-500">โดย: {b.borrowerName} · {b.borrowerDepartment}</p>
                  </div>
                </motion.div>
              ))}
              <Link href="/borrow" className="block mt-2 text-xs text-center text-blue-600 hover:underline">
                ไปอนุมัติ →
              </Link>
            </Section>
          )}

          {/* Overdue Borrows */}
          {overdueBorrows.length > 0 && (
            <Section
              icon={<AlertTriangle className="w-4 h-4 text-orange-500" />}
              title={`เกินกำหนดคืน (${overdueBorrows.length} รายการ)`}
              color="border-orange-100 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/20"
            >
              {overdueBorrows.map((b, i) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between py-2 border-b border-orange-100 dark:border-orange-900/30 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{b.itemName}</p>
                    <p className="text-xs text-gray-500">ผู้ยืม: {b.borrowerName}</p>
                  </div>
                  <p className="text-xs font-semibold text-orange-600">
                    {b.expectedReturnDate.toDate().toLocaleDateString("th-TH")}
                  </p>
                </motion.div>
              ))}
              <Link href="/return" className="block mt-2 text-xs text-center text-blue-600 hover:underline">
                ไปรับคืน →
              </Link>
            </Section>
          )}
        </div>
      )}
    </AppShell>
  );
}

function Section({
  icon, title, color, children,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${color}`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}
