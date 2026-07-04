"use client";

import { useState } from "react";
import { HelpCircle, X, Share, MoreVertical, Plus, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ---- SVG Illustrations ----

function IllustSafariShare() {
  return (
    <svg viewBox="0 0 120 72" fill="none" className="w-full h-full">
      {/* Phone bottom bar */}
      <rect x="4" y="4" width="112" height="64" rx="10" fill="#F3F4F6" />
      <rect x="10" y="10" width="100" height="44" rx="6" fill="#fff" />
      {/* address bar */}
      <rect x="14" y="14" width="68" height="10" rx="3" fill="#E5E7EB" />
      <text x="18" y="21.5" fontSize="5.5" fill="#9CA3AF">stoxy.vercel.app</text>
      {/* Safari bottom toolbar */}
      <rect x="10" y="56" width="100" height="8" rx="4" fill="#E5E7EB" />
      {/* Share icon highlight */}
      <rect x="50" y="54" width="20" height="12" rx="4" fill="#3B82F6" opacity="0.15" />
      <rect x="55" y="57" width="10" height="6" rx="1" fill="none" stroke="#3B82F6" strokeWidth="1.2" />
      <line x1="60" y1="57" x2="60" y2="53" stroke="#3B82F6" strokeWidth="1.2" strokeLinecap="round" />
      <polyline points="57,55 60,52 63,55" fill="none" stroke="#3B82F6" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* tap ripple */}
      <circle cx="60" cy="60" r="7" stroke="#3B82F6" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.6" />
    </svg>
  );
}

