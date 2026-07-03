"use client";

import { useState, useEffect, useCallback } from "react";

type LayoutMode = "mobile" | "desktop";
const KEY = "stoxy_layout_mode";

export function useLayoutMode(): [LayoutMode, () => void] {
  const [mode, setMode] = useState<LayoutMode>("mobile");

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (stored === "desktop" || stored === "mobile") setMode(stored);
  }, []);

  const toggle = useCallback(() => {
    setMode(prev => {
      const next: LayoutMode = prev === "mobile" ? "desktop" : "mobile";
      localStorage.setItem(KEY, next);
      return next;
    });
  }, []);

  return [mode, toggle];
}
