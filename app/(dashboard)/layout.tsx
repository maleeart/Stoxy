"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { firebaseUser, loading, initialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (initialized && !firebaseUser) {
      router.push("/login");
    }
  }, [firebaseUser, initialized, router]);

  if (loading || !initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-[#0d2137] rounded-2xl flex items-center justify-center animate-pulse">
            <svg
              className="w-6 h-6 text-yellow-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M13 2L4.5 13.5H11L9 22L19.5 9.5H13L15 2H13Z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">กำลังโหลด Stoxy...</p>
        </div>
      </div>
    );
  }

  if (!firebaseUser) return null;

  return <>{children}</>;
}