function IllustAddToHome() {
  return (
    <svg viewBox="0 0 120 72" fill="none" className="w-full h-full">
      <rect x="4" y="4" width="112" height="64" rx="10" fill="#F3F4F6" />
      {/* Share sheet */}
      <rect x="10" y="24" width="100" height="44" rx="8" fill="#fff" />
      <text x="16" y="36" fontSize="5" fill="#6B7280">เพิ่มบุ๊คมาร์ค</text>
      <text x="16" y="46" fontSize="5" fill="#6B7280">เพิ่มในรายการอ่านภายหลัง</text>
      {/* highlighted row */}
      <rect x="10" y="50" width="100" height="12" rx="4" fill="#EFF6FF" />
      <text x="16" y="58.5" fontSize="5.5" fontWeight="600" fill="#1D4ED8">เพิ่มในหน้าจอหลัก</text>
      <rect x="95" y="52" width="8" height="8" rx="2" fill="#1D4ED8" opacity="0.15" />
      <line x1="96.5" y1="56" x2="102.5" y2="56" stroke="#1D4ED8" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="99.5" y1="53" x2="99.5" y2="59" stroke="#1D4ED8" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IllustConfirmAdd() {
  return (
    <svg viewBox="0 0 120 72" fill="none" className="w-full h-full">
      <rect x="4" y="4" width="112" height="64" rx="10" fill="#F3F4F6" />
      {/* dialog */}
      <rect x="20" y="12" width="80" height="48" rx="8" fill="#fff" />
      <text x="60" y="26" fontSize="5.5" fontWeight="700" fill="#111827" textAnchor="middle">เพิ่ม STOXY</text>
      {/* icon preview */}
      <rect x="50" y="28" width="20" height="14" rx="4" fill="#1D4ED8" />
      <text x="60" y="38" fontSize="7" fontWeight="900" fill="#fff" textAnchor="middle">S</text>
      {/* Add button highlighted */}
      <rect x="76" y="48" width="18" height="8" rx="3" fill="#1D4ED8" />
      <text x="85" y="53.5" fontSize="5" fill="#fff" textAnchor="middle">เพิ่ม</text>
      {/* Cancel */}
      <text x="36" y="53.5" fontSize="5" fill="#6B7280" textAnchor="middle">ยกเลิก</text>
    </svg>
  );
}

function IllustChromeMenu() {
  return (
    <svg viewBox="0 0 120 72" fill="none" className="w-full h-full">
      <rect x="4" y="4" width="112" height="64" rx="10" fill="#F3F4F6" />
      <rect x="10" y="10" width="100" height="52" rx="6" fill="#fff" />
      {/* address bar */}
      <rect x="14" y="14" width="78" height="10" rx="3" fill="#E5E7EB" />
      <text x="18" y="21.5" fontSize="5.5" fill="#9CA3AF">stoxy.vercel.app</text>
      {/* 3-dot menu highlight */}
      <rect x="96" y="12" width="12" height="14" rx="3" fill="#3B82F6" opacity="0.12" />
      <circle cx="102" cy="16" r="1.2" fill="#3B82F6" />
      <circle cx="102" cy="19" r="1.2" fill="#3B82F6" />
      <circle cx="102" cy="22" r="1.2" fill="#3B82F6" />
      {/* ripple */}
      <circle cx="102" cy="19" r="7" stroke="#3B82F6" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.6" />
    </svg>
  );
}

function IllustAndroidMenu() {
  return (
    <svg viewBox="0 0 120 72" fill="none" className="w-full h-full">
      <rect x="4" y="4" width="112" height="64" rx="10" fill="#F3F4F6" />
      <rect x="10" y="10" width="100" height="52" rx="6" fill="#fff" />
      <rect x="14" y="14" width="78" height="10" rx="3" fill="#E5E7EB" />
      <text x="18" y="21.5" fontSize="5.5" fill="#9CA3AF">stoxy.vercel.app</text>
      {/* 3-dot menu highlight */}
      <rect x="96" y="12" width="12" height="14" rx="3" fill="#22C55E" opacity="0.12" />
      <circle cx="102" cy="16" r="1.2" fill="#16A34A" />
      <circle cx="102" cy="19" r="1.2" fill="#16A34A" />
      <circle cx="102" cy="22" r="1.2" fill="#16A34A" />
      <circle cx="102" cy="19" r="7" stroke="#16A34A" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.6" />
    </svg>
  );
}

function IllustAndroidInstall() {
  return (
    <svg viewBox="0 0 120 72" fill="none" className="w-full h-full">
      <rect x="4" y="4" width="112" height="64" rx="10" fill="#F3F4F6" />
      {/* dropdown menu */}
      <rect x="50" y="8" width="66" height="56" rx="6" fill="#fff" stroke="#E5E7EB" strokeWidth="0.8" />
      <text x="58" y="22" fontSize="4.5" fill="#6B7280">รีเฟรช</text>
      <text x="58" y="32" fontSize="4.5" fill="#6B7280">บุ๊คมาร์ค</text>
      <rect x="50" y="36" width="66" height="12" rx="0" fill="#F0FDF4" />
      <text x="58" y="44.5" fontSize="4.5" fontWeight="700" fill="#16A34A">เพิ่มในหน้าจอหลัก</text>
      <text x="58" y="56" fontSize="4.5" fill="#6B7280">ประวัติ</text>
    </svg>
  );
}

// ---- Step Data ----

const IOS_SAFARI_STEPS = [
  {
    icon: <Share className="w-4 h-4 text-blue-500" />,
    title: 'กดปุ่ม "แชร์"',
    desc: "ไอคอนกล่องมีลูกศรขึ้น ที่แถบเมนูล่างของ Safari",
    illust: <IllustSafariShare />,
  },
  {
    icon: <Plus className="w-4 h-4 text-blue-500" />,
    title: '"เพิ่มในหน้าจอหลัก"',
    desc: "เลื่อนลงในเมนูแชร์ แล้วกดตัวเลือกนี้",
    illust: <IllustAddToHome />,
  },
  {
    icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    title: 'กด "เพิ่ม" เพื่อยืนยัน',
    desc: "แอพจะปรากฏบนหน้าจอหลัก พร้อมใช้งานเหมือนแอพปกติ",
    illust: <IllustConfirmAdd />,
  },
];

const IOS_CHROME_STEPS = [
  {
    icon: <MoreVertical className="w-4 h-4 text-blue-500" />,
    title: 'กดเมนู "⋮" มุมขวาบน',
    desc: "ในแถบด้านบนของ Chrome หรือกดปุ่มแชร์ที่แถบที่อยู่",
    illust: <IllustChromeMenu />,
  },
  {
    icon: <Plus className="w-4 h-4 text-blue-500" />,
    title: '"เพิ่มในหน้าจอหลัก"',
    desc: 'เลือก "Add to Home Screen" หรือ "เพิ่มในหน้าจอหลัก"',
    illust: <IllustAddToHome />,
  },
  {
    icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    title: 'กด "เพิ่ม" เพื่อยืนยัน',
    desc: "แอพจะปรากฏบนหน้าจอหลัก พร้อมใช้งานเหมือนแอพปกติ",
    illust: <IllustConfirmAdd />,
  },
];

const ANDROID_STEPS = [
  {
    icon: <MoreVertical className="w-4 h-4 text-green-600" />,
    title: 'กดเมนู "⋮" มุมขวาบน',
    desc: "ในเบราว์เซอร์ Chrome บน Android",
    illust: <IllustAndroidMenu />,
  },
  {
    icon: <Plus className="w-4 h-4 text-green-600" />,
    title: '"เพิ่มในหน้าจอหลัก"',
    desc: 'กด "Add to Home screen" หรือ "ติดตั้งแอพ"',
    illust: <IllustAndroidInstall />,
  },
  {
    icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    title: 'กด "ติดตั้ง" เพื่อยืนยัน',
    desc: "แอพจะปรากฏบนหน้าจอหลักทันที",
    illust: <IllustConfirmAdd />,
  },
];

type TabId = "ios-safari" | "ios-chrome" | "android";
const TABS: { id: TabId; label: string }[] = [
  { id: "ios-safari", label: "🍎 Safari" },
  { id: "ios-chrome", label: "🍎 Chrome" },
  { id: "android", label: "🤖 Android" },
];

const STEPS: Record<TabId, typeof IOS_SAFARI_STEPS> = {
  "ios-safari": IOS_SAFARI_STEPS,
  "ios-chrome": IOS_CHROME_STEPS,
  android: ANDROID_STEPS,
};

const NOTES: Record<TabId, string> = {
  "ios-safari": "ใช้งานบน iPhone / iPad ผ่าน Safari",
  "ios-chrome": "ใช้งานบน iPhone / iPad ผ่าน Google Chrome",
  android: "รองรับ Chrome, Edge และเบราว์เซอร์ส่วนใหญ่บน Android",
};

function StepList({ steps }: { steps: typeof IOS_SAFARI_STEPS }) {
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
          {/* illustration */}
          <div className="w-20 h-12 shrink-0 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            {s.illust}
          </div>
        </div>
      ))}
    </div>
  );
}

export function HelpButton({ className = "", label }: { className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("ios-safari");

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

              {/* Tabs */}
              <div className="flex mx-5 mb-4 bg-gray-100 dark:bg-gray-700 rounded-xl p-1 gap-1">
                {TABS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      tab === t.id
                        ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-400"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Steps */}
              <div className="px-5 pb-5">
                <StepList steps={STEPS[tab]} />
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    💡 {NOTES[tab]}
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
