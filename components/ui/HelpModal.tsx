"use client";

import { useState } from "react";
import { HelpCircle, X, Share, MoreVertical, Plus, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const IOS_STEPS = [
  {
    icon: <Share className="w-5 h-5 text-blue-500" />,
    title: 'กดปุ่ม "แชร์"',
    desc: "ที่แถบเมนูล่างของ Safari (ไอคอนกล่องมีลูกศรขึ้น)",
  },
  {
    icon: <Plus className="w-5 h-5 text-blue-500" />,
    title: '"Add to Home Screen"',
    desc: 'เลื่อนลงในเมนูแล้วกด "เพิ่มในหน้าจอหลัก"',
  },
  {
    icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    title: 'กด "เพิ่ม" เพื่อยืนยัน',
    desc: "แอพจะปรากฏบนหน้าจอหลัก พร้อมใช้งานเหมือนแอพปกติ",
  },
];

const ANDROID_STEPS = [
  {
    icon: <MoreVertical className="w-5 h-5 text-blue-500" />,
    title: 'กดเมนู "⋮" มุมขวาบน',
    desc: "ในเบราว์เซอร์ Chrome",
  },
  {
    icon: <Plus className="w-5 h-5 text-blue-500" />,
    title: '"Add to Home screen"',
    desc: 'กด "เพิ่มในหน้าจอหลัก" หรือ "ติดตั้งแอพ"',
  },
  {
    icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    title: 'กด "ติดตั้ง" เพื่อยืนยัน',
    desc: "แอพจะปรากฏบนหน้าจอหลักทันที",
  },
];

function StepList({ steps }: { steps: typeof IOS_STEPS }) {
  return (
    <div className="space-y-3">
      {steps.map((s, i) => (
        <div key={i} className="flex gap-3 items-start">
          <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center shrink-0">
            {s.icon}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{s.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function HelpButton({ className = "", label }: { className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"ios" | "android">("ios");

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="วิธีติดตั้งแอพบนมือถือ"
        className={`flex items-center gap-1.5 rounded-full transition-colors ${label ? "px-3 py-1.5" : "w-8 h-8 justify-center"} ${className}`}
      >
        <HelpCircle className="w-4 h-4 shrink-0" />
        {label && <span className="text-xs font-medium whitespace-nowrap">{label}</span>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">ติดตั้ง STOXY บนมือถือ</p>
                  <p className="text-xs text-gray-400 mt-0.5">ทำครั้งเดียว ใช้งานได้เหมือนแอพจริง ไม่ต้องโหลด Store</p>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ml-3">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* OS Tab */}
              <div className="flex mx-5 mb-4 bg-gray-100 dark:bg-gray-700 rounded-xl p-1 gap-1">
                {(["ios", "android"] as const).map(os => (
                  <button
                    key={os}
                    onClick={() => setTab(os)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      tab === os
                        ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-400"
                    }`}
                  >
                    {os === "ios" ? "🍎  iPhone / iPad" : "🤖  Android"}
                  </button>
                ))}
              </div>

              {/* Steps */}
              <div className="px-5 pb-5">
                <StepList steps={tab === "ios" ? IOS_STEPS : ANDROID_STEPS} />

                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    💡 {tab === "ios"
                      ? "ต้องใช้ Safari เท่านั้น (ไม่รองรับบน Chrome บน iOS)"
                      : "รองรับ Chrome, Edge และเบราว์เซอร์ส่วนใหญ่บน Android"}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
