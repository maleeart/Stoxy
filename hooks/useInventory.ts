import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getInventoryItems,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getDashboardStats,
  getRecentMovements,
  searchInventoryItems,
} from "@/services/inventory.service";
import type { InventoryItem, FilterState } from "@/types";

// ── Query Keys ────────────────────────────────────────────────
export const inventoryKeys = {
  all: ["inventory"] as const,
  lists: () => [...inventoryKeys.all, "list"] as const,
  list: (filter?: FilterState) => [...inventoryKeys.lists(), filter] as const,
  details: () => [...inventoryKeys.all, "detail"] as const,
  detail: (id: string) => [...inventoryKeys.details(), id] as const,
  dashboard: () => ["dashboard", "stats"] as const,
  movements: (itemId?: string) => ["movements", itemId] as const,
  search: (q: string) => ["inventory", "search", q] as const,
};

// ── Hooks ─────────────────────────────────────────────────────
export function useInventoryItems(filter?: FilterState) {
  return useQuery({
    queryKey: inventoryKeys.list(filter),
    queryFn: () => getInventoryItems(filter),
    select: (data) => data.items,
  });
}

export function useInventoryItem(id: string) {
  return useQuery({
    queryKey: inventoryKeys.detail(id),
    queryFn: () => getInventoryItem(id),
    enabled: !!id,
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: inventoryKeys.dashboard(),
    queryFn: getDashboardStats,
    staleTime: 1000 * 60 * 5, // 5 min
  });
}

export function useRecentMovements(count = 10) {
  return useQuery({
    queryKey: inventoryKeys.movements(),
    queryFn: () => getRecentMovements(count),
  });
}

export function useSearchInventory(searchText: string) {
  return useQuery({
    queryKey: inventoryKeys.search(searchText),
    queryFn: () => searchInventoryItems(searchText),
    enabled: searchText.length >= 2,
    staleTime: 1000 * 30,
  });
}

// ── Mutations ─────────────────────────────────────────────────
export function useCreateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">) =>
      createInventoryItem(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.lists() });
      qc.invalidateQueries({ queryKey: inventoryKeys.dashboard() });
    },
  });
}

export function useUpdateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InventoryItem> }) =>
      updateInventoryItem(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: inventoryKeys.detail(id) });
      qc.invalidateQueries({ queryKey: inventoryKeys.lists() });
    },
  });
}

export function useDeleteInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteInventoryItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: inventoryKeys.lists() });
      qc.invalidateQueries({ queryKey: inventoryKeys.dashboard() });
    },
  });
}
