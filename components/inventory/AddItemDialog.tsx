"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Package, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCreateInventoryItem, useInventoryItems } from "@/hooks/useInventory";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { generateItemCode } from "@/lib/utils";
import { getLocations, addLocation } from "@/services/locations.service";

const UNIT_OPTIONS = ["ชิ้น", "อัน", "ม้วน", "เมตร", "กล่อง", "ชุด", "แผ่น", "ขด", "โหล", "ถุง", "อื่นๆ"];

const schema = z.object({
  name: z.string().min(2, "กรุณากรอกชื่ออุปกรณ์"),
  code: z.string().min(2, "กรุณากรอกรหัสอุปกรณ์"),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  unit: z.string().optional(),
  categoryId: z.string().min(1, "กรุณาเลือกหมวดหมู่"),
  locationId: z.string().min(1, "กรุณาระบุสถานที่"),
  quantity: z.coerce.number().min(1, "จำนวนต้องมากกว่า 0"),
  minStockLevel: z.coerce.number().min(0),
  condition: z.enum(["excellent", "good", "fair", "poor", "broken"]),
  notes: z.string().optional(),
  requiresCalibration: z.boolean(),
  requiresMaintenance: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface AddItemDialogProps {
  open: boolean;
  onClose: () => void;
}

const tabs = [
  { id: "basic", label: "ข้อมูลพื้นฐาน" },
  { id: "stock", label: "สต็อก & สถานที่" },
  { id: "technical", label: "เทคนิค" },
];

const CATEGORY_LABEL: Record<string, string> = {
  meter: "มิเตอร์และเครื่องวัด",
  tools: "เครื่องมือช่าง",
  safety: "อุปกรณ์ PPE",
  electrical_parts: "อุปกรณ์ไฟฟ้า",
  cable: "สายและท่อร้อยสาย",
  spareparts: "อะไหล่และวัสดุ",
};

const DEFAULT_VALUES = {
  code: "",
  quantity: 1,
  minStockLevel: 1,
  condition: "good" as const,
  requiresCalibration: false,
  requiresMaintenance: false,
};

export function AddItemDialog({ open, onClose }: AddItemDialogProps) {
  const { stoxyUser } = useAuth();
  const [activeTab, setActiveTab] = useState("basic");
  const createItem = useCreateInventoryItem();
  const { data: items = [] } = useInventoryItems();
  const [locations, setLocations] = useState<string[]>([]);
  const [customLocation, setCustomLocation] = useState("");
  const [customLocationError, setCustomLocationError] = useState(false);
  const [customUnit, setCustomUnit] = useState("");

  useEffect(() => {
    getLocations().then(setLocations);
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData, unknown, FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: DEFAULT_VALUES,
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      reset(DEFAULT_VALUES);
      setActiveTab("basic");
      setCustomLocation("");
      setCustomLocationError(false);
      setCustomUnit("");
    }
  }, [open, reset]);

  const categoryId = watch("categoryId");
  const locationId = watch("locationId");
  const unitValue = watch("unit");

  // Auto-generate code when category changes
  useEffect(() => {
    if (!categoryId) return;
    const existingCodes = items.map((i) => i.code);
    setValue("code", generateItemCode(categoryId, existingCodes));
  }, [categoryId, items, setValue]);

  async function onSubmit(data: FormData) {
    // Guard: อื่นๆ but no custom text
    if (data.locationId === "__other__") {
      if (!customLocation.trim()) {
        setCustomLocationError(true);
        return;
      }
      const updated = await addLocation(customLocation.trim());
      setLocations(updated);
      data = { ...data, locationId: customLocation.trim() };
    }

    // Resolve custom unit
    const resolvedUnit = data.unit === "อื่นๆ" ? customUnit.trim() || undefined : data.unit || undefined;

    try {
      await createItem.mutateAsync({
        ...data,
        unit: resolvedUnit,
        status: "available",
        quantityAvailable: data.quantity,
        quantityBorrowed: 0,
        quantityUnderRepair: 0,
        categoryName: CATEGORY_LABEL[data.categoryId] ?? data.categoryId,
        locationName: data.locationId,
        createdBy: stoxyUser?.uid ?? "",
      } as any);
      toast.success("เพิ่มอุปกรณ์สำเร็จ");
      onClose();
    } catch (e) {
      toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, pointerEvents: "none" }}
          animate={{ opacity: 1, pointerEvents: "auto" }}
          exit={{ opacity: 0, pointerEvents: "none" }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#1D4ED8] rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    เพิ่มอุปกรณ์ใหม่
                  </h2>
                  <p className="text-xs text-gray-500">กรอกข้อมูลอุปกรณ์ไฟฟ้า</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 dark:border-gray-800 px-6">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                    activeTab === t.id
                      ? "border-[#1D4ED8] text-[#1D4ED8] dark:border-yellow-400 dark:text-yellow-400"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {/* Basic Tab */}
                {activeTab === "basic" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          ชื่ออุปกรณ์ *
                        </label>
                        <input
                          {...register("name")}
                          className="input-field"
                          placeholder="เช่น มิเตอร์วัดกระแสไฟฟ้า"
                        />
                        {errors.name && (
                          <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          รหัสอุปกรณ์ *
                        </label>
                        <input
                          {...register("code")}
                          className="input-field font-mono"
                          placeholder="ELEC-00001"
                        />
                        {errors.code && (
                          <p className="text-xs text-red-500 mt-1">{errors.code.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          ยี่ห้อ
                        </label>
                        <input
                          {...register("brand")}
                          className="input-field"
                          placeholder="Fluke, Hioki..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          รุ่น
                        </label>
                        <input {...register("model")} className="input-field" placeholder="รุ่น..." />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Serial Number
                        </label>
                        <input
                          {...register("serialNumber")}
                          className="input-field font-mono"
                          placeholder="SN..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          หน่วยนับ
                        </label>
                        <select {...register("unit")} className="input-field">
                          <option value="">— ไม่ระบุ —</option>
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
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
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          หมวดหมู่ *
                        </label>
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
                        {errors.categoryId && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.categoryId.message}
                          </p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          สภาพ *
                        </label>
                        <select {...register("condition")} className="input-field">
                          <option value="excellent">ดีมาก</option>
                          <option value="good">ดี</option>
                          <option value="fair">พอใช้</option>
                          <option value="poor">แย่</option>
                          <option value="broken">เสีย</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* Stock Tab */}
                {activeTab === "stock" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          จำนวน *
                        </label>
                        <input
                          type="number"
                          {...register("quantity")}
                          className="input-field"
                          min={1}
                        />
                        {errors.quantity && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.quantity.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          ขั้นต่ำ (แจ้งเตือน)
                        </label>
                        <input
                          type="number"
                          {...register("minStockLevel")}
                          className="input-field"
                          min={0}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        สถานที่จัดเก็บ *
                      </label>
                      <select {...register("locationId")} className="input-field">
                        <option value="">เลือกสถานที่</option>
                        {locations.map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
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
                          {customLocationError && (
                            <p className="text-xs text-red-500 mt-1">กรุณาระบุสถานที่</p>
                          )}
                        </>
                      )}
                      {errors.locationId && locationId !== "__other__" && (
                        <p className="text-xs text-red-500 mt-1">
                          {errors.locationId.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        หมายเหตุ
                      </label>
                      <textarea
                        {...register("notes")}
                        rows={3}
                        className="input-field resize-none"
                        placeholder="รายละเอียดเพิ่มเติม..."
                      />
                    </div>
                  </div>
                )}

                {/* Technical Tab */}
                {activeTab === "technical" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          ต้องสอบเทียบ
                        </p>
                        <p className="text-xs text-gray-500">
                          ตั้งค่าวันสอบเทียบครั้งถัดไป
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          {...register("requiresCalibration")}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:bg-purple-600 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                      </label>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-orange-100 dark:border-orange-900">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          ต้องซ่อมบำรุง
                        </p>
                        <p className="text-xs text-gray-500">ตั้งค่าการซ่อมบำรุงป้องกัน</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          {...register("requiresMaintenance")}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:bg-orange-600 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <div className="flex gap-2">
                  {activeTab !== "basic" && (
                    <button
                      type="button"
                      onClick={() =>
                        setActiveTab(
                          activeTab === "technical" ? "stock" : "basic"
                        )
                      }
                      className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      ย้อนกลับ
                    </button>
                  )}
                  {activeTab !== "technical" ? (
                    <button
                      type="button"
                      onClick={() =>
                        setActiveTab(activeTab === "basic" ? "stock" : "technical")
                      }
                      className="px-4 py-2 text-sm font-medium bg-[#1D4ED8] text-white rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      ถัดไป
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={createItem.isPending}
                      className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-[#1D4ED8] text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60"
                    >
                      {createItem.isPending && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      บันทึกอุปกรณ์
                    </button>
                  )}
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
