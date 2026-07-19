"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import ProtectedHeader from "@/components/ProtectedHeader";
import { ProfileProvider } from "@/components/profile/ProfileProvider";
import { getSupabaseUser, supabase } from "@/lib/supabaseClient";
import { ROUTES } from "@/lib/routes";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      if (pathname === ROUTES.admin.login) {
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await getSupabaseUser();

      if (!user) {
        router.replace(ROUTES.admin.login);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "admin") {
        await supabase.auth.signOut();
        router.replace(ROUTES.admin.login);
        return;
      }

      setLoading(false);
    }

    checkAuth();
  }, [pathname, router]);

  if (loading) return null;

  if (pathname === ROUTES.admin.login) return <>{children}</>;

  if (
    pathname === ROUTES.admin.home ||
    pathname === ROUTES.admin.mainDashboardPreview
  ) {
    return <ProfileProvider>{children}</ProfileProvider>;
  }

  return (
    <ProfileProvider>
      <ProtectedHeader role="admin" />
      {children}
    </ProfileProvider>
  );
}
