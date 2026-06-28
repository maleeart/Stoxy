"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User } from "firebase/auth";
import { onAuthChange, getStoxyUser, ensureUserDoc } from "@/services/auth.service";
import type { StoxyUser } from "@/types";

interface AuthContextType {
  firebaseUser: User | null;
  stoxyUser: StoxyUser | null;
  loading: boolean;
  initialized: boolean;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  stoxyUser: null,
  loading: true,
  initialized: false,
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
        const u = await getStoxyUser(user.uid);
        setStoxyUser(u);
      } else {
        setStoxyUser(null);
      }
      setLoading(false);
      setInitialized(true);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ firebaseUser, stoxyUser, loading, initialized }}>
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
