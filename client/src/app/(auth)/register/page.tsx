"use client";

import React from "react";
import Link from "next/link";
import { FiLayers, FiShield, FiArrowRight } from "react-icons/fi";
import { Button } from "@/components/ui/Button";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative transition-colors duration-150">
      <div className="absolute top-6 right-6">
        <ThemeSwitcher />
      </div>
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/login" className="inline-flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
            <FiLayers className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">ICSR Portal</span>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Public Registration Closed</h2>
        <p className="mt-1 text-xs text-zinc-500">Access to ICSR project resources is controlled by institutional policy</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-zinc-900 py-8 px-6 shadow-sm border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:px-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center border border-amber-200 dark:border-amber-800">
            <FiShield className="w-6 h-6" />
          </div>

          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Account Provisioning Required</h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Public self-registration has been disabled. All employee and project manager accounts are provisioned directly by your designated <span className="font-semibold text-zinc-800 dark:text-zinc-200">Administrator</span> or <span className="font-semibold text-zinc-800 dark:text-zinc-200">Project Manager</span>.
          </p>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <Link href="/login" className="w-full block">
              <Button className="w-full flex items-center justify-center gap-2">
                <span>Sign In to Your Account</span>
                <FiArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

