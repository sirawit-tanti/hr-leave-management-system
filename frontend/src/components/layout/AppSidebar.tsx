"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AuthUser, Role } from "@/types/auth";

type NavItem = {
  label: string;
  href: string;
  roles: Role[];
};

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
  },
  {
    label: "Leave Requests",
    href: "/leave-requests",
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
  },
  {
    label: "Approvals",
    href: "/approvals",
    roles: ["ADMIN", "MANAGER"],
  },
  {
    label: "Calendar",
    href: "/calendar",
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
  },
  {
    label: "Reports",
    href: "/reports",
    roles: ["ADMIN", "MANAGER"],
  },
  {
    label: "User Management",
    href: "/admin/users",
    roles: ["ADMIN"],
  },
];

type AppSidebarProps = {
  user: AuthUser;
};

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();

  const visibleNavItems = navItems.filter((item) =>
    item.roles.includes(user.role),
  );

  return (
    <aside className="hidden min-h-screen w-64 border-r border-slate-200 bg-white lg:block">
      <div className="border-b border-slate-200 px-6 py-5">
        <p className="text-sm font-meduim text-slate-500">HR Leave</p>
        <h1 className="mt-1 text-lg font-bold text-slate-900">Management</h1>
      </div>

      <nav className="space-y-1 px-4 py-5">
        {visibleNavItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "block rounded-lg px-4 py-3 text-sm font-medium transition",
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
