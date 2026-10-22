"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FiAlertOctagon } from "react-icons/fi";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error Boundary caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
          <FiAlertOctagon className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Something went wrong
        </h1>
        <p className="mt-2 text-xs text-zinc-500 max-w-sm">
          An unexpected error occurred. You can attempt to recover by clicking below.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Button size="sm" onClick={() => reset()}>
            Try Again
          </Button>
          <Link href="/login">
            <Button size="sm" variant="outline">
              Go to Login
            </Button>
          </Link>
        </div>
      </body>
    </html>
  );
}
