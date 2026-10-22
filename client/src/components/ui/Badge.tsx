import React from "react";

export interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | "default"
    | "primary"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "neutral";
  size?: "sm" | "md";
  className?: string;
}

export function Badge({ children, variant = "default", size = "sm", className = "" }: BadgeProps) {
  const variantStyles = {
    default: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
    primary: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    warning: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    danger: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    info: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800",
    neutral: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs font-medium",
    md: "px-2.5 py-1 text-xs font-semibold",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
}

// Helpers for domain entities
export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "Active":
      return <Badge variant="primary">{status}</Badge>;
    case "Completed":
    case "Done":
      return <Badge variant="success">{status}</Badge>;
    case "In Progress":
      return <Badge variant="info">{status}</Badge>;
    case "Review":
      return <Badge variant="warning">{status}</Badge>;
    case "To Do":
      return <Badge variant="neutral">{status}</Badge>;
    case "Archived":
      return <Badge variant="default">{status}</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
}

export function PriorityBadge({ priority }: { priority: string }) {
  switch (priority) {
    case "Critical":
      return <Badge variant="danger">{priority}</Badge>;
    case "High":
      return <Badge variant="warning">{priority}</Badge>;
    case "Medium":
      return <Badge variant="info">{priority}</Badge>;
    case "Low":
      return <Badge variant="neutral">{priority}</Badge>;
    default:
      return <Badge variant="default">{priority}</Badge>;
  }
}

export function RoleBadge({ role }: { role: string }) {
  switch (role) {
    case "Admin":
      return <Badge variant="danger" size="md">Admin</Badge>;
    case "Project Manager":
      return <Badge variant="primary" size="md">Project Manager</Badge>;
    case "Employee":
      return <Badge variant="info" size="md">Employee</Badge>;
    default:
      return <Badge variant="default">{role}</Badge>;
  }
}
