"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "catre-theme";

export const useTheme = () => {
  const [isDark, setIsDark] = useState(false);

  const applyTheme = useCallback((value: boolean) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (value) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    root.style.colorScheme = value ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", value ? "#080d18" : "#ffffff");
    try {
      localStorage.setItem(STORAGE_KEY, value ? "dark" : "light");
    } catch {}
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      applyTheme(next);
      return next;
    });
  }, [applyTheme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const value = stored ? stored === "dark" : prefersDark;
    setIsDark(value);
    applyTheme(value);
  }, [applyTheme]);

  return { isDark, toggleTheme };
};
