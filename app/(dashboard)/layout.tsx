"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";
import { ProfileSetupModal } from "@/components/ui/ProfileSetupModal";
import { RoleRequestModal } from "@/components/ui/RoleRequestModal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { firebaseUser, stoxyUser, loading, initialized } = useAuth();
  const router = useRouter();
  const [roleModalDone, setRoleModalDone] = useState(false);

  useEffect(() => {
    if (initialized && !firebaseUser) {
      router.push("/login");
    }
  }, [firebaseUser, initialized, router]);

  if (loading || !initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <style>{`
          @keyframes logo-breathe {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.08); }
          }
          @keyframes dot-bounce {
            0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
            40% { transform: translateY(-6px); opacity: 1; }
          }
          .logo-breathe { animation: logo-breathe 2s ease-in-out infinite; }
          .dot1 { animation: dot-bounce 1.2s ease-in-out infinite; }
          .dot2 { animation: dot-bounce 1.2s ease-in-out infinite 0.2s; }
          .dot3 { animation: dot-bounce 1.2s ease-in-out infinite 0.4s; }
        `}</style>
        <div className="flex flex-col items-center gap-5">
          {/* logo + spinning ring */}
          <div className="relative w-24 h-24 flex items-center justify-center">
            {/* outer spinning arc */}
            <div
              className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-400 border-r-cyan-300"
              style={{ animation: "spin 1.4s linear infinite" }}
            />
            {/* inner counter-spin arc (subtle) */}
            <div
              className="absolute inset-2 rounded-full border-2 border-transparent border-b-blue-200/60"
              style={{ animation: "spin 2.2s linear infinite reverse" }}
            />
            {/* logo */}
            <Image
              src="/logo.png"
              width={64}
              height={64}
              alt="Stoxy"
              className="logo-breathe relative z-10 drop-shadow-md"
              priority
            />
          </div>
          {/* bouncing dots */}
          <div className="flex items-center gap-1.5">
            <span className="dot1 w-2 h-2 rounded-full bg-blue-400" />
            <span className="dot2 w-2 h-2 rounded-full bg-cyan-400" />
            <span className="dot3 w-2 h-2 rounded-full bg-blue-300" />
          </div>
        </div>
      </div>
    );
  }

  if (!firebaseUser) return null;

  // บังคับกรอกข้อมูลส่วนตัวก่อน
  if (stoxyUser && !stoxyUser.profileCompleted && stoxyUser.role !== "guest") {
    return <ProfileSetupModal />;
  }

  // ถามสิทธิ์ครั้งแรก (viewer ที่ยังไม่เคยตอบ)
  const needRolePrompt = stoxyUser?.role === "viewer"
    && stoxyUser.profileCompleted
    && stoxyUser.accessRequested === false
    && !roleModalDone;

  return (
    <>
      {children}
      {needRolePrompt && <RoleRequestModal onDone={() => setRoleModalDone(true)} />}
    </>
  );
}
