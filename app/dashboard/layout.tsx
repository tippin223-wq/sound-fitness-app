"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { ProfileProvider } from "@/components/profile/ProfileProvider";
import { supabase } from "@/lib/supabaseClient";
import { ROUTES } from "@/lib/routes";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    const fallbackTimer = window.setTimeout(() => {
      if (isActive) setLoading(false);
    }, 3500);

    async function checkAuth() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!isActive) return;

        if (!user) {
          router.replace(ROUTES.auth.login);
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (!isActive) return;

        if (!error && profile?.role && profile.role !== "member") {
          await supabase.auth.signOut();
          router.replace(ROUTES.auth.login);
          return;
        }

        setLoading(false);
      } catch {
        if (isActive) setLoading(false);
      } finally {
        window.clearTimeout(fallbackTimer);
      }
    }

    checkAuth();

    return () => {
      isActive = false;
      window.clearTimeout(fallbackTimer);
    };
  }, [router]);

  if (loading) return null;

  return (
    <ProfileProvider>
      <AppHeader />
      {children}
    </ProfileProvider>
  );
}
