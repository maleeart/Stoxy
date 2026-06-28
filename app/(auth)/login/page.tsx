"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Zap, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { loginWithEmail, loginWithGoogle } from "@/services/auth.service";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    try {
      setLoading(true);
      await loginWithEmail(data.email, data.password);
      router.push("/dashboard");
    } catch (e: any) {
      const msg =
        e.code === "auth/invalid-credential"
          ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
          : "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

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

  return (
    <div className="min-h-screen bg-[#0d2137] flex">
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
          <div className="flex items-center justify-center w-20 h-20 bg-yellow-400 rounded-3xl mx-auto mb-6 shadow-2xl shadow-yellow-400/30">
            <Zap className="w-10 h-10 text-[#0d2137]" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-2">
            sto<span className="text-yellow-400">xy</span>
          </h1>
          <p className="text-blue-200 text-lg mb-10">ระบบบริหารคลังไฟฟ้า</p>

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
                <p className="text-blue-200 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-950">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-[#0d2137] rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="flex items-baseline">
              <span className="text-2xl font-bold text-[#0d2137]">sto</span>
              <span className="text-2xl font-bold text-yellow-500">xy</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            เข้าสู่ระบบ
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            ระบบบริหารจัดการคลังอุปกรณ์ไฟฟ้า
          </p>

          {/* Google Sign In */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 shadow-sm"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            เข้าสู่ระบบด้วย Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
            <span className="text-xs text-gray-400">หรือ</span>
            <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                อีเมล
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register("email")}
                  type="email"
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  placeholder="your@email.com"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                รหัสผ่าน
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register("password")}
                  type={showPass ? "text" : "password"}
                  className="w-full pl-9 pr-10 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0d2137] text-white text-sm font-medium rounded-xl hover:bg-[#1a3a5c] transition-colors shadow-sm disabled:opacity-60"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              เข้าสู่ระบบ
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
            Stoxy © {new Date().getFullYear()} — ระบบคลังไฟฟ้าสำหรับมืออาชีพ
          </p>
        </motion.div>
      </div>
    </div>
  );
}
