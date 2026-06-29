"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppShell } from "@/components/layout/AppShell";
import { useInventoryItem, useUpdateInventoryItem } from "@/hooks/useInventory";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { getLocations } from "@/services/locations.service";
import { useState } from "react";

const CATEGORY_LABEL: Record<string, string> = {
  electrical: "วัสดุ-อุปกรณ์ไฟฟ้า",
  meter: "เครื่องมือวัด",
  cable: "สายไฟ & เคเบิ้ล",
  tools: "เครื่องมือช่าง",
  safety: "อุปกรณ์ความปลอดภัย",
  spareparts: "Spareparts",
  others: "อื่นๆ",
};

const schema = z.object({
  name: z.string().min(2, "กรุณากรอกชื่ออุปกรณ์"),
  code: z.string().min(2, "กรุณากรอกรหัสอุปกรณ์"),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  categoryId: z.string().min(1, "กรุณาเลือกหมวดหมู่"),
  locationId: z.string().min(1, "กรุณาระบุสถานที่"),
  minStockLevel: z.coerce.number().min(0),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: item, isLoading } = useInventoryItem(id);
  const updateItem = useUpdateInventoryItem();
  const [locations, setLocations] = useState<string[]>([]);

  useEffect(() => {
    getLocations().then(setLocations);
  }, []);

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
  });

  // Populate form once item loads
  useEffect(() => {
    if (!item) return;
    reset({
      name: item.name,
      code: item.code,
      brand: item.brand ?? "",
      model: item.model ?? "",
      serialNumber: item.serialNumber ?? "",
      categoryId: item.categoryId,
      locationId: item.locationId,
      minStockLevel: item.minStockLevel ?? 0,
      notes: item.notes ?? "",
    });
  }, [item, reset]);

  async function onSubmit(data: FormData) {
    try {
      await updateItem.mutateAsync({
        id,
        data: {
          ...data,
          categoryName: CATEGORY_LABEL[data.categoryId] ?? data.categoryId,
          locationName: data.locationId,
        },
      });
      toast.success("บันทึกสำเร็จ");
      router.push(`/inventory/${id}`);
    } catch {
      toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
  }

  if (isLoading) {
    return (
      <AppShell title="แก้ไขอุปกรณ์">
        <div className="space-y-4 animate-pulse max-w-2xl">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl" />
          ))}
        </div>
      </AppShell>
    );
  }

  if (!item) {
    return (
      <AppShell title="ไม่พบอุปกรณ์">
        <div className="text-center py-20">
          <p className="text-gray-500">ไม่พบอุปกรณ์นี้</p>
          <button onClick={() => router.back()} className="mt-3 text-sm text-blue-600 hover:underline">← กลับ</button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={`แก้ไข: ${item.name}`}>
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับ
          </button>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">แก้ไขอุปกรณ์</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">ข้อมูลพื้นฐาน</h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">หมวดหมู่ *</label>
                <select {...register("categoryId")} className="input-field">
                  <option value="">เลือกหมวดหมู่</option>
                  {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">ชื่ออุปกรณ์ *</label>
                <input {...register("name")} className="input-field" />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">รหัสอุปกรณ์ *</label>
                <input {...register("code")} className="input-field font-mono" />
                {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">ยี่ห้อ</label>
                <input {...register("brand")} className="input-field" placeholder="Fluke, Hioki..." />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">รุ่น</label>
                <input {...register("model")} className="input-field" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Serial Number</label>
                <input {...register("serialNumber")} className="input-field font-mono" />
              </div>

            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">สต็อก & สถานที่</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">ขั้นต่ำ (แจ้งเตือน)</label>
                <input type="number" {...register("minStockLevel")} className="input-field" min={0} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">สถานที่จัดเก็บ *</label>
                <select {...register("locationId")} className="input-field">
                  <option value="">เลือกสถานที่</option>
                  {locations.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                {errors.locationId && <p className="text-xs text-red-500 mt-1">{errors.locationId.message}</p>}
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">หมายเหตุ</label>
                <textarea {...register("notes")} rows={3} className="input-field resize-none" placeholder="รายละเอียดเพิ่มเติม..." />
              </div>
            </div>
          </div>

          {/* Note: quantity is managed via adjustment page, not here */}
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl px-4 py-3 text-xs text-blue-700 dark:text-blue-400">
            หากต้องการปรับจำนวนสต็อก ให้ใช้หน้า <strong>เติมสต็อก</strong> แทน
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={updateItem.isPending || !isDirty}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-[#1D4ED8] text-white rounded-xl hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors"
            >
              {updateItem.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              บันทึก
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
