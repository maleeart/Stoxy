"use client";
import { useEffect, useState, useMemo } from "react";
import { subscribeBorrowRecords } from "@/services/borrow.service";
import type { BorrowRecord, BorrowStatus } from "@/types";

export function useRealtimeBorrows(status?: BorrowStatus | "all") {
  const [allRecords, setAllRecords] = useState<BorrowRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    return subscribeBorrowRecords((records) => {
      setAllRecords(records);
      setIsLoading(false);
    });
  }, []);

  const records = useMemo(() => {
    if (!status || status === "all") return allRecords;
    return allRecords.filter((r) => r.status === status);
  }, [allRecords, status]);

  return { records, isLoading, allRecords };
}
