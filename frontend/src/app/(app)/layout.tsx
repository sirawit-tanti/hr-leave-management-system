"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAuthUser } from "@/lib/auth";
import type { AuthUser } from "@/types/auth";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";

type AppLayoutProps = {
  children: React.ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const authUser = getAuthUser();

    if (!authUser) {
      router.replace("/login");
      return;
    }

    setUser(authUser);
    setIsCheckingAuth(false);
  }, [router]);

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
