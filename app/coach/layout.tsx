"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import ProtectedHeader from "@/components/ProtectedHeader";
import { ProfileProvider } from "@/components/profile/ProfileProvider";
import { getSupabaseUser, supabase } from "@/lib/supabaseClient";
import { ROUTES } from "@/lib/routes";

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      if (pathname === ROUTES.coach.login) {
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await getSupabaseUser();

      if (!user) {
        router.replace(ROUTES.coach.login);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "coach") {
        await supabase.auth.signOut();
        router.replace(ROUTES.coach.login);
        return;
      }

      setLoading(false);
    }

    checkAuth();
  }, [pathname, router]);

  if (loading) return null;

  if (pathname === ROUTES.coach.login) return <>{children}</>;

  return (
    <ProfileProvider>
      <ProtectedHeader role="coach" />
      {children}
    </ProfileProvider>
  );
}
