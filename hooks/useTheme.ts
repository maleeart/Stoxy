"use client";

export function useTheme() {
  function toggle() {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }
  return { toggle };
}
