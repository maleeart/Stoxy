"use client";

import { use, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { arrayUnion, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AppShell } from "@/components/layout/AppShell";
import { useInventoryItem, useUpdateInventoryItem } from "@/hooks/useInventory";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getLocations, addLocation } from "@/services/locations.service";
import { compressImages } from "@/lib/compress";
import { adjustStock } from "@/services/inventory.service";

const CATEGORY_LABEL: Record<string, string> = {
  meter: "มิเตอร์และเครื่องวัด",
  tools: "เครื่องมือช่าง",
  safety: "อุปกรณ์ PPE",
  electrical_parts: "อุปกรณ์ไฟฟ้า",
  cable: "สายและท่อร้อยสาย",
  spareparts: "อะไหล่และวัสดุ",
};

const DEFAULT_UNITS = ["อัน", "ชุด", "ตัว", "ม้วน", "เส้น", "แผ่น", "กล่อง", "ถุง", "คู่", "ชิ้น", "ขวด", "อื่นๆ"];

async function getUnitOptions(): Promise<string[]> {
  const snap = await getDoc(doc(db, "settings", "units"));
  const items: string[] = snap.exists() ? (snap.data().items as string[]) : DEFAULT_UNITS;
  return items.includes("อื่นๆ") ? items : [...items, "อื่นๆ"];
}

