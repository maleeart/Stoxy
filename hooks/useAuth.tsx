"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User } from "firebase/auth";
import { onAuthChange, getStoxyUser, ensureUserDoc, loadGuestInfo, clearGuestInfo } from "@/services/auth.service";
import type { StoxyUser } from "@/types";

interface AuthContextType {
  firebaseUser: User | null;
  stoxyUser: StoxyUser | null;
  loading: boolean;
  initialized: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  stoxyUser: null,
  loading: true,
  initialized: false,
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [stoxyUser, setStoxyUser] = useState<StoxyUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          if (user.isAnonymous) {
            // Guest session — build stoxyUser from localStorage
            const info = loadGuestInfo();
            setStoxyUser({
              uid: user.uid,
              email: "",
              displayName: info?.name ?? "ผู้เยี่ยมชม",
              role: "guest" as any,
              department: info?.department ?? "",
              isActive: true,
              createdAt: null as any,
              updatedAt: null as any,
            });
          } else {
            const u = await ensureUserDoc(user);
            setStoxyUser(u);
          }
        } catch {
          setStoxyUser(null);
        }
      } else {
        clearGuestInfo();
        setStoxyUser(null);
      }
      setLoading(false);
      setInitialized(true);
    });
    return unsub;
  }, []);

  async function refreshUser() {
    if (!firebaseUser) return;
    const u = await getStoxyUser(firebaseUser.uid);
    if (u) setStoxyUser(u);
  }

  return (
    <AuthContext.Provider value={{ firebaseUser, stoxyUser, loading, initialized, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useRole() {
  const { stoxyUser } = useAuth();
  return stoxyUser?.role ?? "viewer";
}
