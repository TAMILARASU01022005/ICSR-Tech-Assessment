"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "@/lib/theme-context";
import { FiSun, FiMoon } from "react-icons/fi";

export interface ThemeSwitcherProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeSwitcher({ className = "", showLabel = false }: ThemeSwitcherProps) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`w-9 h-9 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 ${className}`}
        aria-hidden="true"
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-medium transition-all duration-200 border cursor-pointer select-none ${
        isDark
          ? "bg-zinc-900/90 hover:bg-zinc-800 border-zinc-700/80 text-amber-400 hover:text-amber-300 shadow-2xs"
          : "bg-white hover:bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900 shadow-2xs"
      } ${className}`}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? (
        <FiSun className="w-4 h-4 text-amber-400 shrink-0" />
      ) : (
        <FiMoon className="w-4 h-4 text-zinc-600 shrink-0" />
      )}
      {showLabel && (
        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
          {isDark ? "Dark Theme" : "Light Theme"}
        </span>
      )}
    </button>
  );
}
