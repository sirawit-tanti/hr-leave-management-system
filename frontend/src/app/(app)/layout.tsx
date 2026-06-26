"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAuthUser, isRoleAllowed } from "@/lib/auth";
import type { AuthUser, Role } from "@/types/auth";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";

type AppLayoutProps = {
  children: React.ReactNode;
};

type RouteAccessRule = {
  path: string;
  roles: Role[];
};

const routeAccessRules: RouteAccessRule[] = [
  {
    path: "/dashboard",
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
  },
  {
    path: "/leave-requests",
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
  },
  {
    path: "/approvals",
    roles: ["ADMIN", "MANAGER"],
  },
  {
    path: "calendar",
    roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
  },
  {
    path: "/reports",
    roles: ["ADMIN", "MANAGER"],
  },
  {
    path: "/admin/users",
    roles: ["ADMIN"],
  },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const authUser = getAuthUser();

    if (!authUser) {
      router.replace("/login");
      return;
    }

    const allowedRoles = getAllowedRolesForPath(pathname);

    if (allowedRoles && !isRoleAllowed(authUser.role, allowedRoles)) {
      router.replace("/dashboard");
      return;
    }

    setUser(authUser);
    setIsCheckingAuth(false);
  }, [pathname, router]);

  if (isCheckingAuth || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-600">Checking authentication...</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <AppSidebar user={user} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader user={user} />

          <main className="flex-1 px-6 py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

function getAllowedRolesForPath(pathname: string) {
  const matchedRule = routeAccessRules
    .sort((a, b) => b.path.length - a.path.length)
    .find(
      (rule) => pathname === rule.path || pathname.startsWith(`${rule.path}/`),
    );

  return matchedRule?.roles;
}