const schema = z.object({
  name: z.string().min(2, "กรุณากรอกชื่ออุปกรณ์"),
  code: z.string().min(2, "กรุณากรอกรหัสอุปกรณ์"),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  unit: z.string().optional(),
  categoryId: z.string().min(1, "กรุณาเลือกหมวดหมู่"),
  locationId: z.string().min(1, "กรุณาระบุสถานที่"),
  quantityAvailable: z.coerce.number().min(0, "จำนวนต้องไม่ติดลบ"),
  minStockLevel: z.coerce.number().min(0),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { stoxyUser } = useAuth();
  const { data: item, isLoading, refetch } = useInventoryItem(id);
  const updateItem = useUpdateInventoryItem();

  const [locations, setLocations] = useState<string[]>([]);
  const [unitOptions, setUnitOptions] = useState<string[]>(DEFAULT_UNITS);
  const [customLocation, setCustomLocation] = useState("");
  const [customLocationError, setCustomLocationError] = useState(false);
  const [customUnit, setCustomUnit] = useState("");

  // Photo state
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getLocations().then(setLocations);
    getUnitOptions().then(setUnitOptions);
  }, []);

  const { register, handleSubmit, reset, watch, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
  });

  useEffect(() => {
    if (!item) return;
    reset({
      name: item.name,
      code: item.code,
      brand: item.brand ?? "",
      model: item.model ?? "",
      serialNumber: item.serialNumber ?? "",
      unit: item.unit ?? "",
      categoryId: item.categoryId,
      locationId: item.locationId,
      quantityAvailable: item.quantityAvailable ?? 0,
      minStockLevel: item.minStockLevel ?? 0,
      notes: item.notes ?? "",
    });
    if (item.unit && !DEFAULT_UNITS.includes(item.unit)) {
      setCustomUnit(item.unit);
    }
  }, [item, reset]);

  const locationId = watch("locationId");
  const unitValue = watch("unit");

  async function onSubmit(data: FormData) {
    if (data.locationId === "__other__") {
      if (!customLocation.trim()) { setCustomLocationError(true); return; }
      const updated = await addLocation(customLocation.trim());
      setLocations(updated);
      data = { ...data, locationId: customLocation.trim() };
    }

    const resolvedUnit = data.unit === "อื่นๆ" ? customUnit.trim() || undefined : data.unit || undefined;
    const { quantityAvailable, ...rest } = data;

    try {
      setUploadingPhotos(newFiles.length > 0);
      let extraImages: string[] = [];
      if (newFiles.length > 0) {
        extraImages = await compressImages(newFiles);
        await updateDoc(doc(db, "inventory_items", id), { images: arrayUnion(...extraImages) });
      }

      const delta = quantityAvailable - (item?.quantityAvailable ?? 0);
      if (delta !== 0) {
        await adjustStock({
          itemId: id,
          type: delta > 0 ? "adjustment_in" : "adjustment_out",
          quantity: Math.abs(delta),
          reason: "แก้ไขจำนวนจากหน้าแก้ไขอุปกรณ์",
          performedBy: stoxyUser?.uid ?? "",
          performedByName: stoxyUser?.displayName ?? "",
        });
      }

      await updateItem.mutateAsync({
        id,
        data: {
          ...rest,
          unit: resolvedUnit,
          categoryName: CATEGORY_LABEL[data.categoryId] ?? data.categoryId,
          locationName: data.locationId === "__other__" ? customLocation.trim() : data.locationId,
        },
      });

      toast.success("บันทึกสำเร็จ");
      refetch();
      router.push(`/inventory/${id}`);
    } catch {
      toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setUploadingPhotos(false);
    }
  }

  async function removeExistingPhoto(url: string) {
    if (!item) return;
    const next = (item.images ?? []).filter((u) => u !== url);
    await updateDoc(doc(db, "inventory_items", id), { images: next });
    refetch();
    toast.success("ลบรูปแล้ว");
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

  const isBusy = updateItem.isPending || uploadingPhotos;

  return (
    <AppShell title={`แก้ไข: ${item.name}`}>
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> กลับ
          </button>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">แก้ไขอุปกรณ์</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* ข้อมูลพื้นฐาน */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">ข้อมูลพื้นฐาน</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">ชื่ออุปกรณ์ *</label>
                <input {...register("name")} className="input-field" placeholder="เช่น มิเตอร์วัดกระแสไฟฟ้า" />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">รหัสอุปกรณ์ *</label>
                <input {...register("code")} className="input-field font-mono" />
                {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">หมวดหมู่ *</label>
                <select {...register("categoryId")} className="input-field">
                  <option value="">เลือกหมวดหมู่</option>
                  <optgroup label="— ยืม —">
                    <option value="meter">มิเตอร์และเครื่องวัด</option>
                    <option value="tools">เครื่องมือช่าง</option>
                    <option value="safety">อุปกรณ์ PPE</option>
                  </optgroup>
                  <optgroup label="— เบิก —">
                    <option value="electrical_parts">อุปกรณ์ไฟฟ้า</option>
                    <option value="cable">สายและท่อร้อยสาย</option>
                    <option value="spareparts">อะไหล่และวัสดุ</option>
                  </optgroup>
                </select>
                {errors.categoryId && <p className="text-xs text-red-500 mt-1">{errors.categoryId.message}</p>}
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
                <input {...register("serialNumber")} className="input-field font-mono" placeholder="SN..." />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">หน่วยนับ</label>
                <select {...register("unit")} className="input-field">
                  <option value="">— ไม่ระบุ —</option>
                  {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
                {unitValue === "อื่นๆ" && (
                  <input
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    className="input-field mt-2"
                    placeholder="ระบุหน่วย เช่น กิโลกรัม, ลิตร..."
                    autoFocus
                  />
                )}
              </div>
            </div>
          </div>

          {/* สต็อก & สถานที่ */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">สต็อก & สถานที่</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">จำนวนคงเหลือ *</label>
                <input type="number" {...register("quantityAvailable")} className="input-field" min={0} />
                {errors.quantityAvailable && <p className="text-xs text-red-500 mt-1">{errors.quantityAvailable.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">ขั้นต่ำ (แจ้งเตือน)</label>
                <input type="number" {...register("minStockLevel")} className="input-field" min={0} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">สถานที่จัดเก็บ *</label>
                <select {...register("locationId")} className="input-field">
                  <option value="">เลือกสถานที่</option>
                  {locations.map((l) => <option key={l} value={l}>{l}</option>)}
                  <option value="__other__">+ อื่นๆ (ระบุเอง)</option>
                </select>
                {locationId === "__other__" && (
                  <>
                    <input
                      value={customLocation}
                      onChange={(e) => { setCustomLocation(e.target.value); setCustomLocationError(false); }}
                      className={`input-field mt-2 ${customLocationError ? "border-red-400" : ""}`}
                      placeholder="ระบุสถานที่ใหม่..."
                      autoFocus
                    />
                    {customLocationError && <p className="text-xs text-red-500 mt-1">กรุณาระบุสถานที่</p>}
                  </>
                )}
                {errors.locationId && locationId !== "__other__" && (
                  <p className="text-xs text-red-500 mt-1">{errors.locationId.message}</p>
                )}
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">หมายเหตุ</label>
                <textarea {...register("notes")} rows={3} className="input-field resize-none" placeholder="รายละเอียดเพิ่มเติม..." />
              </div>
            </div>
          </div>

          {/* รูปภาพ */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">รูปภาพ</h3>

            {/* Existing photos */}
            {(item.images ?? []).length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {(item.images ?? []).map((url) => (
                  <div key={url} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExistingPhoto(url)}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* New photo previews */}
            {newPreviews.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {newPreviews.map((src, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-dashed border-blue-300">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setNewFiles((p) => p.filter((_, j) => j !== i));
                        setNewPreviews((p) => p.filter((_, j) => j !== i));
                      }}
                      className="absolute top-0.5 right-0.5 bg-white dark:bg-gray-900 rounded-full p-0.5 shadow"
                    >
                      <Trash2 className="w-3 h-3 text-gray-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                setNewFiles((p) => [...p, ...files]);
                setNewPreviews((p) => [...p, ...files.map((f) => URL.createObjectURL(f))]);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <ImagePlus className="w-4 h-4" /> เพิ่มรูปภาพ
            </button>
          </div>

          {/* Actions */}
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
              disabled={isBusy || (!isDirty && newFiles.length === 0)}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-[#1D4ED8] text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              บันทึก
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
