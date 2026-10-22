import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FiAlertTriangle } from "react-icons/fi";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
        <FiAlertTriangle className="w-7 h-7" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Page Not Found</h1>
      <p className="mt-2 text-xs text-zinc-500 max-w-sm">
        The requested resource or page does not exist or you do not have permission to access it.
      </p>
      <div className="mt-6">
        <Link href="/dashboard">
          <Button size="sm">Return to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
