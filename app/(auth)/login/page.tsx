"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserCircle2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { loginWithGoogle, loginAsGuest } from "@/services/auth.service";
import { toast } from "sonner";
import { HelpButton } from "@/components/ui/HelpModal";

export default function LoginPage() {
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [guestModal, setGuestModal] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestDept, setGuestDept] = useState("");
  const [guestLoading, setGuestLoading] = useState(false);

  async function handleGoogle() {
    try {
      setGoogleLoading(true);
      await loginWithGoogle();
      router.push("/dashboard");
    } catch {
      toast.error("เข้าสู่ระบบด้วย Google ไม่สำเร็จ");
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleGuest() {
    if (!guestName.trim()) { toast.error("กรุณากรอกชื่อ"); return; }
    try {
      setGuestLoading(true);
      await loginAsGuest(guestName.trim(), guestDept.trim());
      router.push("/borrow");
    } catch (err: any) {
      console.error("Guest login error:", err?.code, err?.message);
      toast.error(err?.code === "auth/operation-not-allowed"
        ? "กรุณาเปิด Anonymous Auth ใน Firebase Console ก่อน"
        : `เข้าสู่ระบบไม่สำเร็จ: ${err?.code ?? err?.message}`);
    } finally {
      setGuestLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1D4ED8] to-[#0ea5c2] flex">
      {/* Left - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-white"
              style={{
                width: `${(i + 1) * 60}px`,
                height: `${(i + 1) * 60}px`,
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 text-center"
        >
          <img src="/logo.png" alt="Stoxy" className="w-20 h-20 rounded-3xl mx-auto mb-6 shadow-2xl shadow-black/30" />
          <h1 className="text-5xl font-bold text-white mb-3 tracking-tight" style={{ fontFamily: "var(--font-geist-sans, inherit)" }}>
            STOXY
          </h1>
          <p className="text-white/75 text-sm leading-relaxed mb-2">
            Smart Tracking, Organization,<br />
            e<span className="text-yellow-400 font-semibold">X</span>change &amp; Efficiency
          </p>
          <p className="text-yellow-400 font-semibold text-base mb-10 italic">
            Track Smarter. Work Faster.
          </p>

          <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
            {[
              { label: "อุปกรณ์", value: "∞" },
              { label: "ทำงานได้ทุกที่", value: "PWA" },
              { label: "ไม่ใช้กระดาษ", value: "100%" },
              { label: "ความปลอดภัย", value: "✓" },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white/10 backdrop-blur rounded-xl p-3 text-center"
              >
                <p className="text-yellow-400 font-bold text-lg">{s.value}</p>
                <p className="text-white/75 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex flex-col mb-8 lg:hidden">
            <div className="flex items-center gap-3 mb-1">
              <img src="/logo.png" alt="Stoxy" className="w-10 h-10 rounded-xl" />
              <span className="text-2xl font-bold text-[#1D4ED8] tracking-tight" style={{ fontFamily: "var(--font-geist-sans, inherit)" }}>STOXY</span>
            </div>
            <p className="text-xs text-gray-400 pl-1">Track Smarter. Work Faster.</p>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            เข้าสู่ระบบ
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            ระบบบริหารจัดการคลังอุปกรณ์ไฟฟ้า
          </p>

          {/* Google Sign In */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all text-sm font-medium text-gray-700 shadow-sm"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            เข้าสู่ระบบด้วย Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">หรือ</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Guest */}
          <button
            onClick={() => setGuestModal(true)}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-all text-sm font-medium text-gray-600"
          >
            <UserCircle2 className="w-4 h-4 text-gray-400" />
            เข้าใช้แบบผู้เยี่ยมชม (ยืม-คืนเท่านั้น)
          </button>

          <div className="flex items-center justify-between mt-6">
            <p className="text-xs text-gray-400">
              STOXY © {new Date().getFullYear()} — Track Smarter. Work Faster.
            </p>
            <HelpButton label="ใช้งานบนมือถือ" className="text-blue-500 hover:text-blue-600 bg-blue-50 hover:bg-blue-100" />
          </div>

          {/* Guest Modal */}
          <AnimatePresence>
            {guestModal && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                onClick={() => setGuestModal(false)}
              >
                <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
                  className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 bg-gray-100 rounded-2xl flex items-center justify-center">
                      <UserCircle2 className="w-5 h-5 text-gray-500" />
                    </div>
                    <button onClick={() => setGuestModal(false)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-900 text-base">เข้าใช้แบบผู้เยี่ยมชม</h3>
                    <p className="text-xs text-gray-500 mt-1">สามารถยืม-คืนอุปกรณ์ได้ ชื่อจะถูกบันทึกใน record</p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 mb-1.5 block">ชื่อ-สกุล *</label>
                      <input
                        value={guestName}
                        onChange={e => setGuestName(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleGuest()}
                        placeholder="เช่น สมชาย ใจดี"
                        autoFocus
                        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-2xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 focus:border-[#1D4ED8]/40"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-700 mb-1.5 block">แผนก / หน่วยงาน</label>
                      <input
                        value={guestDept}
                        onChange={e => setGuestDept(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleGuest()}
                        placeholder="เช่น ช่างไฟฟ้า, ผู้รับเหมา"
                        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-2xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 focus:border-[#1D4ED8]/40"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleGuest}
                    disabled={!guestName.trim() || guestLoading}
                    className="w-full py-3.5 bg-[#1D4ED8] text-white font-bold rounded-2xl hover:bg-blue-700 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    {guestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    เข้าใช้งาน
                  </button>

                  <p className="text-center text-xs text-gray-400">
                    ข้อมูลจะถูกลบเมื่อปิดเบราว์เซอร์
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
