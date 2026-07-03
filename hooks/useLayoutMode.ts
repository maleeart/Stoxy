"use client";

import { useState, useEffect, useCallback } from "react";

type LayoutMode = "mobile" | "desktop";
const KEY = "stoxy_layout_mode";

// Module-level store: all hook instances share the same state
let _mode: LayoutMode = "mobile";
const _listeners = new Set<(m: LayoutMode) => void>();

function _setMode(next: LayoutMode) {
  _mode = next;
  localStorage.setItem(KEY, next);
  _listeners.forEach((fn) => fn(next));
}

export function useLayoutMode(): [LayoutMode, () => void] {
  const [mode, setMode] = useState<LayoutMode>(_mode);

  useEffect(() => {
    // Sync from localStorage on first mount (handles page refresh)
    const stored = localStorage.getItem(KEY);
    if (stored === "desktop" || stored === "mobile") {
      _mode = stored;
      setMode(stored);
    }
    _listeners.add(setMode);
    return () => { _listeners.delete(setMode); };
  }, []);

  const toggle = useCallback(() => _setMode(_mode === "mobile" ? "desktop" : "mobile"), []);

  return [mode, toggle];
}
