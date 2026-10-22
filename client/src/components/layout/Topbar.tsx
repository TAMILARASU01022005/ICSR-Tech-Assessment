"use client";

import React from "react";
import { useAuth } from "@/lib/auth-context";
import { FiMenu, FiBell, FiSearch } from "react-icons/fi";
import { RoleBadge } from "../ui/Badge";
import { ThemeSwitcher } from "../ui/ThemeSwitcher";

export function Topbar({ onOpenMobile }: { onOpenMobile: () => void }) {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 px-6 flex items-center justify-between z-10 sticky top-0 transition-colors">
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenMobile}
          className="md:hidden p-2 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer"
          aria-label="Open navigation menu"
        >
          <FiMenu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-500">
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">ICSR Technical Assignment</span>
          <span>/</span>
          <span>Advanced Project Management</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ThemeSwitcher />
        {user?.role && <RoleBadge role={user.role} />}

        <a
          href="/profile"
          className="flex items-center gap-2 pl-3 border-l border-zinc-200 dark:border-zinc-800 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-xs font-bold text-indigo-700 dark:text-indigo-300">
            {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <span className="hidden sm:inline text-xs font-medium text-zinc-700 dark:text-zinc-300">
            {user?.name}
          </span>
        </a>
      </div>
    </header>
  );
}
