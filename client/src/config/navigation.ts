import { IconType } from "react-icons";
import {
  FiGrid,
  FiFolder,
  FiCheckSquare,
  FiColumns,
  FiUsers,
  FiActivity,
  FiSettings,
  FiUser,
} from "react-icons/fi";
import { UserRole } from "@/types";

export interface NavItemConfig {
  key: string;
  name: string;
  href: string;
  icon: IconType;
  allowedRoles: UserRole[];
  description?: string;
}

export const NAVIGATION_ITEMS: NavItemConfig[] = [
  {
    key: "dashboard",
    name: "Dashboard",
    href: "/dashboard",
    icon: FiGrid,
    allowedRoles: ["Admin", "Project Manager", "Employee"],
  },
  {
    key: "projects",
    name: "Projects",
    href: "/projects",
    icon: FiFolder,
    allowedRoles: ["Admin", "Project Manager", "Employee"],
  },
  {
    key: "tasks",
    name: "Tasks",
    href: "/tasks",
    icon: FiCheckSquare,
    allowedRoles: ["Admin", "Project Manager", "Employee"],
  },
  {
    key: "board",
    name: "Kanban Board",
    href: "/board",
    icon: FiColumns,
    allowedRoles: ["Admin", "Project Manager", "Employee"],
  },
  {
    key: "team",
    name: "Team Management",
    href: "/team",
    icon: FiUsers,
    allowedRoles: ["Admin", "Project Manager"],
  },
  {
    key: "activity",
    name: "Activity Logs",
    href: "/activity",
    icon: FiActivity,
    allowedRoles: ["Admin", "Project Manager", "Employee"],
  },
  {
    key: "settings",
    name: "Settings",
    href: "/settings",
    icon: FiSettings,
    allowedRoles: ["Admin"],
  },
  {
    key: "profile",
    name: "Profile",
    href: "/profile",
    icon: FiUser,
    allowedRoles: ["Admin", "Project Manager", "Employee"],
  },
];

export function getNavItemsForRole(role?: UserRole): NavItemConfig[] {
  if (!role) return [];

  if (role === "Admin") {
    return [
      { key: "dashboard", name: "Dashboard", href: "/dashboard", icon: FiGrid, allowedRoles: ["Admin"] },
      { key: "projects", name: "Projects", href: "/projects", icon: FiFolder, allowedRoles: ["Admin"] },
      { key: "tasks", name: "Tasks", href: "/tasks", icon: FiCheckSquare, allowedRoles: ["Admin"] },
      { key: "board", name: "Kanban Board", href: "/board", icon: FiColumns, allowedRoles: ["Admin"] },
      { key: "team", name: "Team Management", href: "/team", icon: FiUsers, allowedRoles: ["Admin"] },
      { key: "activity", name: "Activity Logs", href: "/activity", icon: FiActivity, allowedRoles: ["Admin"] },
      { key: "settings", name: "Settings", href: "/settings", icon: FiSettings, allowedRoles: ["Admin"] },
      { key: "profile", name: "Profile", href: "/profile", icon: FiUser, allowedRoles: ["Admin"] },
    ];
  }

  if (role === "Project Manager") {
    return [
      { key: "dashboard", name: "Dashboard", href: "/dashboard", icon: FiGrid, allowedRoles: ["Project Manager"] },
      { key: "projects", name: "My Projects", href: "/projects", icon: FiFolder, allowedRoles: ["Project Manager"] },
      { key: "tasks", name: "Tasks", href: "/tasks", icon: FiCheckSquare, allowedRoles: ["Project Manager"] },
      { key: "board", name: "Kanban Board", href: "/board", icon: FiColumns, allowedRoles: ["Project Manager"] },
      { key: "team", name: "Team", href: "/team", icon: FiUsers, allowedRoles: ["Project Manager"] },
      { key: "activity", name: "Activity", href: "/activity", icon: FiActivity, allowedRoles: ["Project Manager"] },
      { key: "profile", name: "Profile", href: "/profile", icon: FiUser, allowedRoles: ["Project Manager"] },
    ];
  }

  // Employee
  return [
    { key: "dashboard", name: "Dashboard", href: "/dashboard", icon: FiGrid, allowedRoles: ["Employee"] },
    { key: "tasks", name: "My Tasks", href: "/tasks", icon: FiCheckSquare, allowedRoles: ["Employee"] },
    { key: "projects", name: "My Projects", href: "/projects", icon: FiFolder, allowedRoles: ["Employee"] },
    { key: "board", name: "My Kanban Board", href: "/board", icon: FiColumns, allowedRoles: ["Employee"] },
    { key: "activity", name: "Relevant Activity", href: "/activity", icon: FiActivity, allowedRoles: ["Employee"] },
    { key: "profile", name: "Profile", href: "/profile", icon: FiUser, allowedRoles: ["Employee"] },
  ];
}

export function isRouteAllowedForRole(pathname: string, role?: UserRole): boolean {
  if (!role) return false;

  // Exact or prefix matching
  const matchingItem = NAVIGATION_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  if (!matchingItem) return true;
  return matchingItem.allowedRoles.includes(role);
}
