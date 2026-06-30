"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { StaffShell } from "./StaffShell";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

export function AppShell({ children, title }: AppShellProps) {
  const { stoxyUser, loading } = useAuth();
  const isAdmin = stoxyUser?.role === "admin" || stoxyUser?.role === "manager";
  const hasSidebar = isAdmin || stoxyUser?.role === "supervisor";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Wait for auth — prevents flash between admin layout and StaffShell
  if (loading) return null;

  // Staff gets a clean mobile-first shell
  if (!hasSidebar && stoxyUser) {
    return <StaffShell>{children}</StaffShell>;
  }

  // Admin gets the full sidebar layout
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="hidden md:flex">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </div>

      <div
        className={cn(
          "fixed left-0 top-0 z-50 md:hidden transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
      </div>

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header title={title} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-screen-2xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
