import React from "react";
import Link from "next/link";

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  colorClass?: string;
  href?: string;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  colorClass = "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400",
  href,
  onClick,
}: StatCardProps) {
  const content = (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs flex items-start justify-between h-full ${
        href || onClick
          ? "cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600 hover:-translate-y-0.5 transition-all"
          : ""
      }`}
    >
      <div>
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{value}</p>
        {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
        {trend && (
          <p
            className={`text-xs font-medium mt-2 flex items-center gap-1 ${
              trend.isPositive ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            <span>{trend.isPositive ? "↑" : "↓"}</span>
            <span>{trend.value}</span>
          </p>
        )}
      </div>
      <div className={`p-3 rounded-lg shrink-0 ${colorClass}`}>{icon}</div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block h-full">{content}</Link>;
  }

  return content;
}
