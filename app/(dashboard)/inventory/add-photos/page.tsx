"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { arrayUnion, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { uploadImages } from "@/lib/upload";
import { useInventoryItems } from "@/hooks/useInventory";
import { AppShell } from "@/components/layout/AppShell";
import { ArrowLeft, Camera, CheckCircle, ImagePlus, Loader2, Package, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { InventoryItem } from "@/types";

export default function AddPhotosPage() {
  const router = useRouter();
  const { data: items = [], isLoading, refetch } = useInventoryItems();

  // uploading: itemId → true while in-flight
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  // preview files per item before upload
  const [pending, setPending] = useState<Record<string, File[]>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});


  function pickFiles(itemId: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    const valid = Array.from(files).filter((f) => {
      if (!f.type.startsWith("image/")) { toast.error(`${f.name} ไม่ใช่ไฟล์รูปภาพ`); return false; }
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name} ใหญ่เกิน 10 MB`); return false; }
      return true;
    });
    if (valid.length === 0) return;
    setPending((prev) => ({ ...prev, [itemId]: [...(prev[itemId] ?? []), ...valid] }));
    // reset input so same file can be picked again
    if (inputRefs.current[itemId]) inputRefs.current[itemId]!.value = "";
  }

  function removePending(itemId: string, idx: number) {
    setPending((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] ?? []).filter((_, i) => i !== idx),
    }));
  }

  async function upload(item: InventoryItem) {
    const files = pending[item.id] ?? [];
    if (files.length === 0) return;
    if (uploading[item.id]) return; // guard double-submit
    setUploading((prev) => ({ ...prev, [item.id]: true }));
    try {
      const urls = await uploadImages(files, `inventory/${item.id}`);
      await updateDoc(doc(db, "inventory_items", item.id), {
        images: arrayUnion(...urls),
      });
      setPending((prev) => ({ ...prev, [item.id]: [] }));
      refetch();
      toast.success(`อัปโหลดรูป ${item.name} สำเร็จ`);
    } catch (e: unknown) {
      toast.error((e as Error).message ?? "อัปโหลดไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setUploading((prev) => ({ ...prev, [item.id]: false }));
    }
  }

  async function removeExisting(item: InventoryItem, url: string) {
    const next = (item.images ?? []).filter((u) => u !== url);
    await updateDoc(doc(db, "inventory_items", item.id), { images: next });
    refetch();
    toast.success("ลบรูปแล้ว");
  }

  return (
    <AppShell title="เพิ่มรูปอุปกรณ์">
      <div className="mb-5 flex items-center gap-3">
        <button
          onClick={() => router.push("/inventory")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> กลับ
        </button>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">เพิ่มรูปอุปกรณ์</h2>
          <p className="text-xs text-gray-400">คลิก + เพื่อเลือกรูป แล้วกด "บันทึก"</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const files = pending[item.id] ?? [];
            const busy = uploading[item.id] ?? false;
            const existing = item.images ?? [];
            return (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4"
              >
                {/* Item header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 flex items-center justify-center">
                    {existing[0] ? (
                      <img src={existing[0]} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.code}</p>
                  </div>
                  {existing.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <CheckCircle className="w-3 h-3" />
                      {existing.length} รูป
                    </span>
                  )}
                </div>

                {/* Existing photos */}
                {existing.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-3">
                    {existing.map((url) => (
                      <div key={url} className="relative group w-16 h-16 rounded-xl overflow-hidden border border-gray-100">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeExisting(item, url)}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pending previews */}
                {files.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-3">
                    {files.map((f, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-dashed border-blue-300">
                        <img
                          src={URL.createObjectURL(f)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removePending(item.id, idx)}
                          className="absolute top-0.5 right-0.5 bg-white rounded-full p-0.5 shadow"
                        >
                          <X className="w-3 h-3 text-gray-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <input
                    ref={(el) => { inputRefs.current[item.id] = el; }}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => pickFiles(item.id, e.target.files)}
                  />
                  <button
                    onClick={() => inputRefs.current[item.id]?.click()}
                    disabled={busy}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    เพิ่มรูป
                  </button>
                  {files.length > 0 && (
                    <button
                      onClick={() => upload(item)}
                      disabled={busy}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-xl transition-colors",
                        busy ? "bg-blue-400" : "bg-[#1D4ED8] hover:bg-blue-700"
                      )}
                    >
                      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                      {busy ? "กำลังบันทึก..." : `บันทึก (${files.length})`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
